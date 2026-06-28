import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';

const ROOT = process.cwd();

const projectImport = relativePath => path.join(ROOT, relativePath).replaceAll(path.sep, '/');

const entrySource = `
import { INITIAL_CHARACTER } from '${projectImport('types.ts')}';
import {
  buildLevelOneCharacter,
  getRaceResistanceOptions,
} from '${projectImport('utils/autoBuilderRules.ts')}';
import { removeCharacterAdjustments } from '${projectImport('utils/characterAdjustments.ts')}';
import { equipWeapon } from '${projectImport('utils/equipmentRules.ts')}';
import content from '${projectImport('public/data/auto-builder-core.json')}';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const fighter = content.classes.find(item => item.key === 'Fighter' && item.source === 'XPHB');
const wizard = content.classes.find(item => item.key === 'Wizard' && item.source === 'PHB');
const background = content.backgrounds.find(item => item.source === 'XPHB') || content.backgrounds[0];
const phbBackground = content.backgrounds.find(item => item.source === 'PHB') || background;
const aasimar = content.races.find(item => item.key === 'Aasimar' && item.source === 'MPMM');
const dragonborn = content.races.find(item => item.key === 'Dragonborn' && item.source === 'PHB');
const dwarf = content.races.find(item => item.key === 'Dwarf' && item.source === 'PHB');
const battleaxe = content.weapons.find(item => item.key === 'Battleaxe' && item.source === 'PHB');

assert(fighter, 'missing XPHB Fighter');
assert(wizard, 'missing PHB Wizard');
assert(background, 'missing background fixture');
assert(phbBackground, 'missing PHB background fixture');
assert(aasimar, 'missing MPMM Aasimar fixture');
assert(dragonborn, 'missing PHB Dragonborn fixture');
assert(dwarf, 'missing PHB Dwarf fixture');
assert(battleaxe, 'missing PHB Battleaxe fixture');

const baseOptions = {
  ruleSystem: '5r',
  background,
  skillChoices: [],
  spellChoices: { cantrips: [], leveled: [] },
};

const aasimarCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: aasimar,
});

assert(
  aasimarCharacter.senses.includes('黑暗视觉 60 尺'),
  \`Aasimar should add structured darkvision sense, got \${aasimarCharacter.senses.join(', ')}\`,
);
assert(
  aasimarCharacter.damageResistances.includes('暗蚀') && aasimarCharacter.damageResistances.includes('光耀'),
  \`Aasimar should add structured fixed resistances, got \${aasimarCharacter.damageResistances.join(', ')}\`,
);
assert(
  aasimarCharacter.featureEntries.some(feature => feature.id.endsWith('-darkvision')),
  'Aasimar should still add darkvision feature description',
);
assert(
  aasimarCharacter.featureEntries.some(feature => feature.id.endsWith('-fixed-resistances')),
  'Aasimar should still add resistance feature description',
);

const removedAasimar = removeCharacterAdjustments(aasimarCharacter, 'auto-character-5r');
assert(!removedAasimar.senses.includes('黑暗视觉 60 尺'), 'removing auto-character should remove structured darkvision');
assert(!removedAasimar.damageResistances.includes('暗蚀'), 'removing auto-character should remove structured fixed resistance');

const resistanceOptions = getRaceResistanceOptions(dragonborn);
assert(resistanceOptions.includes('火焰'), \`Dragonborn resistance choices should include 火焰, got \${resistanceOptions.join(', ')}\`);
const dragonbornCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: dragonborn,
  raceChoices: {
    resistance: '火焰',
  },
});

assert(
  dragonbornCharacter.damageResistances.includes('火焰'),
  \`Dragonborn selected resistance should be structured, got \${dragonbornCharacter.damageResistances.join(', ')}\`,
);
assert(
  dragonbornCharacter.featureEntries.some(feature => feature.sourceId === 'auto-race-Dragonborn-PHB-choice-resistance'),
  'Dragonborn selected resistance should still add feature description',
);
const removedDragonborn = removeCharacterAdjustments(dragonbornCharacter, 'auto-character-5r');
assert(!removedDragonborn.damageResistances.includes('火焰'), 'removing auto-character should remove selected resistance');

const dwarfCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, wizard, {
  ruleSystem: '5e',
  race: dwarf,
  background: phbBackground,
  skillChoices: [],
  spellChoices: { cantrips: [], leveled: [] },
});
assert(
  dwarfCharacter.proficiencies.has('weapon:battleaxe'),
  \`Dwarf weapon proficiency should normalize source suffix, got \${Array.from(dwarfCharacter.proficiencies).join(', ')}\`,
);
assert(
  !dwarfCharacter.proficiencies.has('weapon:battleaxe|phb'),
  'Dwarf weapon proficiency should not keep source suffix in character proficiency key',
);
const dwarfWithBattleaxe = equipWeapon(dwarfCharacter, battleaxe, content);
const battleaxeAttack = dwarfWithBattleaxe.attacks.find(attack => attack.sourceId === \`equip-weapon-\${battleaxe.id}\`);
assert(battleaxeAttack, 'Dwarf should add battleaxe attack');
assert(
  battleaxeAttack.bonus === '+2',
  \`Dwarf battleaxe attack should include proficiency bonus with STR 10, got \${battleaxeAttack.bonus}\`,
);

export default {
  races: [aasimar.name, dragonborn.name, dwarf.name],
  checks: [
    'fixed race darkvision adds reversible structured sense',
    'fixed race resistances add reversible structured resistances',
    'chosen race resistance adds reversible structured resistance',
    'structured origin data keeps feature descriptions',
    'fixed race weapon proficiencies normalize source suffixes and affect attacks',
  ],
};
`;

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'origin-structured-audit-'));
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
      fileName: () => 'audit-origin-structured-behavior.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },
});

const result = await import(pathToFileURL(path.join(outDir, 'audit-origin-structured-behavior.js')).href);

console.log(JSON.stringify(result.default, null, 2));
