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
  buildLevelUpCharacter,
  getOriginWeaponChoiceOptions,
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
const xphbDragonborn = content.races.find(item => item.key === 'Dragonborn' && item.source === 'XPHB');
const chromaticDragonborn = content.races.find(item => item.key === 'Dragonborn (Chromatic)' && item.source === 'FTD');
const gemDragonborn = content.races.find(item => item.key === 'Dragonborn (Gem)' && item.source === 'FTD');
const metallicDragonborn = content.races.find(item => item.key === 'Dragonborn (Metallic)' && item.source === 'FTD');
const dwarf = content.races.find(item => item.key === 'Dwarf' && item.source === 'PHB');
const xphbDwarf = content.races.find(item => item.key === 'Dwarf' && item.source === 'XPHB');
const xphbOrc = content.races.find(item => item.key === 'Orc' && item.source === 'XPHB');
const mpmmOrc = content.races.find(item => item.key === 'Orc' && item.source === 'MPMM');
const halfOrc = content.races.find(item => item.key === 'Half-Orc' && item.source === 'PHB');
const mpmmGoliath = content.races.find(item => item.key === 'Goliath' && item.source === 'MPMM');
const vgmGoliath = content.races.find(item => item.key === 'Goliath' && item.source === 'VGM');
const hobgoblin = content.races.find(item => item.key === 'Hobgoblin' && item.source === 'VGM');
const autognome = content.races.find(item => item.key === 'Autognome' && item.source === 'AAG');
const yuanTi = content.races.find(item => item.key === 'Yuan-ti Pureblood' && item.source === 'VGM');
const loxodon = content.races.find(item => item.key === 'Loxodon' && item.source === 'GGR');
const tortle = content.races.find(item => item.key === 'Tortle' && item.source === 'MPMM');
const warforged = content.races.find(item => item.key === 'Warforged' && item.source === 'ERLW');
const battleaxe = content.weapons.find(item => item.key === 'Battleaxe' && item.source === 'PHB');

assert(fighter, 'missing XPHB Fighter');
assert(wizard, 'missing PHB Wizard');
assert(background, 'missing background fixture');
assert(phbBackground, 'missing PHB background fixture');
assert(aasimar, 'missing MPMM Aasimar fixture');
assert(dragonborn, 'missing PHB Dragonborn fixture');
assert(xphbDragonborn, 'missing XPHB Dragonborn fixture');
assert(chromaticDragonborn, 'missing FTD Chromatic Dragonborn fixture');
assert(gemDragonborn, 'missing FTD Gem Dragonborn fixture');
assert(metallicDragonborn, 'missing FTD Metallic Dragonborn fixture');
assert(dwarf, 'missing PHB Dwarf fixture');
assert(xphbDwarf, 'missing XPHB Dwarf fixture');
assert(xphbOrc, 'missing XPHB Orc fixture');
assert(mpmmOrc, 'missing MPMM Orc fixture');
assert(halfOrc, 'missing PHB Half-Orc fixture');
assert(mpmmGoliath, 'missing MPMM Goliath fixture');
assert(vgmGoliath, 'missing VGM Goliath fixture');
assert(hobgoblin, 'missing VGM Hobgoblin fixture');
assert(autognome, 'missing AAG Autognome fixture');
assert(yuanTi, 'missing VGM Yuan-ti Pureblood fixture');
assert(loxodon, 'missing GGR Loxodon fixture');
assert(tortle, 'missing MPMM Tortle fixture');
assert(warforged, 'missing ERLW Warforged fixture');
assert(battleaxe, 'missing PHB Battleaxe fixture');

const baseOptions = {
  ruleSystem: '5r',
  background,
  skillChoices: [],
  spellChoices: { cantrips: [], leveled: [] },
};

const getResource = (character, id) => character.resources.find(resource => resource.id === id);

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
const aasimarHealingHandsResource = getResource(aasimarCharacter, 'auto-resource-race-Aasimar-MPMM-healing-hands');
assert(aasimarHealingHandsResource?.max === 1 && aasimarHealingHandsResource.reset === 'longRest', 'Aasimar should add Healing Hands long-rest resource');

