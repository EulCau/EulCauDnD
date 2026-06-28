import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';

const ROOT = process.cwd();

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const projectImport = relativePath => path.join(ROOT, relativePath).replaceAll(path.sep, '/');

const entrySource = `
import { INITIAL_CHARACTER } from '${projectImport('types.ts')}';
import {
  equipMagicWeapon,
  equipOffHandWeapon,
  equipShield,
  equipWeapon,
  getOffHandWeaponEquipBlockReason,
} from '${projectImport('utils/equipmentRules.ts')}';
import content from '${projectImport('public/data/auto-builder-core.json')}';

const hasProperty = (weapon, code) => (weapon.property || []).some(property => {
  const uid = typeof property === 'string' ? property : property?.uid;
  return String(uid || '').split('|')[0] === code;
});

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const cloneCharacter = () => ({
  ...INITIAL_CHARACTER,
  classes: [{ id: 'fighter-1', name: 'Fighter', level: 5, subclass: '', source: 'PHB' }],
  abilities: { ...INITIAL_CHARACTER.abilities, STR: 16, DEX: 14 },
  proficiencies: new Set(['weapon:simple', 'weapon:martial', 'weapon:简易', 'weapon:军用']),
  expertises: new Set(),
  attacks: [],
  featureEntries: [],
  resources: [],
  appliedAdjustments: [],
  inventory: [],
  automation: { ...INITIAL_CHARACTER.automation },
  spellcasting: {
    ...INITIAL_CHARACTER.spellcasting,
    slots: { ...INITIAL_CHARACTER.spellcasting.slots },
    spells: [],
  },
  spellcastingProfiles: [],
});

const weapons = content.weapons;
const lightWeapon = weapons.find(weapon => hasProperty(weapon, 'L') && !hasProperty(weapon, '2H'));
const nonLightWeapon = weapons.find(weapon => !hasProperty(weapon, 'L') && !hasProperty(weapon, '2H'));
const twoHandWeapon = weapons.find(weapon => hasProperty(weapon, '2H'));
const shield = content.armors.find(armor => String(armor.type || '').split('|')[0] === 'S');

assert(lightWeapon, 'missing light weapon fixture');
assert(nonLightWeapon, 'missing non-light weapon fixture');
assert(twoHandWeapon, 'missing two-handed weapon fixture');
assert(shield, 'missing shield fixture');

let character = cloneCharacter();
character = equipWeapon(character, nonLightWeapon, content);
const blockedByMain = getOffHandWeaponEquipBlockReason(character, lightWeapon, content);
assert(blockedByMain.includes('主手'), 'light off-hand should be blocked by non-light main hand');
const blockedAttempt = equipOffHandWeapon(character, lightWeapon, content);
assert(
  !blockedAttempt.appliedAdjustments.some(adjustment => adjustment.sourceId.startsWith('equip-weapon-offhand-')),
  'blocked off-hand equip should not add an adjustment',
);

character = cloneCharacter();
const nonLightOffHandReason = getOffHandWeaponEquipBlockReason(character, nonLightWeapon, content);
assert(nonLightOffHandReason.includes('轻型'), 'non-light off-hand should explain light weapon requirement');
character = equipOffHandWeapon(character, lightWeapon, content);
assert(
  character.appliedAdjustments.some(adjustment => adjustment.sourceId === \`equip-weapon-offhand-\${lightWeapon.id}\`),
  'light off-hand weapon should add an off-hand adjustment',
);
assert(
  character.attacks.some(attack => attack.sourceId === \`equip-weapon-offhand-\${lightWeapon.id}\` && attack.offHand),
  'light off-hand weapon should add an off-hand attack',
);
character = equipWeapon(character, nonLightWeapon, content);
assert(
  !character.appliedAdjustments.some(adjustment => adjustment.sourceId.startsWith('equip-weapon-offhand-')),
  'equipping a non-light main hand should remove existing off-hand weapon',
);

character = cloneCharacter();
character = equipWeapon(character, twoHandWeapon, content);
character = equipShield(character, shield, content);
assert(
  !character.appliedAdjustments.some(adjustment => adjustment.sourceId === \`equip-weapon-\${twoHandWeapon.id}\`),
  'equipping a shield should remove two-handed main weapon',
);
assert(
  character.appliedAdjustments.some(adjustment => adjustment.sourceId === \`equip-shield-\${shield.id}\`),
  'equipping a shield should add shield adjustment',
);

character = cloneCharacter();
character = equipWeapon(character, nonLightWeapon, content);
const magicWeapon = {
  ...lightWeapon,
  id: \`magic-audit-\${lightWeapon.id}\`,
  name: \`+1 \${lightWeapon.name}\`,
  bonusWeapon: '+1',
};
character = equipMagicWeapon(character, magicWeapon, {
  inventoryItemId: 'audit-magic-1',
  displayName: magicWeapon.name,
  detailName: '+1 Weapon',
  magicBonus: 1,
  isTemplate: true,
});
assert(
  !character.appliedAdjustments.some(adjustment => adjustment.sourceId === \`equip-weapon-\${nonLightWeapon.id}\`),
  'equipping a magic weapon should remove existing ordinary main weapon',
);
assert(
  character.appliedAdjustments.some(adjustment => adjustment.sourceId === 'equip-magic-audit-magic-1'),
  'equipping a magic weapon should add magic weapon adjustment',
);
assert(
  getOffHandWeaponEquipBlockReason(character, lightWeapon, content).includes('魔法主手武器'),
  'magic main hand should block off-hand equip until its base weapon can be tracked',
);

const secondMagicWeapon = {
  ...lightWeapon,
  id: \`magic-audit-2-\${lightWeapon.id}\`,
  name: \`+2 \${lightWeapon.name}\`,
  bonusWeapon: '+2',
};
character = equipMagicWeapon(character, secondMagicWeapon, {
  inventoryItemId: 'audit-magic-2',
  displayName: secondMagicWeapon.name,
  detailName: '+2 Weapon',
  magicBonus: 2,
  isTemplate: true,
});
assert(
  !character.appliedAdjustments.some(adjustment => adjustment.sourceId === 'equip-magic-audit-magic-1')
    && character.appliedAdjustments.some(adjustment => adjustment.sourceId === 'equip-magic-audit-magic-2'),
  'equipping a second magic weapon should replace the previous magic weapon',
);

export default {
  lightWeapon: lightWeapon.name,
  nonLightWeapon: nonLightWeapon.name,
  twoHandWeapon: twoHandWeapon.name,
  shield: shield.name,
};
`;

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'equipment-audit-'));
const entryPath = path.join(tempDir, 'entry.ts');
const outDir = path.join(tempDir, 'dist');

await fs.writeFile(entryPath, entrySource);
await build({
  logLevel: 'silent',
  configFile: false,
  build: {
    outDir,
    emptyOutDir: true,
    lib: {
      entry: entryPath,
      formats: ['es'],
      fileName: () => 'audit-equipment-behavior.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },
});

const result = await import(pathToFileURL(path.join(outDir, 'audit-equipment-behavior.js')).href);

console.log(JSON.stringify({
  fixtures: result.default,
  checks: [
    'non-light main blocks off-hand',
    'non-light off-hand reports light requirement',
    'light off-hand adds off-hand attack',
    'non-light main removes off-hand',
    'shield removes two-handed main',
    'magic weapon replaces ordinary main',
    'magic weapon blocks off-hand',
    'second magic weapon replaces first magic weapon',
  ],
}, null, 2));
