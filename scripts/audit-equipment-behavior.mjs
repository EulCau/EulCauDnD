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
  refreshCharacterAutomation,
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

const addFeature = (character, name, sourceId = \`audit-feature-\${name}\`) => ({
  ...character,
  featureEntries: [
    ...character.featureEntries,
    {
      id: sourceId,
      sourceId,
      sourceName: name,
      name,
      description: name,
    },
  ],
});

const getAttack = (character, sourceId) => character.attacks.find(attack => attack.sourceId === sourceId);

const weapons = content.weapons;
const lightWeapon = weapons.find(weapon => hasProperty(weapon, 'L') && !hasProperty(weapon, '2H'));
const nonLightWeapon = weapons.find(weapon => !hasProperty(weapon, 'L') && !hasProperty(weapon, '2H'));
const twoHandWeapon = weapons.find(weapon => hasProperty(weapon, '2H'));
const rangedWeapon = weapons.find(weapon => String(weapon.type || '').split('|')[0] === 'R' && weapon.dmg1);
const shield = content.armors.find(armor => String(armor.type || '').split('|')[0] === 'S');

assert(lightWeapon, 'missing light weapon fixture');
assert(nonLightWeapon, 'missing non-light weapon fixture');
assert(twoHandWeapon, 'missing two-handed weapon fixture');
assert(rangedWeapon, 'missing ranged weapon fixture');
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
character = equipWeapon(character, nonLightWeapon, content);
const nonLightAttack = getAttack(character, \`equip-weapon-\${nonLightWeapon.id}\`);
assert(nonLightAttack, 'ordinary main weapon should add attack');
assert(nonLightAttack.bonus === '+6', \`ordinary main weapon attack bonus should be +6, got \${nonLightAttack.bonus}\`);
assert(
  nonLightAttack.damage.includes('+3'),
  \`ordinary main weapon damage should include STR modifier +3, got \${nonLightAttack.damage}\`,
);

character = cloneCharacter();
character = addFeature(character, 'Archery');
character = equipWeapon(character, rangedWeapon, content);
const rangedAttack = getAttack(character, \`equip-weapon-\${rangedWeapon.id}\`);
assert(rangedAttack, 'ranged weapon should add attack');
assert(rangedAttack.bonus === '+7', \`archery ranged attack bonus should be +7, got \${rangedAttack.bonus}\`);
assert(
  rangedAttack.notes.includes('箭术 +2 命中'),
  \`archery ranged attack notes should mention +2, got \${rangedAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, 'Dueling');
character = equipWeapon(character, nonLightWeapon, content);
const duelingAttack = getAttack(character, \`equip-weapon-\${nonLightWeapon.id}\`);
assert(duelingAttack, 'dueling main weapon should add attack');
assert(
  duelingAttack.damage.includes('+5'),
  \`dueling damage should include STR +3 and style +2, got \${duelingAttack.damage}\`,
);
assert(
  duelingAttack.notes.includes('对决 +2 伤害'),
  \`dueling attack notes should mention damage bonus, got \${duelingAttack.notes}\`,
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
  baseWeaponId: lightWeapon.id,
});
assert(
  !character.appliedAdjustments.some(adjustment => adjustment.sourceId === \`equip-weapon-\${nonLightWeapon.id}\`),
  'equipping a magic weapon should remove existing ordinary main weapon',
);
assert(
  character.appliedAdjustments.some(adjustment => adjustment.sourceId === 'equip-magic-audit-magic-1'),
  'equipping a magic weapon should add magic weapon adjustment',
);
const magicAttack = getAttack(character, 'equip-magic-audit-magic-1');
assert(magicAttack, 'magic weapon should add attack');
assert(magicAttack.bonus === '+7', \`+1 magic melee weapon attack bonus should be +7, got \${magicAttack.bonus}\`);
assert(
  magicAttack.damage.includes('+4'),
  \`+1 magic melee weapon damage should include STR +3 and magic +1, got \${magicAttack.damage}\`,
);
assert(
  getOffHandWeaponEquipBlockReason(character, lightWeapon, content).includes('魔法主手武器'),
  'magic main hand should block off-hand equip until its base weapon can be tracked',
);
character = {
  ...character,
  abilities: { ...character.abilities, STR: 18 },
};
character = refreshCharacterAutomation(character, content);
const refreshedMagicAttack = getAttack(character, 'equip-magic-audit-magic-1');
assert(refreshedMagicAttack, 'refreshed magic weapon should keep attack');
assert(
  refreshedMagicAttack.bonus === '+8',
  \`+1 magic melee weapon attack bonus should refresh after STR change to +8, got \${refreshedMagicAttack.bonus}\`,
);
assert(
  refreshedMagicAttack.damage.includes('+5'),
  \`+1 magic melee weapon damage should refresh after STR change to +5, got \${refreshedMagicAttack.damage}\`,
);
assert(
  refreshedMagicAttack.magicBaseWeaponId === lightWeapon.id,
  'refreshed magic weapon attack should keep base weapon metadata',
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
  baseWeaponId: lightWeapon.id,
});
assert(
  !character.appliedAdjustments.some(adjustment => adjustment.sourceId === 'equip-magic-audit-magic-1')
    && character.appliedAdjustments.some(adjustment => adjustment.sourceId === 'equip-magic-audit-magic-2'),
  'equipping a second magic weapon should replace the previous magic weapon',
);

character = cloneCharacter();
character = equipWeapon(character, nonLightWeapon, content);
character = {
  ...character,
  abilities: { ...character.abilities, STR: 18 },
};
character = refreshCharacterAutomation(character, content);
const refreshedStrengthAttack = getAttack(character, \`equip-weapon-\${nonLightWeapon.id}\`);
assert(refreshedStrengthAttack, 'refreshed main weapon should keep attack');
assert(
  refreshedStrengthAttack.bonus === '+7',
  \`main weapon attack bonus should refresh after STR change to +7, got \${refreshedStrengthAttack.bonus}\`,
);
assert(
  refreshedStrengthAttack.damage.includes('+4'),
  \`main weapon damage should refresh after STR change to +4, got \${refreshedStrengthAttack.damage}\`,
);

character = cloneCharacter();
character = equipWeapon(character, rangedWeapon, content);
character = addFeature(character, 'Archery');
character = refreshCharacterAutomation(character, content);
const refreshedArcheryAttack = getAttack(character, \`equip-weapon-\${rangedWeapon.id}\`);
assert(refreshedArcheryAttack, 'refreshed ranged weapon should keep attack');
assert(
  refreshedArcheryAttack.bonus === '+7',
  \`ranged attack bonus should refresh after adding Archery to +7, got \${refreshedArcheryAttack.bonus}\`,
);
assert(
  refreshedArcheryAttack.notes.includes('箭术 +2 命中'),
  \`ranged attack notes should refresh after adding Archery, got \${refreshedArcheryAttack.notes}\`,
);

character = cloneCharacter();
character = equipOffHandWeapon(character, lightWeapon, content);
let refreshedOffHandAttack = getAttack(character, \`equip-weapon-offhand-\${lightWeapon.id}\`);
assert(refreshedOffHandAttack, 'off-hand fixture should add attack before refresh');
assert(
  !refreshedOffHandAttack.damage.includes('+3'),
  \`off-hand damage should initially omit ability modifier, got \${refreshedOffHandAttack.damage}\`,
);
character = addFeature(character, 'Two-Weapon Fighting');
character = refreshCharacterAutomation(character, content);
refreshedOffHandAttack = getAttack(character, \`equip-weapon-offhand-\${lightWeapon.id}\`);
assert(refreshedOffHandAttack, 'refreshed off-hand weapon should keep attack');
assert(
  refreshedOffHandAttack.damage.includes('+3'),
  \`off-hand damage should refresh after Two-Weapon Fighting to include ability modifier, got \${refreshedOffHandAttack.damage}\`,
);

export default {
  lightWeapon: lightWeapon.name,
  nonLightWeapon: nonLightWeapon.name,
  twoHandWeapon: twoHandWeapon.name,
  rangedWeapon: rangedWeapon.name,
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
    'ordinary weapon attack bonus and damage',
    'archery ranged attack bonus and notes',
    'dueling melee damage and notes',
    'non-light off-hand reports light requirement',
    'light off-hand adds off-hand attack',
    'non-light main removes off-hand',
    'shield removes two-handed main',
    'magic weapon replaces ordinary main',
    'magic weapon attack bonus and damage',
    'magic weapon blocks off-hand',
    'magic weapon refreshes after ability change',
    'second magic weapon replaces first magic weapon',
    'main weapon refreshes after ability change',
    'ranged weapon refreshes after adding archery',
    'off-hand weapon refreshes after adding two-weapon fighting',
  ],
}, null, 2));