const removedAasimar = removeCharacterAdjustments(aasimarCharacter, 'auto-character-5r');
assert(!removedAasimar.senses.includes('黑暗视觉 60 尺'), 'removing auto-character should remove structured darkvision');
assert(!removedAasimar.damageResistances.includes('暗蚀'), 'removing auto-character should remove structured fixed resistance');
assert(!getResource(removedAasimar, 'auto-resource-race-Aasimar-MPMM-healing-hands'), 'removing auto-character should remove Aasimar Healing Hands resource');

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
const dragonbornBreathResource = getResource(dragonbornCharacter, 'auto-resource-race-Dragonborn-PHB-breath-weapon');
assert(dragonbornBreathResource?.max === 1 && dragonbornBreathResource.reset === 'shortRest', 'PHB Dragonborn should add one-use short-rest Breath Weapon resource');
const removedDragonborn = removeCharacterAdjustments(dragonbornCharacter, 'auto-character-5r');
assert(!removedDragonborn.damageResistances.includes('火焰'), 'removing auto-character should remove selected resistance');
assert(!getResource(removedDragonborn, 'auto-resource-race-Dragonborn-PHB-breath-weapon'), 'removing auto-character should remove PHB Dragonborn Breath Weapon resource');

const xphbDragonbornResourceId = 'auto-resource-race-Dragonborn-XPHB-breath-weapon';
let xphbDragonbornCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: xphbDragonborn,
  raceChoices: {
    resistance: '火焰',
  },
});
const xphbDragonbornBreathResource = getResource(xphbDragonbornCharacter, xphbDragonbornResourceId);
assert(xphbDragonbornBreathResource?.max === 2 && xphbDragonbornBreathResource.reset === 'longRest', 'XPHB Dragonborn should add proficiency-based long-rest Breath Weapon resource');
assert(!getResource(xphbDragonbornCharacter, 'auto-resource-race-Dragonborn-XPHB-draconic-flight'), 'XPHB Dragonborn should not add Draconic Flight before level 5');
for (let index = 0; index < 4; index += 1) {
  xphbDragonbornCharacter = buildLevelUpCharacter(xphbDragonbornCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const leveledXphbDragonbornBreathResource = getResource(xphbDragonbornCharacter, xphbDragonbornResourceId);
assert(leveledXphbDragonbornBreathResource?.max === 3, \`XPHB Dragonborn Breath Weapon should refresh to PB 3 at level 5, got \${leveledXphbDragonbornBreathResource?.max}\`);
const xphbDragonbornFlightResource = getResource(xphbDragonbornCharacter, 'auto-resource-race-Dragonborn-XPHB-draconic-flight');
assert(xphbDragonbornFlightResource?.max === 1 && xphbDragonbornFlightResource.reset === 'longRest', 'XPHB Dragonborn should add Draconic Flight resource at level 5');

const chromaticDragonbornResourceId = 'auto-resource-race-Dragonborn (Chromatic)-FTD-breath-weapon';
let chromaticDragonbornCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: chromaticDragonborn,
});
const chromaticDragonbornBreathResource = getResource(chromaticDragonbornCharacter, chromaticDragonbornResourceId);
assert(chromaticDragonbornBreathResource?.max === 2 && chromaticDragonbornBreathResource.reset === 'longRest', 'FTD Chromatic Dragonborn should add proficiency-based long-rest Breath Weapon resource');
assert(!getResource(chromaticDragonbornCharacter, 'auto-resource-race-Dragonborn (Chromatic)-FTD-chromatic-warding'), 'FTD Chromatic Dragonborn should not add Chromatic Warding before level 5');
for (let index = 0; index < 4; index += 1) {
  chromaticDragonbornCharacter = buildLevelUpCharacter(chromaticDragonbornCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const leveledChromaticDragonbornBreathResource = getResource(chromaticDragonbornCharacter, chromaticDragonbornResourceId);
assert(leveledChromaticDragonbornBreathResource?.max === 3, \`FTD Chromatic Dragonborn Breath Weapon should refresh to PB 3 at level 5, got \${leveledChromaticDragonbornBreathResource?.max}\`);
const chromaticWardingResource = getResource(chromaticDragonbornCharacter, 'auto-resource-race-Dragonborn (Chromatic)-FTD-chromatic-warding');
assert(chromaticWardingResource?.max === 1 && chromaticWardingResource.reset === 'longRest', 'FTD Chromatic Dragonborn should add Chromatic Warding resource at level 5');

let gemDragonbornCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: gemDragonborn,
});
for (let index = 0; index < 4; index += 1) {
  gemDragonbornCharacter = buildLevelUpCharacter(gemDragonbornCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const gemFlightResource = getResource(gemDragonbornCharacter, 'auto-resource-race-Dragonborn (Gem)-FTD-gem-flight');
assert(gemFlightResource?.max === 1 && gemFlightResource.reset === 'longRest', 'FTD Gem Dragonborn should add Gem Flight resource at level 5');

let metallicDragonbornCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: metallicDragonborn,
});
for (let index = 0; index < 4; index += 1) {
  metallicDragonbornCharacter = buildLevelUpCharacter(metallicDragonbornCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const metallicBreathResource = getResource(metallicDragonbornCharacter, 'auto-resource-race-Dragonborn (Metallic)-FTD-metallic-breath-weapon');
assert(metallicBreathResource?.max === 1 && metallicBreathResource.reset === 'longRest', 'FTD Metallic Dragonborn should add Metallic Breath Weapon resource at level 5');

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

const xphbDwarfCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: xphbDwarf,
});
assert(xphbDwarfCharacter.hpMaxBonus === 1, \`XPHB Dwarf should add +1 HP max bonus at level 1, got \${xphbDwarfCharacter.hpMaxBonus}\`);
const removedXphbDwarf = removeCharacterAdjustments(xphbDwarfCharacter, 'auto-character-5r');
assert(removedXphbDwarf.hpMaxBonus === 0, 'removing auto-character should remove XPHB Dwarf HP max bonus');
const leveledXphbDwarf = buildLevelUpCharacter(xphbDwarfCharacter, content, fighter, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
});
assert(leveledXphbDwarf.hpMaxBonus === 2, \`XPHB Dwarf should add +1 HP max bonus on level up, got \${leveledXphbDwarf.hpMaxBonus}\`);

const xphbOrcResourceId = 'auto-resource-race-Orc-XPHB-adrenaline-rush';
const xphbOrcCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: xphbOrc,
});
const xphbOrcResource = getResource(xphbOrcCharacter, xphbOrcResourceId);
assert(xphbOrcResource, 'XPHB Orc should add Adrenaline Rush resource');
assert(xphbOrcResource.max === 2 && xphbOrcResource.reset === 'shortRest', 'XPHB Orc Adrenaline Rush should use proficiency bonus and reset on short rest');
const xphbOrcEnduranceResource = getResource(xphbOrcCharacter, 'auto-resource-race-Orc-XPHB-relentless-endurance');
assert(xphbOrcEnduranceResource?.max === 1 && xphbOrcEnduranceResource.reset === 'longRest', 'XPHB Orc should add Relentless Endurance long-rest resource');
const removedXphbOrc = removeCharacterAdjustments(xphbOrcCharacter, 'auto-character-5r');
assert(!getResource(removedXphbOrc, xphbOrcResourceId), 'removing auto-character should remove XPHB Orc Adrenaline Rush resource');
assert(!getResource(removedXphbOrc, 'auto-resource-race-Orc-XPHB-relentless-endurance'), 'removing auto-character should remove XPHB Orc Relentless Endurance resource');
let leveledXphbOrc = xphbOrcCharacter;
for (let index = 0; index < 4; index += 1) {
  leveledXphbOrc = buildLevelUpCharacter(leveledXphbOrc, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const leveledXphbOrcResource = getResource(leveledXphbOrc, xphbOrcResourceId);
assert(leveledXphbOrcResource?.max === 3, \`XPHB Orc Adrenaline Rush should refresh to PB 3 at level 5, got \${leveledXphbOrcResource?.max}\`);

const mpmmOrcResourceId = 'auto-resource-race-Orc-MPMM-adrenaline-rush';
const mpmmOrcCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: mpmmOrc,
});
const mpmmOrcResource = getResource(mpmmOrcCharacter, mpmmOrcResourceId);
assert(mpmmOrcResource, 'MPMM Orc should add Adrenaline Rush resource');
assert(mpmmOrcResource.max === 2 && mpmmOrcResource.reset === 'longRest', 'MPMM Orc Adrenaline Rush should use proficiency bonus and reset on long rest');

const halfOrcCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, wizard, {
  ruleSystem: '5e',
  race: halfOrc,
  background: phbBackground,
  skillChoices: [],
  spellChoices: { cantrips: [], leveled: [] },
});
const halfOrcEnduranceResource = getResource(halfOrcCharacter, 'auto-resource-race-Half-Orc-PHB-relentless-endurance');
assert(halfOrcEnduranceResource?.max === 1 && halfOrcEnduranceResource.reset === 'longRest', 'PHB Half-Orc should add Relentless Endurance long-rest resource');

const mpmmGoliathResourceId = 'auto-resource-race-Goliath-MPMM-stones-endurance';
let mpmmGoliathCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: mpmmGoliath,
});
const mpmmGoliathResource = getResource(mpmmGoliathCharacter, mpmmGoliathResourceId);
assert(mpmmGoliathResource?.max === 2 && mpmmGoliathResource.reset === 'longRest', 'MPMM Goliath should add proficiency-based Stone Endurance long-rest resource');
for (let index = 0; index < 4; index += 1) {
  mpmmGoliathCharacter = buildLevelUpCharacter(mpmmGoliathCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const leveledMpmmGoliathResource = getResource(mpmmGoliathCharacter, mpmmGoliathResourceId);
assert(leveledMpmmGoliathResource?.max === 3, \`MPMM Goliath Stone Endurance should refresh to PB 3 at level 5, got \${leveledMpmmGoliathResource?.max}\`);

const vgmGoliathCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, wizard, {
  ruleSystem: '5e',
  race: vgmGoliath,
  background: phbBackground,
  skillChoices: [],
  spellChoices: { cantrips: [], leveled: [] },
});
const vgmGoliathResource = getResource(vgmGoliathCharacter, 'auto-resource-race-Goliath-VGM-stones-endurance');
assert(vgmGoliathResource?.max === 1 && vgmGoliathResource.reset === 'shortRest', 'VGM Goliath should add one-use Stone Endurance short-rest resource');

const hobgoblinWeaponChoices = getOriginWeaponChoiceOptions(content, '5e', hobgoblin);
assert(hobgoblinWeaponChoices.length === 1, \`Hobgoblin should expose one weapon choice group, got \${hobgoblinWeaponChoices.length}\`);
assert(hobgoblinWeaponChoices[0].count === 2, \`Hobgoblin should choose two martial weapons, got \${hobgoblinWeaponChoices[0].count}\`);
assert(hobgoblinWeaponChoices[0].from.includes(battleaxe.id), 'Hobgoblin martial weapon choices should include battleaxe');
const secondHobgoblinWeaponId = hobgoblinWeaponChoices[0].from.find(id => id !== battleaxe.id);
assert(secondHobgoblinWeaponId, 'Hobgoblin martial weapon choices should include a second weapon');
const hobgoblinCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, wizard, {
  ruleSystem: '5e',
  race: hobgoblin,
  background: phbBackground,
  skillChoices: [],
  spellChoices: { cantrips: [], leveled: [] },
  raceChoices: {
    weaponChoices: {
      [hobgoblinWeaponChoices[0].id]: [battleaxe.id, secondHobgoblinWeaponId],
    },
  },
});
assert(hobgoblinCharacter.proficiencies.has('weapon:battleaxe'), 'Hobgoblin selected battleaxe proficiency should be applied');
assert(
  hobgoblinCharacter.proficiencies.has('armor:light'),
  'Hobgoblin fixed light armor proficiency should still be applied with weapon choices',
);

const autognomeCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: autognome,
});
assert(
  autognomeCharacter.conditionImmunities.includes('疾病'),
  \`Autognome should add structured condition immunity, got \${autognomeCharacter.conditionImmunities.join(', ')}\`,
);
assert(
  autognomeCharacter.damageResistances.includes('毒素'),
  \`Autognome should keep structured poison resistance, got \${autognomeCharacter.damageResistances.join(', ')}\`,
);
const removedAutognome = removeCharacterAdjustments(autognomeCharacter, 'auto-character-5r');
assert(!removedAutognome.conditionImmunities.includes('疾病'), 'removing auto-character should remove structured condition immunity');

const yuanTiCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, wizard, {
  ruleSystem: '5e',
  race: yuanTi,
  background: phbBackground,
  skillChoices: [],
  spellChoices: { cantrips: [], leveled: [] },
});
assert(
  yuanTiCharacter.damageImmunities.includes('毒素'),
  \`Yuan-ti should add structured damage immunity, got \${yuanTiCharacter.damageImmunities.join(', ')}\`,
);
assert(
  yuanTiCharacter.conditionImmunities.includes('中毒'),
  \`Yuan-ti should add structured poisoned immunity, got \${yuanTiCharacter.conditionImmunities.join(', ')}\`,
);
assert(
  yuanTiCharacter.featureEntries.some(feature => feature.id.endsWith('-fixed-immunities')),
  'Yuan-ti should still add damage immunity feature description',
);

assert(autognomeCharacter.armorBase === 13, \`Autognome armored casing should set armor base 13 with DEX 10, got \${autognomeCharacter.armorBase}\`);

const loxodonCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, wizard, {
  ruleSystem: '5e',
  race: loxodon,
  background: phbBackground,
  skillChoices: [],
  spellChoices: { cantrips: [], leveled: [] },
});
assert(loxodonCharacter.armorBase === 13, \`Loxodon natural armor should set armor base 13 with CON 12, got \${loxodonCharacter.armorBase}\`);

const tortleCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: tortle,
});
assert(tortleCharacter.armorBase === 17, \`Tortle natural armor should set armor base 17, got \${tortleCharacter.armorBase}\`);

const warforgedCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, wizard, {
  ruleSystem: '5e',
  race: warforged,
  background: phbBackground,
  skillChoices: [],
  spellChoices: { cantrips: [], leveled: [] },
});
assert(warforgedCharacter.armorBonus === 1, \`Warforged integrated protection should add +1 armor bonus, got \${warforgedCharacter.armorBonus}\`);
const removedWarforged = removeCharacterAdjustments(warforgedCharacter, 'auto-character-5e');
assert(removedWarforged.armorBonus === 0, 'removing auto-character should remove Warforged armor bonus');

export default {
  races: [aasimar.name, dragonborn.name, xphbDragonborn.name, chromaticDragonborn.name, gemDragonborn.name, metallicDragonborn.name, dwarf.name, xphbDwarf.name, xphbOrc.name, mpmmOrc.name, halfOrc.name, mpmmGoliath.name, vgmGoliath.name, hobgoblin.name, autognome.name, yuanTi.name, loxodon.name, tortle.name, warforged.name],
  checks: [
    'fixed race darkvision adds reversible structured sense',
    'fixed race resistances add reversible structured resistances',
    'Healing Hands adds reversible long-rest race resource',
    'chosen race resistance adds reversible structured resistance',
    'Dragonborn Breath Weapon adds source-specific race resources and level-gated resources',
    'structured origin data keeps feature descriptions',
    'fixed race weapon proficiencies normalize source suffixes and affect attacks',
    'XPHB Dwarf adds reversible HP max bonus and scales it on level up',
    'Orc Adrenaline Rush adds reversible proficiency-based resources and refreshes on level up',
    'Relentless Endurance adds reversible long-rest race resources',
    'Goliath Stone Endurance adds source-specific race resources and refreshes proficiency-based uses',
    'chosen race weapon proficiencies expose choices and apply selected weapons',
    'fixed condition immunities add reversible structured entries',
    'fixed damage immunities add structured entries and feature descriptions',
    'constant racial armor formulas update armor class',
    'Warforged integrated protection adds reversible armor bonus',
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
