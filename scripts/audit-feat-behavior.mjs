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
  getFeatLanguageChoiceOptions,
  getFeatManeuverChoiceState,
  getFeatMetamagicChoiceState,
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
const phbHeavilyArmored = getFeat('Heavily Armored', 'PHB');
const xphbHeavilyArmored = getFeat('Heavily Armored', 'XPHB');
const phbModeratelyArmored = getFeat('Moderately Armored', 'PHB');
const xphbModeratelyArmored = getFeat('Moderately Armored', 'XPHB');
const martialWeaponTraining = getFeat('Martial Weapon Training', 'XPHB');
const phbTavernBrawler = getFeat('Tavern Brawler', 'PHB');
const xphbTavernBrawler = getFeat('Tavern Brawler', 'XPHB');
const gunner = getFeat('Gunner', 'TCE');
const linguist = getFeat('Linguist', 'PHB');
const xphbObservant = getFeat('Observant', 'XPHB');
const phbLucky = getFeat('Lucky', 'PHB');
const xphbLucky = getFeat('Lucky', 'XPHB');
const tceChef = getFeat('Chef', 'TCE');
const xphbChef = getFeat('Chef', 'XPHB');
const tcePoisoner = getFeat('Poisoner', 'TCE');
const xphbPoisoner = getFeat('Poisoner', 'XPHB');
const squireOfSolamnia = getFeat('Squire of Solamnia', 'DSotDQ');
const knightOfTheCrown = getFeat('Knight of the Crown', 'DSotDQ');
const knightOfTheRose = getFeat('Knight of the Rose', 'DSotDQ');
const knightOfTheSword = getFeat('Knight of the Sword', 'DSotDQ');
const cartomancer = getFeat('Cartomancer', 'BMT');
const planarWanderer = getFeat('Planar Wanderer', 'SatO');
const runeShaper = getFeat('Rune Shaper', 'BGG');
const martialAdept = getFeat('Martial Adept', 'PHB');
const metamagicAdept = getFeat('Metamagic Adept', 'TCE');
const chromaticGift = getFeat('Gift of the Chromatic Dragon', 'FTD');
const gemGift = getFeat('Gift of the Gem Dragon', 'FTD');
const metallicGift = getFeat('Gift of the Metallic Dragon', 'FTD');
const emberFireGiant = getFeat('Ember of the Fire Giant', 'BGG');
const frostGiantFury = getFeat('Fury of the Frost Giant', 'BGG');
const cloudGiantGuile = getFeat('Guile of the Cloud Giant', 'BGG');
const stoneGiantKeenness = getFeat('Keenness of the Stone Giant', 'BGG');
const stormGiantSoul = getFeat('Soul of the Storm Giant', 'BGG');
const agentOfOrder = getFeat('Agent of Order', 'SatO');
const balefulScion = getFeat('Baleful Scion', 'SatO');
const righteousHeritor = getFeat('Righteous Heritor', 'SatO');
const outlandsEnvoy = getFeat('Outlands Envoy', 'SatO');
const telepathic = getFeat('Telepathic', 'XPHB');
const boonOfRecovery = getFeat('Boon of Recovery', 'XPHB');
const boonOfFate = getFeat('Boon of Fate', 'XPHB');
const boonOfFortitude = getFeat('Boon of Fortitude', 'XPHB');
const boonOfSpeed = getFeat('Boon of Speed', 'XPHB');
const boonOfTruesight = getFeat('Boon of Truesight', 'XPHB');
const boonOfSkill = getFeat('Boon of Skill', 'XPHB');
const squatNimbleness = getFeat('Squat Nimbleness', 'XGE');
const ritualCaster = getFeat('Ritual Caster', 'XPHB');
const tceFeyTouched = getFeat('Fey Touched', 'TCE');
const xphbFeyTouched = getFeat('Fey-Touched', 'XPHB');
const tceShadowTouched = getFeat('Shadow Touched', 'TCE');
const xphbShadowTouched = getFeat('Shadow-Touched', 'XPHB');
const drowHighMagic = getFeat('Drow High Magic', 'XGE');
const feyTeleportation = getFeat('Fey Teleportation', 'XGE');
const xphbMageSlayer = getFeat('Mage Slayer', 'XPHB');
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

const phbHeavilyArmoredCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Heavily Armored|PHB',
  },
});
assert(phbHeavilyArmoredCharacter.abilities.STR === 11, 'PHB Heavily Armored should add +1 STR, got ' + phbHeavilyArmoredCharacter.abilities.STR);
assert(phbHeavilyArmoredCharacter.proficiencies.has('armor:heavy'), 'PHB Heavily Armored should add heavy armor proficiency');

const xphbHeavilyArmoredCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Heavily Armored|XPHB',
    featAbility: 'CON',
  },
});
assert(xphbHeavilyArmoredCharacter.abilities.CON === 14, 'XPHB Heavily Armored should add +1 CON, got ' + xphbHeavilyArmoredCharacter.abilities.CON);
assert(xphbHeavilyArmoredCharacter.proficiencies.has('armor:heavy'), 'XPHB Heavily Armored should add heavy armor proficiency');

const phbModeratelyArmoredCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Moderately Armored|PHB',
    featAbility: 'DEX',
  },
});
assert(phbModeratelyArmoredCharacter.abilities.DEX === 14, 'PHB Moderately Armored should add +1 DEX, got ' + phbModeratelyArmoredCharacter.abilities.DEX);
assert(phbModeratelyArmoredCharacter.proficiencies.has('armor:medium'), 'PHB Moderately Armored should add medium armor proficiency');
assert(phbModeratelyArmoredCharacter.proficiencies.has('armor:shield'), 'PHB Moderately Armored should add shield proficiency');

const xphbModeratelyArmoredCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Moderately Armored|XPHB',
    featAbility: 'STR',
  },
});
assert(xphbModeratelyArmoredCharacter.abilities.STR === 11, 'XPHB Moderately Armored should add +1 STR, got ' + xphbModeratelyArmoredCharacter.abilities.STR);
assert(xphbModeratelyArmoredCharacter.proficiencies.has('armor:medium'), 'XPHB Moderately Armored should add medium armor proficiency');

const martialWeaponTrainingCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Martial Weapon Training|XPHB',
    featAbility: 'DEX',
  },
});
assert(martialWeaponTrainingCharacter.abilities.DEX === 14, 'XPHB Martial Weapon Training should add +1 DEX, got ' + martialWeaponTrainingCharacter.abilities.DEX);
assert(martialWeaponTrainingCharacter.proficiencies.has('weapon:martial'), 'XPHB Martial Weapon Training should add martial weapon proficiency');

const phbTavernBrawlerCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Tavern Brawler|PHB',
    featAbility: 'STR',
  },
});
assert(phbTavernBrawlerCharacter.abilities.STR === 11, 'PHB Tavern Brawler should add +1 STR, got ' + phbTavernBrawlerCharacter.abilities.STR);
assert(phbTavernBrawlerCharacter.proficiencies.has('weapon:improvised'), 'PHB Tavern Brawler should add improvised weapon proficiency');

const xphbTavernBrawlerCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Tavern Brawler|XPHB',
  },
});
assert(xphbTavernBrawlerCharacter.proficiencies.has('weapon:improvised'), 'XPHB Tavern Brawler should add improvised weapon proficiency');

const gunnerCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Gunner|TCE',
  },
});
assert(gunnerCharacter.abilities.DEX === 14, 'TCE Gunner should add +1 DEX, got ' + gunnerCharacter.abilities.DEX);
assert(gunnerCharacter.proficiencies.has('weapon:firearms'), 'TCE Gunner should add firearms proficiency');

const linguistLanguageChoices = getFeatLanguageChoiceOptions(linguist);
assert(linguistLanguageChoices.length === 1, 'PHB Linguist should expose one language choice group');
assert(linguistLanguageChoices[0].count === 3, 'PHB Linguist should require three language choices');
const linguistCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Linguist|PHB',
    featLanguageChoices: {
      [linguistLanguageChoices[0].id]: ['draconic', 'infernal', 'sylvan'],
    },
  },
});
assert(linguistCharacter.abilities.INT === 17, 'PHB Linguist should add +1 INT, got ' + linguistCharacter.abilities.INT);
assert(linguistCharacter.proficiencies.has('language:draconic'), 'PHB Linguist should add selected Draconic language proficiency');
assert(linguistCharacter.proficiencies.has('language:infernal'), 'PHB Linguist should add selected Infernal language proficiency');
assert(linguistCharacter.proficiencies.has('language:sylvan'), 'PHB Linguist should add selected Sylvan language proficiency');

const observantSkillChoices = getFeatSkillChoiceOptions(xphbObservant);
assert(observantSkillChoices.length === 1, 'XPHB Observant should expose one skill choice group');
assert(observantSkillChoices[0].from.includes('Perception'), 'XPHB Observant skill choices should include Perception');
const observantBaseCharacter = {
  ...makeLevelThreeWizard(),
  proficiencies: new Set(['INT', 'WIS', 'Perception']),
};
const observantCharacter = buildLevelUpCharacter(observantBaseCharacter, content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Observant|XPHB',
    featAbility: 'WIS',
    featSkillChoices: {
      [observantSkillChoices[0].id]: ['Perception'],
    },
  },
});
assert(observantCharacter.abilities.WIS === 13, 'XPHB Observant should add +1 WIS, got ' + observantCharacter.abilities.WIS);
assert(observantCharacter.proficiencies.has('Perception'), 'XPHB Observant should preserve selected skill proficiency');
assert(observantCharacter.expertises.has('Perception'), 'XPHB Observant should add expertise when selected skill is already proficient');

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

const tceChefCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Chef|TCE',
    featAbility: 'WIS',
  },
});
const tceChefResource = tceChefCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Chef-TCE-chef-treats');
assert(tceChefResource?.name === '餐点', \`TCE Chef resource should be named 餐点, got \${tceChefResource?.name}\`);
assert(tceChefResource?.max === 2, \`TCE Chef at total level 4 should add proficiency bonus treats, got \${tceChefResource?.max}\`);
assert(tceChefCharacter.proficiencies.has("tool:cook's utensils"), 'TCE Chef should add cook\\'s utensils proficiency');
const tceChefLevelFive = buildLevelUpCharacter(tceChefCharacter, content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
});
const tceChefLevelFiveResource = tceChefLevelFive.resources.find(resource => resource.id === 'auto-resource-feat-Chef-TCE-chef-treats');
assert(tceChefLevelFiveResource?.max === 3, \`TCE Chef at total level 5 should refresh treats to proficiency bonus 3, got \${tceChefLevelFiveResource?.max}\`);

const xphbChefCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Chef|XPHB',
    featAbility: 'WIS',
  },
});
const xphbChefResource = xphbChefCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Chef-XPHB-chef-treats');
assert(xphbChefResource?.name === '应急零嘴', \`XPHB Chef resource should be named 应急零嘴, got \${xphbChefResource?.name}\`);
assert(xphbChefResource?.max === 2, \`XPHB Chef at total level 4 should add proficiency bonus treats, got \${xphbChefResource?.max}\`);
assert(xphbChefCharacter.proficiencies.has("tool:cook's utensils"), 'XPHB Chef should add cook\\'s utensils proficiency');
const xphbChefLevelFive = buildLevelUpCharacter(xphbChefCharacter, content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
});
const xphbChefLevelFiveResource = xphbChefLevelFive.resources.find(resource => resource.id === 'auto-resource-feat-Chef-XPHB-chef-treats');
assert(xphbChefLevelFiveResource?.max === 3, \`XPHB Chef at total level 5 should refresh treats to proficiency bonus 3, got \${xphbChefLevelFiveResource?.max}\`);

const assertPoisonerResource = ({ featId, classDefinition, ruleSystem, ability, resourceId, label, expectedTool }) => {
  const characterWithFeat = buildLevelUpCharacter(makeLevelThreeWizard(), content, classDefinition, {
    ruleSystem,
    spellChoices: { cantrips: [], leveled: [] },
    abilityScoreImprovementChoice: {
      mode: 'feat',
      featId,
      featAbility: ability,
    },
  });
  assert(characterWithFeat.proficiencies.has(expectedTool), \`\${label} should add poisoner's kit proficiency\`);
  const levelFourResource = characterWithFeat.resources.find(resource => resource.id === resourceId);
  assert(levelFourResource?.max === 2, \`\${label} at total level 4 should add proficiency bonus poison doses, got \${levelFourResource?.max}\`);
  assert(levelFourResource?.reset === 'manual', \`\${label} poison doses should use manual reset, got \${levelFourResource?.reset}\`);
  assert(levelFourResource?.note?.includes('材料'), \`\${label} poison resource note should mention materials, got \${levelFourResource?.note}\`);
  const levelFiveCharacter = buildLevelUpCharacter(characterWithFeat, content, classDefinition, {
    ruleSystem,
    spellChoices: { cantrips: [], leveled: [] },
  });
  const levelFiveResource = levelFiveCharacter.resources.find(resource => resource.id === resourceId);
  assert(levelFiveResource?.max === 3, \`\${label} at total level 5 should refresh poison doses to proficiency bonus 3, got \${levelFiveResource?.max}\`);
};

assertPoisonerResource({
  featId: 'Poisoner|TCE',
  classDefinition: phbWizard,
  ruleSystem: '5e',
  ability: 'DEX',
  resourceId: 'auto-resource-feat-Poisoner-TCE-poison-doses',
  label: 'TCE Poisoner',
  expectedTool: "tool:poisoner's kit",
});
assertPoisonerResource({
  featId: 'Poisoner|XPHB',
  classDefinition: wizard,
  ruleSystem: '5r',
  ability: 'INT',
  resourceId: 'auto-resource-feat-Poisoner-XPHB-poison-doses',
  label: 'XPHB Poisoner',
  expectedTool: "tool:poisoner's kit",
});

const squireCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Squire of Solamnia|DSotDQ',
  },
});
const squireResource = squireCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Squire of Solamnia-DSotDQ-precise-strike');
assert(squireResource?.max === 2, \`Squire of Solamnia at total level 4 should add proficiency bonus Precise Strike uses, got \${squireResource?.max}\`);
assert(squireResource?.note?.includes('命中'), \`Squire of Solamnia resource note should mention hit-only consumption, got \${squireResource?.note}\`);
const squireLevelFive = buildLevelUpCharacter(squireCharacter, content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
});
const squireLevelFiveResource = squireLevelFive.resources.find(resource => resource.id === 'auto-resource-feat-Squire of Solamnia-DSotDQ-precise-strike');
assert(squireLevelFiveResource?.max === 3, \`Squire of Solamnia at total level 5 should refresh Precise Strike to proficiency bonus 3, got \${squireLevelFiveResource?.max}\`);

const cartomancerCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Cartomancer|BMT',
  },
});
const cartomancerResource = cartomancerCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Cartomancer-BMT-hidden-ace');
assert(cartomancerResource?.max === 1, \`Cartomancer should add one Hidden Ace resource, got \${cartomancerResource?.max}\`);
assert(cartomancerResource?.reset === 'longRest', \`Cartomancer Hidden Ace should recover on long rest, got \${cartomancerResource?.reset}\`);
assert(cartomancerResource?.note?.includes('8 小时'), \`Cartomancer resource note should mention 8-hour duration, got \${cartomancerResource?.note}\`);
const cartomancerProfile = cartomancerCharacter.spellcastingProfiles.find(profile => profile.id === 'auto-feat-Cartomancer-BMT-spells');
assert(
  cartomancerProfile?.spells.some(spell => spell.name === '魔法伎俩' && spell.prepared),
  'Cartomancer should add prepared Prestidigitation feat spell',
);

const planarWandererCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Planar Wanderer|SatO',
  },
});
const planarWandererResource = planarWandererCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Planar Wanderer-SatO-portal-sense');
assert(planarWandererResource?.max === 1, \`Planar Wanderer should add one Portal Sense resource, got \${planarWandererResource?.max}\`);
assert(planarWandererResource?.reset === 'longRest', \`Planar Wanderer Portal Sense should recover on long rest, got \${planarWandererResource?.reset}\`);
assert(planarWandererResource?.note?.includes('30 尺'), \`Planar Wanderer resource note should mention 30-foot range, got \${planarWandererResource?.note}\`);

const runeShaperCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Rune Shaper|BGG',
    featSpellAbility: 'WIS',
  },
});
const runeShaperResource = runeShaperCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Rune Shaper-BGG-rune-magic');
assert(runeShaperResource?.max === 1, \`Rune Shaper should add one Rune Magic resource, got \${runeShaperResource?.max}\`);
assert(runeShaperResource?.reset === 'longRest', \`Rune Shaper Rune Magic should recover on long rest, got \${runeShaperResource?.reset}\`);
assert(runeShaperResource?.note?.includes('无需材料成分'), \`Rune Shaper resource note should mention no material components, got \${runeShaperResource?.note}\`);
const runeShaperProfile = runeShaperCharacter.spellcastingProfiles.find(profile => profile.id === 'auto-feat-Rune Shaper-BGG-spells');
assert(
  runeShaperProfile?.spells.some(spell => spell.name === '通晓语言' && spell.prepared),
  'Rune Shaper should add prepared Comprehend Languages feat spell',
);

const martialAdeptChoices = getFeatManeuverChoiceState(content, martialAdept, makeLevelThreeWizard(), '5e');
assert(martialAdeptChoices?.needed === 2, \`Martial Adept should require two maneuvers, got \${martialAdeptChoices?.needed}\`);
assert(martialAdeptChoices.options.some(maneuver => maneuver.id === '反击|PHB'), 'Martial Adept should expose PHB Riposte');
const selectedManeuvers = martialAdeptChoices.options.slice(0, 2).map(maneuver => maneuver.id);
assert(selectedManeuvers.length === 2, 'Martial Adept should have at least two maneuver options');
const martialAdeptCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Martial Adept|PHB',
    featManeuvers: selectedManeuvers,
  },
});
const martialAdeptResource = martialAdeptCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Martial Adept-PHB-superiority-die');
assert(martialAdeptResource?.max === 1, \`Martial Adept should add one superiority die resource, got \${martialAdeptResource?.max}\`);
assert(martialAdeptResource?.reset === 'shortRest', \`Martial Adept superiority die should recover on short rest, got \${martialAdeptResource?.reset}\`);
assert(
  selectedManeuvers.every(id => martialAdeptCharacter.featureEntries.some(feature => feature.sourceId === \`auto-maneuver-\${id}\`)),
  'Martial Adept should add selected maneuver features',
);

const metamagicAdeptChoices = getFeatMetamagicChoiceState(content, metamagicAdept, makeLevelThreeWizard(), '5e');
assert(metamagicAdeptChoices?.needed === 2, \`Metamagic Adept should require two metamagics, got \${metamagicAdeptChoices?.needed}\`);
assert(metamagicAdeptChoices.options.some(metamagic => metamagic.id === '谨慎法术|PHB'), 'Metamagic Adept should expose PHB Careful Spell');
const selectedMetamagics = metamagicAdeptChoices.options.slice(0, 2).map(metamagic => metamagic.id);
assert(selectedMetamagics.length === 2, 'Metamagic Adept should have at least two metamagic options');
const metamagicAdeptCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Metamagic Adept|TCE',
    featMetamagics: selectedMetamagics,
  },
});
const metamagicAdeptResource = metamagicAdeptCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Metamagic Adept-TCE-sorcery-points');
assert(metamagicAdeptResource?.max === 2, \`Metamagic Adept should add two feat sorcery points, got \${metamagicAdeptResource?.max}\`);
assert(metamagicAdeptResource?.reset === 'longRest', \`Metamagic Adept sorcery points should recover on long rest, got \${metamagicAdeptResource?.reset}\`);
assert(
  selectedMetamagics.every(id => metamagicAdeptCharacter.featureEntries.some(feature => feature.sourceId === \`auto-metamagic-\${id}\`)),
  'Metamagic Adept should add selected metamagic features',
);

const chromaticGiftCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Gift of the Chromatic Dragon|FTD',
  },
});
const chromaticInfusionResource = chromaticGiftCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Gift of the Chromatic Dragon-FTD-chromatic-infusion');
const chromaticResistanceResource = chromaticGiftCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Gift of the Chromatic Dragon-FTD-reactive-resistance');
assert(chromaticInfusionResource?.max === 1, \`Gift of the Chromatic Dragon should add one Chromatic Infusion use, got \${chromaticInfusionResource?.max}\`);
assert(chromaticResistanceResource?.max === 2, \`Gift of the Chromatic Dragon at total level 4 should add proficiency bonus reactive resistance uses, got \${chromaticResistanceResource?.max}\`);
const chromaticGiftLevelFive = buildLevelUpCharacter(chromaticGiftCharacter, content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
});
const chromaticLevelFiveResistanceResource = chromaticGiftLevelFive.resources.find(resource => resource.id === 'auto-resource-feat-Gift of the Chromatic Dragon-FTD-reactive-resistance');
assert(chromaticLevelFiveResistanceResource?.max === 3, \`Gift of the Chromatic Dragon at total level 5 should refresh reactive resistance to proficiency bonus 3, got \${chromaticLevelFiveResistanceResource?.max}\`);

const gemGiftCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Gift of the Gem Dragon|FTD',
    featAbility: 'INT',
  },
});
const gemGiftResource = gemGiftCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Gift of the Gem Dragon-FTD-telekinetic-reprisal');
assert(gemGiftResource?.max === 2, \`Gift of the Gem Dragon at total level 4 should add proficiency bonus reprisal uses, got \${gemGiftResource?.max}\`);
const gemGiftLevelFive = buildLevelUpCharacter(gemGiftCharacter, content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
});
const gemLevelFiveResource = gemGiftLevelFive.resources.find(resource => resource.id === 'auto-resource-feat-Gift of the Gem Dragon-FTD-telekinetic-reprisal');
assert(gemLevelFiveResource?.max === 3, \`Gift of the Gem Dragon at total level 5 should refresh reprisal to proficiency bonus 3, got \${gemLevelFiveResource?.max}\`);

const metallicGiftCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Gift of the Metallic Dragon|FTD',
    featSpellAbility: 'WIS',
  },
});
const metallicGiftResource = metallicGiftCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Gift of the Metallic Dragon-FTD-protective-wings');
assert(metallicGiftResource?.max === 2, \`Gift of the Metallic Dragon at total level 4 should add proficiency bonus Protective Wings uses, got \${metallicGiftResource?.max}\`);
const metallicGiftProfile = metallicGiftCharacter.spellcastingProfiles.find(profile => profile.id === 'auto-feat-Gift of the Metallic Dragon-FTD-spells');
assert(
  metallicGiftProfile?.ability === 'WIS'
    && metallicGiftProfile.spells.some(spell => spell.name === '疗伤术' && spell.prepared),
  'Gift of the Metallic Dragon should add prepared Cure Wounds spell',
);
const metallicGiftLevelFive = buildLevelUpCharacter(metallicGiftCharacter, content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
});
const metallicLevelFiveResource = metallicGiftLevelFive.resources.find(resource => resource.id === 'auto-resource-feat-Gift of the Metallic Dragon-FTD-protective-wings');
assert(metallicLevelFiveResource?.max === 3, \`Gift of the Metallic Dragon at total level 5 should refresh Protective Wings to proficiency bonus 3, got \${metallicLevelFiveResource?.max}\`);

const emberFireGiantCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Ember of the Fire Giant|BGG',
    featAbility: 'WIS',
  },
});
assert(
  emberFireGiantCharacter.damageResistances.includes('火焰'),
  \`Ember of the Fire Giant should add fire resistance, got \${emberFireGiantCharacter.damageResistances.join(', ')}\`,
);
const emberFireGiantResource = emberFireGiantCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Ember of the Fire Giant-BGG-searing-ignition');
assert(emberFireGiantResource?.max === 2, \`Ember of the Fire Giant at total level 4 should add proficiency bonus Searing Ignition uses, got \${emberFireGiantResource?.max}\`);
const emberFireGiantLevelFive = buildLevelUpCharacter(emberFireGiantCharacter, content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
});
const emberLevelFiveResource = emberFireGiantLevelFive.resources.find(resource => resource.id === 'auto-resource-feat-Ember of the Fire Giant-BGG-searing-ignition');
assert(emberLevelFiveResource?.max === 3, \`Ember of the Fire Giant at total level 5 should refresh Searing Ignition to proficiency bonus 3, got \${emberLevelFiveResource?.max}\`);

const assertProficiencyFeatResource = ({ featId, ability = 'WIS', resourceId, label, resistance }) => {
  const characterWithFeat = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
    ruleSystem: '5e',
    spellChoices: { cantrips: [], leveled: [] },
    abilityScoreImprovementChoice: {
      mode: 'feat',
      featId,
      featAbility: ability,
    },
  });
  if (resistance) {
    assert(
      characterWithFeat.damageResistances.includes(resistance),
      \`\${label} should add \${resistance} resistance, got \${characterWithFeat.damageResistances.join(', ')}\`,
    );
  }
  const levelFourResource = characterWithFeat.resources.find(resource => resource.id === resourceId);
  assert(levelFourResource?.max === 2, \`\${label} at total level 4 should add proficiency bonus uses, got \${levelFourResource?.max}\`);
  const levelFiveCharacter = buildLevelUpCharacter(characterWithFeat, content, phbWizard, {
    ruleSystem: '5e',
    spellChoices: { cantrips: [], leveled: [] },
  });
  const levelFiveResource = levelFiveCharacter.resources.find(resource => resource.id === resourceId);
  assert(levelFiveResource?.max === 3, \`\${label} at total level 5 should refresh to proficiency bonus 3, got \${levelFiveResource?.max}\`);
};

assertProficiencyFeatResource({
  featId: 'Fury of the Frost Giant|BGG',
  resourceId: 'auto-resource-feat-Fury of the Frost Giant-BGG-frigid-retaliation',
  label: 'Fury of the Frost Giant',
  resistance: '寒冷',
});
assertProficiencyFeatResource({
  featId: 'Knight of the Crown|DSotDQ',
  ability: 'STR',
  resourceId: 'auto-resource-feat-Knight of the Crown-DSotDQ-commanding-rally',
  label: 'Knight of the Crown',
});
assertProficiencyFeatResource({
  featId: 'Knight of the Rose|DSotDQ',
  ability: 'CHA',
  resourceId: 'auto-resource-feat-Knight of the Rose-DSotDQ-bolstering-rally',
  label: 'Knight of the Rose',
});
assertProficiencyFeatResource({
  featId: 'Knight of the Sword|DSotDQ',
  ability: 'WIS',
  resourceId: 'auto-resource-feat-Knight of the Sword-DSotDQ-demoralizing-strike',
  label: 'Knight of the Sword',
});
assertProficiencyFeatResource({
  featId: 'Guile of the Cloud Giant|BGG',
  ability: 'CHA',
  resourceId: 'auto-resource-feat-Guile of the Cloud Giant-BGG-cloudy-escape',
  label: 'Guile of the Cloud Giant',
});
assertProficiencyFeatResource({
  featId: 'Keenness of the Stone Giant|BGG',
  resourceId: 'auto-resource-feat-Keenness of the Stone Giant-BGG-stone-throw',
  label: 'Keenness of the Stone Giant',
});
assertProficiencyFeatResource({
  featId: 'Soul of the Storm Giant|BGG',
  ability: 'CHA',
  resourceId: 'auto-resource-feat-Soul of the Storm Giant-BGG-maelstrom-aura',
  label: 'Soul of the Storm Giant',
});
assertProficiencyFeatResource({
  featId: 'Agent of Order|SatO',
  ability: 'INT',
  resourceId: 'auto-resource-feat-Agent of Order-SatO-stasis-strike',
  label: 'Agent of Order',
});
assertProficiencyFeatResource({
  featId: 'Baleful Scion|SatO',
  ability: 'CHA',
  resourceId: 'auto-resource-feat-Baleful Scion-SatO-grasp-of-avarice',
  label: 'Baleful Scion',
});
assertProficiencyFeatResource({
  featId: 'Righteous Heritor|SatO',
  resourceId: 'auto-resource-feat-Righteous Heritor-SatO-soothe-pain',
  label: 'Righteous Heritor',
});

const outlandsEnvoyCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Outlands Envoy|SatO',
    featSpellAbility: 'INT',
  },
});
const outlandsMistyStepResource = outlandsEnvoyCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Outlands Envoy-SatO-crossroads-emissary-misty-step');
assert(outlandsMistyStepResource?.max === 1, \`Outlands Envoy should add one Misty Step resource, got \${outlandsMistyStepResource?.max}\`);
assert(outlandsMistyStepResource?.reset === 'longRest', \`Outlands Envoy Misty Step should recover on long rest, got \${outlandsMistyStepResource?.reset}\`);
const outlandsTonguesResource = outlandsEnvoyCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Outlands Envoy-SatO-crossroads-emissary-tongues');
assert(outlandsTonguesResource?.max === 1, \`Outlands Envoy should add one Tongues resource, got \${outlandsTonguesResource?.max}\`);
assert(outlandsTonguesResource?.note?.includes('无需材料成分'), \`Outlands Envoy Tongues note should mention no material components, got \${outlandsTonguesResource?.note}\`);
const outlandsEnvoyProfile = outlandsEnvoyCharacter.spellcastingProfiles.find(profile => profile.id === 'auto-feat-Outlands Envoy-SatO-spells');
assert(
  outlandsEnvoyProfile?.spells.some(spell => spell.name === '迷踪步' && spell.prepared)
    && outlandsEnvoyProfile.spells.some(spell => spell.name === '巧言术' && spell.prepared),
  'Outlands Envoy should add prepared Misty Step and Tongues feat spells',
);

const telepathicCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Telepathic|XPHB',
    featAbility: 'INT',
  },
});
const telepathicResource = telepathicCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Telepathic-XPHB-detect-thoughts');
assert(telepathicResource?.max === 1, \`XPHB Telepathic should add one Detect Thoughts resource, got \${telepathicResource?.max}\`);
assert(telepathicResource?.reset === 'longRest', \`XPHB Telepathic Detect Thoughts should recover on long rest, got \${telepathicResource?.reset}\`);
assert(telepathicResource?.note?.includes('无需法术成分'), \`XPHB Telepathic resource note should mention no components, got \${telepathicResource?.note}\`);
const telepathicProfile = telepathicCharacter.spellcastingProfiles.find(profile => profile.id === 'auto-feat-Telepathic-XPHB-spells');
assert(
  telepathicProfile?.spells.some(spell => spell.name === '侦测思想' && spell.prepared),
  'XPHB Telepathic should add prepared Detect Thoughts feat spell',
);

const boonOfRecoveryCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Boon of Recovery|XPHB',
    featAbility: 'CON',
  },
});
const lastStandResource = boonOfRecoveryCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Boon of Recovery-XPHB-last-stand');
assert(lastStandResource?.max === 1, \`XPHB Boon of Recovery should add one Last Stand resource, got \${lastStandResource?.max}\`);
assert(lastStandResource?.reset === 'longRest', \`XPHB Boon of Recovery Last Stand should recover on long rest, got \${lastStandResource?.reset}\`);
const recoveryDiceResource = boonOfRecoveryCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Boon of Recovery-XPHB-recovery-dice');
assert(recoveryDiceResource?.max === 10, \`XPHB Boon of Recovery should add ten recovery dice, got \${recoveryDiceResource?.max}\`);
assert(recoveryDiceResource?.note?.includes('10 枚 d10'), \`XPHB Boon of Recovery dice note should mention 10d10 pool, got \${recoveryDiceResource?.note}\`);

const boonOfFortitudeCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Boon of Fortitude|XPHB',
    featAbility: 'CON',
  },
});
assert(boonOfFortitudeCharacter.hpMaxBonus === 40, \`XPHB Boon of Fortitude should add +40 HP max bonus, got \${boonOfFortitudeCharacter.hpMaxBonus}\`);

const boonOfSpeedCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Boon of Speed|XPHB',
    featAbility: 'DEX',
  },
});
assert(boonOfSpeedCharacter.speedBonus === 30, \`XPHB Boon of Speed should add +30 speed bonus, got \${boonOfSpeedCharacter.speedBonus}\`);

const boonOfTruesightCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Boon of Truesight|XPHB',
    featAbility: 'WIS',
  },
});
assert(
  boonOfTruesightCharacter.senses.includes('真实视觉 60 尺'),
  \`XPHB Boon of Truesight should add 60-foot truesight, got \${boonOfTruesightCharacter.senses.join(', ')}\`,
);

const xphbSkulkerCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Skulker|XPHB',
    featAbility: 'DEX',
  },
});
assert(
  xphbSkulkerCharacter.senses.includes('盲视 10 尺'),
  \`XPHB Skulker should add 10-foot blindsight, got \${xphbSkulkerCharacter.senses.join(', ')}\`,
);

const allSkillKeys = [
  'Acrobatics',
  'Animal Handling',
  'Arcana',
  'Athletics',
  'Deception',
  'History',
  'Insight',
  'Intimidation',
  'Investigation',
  'Medicine',
  'Nature',
  'Perception',
  'Performance',
  'Persuasion',
  'Religion',
  'Sleight of Hand',
  'Stealth',
  'Survival',
];
const boonOfSkillCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Boon of Skill|XPHB',
    featAbility: 'INT',
  },
});
assert(
  allSkillKeys.every(skill => boonOfSkillCharacter.proficiencies.has(skill)),
  \`XPHB Boon of Skill should add all skill proficiencies, got \${Array.from(boonOfSkillCharacter.proficiencies).join(', ')}\`,
);

const squatSkillChoices = getFeatSkillChoiceOptions(squatNimbleness);
assert(squatSkillChoices.length === 1, 'Squat Nimbleness should expose one skill choice group, got ' + squatSkillChoices.length);
assert(squatSkillChoices[0].from.includes('特技'), 'Squat Nimbleness skill choices should include Acrobatics');
const squatNimblenessCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Squat Nimbleness|XGE',
    featAbility: 'DEX',
    featSkillChoices: {
      [squatSkillChoices[0].id]: ['特技'],
    },
  },
});
assert(squatNimblenessCharacter.speedBonus === 5, \`Squat Nimbleness should add +5 speed bonus, got \${squatNimblenessCharacter.speedBonus}\`);
assert(squatNimblenessCharacter.proficiencies.has('特技'), 'Squat Nimbleness should add selected Acrobatics proficiency');

const boonOfFateCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Boon of Fate|XPHB',
    featAbility: 'WIS',
  },
});
const boonOfFateResource = boonOfFateCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Boon of Fate-XPHB-fate-points');
assert(boonOfFateResource?.max === 1, \`XPHB Boon of Fate should add one Fate resource, got \${boonOfFateResource?.max}\`);
assert(boonOfFateResource?.reset === 'shortRest', \`XPHB Boon of Fate should use short rest reset, got \${boonOfFateResource?.reset}\`);
assert(boonOfFateResource?.note?.includes('投掷先攻'), \`XPHB Boon of Fate note should mention initiative recovery, got \${boonOfFateResource?.note}\`);

const ritualCasterCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Ritual Caster|XPHB',
    featAbility: 'INT',
  },
});
const ritualCasterResource = ritualCasterCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Ritual Caster-XPHB-quick-ritual');
assert(ritualCasterResource?.max === 1, \`XPHB Ritual Caster should add one Quick Ritual resource, got \${ritualCasterResource?.max}\`);
assert(ritualCasterResource?.reset === 'longRest', \`XPHB Ritual Caster Quick Ritual should recover on long rest, got \${ritualCasterResource?.reset}\`);
assert(ritualCasterResource?.note?.includes('不消耗法术位'), \`XPHB Ritual Caster note should mention no spell slot, got \${ritualCasterResource?.note}\`);

const assertFixedTouchedSpellResource = ({
  featId,
  featKey,
  featSource,
  ruleSystem,
  classDefinition,
  resourceKey,
  spellName,
}) => {
  const character = buildLevelUpCharacter(makeLevelThreeWizard(), content, classDefinition, {
    ruleSystem,
    spellChoices: { cantrips: [], leveled: [] },
    abilityScoreImprovementChoice: {
      mode: 'feat',
      featId,
      featAbility: 'WIS',
    },
  });
  const resource = character.resources.find(item => item.id === \`auto-resource-feat-\${featKey}-\${featSource}-\${resourceKey}\`);
  assert(resource?.max === 1, \`\${featId} should add one \${spellName} resource, got \${resource?.max}\`);
  assert(resource?.reset === 'longRest', \`\${featId} \${spellName} should recover on long rest, got \${resource?.reset}\`);
  assert(resource?.note?.includes('不消耗法术位'), \`\${featId} resource note should mention no spell slot, got \${resource?.note}\`);
  const profile = character.spellcastingProfiles.find(item => item.id === \`auto-feat-\${featKey}-\${featSource}-spells\`);
  assert(
    profile?.spells.some(spell => spell.name === spellName && spell.prepared),
    \`\${featId} should add prepared \${spellName} feat spell\`,
  );
};

assertFixedTouchedSpellResource({
  featId: 'Fey Touched|TCE',
  featKey: 'Fey Touched',
  featSource: 'TCE',
  ruleSystem: '5e',
  classDefinition: phbWizard,
  resourceKey: 'misty-step',
  spellName: '迷踪步',
});
assertFixedTouchedSpellResource({
  featId: 'Fey-Touched|XPHB',
  featKey: 'Fey-Touched',
  featSource: 'XPHB',
  ruleSystem: '5r',
  classDefinition: wizard,
  resourceKey: 'misty-step',
  spellName: '迷踪步',
});
assertFixedTouchedSpellResource({
  featId: 'Shadow Touched|TCE',
  featKey: 'Shadow Touched',
  featSource: 'TCE',
  ruleSystem: '5e',
  classDefinition: phbWizard,
  resourceKey: 'invisibility',
  spellName: '隐形术',
});
assertFixedTouchedSpellResource({
  featId: 'Shadow-Touched|XPHB',
  featKey: 'Shadow-Touched',
  featSource: 'XPHB',
  ruleSystem: '5r',
  classDefinition: wizard,
  resourceKey: 'invisibility',
  spellName: '隐形术',
});

const drowHighMagicCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Drow High Magic|XGE',
  },
});
const drowLevitateResource = drowHighMagicCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Drow High Magic-XGE-levitate');
assert(drowLevitateResource?.max === 1, \`Drow High Magic should add one Levitate resource, got \${drowLevitateResource?.max}\`);
assert(drowLevitateResource?.reset === 'longRest', \`Drow High Magic Levitate should recover on long rest, got \${drowLevitateResource?.reset}\`);
const drowDispelMagicResource = drowHighMagicCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Drow High Magic-XGE-dispel-magic');
assert(drowDispelMagicResource?.max === 1, \`Drow High Magic should add one Dispel Magic resource, got \${drowDispelMagicResource?.max}\`);
assert(drowDispelMagicResource?.note?.includes('不消耗法术位'), \`Drow High Magic Dispel Magic note should mention no spell slot, got \${drowDispelMagicResource?.note}\`);
const drowHighMagicProfile = drowHighMagicCharacter.spellcastingProfiles.find(profile => profile.id === 'auto-feat-Drow High Magic-XGE-spells');
assert(
  drowHighMagicProfile?.spells.some(spell => spell.name === '浮空术' && spell.prepared)
    && drowHighMagicProfile.spells.some(spell => spell.name === '解除魔法' && spell.prepared)
    && drowHighMagicProfile.spells.some(spell => spell.name === '侦测魔法' && spell.prepared),
  'Drow High Magic should add prepared Detect Magic, Levitate, and Dispel Magic feat spells',
);

const feyTeleportationCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, phbWizard, {
  ruleSystem: '5e',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Fey Teleportation|XGE',
    featAbility: 'INT',
  },
});
const feyTeleportationResource = feyTeleportationCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Fey Teleportation-XGE-misty-step');
assert(feyTeleportationResource?.max === 1, \`Fey Teleportation should add one Misty Step resource, got \${feyTeleportationResource?.max}\`);
assert(feyTeleportationResource?.reset === 'shortRest', \`Fey Teleportation Misty Step should recover on short rest, got \${feyTeleportationResource?.reset}\`);
const feyTeleportationProfile = feyTeleportationCharacter.spellcastingProfiles.find(profile => profile.id === 'auto-feat-Fey Teleportation-XGE-spells');
assert(
  feyTeleportationProfile?.spells.some(spell => spell.name === '迷踪步' && spell.prepared),
  'Fey Teleportation should add prepared Misty Step feat spell',
);

const mageSlayerCharacter = buildLevelUpCharacter(makeLevelThreeWizard(), content, wizard, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: {
    mode: 'feat',
    featId: 'Mage Slayer|XPHB',
    featAbility: 'DEX',
  },
});
const mageSlayerResource = mageSlayerCharacter.resources.find(resource => resource.id === 'auto-resource-feat-Mage Slayer-XPHB-guarded-mind');
assert(mageSlayerResource?.max === 1, \`XPHB Mage Slayer should add one Guarded Mind resource, got \${mageSlayerResource?.max}\`);
assert(mageSlayerResource?.reset === 'shortRest', \`XPHB Mage Slayer should recover on short or long rest, represented as shortRest, got \${mageSlayerResource?.reset}\`);

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
  feats: [
    lightlyArmored.name,
    phbHeavilyArmored.name,
    xphbHeavilyArmored.name,
    phbModeratelyArmored.name,
    xphbModeratelyArmored.name,
    martialWeaponTraining.name,
    phbTavernBrawler.name,
    xphbTavernBrawler.name,
    gunner.name,
    linguist.name,
    xphbObservant.name,
    phbLucky.name,
    xphbLucky.name,
    tceChef.name,
    xphbChef.name,
    tcePoisoner.name,
    xphbPoisoner.name,
    squireOfSolamnia.name,
    knightOfTheCrown.name,
    knightOfTheRose.name,
    knightOfTheSword.name,
    cartomancer.name,
    planarWanderer.name,
    runeShaper.name,
    martialAdept.name,
    metamagicAdept.name,
    chromaticGift.name,
    gemGift.name,
    metallicGift.name,
    emberFireGiant.name,
    frostGiantFury.name,
    cloudGiantGuile.name,
    stoneGiantKeenness.name,
    stormGiantSoul.name,
    agentOfOrder.name,
    balefulScion.name,
    righteousHeritor.name,
    outlandsEnvoy.name,
    telepathic.name,
    boonOfRecovery.name,
    boonOfFortitude.name,
    boonOfSpeed.name,
    boonOfTruesight.name,
    boonOfSkill.name,
    squatNimbleness.name,
    boonOfFate.name,
    ritualCaster.name,
    tceFeyTouched.name,
    xphbFeyTouched.name,
    tceShadowTouched.name,
    xphbShadowTouched.name,
    drowHighMagic.name,
    feyTeleportation.name,
    xphbMageSlayer.name,
    resilient.name,
    skillExpert.name,
    weaponMaster.name,
  ],
  checks: [
    'Lightly Armored applies ability, armor, and shield proficiencies',
    'armor and weapon training feats apply fixed proficiencies',
    'PHB Linguist exposes and applies three selected language proficiencies',
    'XPHB Observant upgrades an already proficient selected skill to expertise',
    'PHB Lucky adds fixed long-rest luck point resource',
    'XPHB Lucky adds and refreshes proficiency-based luck point resource',
    'TCE Chef adds cook utensils and refreshes proficiency-based treat resource',
    'XPHB Chef adds cook utensils and refreshes proficiency-based treat resource',
    'TCE and XPHB Poisoner refresh proficiency-based poison dose resources',
    'Squire of Solamnia refreshes proficiency-based Precise Strike resource',
    'Solamnia knight feats refresh proficiency-based resources',
    'Cartomancer adds Hidden Ace resource and Prestidigitation profile',
    'Planar Wanderer adds Portal Sense long-rest resource',
    'Rune Shaper adds Rune Magic resource and Comprehend Languages profile',
    'Martial Adept exposes maneuvers and adds superiority die resource',
    'Metamagic Adept exposes metamagics and adds feat sorcery point resource',
    'Gift of the Chromatic Dragon adds fixed and proficiency-based resources',
    'Gift of the Gem Dragon adds and refreshes proficiency-based resource',
    'Gift of the Metallic Dragon adds prepared Cure Wounds and refreshes proficiency-based resource',
    'Ember of the Fire Giant adds fire resistance and refreshes proficiency-based resource',
    'Fury of the Frost Giant adds cold resistance and refreshes proficiency-based resource',
    'Guile of the Cloud Giant refreshes proficiency-based resource',
    'Keenness of the Stone Giant refreshes proficiency-based resource',
    'Soul of the Storm Giant refreshes proficiency-based resource',
    'SatO planar successor feats refresh proficiency-based resources',
    'Outlands Envoy adds Crossroads Emissary resources and spell profile',
    'XPHB Telepathic adds Detect Thoughts resource and spell profile',
    'XPHB Boon of Recovery adds Last Stand and recovery dice resources',
    'XPHB fixed boon effects add HP, speed, and truesight adjustments',
    'XPHB Skulker adds 10-foot blindsight',
    'XPHB Boon of Skill adds all skill proficiencies',
    'Squat Nimbleness adds speed and selected skill proficiency',
    'XPHB Boon of Fate adds Fate resource',
    'XPHB Ritual Caster adds Quick Ritual resource',
    'TCE and XPHB Fey/Shadow Touched add fixed spell resources',
    'XGE fixed spell feats add spell resources',
    'XPHB Mage Slayer adds short-rest Guarded Mind resource',
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
