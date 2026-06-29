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
  getFeatWeaponChoiceOptions,
} from '${projectImport('utils/autoBuilderRules.ts')}';
import { equipWeapon } from '${projectImport('utils/equipmentRules.ts')}';
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
const phbWizard = getClass('Wizard', 'PHB');
const battleaxe = content.weapons.find(item => item.key === 'Battleaxe' && item.source === 'PHB');
const xphbBattleaxe = content.weapons.find(item => item.key === 'Battleaxe' && item.source === 'XPHB');
assert(battleaxe, 'missing PHB Battleaxe');
assert(xphbBattleaxe, 'missing XPHB Battleaxe');

const lightlyArmored = getFeat('Lightly Armored', 'XPHB');
const phbLucky = getFeat('Lucky', 'PHB');
const xphbLucky = getFeat('Lucky', 'XPHB');
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

const phbLuckyCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Lucky|PHB',
  },
});
const phbLuckyResource = phbLuckyCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Lucky-PHB-luck-points');
assert(phbLuckyResource?.max === 3, \`PHB Lucky should add 3 luck points, got \${phbLuckyResource?.max}\`);
assert(phbLuckyResource?.reset === 'longRest', \`PHB Lucky should recover on long rest, got \${phbLuckyResource?.reset}\`);

const xphbLuckyCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Lucky|XPHB',
  },
});
const xphbLuckyResource = xphbLuckyCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Lucky-XPHB-luck-points');
assert(xphbLuckyResource?.max === 2, \`XPHB Lucky at total level 4 should add proficiency bonus luck points, got \${xphbLuckyResource?.max}\`);
const xphbLuckyLevelFive = buildLevelUpCharacter(xphbLuckyCharacter, content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
});
const xphbLuckyLevelFiveResource = xphbLuckyLevelFive.resources.find(resource => resource.id === 'auto-resource-feat-Lucky-XPHB-luck-points');
assert(xphbLuckyLevelFiveResource?.max === 3, \`XPHB Lucky at total level 5 should refresh to proficiency bonus 3, got \${xphbLuckyLevelFiveResource?.max}\`);

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

const weaponMaster = getFeat('Weapon Master', 'PHB');
const weaponMasterChoices = getFeatWeaponChoiceOptions(content, weaponMaster, '5e');
assert(weaponMasterChoices.length === 1, \`Weapon Master should expose one weapon choice group, got \${weaponMasterChoices.length}\`);
assert(weaponMasterChoices[0].count === 4, \`Weapon Master should choose four weapons, got \${weaponMasterChoices[0].count}\`);
assert(weaponMasterChoices[0].from.includes(battleaxe.id), 'Weapon Master choices should include battleaxe');
const weaponMaster5rChoices = getFeatWeaponChoiceOptions(content, weaponMaster, '5r');
assert(
  weaponMaster5rChoices[0].from.includes(xphbBattleaxe.id) && !weaponMaster5rChoices[0].from.includes(battleaxe.id),
  'Weapon Master 5r weapon choices should prefer XPHB battleaxe over PHB duplicate',
);
const selectedWeaponMasterIds = [
  battleaxe.id,
  ...weaponMasterChoices[0].from.filter(id => id !== battleaxe.id).slice(0, 3),
];
assert(selectedWeaponMasterIds.length === 4, 'Weapon Master should have at least four selectable weapons');
const weaponMasterCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Weapon Master|PHB',
    featAbility: 'DEX',
    featWeaponChoices: {
      [weaponMasterChoices[0].id]: selectedWeaponMasterIds,
    },
  },
});
assert(weaponMasterCharacter.proficiencies.has('weapon:battleaxe'), 'Weapon Master should add selected battleaxe proficiency');
const weaponMasterWithBattleaxe = equipWeapon(weaponMasterCharacter, battleaxe, content);
const battleaxeAttack = weaponMasterWithBattleaxe.attacks.find(attack => attack.sourceId === \`equip-weapon-\${battleaxe.id}\`);
assert(battleaxeAttack, 'Weapon Master character should add battleaxe attack');
assert(
  battleaxeAttack.bonus === '+2',
  \`Weapon Master battleaxe attack should include proficiency bonus with STR 10, got \${battleaxeAttack.bonus}\`,
);

export default {
  feats: [lightlyArmored.name, phbLucky.name, xphbLucky.name, resilient.name, skillExpert.name, weaponMaster.name],
  checks: [
    'Lightly Armored applies ability, armor, and shield proficiencies',
    'PHB Lucky adds fixed long-rest luck point resource',
    'XPHB Lucky adds and refreshes proficiency-based luck point resource',
    'Resilient exposes and applies selected saving throw proficiency',
    'Skill Expert applies ability, skill proficiency, and expertise',
    'Weapon Master exposes and applies selected weapon proficiencies',
    'Weapon Master 5r weapon choices prefer XPHB duplicates',
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
