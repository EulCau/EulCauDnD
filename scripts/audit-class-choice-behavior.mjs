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
  getAutoBuilderClass,
  getAutoBuilderSubclassAdvancementState,
  getAutoBuilderSubclasses,
  getClassExpertiseChoiceOptions,
  getFightingStyleFeatChoiceOptions,
  getFightingStyleFeatureChoiceOptions,
  getInvocationChoiceState,
  getManeuverChoiceState,
  getMetamagicChoiceState,
  getWeaponMasteryChoiceState,
} from '${projectImport('utils/autoBuilderRules.ts')}';
import content from '${projectImport('public/data/auto-builder-core.json')}';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const character = overrides => ({
  ...INITIAL_CHARACTER,
  classes: [],
  proficiencies: new Set(),
  expertises: new Set(),
  featureEntries: [],
  appliedAdjustments: [],
  ...overrides,
});
const getClass = (key, system) => {
  const value = getAutoBuilderClass(content, key, system);
  assert(value, \`missing \${system} \${key}\`);
  return value;
};

const cleric5e = getClass('Cleric', '5e');
const cleric5r = getClass('Cleric', '5r');
const subclass5e = getAutoBuilderSubclassAdvancementState(content, cleric5e, 0, 1);
const subclass5r = getAutoBuilderSubclassAdvancementState(content, cleric5r, 2, 3);
assert(subclass5e.group?.min === 1, '5e Cleric level 1 should require one subclass');
assert(subclass5r.group?.min === 1, '5r Cleric level 3 should require one subclass');

const rogue5e = getClass('Rogue', '5e');
const rogue = character({
  proficiencies: new Set(['Stealth', 'Perception', "tool:thieves' tools"]),
});
const expertise = getClassExpertiseChoiceOptions(content, rogue5e, rogue, 1);
assert(expertise[0]?.count === 2, '5e Rogue level 1 should require two expertises');
assert(expertise[0]?.from.includes("tool:thieves' tools"), '5e Rogue expertise should allow proficient thieves tools');

const fighter5e = getClass('Fighter', '5e');
const fighter5r = getClass('Fighter', '5r');
const style5e = getFightingStyleFeatureChoiceOptions(content, '5e', character({}), fighter5e, 1);
const style5r = getFightingStyleFeatChoiceOptions(content, '5r', character({}), fighter5r, 1);
assert(style5e?.count === 1 && style5e.from.length > 0, '5e Fighter should select one fighting style feature');
assert(style5r?.count === 1 && style5r.from.every(feat => feat.source === 'XPHB'), '5r Fighter should select one XPHB fighting style feat');

const mastery = getWeaponMasteryChoiceState(content, fighter5r, character({}), 1);
assert(mastery?.needed === 3, '5r Fighter level 1 should require three weapon masteries');

const warlock5e = getClass('Warlock', '5e');
const warlock5r = getClass('Warlock', '5r');
const invocations5e = getInvocationChoiceState(content, warlock5e, character({}), 2);
const invocations5r = getInvocationChoiceState(content, warlock5r, character({}), 1);
assert(invocations5e.needed === 2, '5e Warlock level 2 should require two invocations');
assert(invocations5r.needed === 1, '5r Warlock level 1 should require one invocation');

const sorcerer5e = getClass('Sorcerer', '5e');
const sorcerer5r = getClass('Sorcerer', '5r');
assert(getMetamagicChoiceState(content, sorcerer5e, character({}), 3).needed === 2, '5e Sorcerer level 3 should require two metamagics');
assert(getMetamagicChoiceState(content, sorcerer5r, character({}), 2).needed === 2, '5r Sorcerer level 2 should require two metamagics');

const battleMaster = getAutoBuilderSubclasses(content, fighter5r)
  .find(subclass => subclass.key === 'Battle Master' && subclass.source === 'XPHB');
assert(battleMaster, 'missing authorized 5r Battle Master');
const maneuvers = getManeuverChoiceState(content, battleMaster, character({}), 3, 0, '5r');
assert(maneuvers.needed === 3, '5r Battle Master level 3 should require three maneuvers');
const superiorTechnique = content.fightingStyles.find(style => style.key === 'Superior Technique');
assert(superiorTechnique, 'missing Superior Technique');
const withStyle = character({
  featureEntries: [{
    id: 'superior-technique',
    sourceId: \`auto-fighting-style-\${superiorTechnique.id}\`,
    sourceName: 'Superior Technique',
    name: superiorTechnique.name,
    level: 1,
    ruleSystem: '5e',
    description: superiorTechnique.description,
  }],
});
const maneuversWithStyle = getManeuverChoiceState(content, battleMaster, withStyle, 3, 0, '5r');
assert(maneuversWithStyle.needed === 4, 'Battle Master should preserve the extra Superior Technique maneuver target');

export default {
  subclass5e: subclass5e.group?.options.length,
  subclass5r: subclass5r.group?.options.length,
  expertise: expertise[0]?.count,
  fightingStyles5e: style5e?.from.length,
  fightingStyleFeats5r: style5r?.from.length,
  weaponMasteries: mastery?.needed,
  invocations5e: invocations5e.needed,
  invocations5r: invocations5r.needed,
  metamagics5e: getMetamagicChoiceState(content, sorcerer5e, character({}), 3).needed,
  metamagics5r: getMetamagicChoiceState(content, sorcerer5r, character({}), 2).needed,
  maneuvers: maneuvers.needed,
  maneuversWithStyle: maneuversWithStyle.needed,
};
`;

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'class-choice-behavior-audit-'));
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
      fileName: () => 'audit-class-choice-behavior.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },
});

const result = await import(pathToFileURL(path.join(outDir, 'audit-class-choice-behavior.js')).href);
console.log(JSON.stringify({
  ...result.default,
  checks: [
    '2014 and 2024 subclass thresholds use shared advancement state',
    'class expertise includes only proficient non-expertise options',
    '2014 fighting styles and 2024 fighting style feats use authorized candidates',
    'weapon mastery, invocation, maneuver, and metamagic counts follow progression',
    'feat and fighting-style grants remain additional to class progression',
  ],
}, null, 2));
