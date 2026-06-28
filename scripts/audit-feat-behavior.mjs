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
  buildLevelUpCharacter,
  getFeatExpertiseChoiceOptions,
  getFeatSavingThrowChoiceOptions,
  getFeatSkillChoiceOptions,
} from '${projectImport('utils/autoBuilderRules.ts')}';
import content from '${projectImport('public/data/auto-builder-core.json')}';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const getClass = (key, source) => {
  const cls = content.classes.find(item => item.key === key && item.source === source);
  assert(cls, \`missing class \${key}|\${source}\`);
  return cls;
};

const getFeat = (key, source) => {
  const feat = content.feats.find(item => item.key === key && item.source === source);
  assert(feat, \`missing feat \${key}|\${source}\`);
  return feat;
};

const makeLevelThreeWizard = () => ({
  ...INITIAL_CHARACTER,
  abilities: { ...INITIAL_CHARACTER.abilities, STR: 10, DEX: 13, CON: 13, INT: 16, WIS: 12, CHA: 8 },
  classes: [{ id: 'auto-class-main', name: 'Wizard', level: 3, subclass: '', source: 'XPHB' }],
  proficiencies: new Set(['INT', 'WIS']),
  expertises: new Set(),
  featureEntries: [],
  appliedAdjustments: [],
});

const wizard = getClass('Wizard', 'XPHB');

const lightlyArmored = getFeat('Lightly Armored', 'XPHB');
const lightlyArmoredCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Lightly Armored|XPHB',
    featAbility: 'DEX',
  },
});
assert(lightlyArmoredCharacter.abilities.DEX === 14, \`Lightly Armored should add +1 DEX, got \${lightlyArmoredCharacter.abilities.DEX}\`);
assert(lightlyArmoredCharacter.proficiencies.has('armor:light'), 'Lightly Armored should add light armor proficiency');
assert(lightlyArmoredCharacter.proficiencies.has('armor:shield'), 'Lightly Armored should add shield proficiency');
assert(lightlyArmoredCharacter.featureEntries.some(feature => feature.sourceId === 'auto-feat-Lightly Armored-XPHB'), 'Lightly Armored should add its feat feature entry');

const resilient = getFeat('Resilient', 'XPHB');
const resilientSavingChoices = getFeatSavingThrowChoiceOptions(resilient);
assert(resilientSavingChoices.length === 1, \`Resilient should expose one saving throw choice group, got \${resilientSavingChoices.length}\`);
assert(resilientSavingChoices[0].from.includes('CON'), \`Resilient saving throw choices should include CON, got \${resilientSavingChoices[0].from.join(', ')}\`);
const resilientCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Resilient|XPHB',
    featAbility: 'CON',
    featSavingThrowChoices: {
      [resilientSavingChoices[0].id]: ['CON'],
    },
  },
});
assert(resilientCharacter.abilities.CON === 14, \`Resilient should add +1 CON, got \${resilientCharacter.abilities.CON}\`);
assert(resilientCharacter.proficiencies.has('CON'), 'Resilient should add selected saving throw proficiency');

const skillExpert = getFeat('Skill Expert', 'XPHB');
const skillChoices = getFeatSkillChoiceOptions(skillExpert);
assert(skillChoices.length === 1, \`Skill Expert should expose one skill choice group, got \${skillChoices.length}\`);
assert(skillChoices[0].from.includes('Perception'), 'Skill Expert skill choices should include Perception');
const expertiseChoices = getFeatExpertiseChoiceOptions(skillExpert, makeLevelThreeWizard(), {
  [skillChoices[0].id]: ['Perception'],
});
assert(expertiseChoices.length === 1, \`Skill Expert should expose one expertise choice group, got \${expertiseChoices.length}\`);
assert(expertiseChoices[0].from.includes('Perception'), 'Skill Expert expertise choices should include newly selected skill');
const skillExpertCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Skill Expert|XPHB',
    featAbility: 'DEX',
    featSkillChoices: {
      [skillChoices[0].id]: ['Perception'],
    },
    featExpertiseChoices: {
      [expertiseChoices[0].id]: ['Perception'],
    },
  },
});
assert(skillExpertCharacter.abilities.DEX === 14, \`Skill Expert should add +1 DEX, got \${skillExpertCharacter.abilities.DEX}\`);
assert(skillExpertCharacter.proficiencies.has('Perception'), 'Skill Expert should add selected skill proficiency');
assert(skillExpertCharacter.expertises.has('Perception'), 'Skill Expert should add selected expertise');

export default {
  feats: [lightlyArmored.name, resilient.name, skillExpert.name],
  checks: [
    'Lightly Armored applies ability, armor, and shield proficiencies',
    'Resilient exposes and applies selected saving throw proficiency',
    'Skill Expert applies ability, skill proficiency, and expertise',
  ],
};
`;

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'feat-behavior-audit-'));
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
      fileName: () => 'audit-feat-behavior.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },
});

const result = await import(pathToFileURL(path.join(outDir, 'audit-feat-behavior.js')).href);

console.log(JSON.stringify(result.default, null, 2));
