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
import { equipWeapon, refreshAutomaticStyleAttacks } from '${projectImport('utils/equipmentRules.ts')}';
import content from '${projectImport('public/data/auto-builder-core.json')}';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const fighter = content.classes.find(item => item.key === 'Fighter' && item.source === 'XPHB');
const wizard = content.classes.find(item => item.key === 'Wizard' && item.source === 'PHB');
const background = content.backgrounds.find(item => item.source === 'XPHB') || content.backgrounds[0];
const phbBackground = content.backgrounds.find(item => item.source === 'PHB') || background;
const aasimar = content.races.find(item => item.key === 'Aasimar' && item.source === 'MPMM');
const xphbAasimar = content.races.find(item => item.key === 'Aasimar' && item.source === 'XPHB');
const astralElf = content.races.find(item => item.key === 'Astral Elf' && item.source === 'AAG');
const dragonborn = content.races.find(item => item.key === 'Dragonborn' && item.source === 'PHB');
const xphbDragonborn = content.races.find(item => item.key === 'Dragonborn' && item.source === 'XPHB');
const chromaticDragonborn = content.races.find(item => item.key === 'Dragonborn (Chromatic)' && item.source === 'FTD');
const gemDragonborn = content.races.find(item => item.key === 'Dragonborn (Gem)' && item.source === 'FTD');
const metallicDragonborn = content.races.find(item => item.key === 'Dragonborn (Metallic)' && item.source === 'FTD');
const eladrin = content.races.find(item => item.key === 'Eladrin' && item.source === 'MPMM');
const dwarf = content.races.find(item => item.key === 'Dwarf' && item.source === 'PHB');
const xphbDwarf = content.races.find(item => item.key === 'Dwarf' && item.source === 'XPHB');
const xphbOrc = content.races.find(item => item.key === 'Orc' && item.source === 'XPHB');
const mpmmOrc = content.races.find(item => item.key === 'Orc' && item.source === 'MPMM');
const halfOrc = content.races.find(item => item.key === 'Half-Orc' && item.source === 'PHB');
const mpmmGoliath = content.races.find(item => item.key === 'Goliath' && item.source === 'MPMM');
const vgmGoliath = content.races.find(item => item.key === 'Goliath' && item.source === 'VGM');
const xphbGoliath = content.races.find(item => item.key === 'Goliath' && item.source === 'XPHB');
const mpmmHarengon = content.races.find(item => item.key === 'Harengon' && item.source === 'MPMM');
const wbtwHarengon = content.races.find(item => item.key === 'Harengon' && item.source === 'WBtW');
const kender = content.races.find(item => item.key === 'Kender' && item.source === 'DSotDQ');
const kenku = content.races.find(item => item.key === 'Kenku' && item.source === 'MPMM');
const mpmmKobold = content.races.find(item => item.key === 'Kobold' && item.source === 'MPMM');
const vgmKobold = content.races.find(item => item.key === 'Kobold' && item.source === 'VGM');
const mpmmFirbolg = content.races.find(item => item.key === 'Firbolg' && item.source === 'MPMM');
const vgmFirbolg = content.races.find(item => item.key === 'Firbolg' && item.source === 'VGM');
const mpmmGoblin = content.races.find(item => item.key === 'Goblin' && item.source === 'MPMM');
const vgmGoblin = content.races.find(item => item.key === 'Goblin' && item.source === 'VGM');
const mpmmHobgoblin = content.races.find(item => item.key === 'Hobgoblin' && item.source === 'MPMM');
const hobgoblin = content.races.find(item => item.key === 'Hobgoblin' && item.source === 'VGM');
const mpmmLizardfolk = content.races.find(item => item.key === 'Lizardfolk' && item.source === 'MPMM');
const vgmLizardfolk = content.races.find(item => item.key === 'Lizardfolk' && item.source === 'VGM');
const rhwDhampir = content.races.find(item => item.key === 'Dhampir' && item.source === 'RHW');
const vrgrDhampir = content.races.find(item => item.key === 'Dhampir' && item.source === 'VRGR');
const vampire = content.races.find(item => item.key === 'Vampire' && item.source === 'PSZ');
const rhwHexblood = content.races.find(item => item.key === 'Hexblood' && item.source === 'RHW');
const vrgrHexblood = content.races.find(item => item.key === 'Hexblood' && item.source === 'VRGR');
const deepGnome = content.races.find(item => item.key === 'Deep Gnome' && item.source === 'MPMM');
const hadozee = content.races.find(item => item.key === 'Hadozee' && item.source === 'AAG');
const giff = content.races.find(item => item.key === 'Giff' && item.source === 'AAG');
const efaShifter = content.races.find(item => item.key === 'Shifter' && item.source === 'EFA');
const erlwShifter = content.races.find(item => item.key === 'Shifter' && item.source === 'ERLW');
const mpmmShifter = content.races.find(item => item.key === 'Shifter' && item.source === 'MPMM');
const rhwReborn = content.races.find(item => item.key === 'Reborn' && item.source === 'RHW');
const vrgrReborn = content.races.find(item => item.key === 'Reborn' && item.source === 'VRGR');
const shadarKai = content.races.find(item => item.key === 'Shadar-Kai' && item.source === 'MPMM');
const autognome = content.races.find(item => item.key === 'Autognome' && item.source === 'AAG');
const yuanTi = content.races.find(item => item.key === 'Yuan-ti Pureblood' && item.source === 'VGM');
const aarakocra = content.races.find(item => item.key === 'Aarakocra' && item.source === 'MPMM');
const mpmmCentaur = content.races.find(item => item.key === 'Centaur' && item.source === 'MPMM');
const mpmmMinotaur = content.races.find(item => item.key === 'Minotaur' && item.source === 'MPMM');
const leonin = content.races.find(item => item.key === 'Leonin' && item.source === 'MOT');
const lupin = content.races.find(item => item.key === 'Lupin' && item.source === 'RHW');
const khoravar = content.races.find(item => item.key === 'Khoravar' && item.source === 'EFA');
const loxodon = content.races.find(item => item.key === 'Loxodon' && item.source === 'GGR');
const vedalken = content.races.find(item => item.key === 'Vedalken' && item.source === 'GGR');
const xphbHuman = content.races.find(item => item.key === 'Human' && item.source === 'XPHB');
const tortle = content.races.find(item => item.key === 'Tortle' && item.source === 'MPMM');
const warforged = content.races.find(item => item.key === 'Warforged' && item.source === 'ERLW');
const battleaxe = content.weapons.find(item => item.key === 'Battleaxe' && item.source === 'PHB');

assert(fighter, 'missing XPHB Fighter');
assert(wizard, 'missing PHB Wizard');
assert(background, 'missing background fixture');
assert(phbBackground, 'missing PHB background fixture');
assert(aasimar, 'missing MPMM Aasimar fixture');
assert(xphbAasimar, 'missing XPHB Aasimar fixture');
assert(astralElf, 'missing AAG Astral Elf fixture');
assert(dragonborn, 'missing PHB Dragonborn fixture');
assert(xphbDragonborn, 'missing XPHB Dragonborn fixture');
assert(chromaticDragonborn, 'missing FTD Chromatic Dragonborn fixture');
assert(gemDragonborn, 'missing FTD Gem Dragonborn fixture');
assert(metallicDragonborn, 'missing FTD Metallic Dragonborn fixture');
assert(eladrin, 'missing MPMM Eladrin fixture');
assert(dwarf, 'missing PHB Dwarf fixture');
assert(xphbDwarf, 'missing XPHB Dwarf fixture');
assert(xphbOrc, 'missing XPHB Orc fixture');
assert(mpmmOrc, 'missing MPMM Orc fixture');
assert(halfOrc, 'missing PHB Half-Orc fixture');
assert(mpmmGoliath, 'missing MPMM Goliath fixture');
assert(vgmGoliath, 'missing VGM Goliath fixture');
assert(xphbGoliath, 'missing XPHB Goliath fixture');
assert(mpmmHarengon, 'missing MPMM Harengon fixture');
assert(wbtwHarengon, 'missing WBtW Harengon fixture');
assert(kender, 'missing DSotDQ Kender fixture');
assert(kenku, 'missing MPMM Kenku fixture');
assert(mpmmKobold, 'missing MPMM Kobold fixture');
assert(vgmKobold, 'missing VGM Kobold fixture');
assert(mpmmFirbolg, 'missing MPMM Firbolg fixture');
assert(vgmFirbolg, 'missing VGM Firbolg fixture');
assert(mpmmGoblin, 'missing MPMM Goblin fixture');
assert(vgmGoblin, 'missing VGM Goblin fixture');
assert(mpmmHobgoblin, 'missing MPMM Hobgoblin fixture');
assert(hobgoblin, 'missing VGM Hobgoblin fixture');
assert(mpmmLizardfolk, 'missing MPMM Lizardfolk fixture');
assert(vgmLizardfolk, 'missing VGM Lizardfolk fixture');
assert(rhwDhampir, 'missing RHW Dhampir fixture');
assert(vrgrDhampir, 'missing VRGR Dhampir fixture');
assert(vampire, 'missing PSZ Vampire fixture');
assert(rhwHexblood, 'missing RHW Hexblood fixture');
assert(vrgrHexblood, 'missing VRGR Hexblood fixture');
assert(deepGnome, 'missing MPMM Deep Gnome fixture');
assert(hadozee, 'missing AAG Hadozee fixture');
assert(giff, 'missing AAG Giff fixture');
assert(efaShifter, 'missing EFA Shifter fixture');
assert(erlwShifter, 'missing ERLW Shifter fixture');
assert(mpmmShifter, 'missing MPMM Shifter fixture');
assert(rhwReborn, 'missing RHW Reborn fixture');
assert(vrgrReborn, 'missing VRGR Reborn fixture');
assert(shadarKai, 'missing MPMM Shadar-Kai fixture');
assert(autognome, 'missing AAG Autognome fixture');
assert(yuanTi, 'missing VGM Yuan-ti Pureblood fixture');
assert(aarakocra, 'missing MPMM Aarakocra fixture');
assert(mpmmCentaur, 'missing MPMM Centaur fixture');
assert(mpmmMinotaur, 'missing MPMM Minotaur fixture');
assert(leonin, 'missing MOT Leonin fixture');
assert(lupin, 'missing RHW Lupin fixture');
assert(khoravar, 'missing EFA Khoravar fixture');
assert(loxodon, 'missing GGR Loxodon fixture');
assert(vedalken, 'missing GGR Vedalken fixture');
assert(xphbHuman, 'missing XPHB Human fixture');
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
const getAttack = (character, id) => character.attacks.find(attack => attack.sourceId === id);
const levelToFive = (character, cls, ruleSystem) => {
  let nextCharacter = character;
  for (let index = 0; index < 4; index += 1) {
    nextCharacter = buildLevelUpCharacter(nextCharacter, content, cls, {
      ruleSystem,
      spellChoices: { cantrips: [], leveled: [] },
    });
  }
  return nextCharacter;
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
const aasimarHealingHandsResource = getResource(aasimarCharacter, 'auto-resource-race-Aasimar-MPMM-healing-hands');
assert(aasimarHealingHandsResource?.max === 1 && aasimarHealingHandsResource.reset === 'longRest', 'Aasimar should add Healing Hands long-rest resource');

const removedAasimar = removeCharacterAdjustments(aasimarCharacter, 'auto-character-5r');
assert(!removedAasimar.senses.includes('黑暗视觉 60 尺'), 'removing auto-character should remove structured darkvision');
assert(!removedAasimar.damageResistances.includes('暗蚀'), 'removing auto-character should remove structured fixed resistance');
assert(!getResource(removedAasimar, 'auto-resource-race-Aasimar-MPMM-healing-hands'), 'removing auto-character should remove Aasimar Healing Hands resource');

let leveledAasimarCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: aasimar,
});
assert(!getResource(leveledAasimarCharacter, 'auto-resource-race-Aasimar-MPMM-celestial-revelation'), 'MPMM Aasimar should not add Celestial Revelation before level 3');
for (let index = 0; index < 2; index += 1) {
  leveledAasimarCharacter = buildLevelUpCharacter(leveledAasimarCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const aasimarRevelationResource = getResource(leveledAasimarCharacter, 'auto-resource-race-Aasimar-MPMM-celestial-revelation');
assert(aasimarRevelationResource?.max === 1 && aasimarRevelationResource.reset === 'longRest', 'MPMM Aasimar should add Celestial Revelation resource at level 3');

let xphbAasimarCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: xphbAasimar,
});
for (let index = 0; index < 2; index += 1) {
  xphbAasimarCharacter = buildLevelUpCharacter(xphbAasimarCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const xphbAasimarRevelationResource = getResource(xphbAasimarCharacter, 'auto-resource-race-Aasimar-XPHB-celestial-revelation');
assert(xphbAasimarRevelationResource?.max === 1 && xphbAasimarRevelationResource.reset === 'longRest', 'XPHB Aasimar should add Celestial Revelation resource at level 3');

const astralElfResourceId = 'auto-resource-race-Astral Elf-AAG-starlight-step';
let astralElfCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: astralElf,
});
const astralElfResource = getResource(astralElfCharacter, astralElfResourceId);
assert(astralElfResource?.max === 2 && astralElfResource.reset === 'longRest', 'AAG Astral Elf should add proficiency-based Starlight Step resource');
for (let index = 0; index < 4; index += 1) {
  astralElfCharacter = buildLevelUpCharacter(astralElfCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const leveledAstralElfResource = getResource(astralElfCharacter, astralElfResourceId);
assert(leveledAstralElfResource?.max === 3, \`AAG Astral Elf Starlight Step should refresh to PB 3 at level 5, got \${leveledAstralElfResource?.max}\`);

const eladrinResourceId = 'auto-resource-race-Eladrin-MPMM-fey-step';
let eladrinCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: eladrin,
});
const eladrinResource = getResource(eladrinCharacter, eladrinResourceId);
assert(eladrinResource?.max === 2 && eladrinResource.reset === 'longRest', 'MPMM Eladrin should add proficiency-based Fey Step resource');
for (let index = 0; index < 4; index += 1) {
  eladrinCharacter = buildLevelUpCharacter(eladrinCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const leveledEladrinResource = getResource(eladrinCharacter, eladrinResourceId);
assert(leveledEladrinResource?.max === 3, \`MPMM Eladrin Fey Step should refresh to PB 3 at level 5, got \${leveledEladrinResource?.max}\`);

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
const xphbDwarfStonecunningResourceId = 'auto-resource-race-Dwarf-XPHB-stonecunning';
const xphbDwarfStonecunningResource = getResource(xphbDwarfCharacter, xphbDwarfStonecunningResourceId);
assert(xphbDwarfStonecunningResource?.max === 2 && xphbDwarfStonecunningResource.reset === 'longRest', 'XPHB Dwarf should add proficiency-based Stonecunning resource');
assert(xphbDwarfStonecunningResource?.note.includes('震颤感知'), 'XPHB Dwarf Stonecunning resource should keep tremorsense note');
const removedXphbDwarf = removeCharacterAdjustments(xphbDwarfCharacter, 'auto-character-5r');
assert(removedXphbDwarf.hpMaxBonus === 0, 'removing auto-character should remove XPHB Dwarf HP max bonus');
assert(!getResource(removedXphbDwarf, xphbDwarfStonecunningResourceId), 'removing auto-character should remove XPHB Dwarf Stonecunning resource');
const leveledXphbDwarf = buildLevelUpCharacter(xphbDwarfCharacter, content, fighter, {
  ruleSystem: '5r',
  spellChoices: { cantrips: [], leveled: [] },
});
assert(leveledXphbDwarf.hpMaxBonus === 2, \`XPHB Dwarf should add +1 HP max bonus on level up, got \${leveledXphbDwarf.hpMaxBonus}\`);
const leveledXphbDwarfStonecunning = getResource(levelToFive(xphbDwarfCharacter, fighter, '5r'), xphbDwarfStonecunningResourceId);
assert(leveledXphbDwarfStonecunning?.max === 3, 'XPHB Dwarf Stonecunning should refresh to PB 3 at level 5');

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

const xphbGoliathLargeFormResourceId = 'auto-resource-race-Goliath-XPHB-large-form';
let xphbGoliathCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: xphbGoliath,
});
assert(!getResource(xphbGoliathCharacter, xphbGoliathLargeFormResourceId), 'XPHB Goliath should not add Large Form before level 5');
xphbGoliathCharacter = levelToFive(xphbGoliathCharacter, fighter, '5r');
const xphbGoliathLargeFormResource = getResource(xphbGoliathCharacter, xphbGoliathLargeFormResourceId);
assert(xphbGoliathLargeFormResource?.max === 1 && xphbGoliathLargeFormResource.reset === 'longRest', 'XPHB Goliath should add one-use Large Form long-rest resource at level 5');
assert(xphbGoliathLargeFormResource?.note.includes('速度增加 10 尺'), 'XPHB Goliath Large Form resource should keep speed bonus note');
const removedXphbGoliath = removeCharacterAdjustments(xphbGoliathCharacter, 'auto-Fighter-XPHB-level-5');
assert(!getResource(removedXphbGoliath, xphbGoliathLargeFormResourceId), 'removing level-up adjustment should remove XPHB Goliath Large Form resource');

const mpmmHarengonResourceId = 'auto-resource-race-Harengon-MPMM-rabbit-hop';
let mpmmHarengonCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: mpmmHarengon,
});
const mpmmHarengonResource = getResource(mpmmHarengonCharacter, mpmmHarengonResourceId);
assert(mpmmHarengonResource?.max === 2 && mpmmHarengonResource.reset === 'longRest', 'MPMM Harengon should add proficiency-based Rabbit Hop resource');
assert(mpmmHarengonCharacter.initiativeBonus === 2, \`MPMM Harengon should add PB to initiative at level 1, got \${mpmmHarengonCharacter.initiativeBonus}\`);
for (let index = 0; index < 4; index += 1) {
  mpmmHarengonCharacter = buildLevelUpCharacter(mpmmHarengonCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const leveledMpmmHarengonResource = getResource(mpmmHarengonCharacter, mpmmHarengonResourceId);
assert(leveledMpmmHarengonResource?.max === 3, \`MPMM Harengon Rabbit Hop should refresh to PB 3 at level 5, got \${leveledMpmmHarengonResource?.max}\`);
assert(mpmmHarengonCharacter.initiativeBonus === 3, \`MPMM Harengon initiative bonus should refresh to PB 3 at level 5, got \${mpmmHarengonCharacter.initiativeBonus}\`);

const wbtwHarengonResourceId = 'auto-resource-race-Harengon-WBtW-rabbit-hop';
let wbtwHarengonCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, wizard, {
  ruleSystem: '5e',
  race: wbtwHarengon,
  background: phbBackground,
  skillChoices: [],
  spellChoices: { cantrips: [], leveled: [] },
});
const wbtwHarengonResource = getResource(wbtwHarengonCharacter, wbtwHarengonResourceId);
assert(wbtwHarengonResource?.max === 2 && wbtwHarengonResource.reset === 'longRest', 'WBtW Harengon should add proficiency-based Rabbit Hop resource');
assert(wbtwHarengonCharacter.initiativeBonus === 2, \`WBtW Harengon should add PB to initiative at level 1, got \${wbtwHarengonCharacter.initiativeBonus}\`);
for (let index = 0; index < 4; index += 1) {
  wbtwHarengonCharacter = buildLevelUpCharacter(wbtwHarengonCharacter, content, wizard, {
    ruleSystem: '5e',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const leveledWbtwHarengonResource = getResource(wbtwHarengonCharacter, wbtwHarengonResourceId);
assert(leveledWbtwHarengonResource?.max === 3, \`WBtW Harengon Rabbit Hop should refresh to PB 3 at level 5, got \${leveledWbtwHarengonResource?.max}\`);
assert(wbtwHarengonCharacter.initiativeBonus === 3, \`WBtW Harengon initiative bonus should refresh to PB 3 at level 5, got \${wbtwHarengonCharacter.initiativeBonus}\`);

const kenderTauntResourceId = 'auto-resource-race-Kender-DSotDQ-taunt';
let kenderCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: kender,
});
const kenderFearlessResource = getResource(kenderCharacter, 'auto-resource-race-Kender-DSotDQ-fearless');
assert(kenderFearlessResource?.max === 1 && kenderFearlessResource.reset === 'longRest', 'DSotDQ Kender should add one-use Fearless long-rest resource');
const kenderTauntResource = getResource(kenderCharacter, kenderTauntResourceId);
assert(kenderTauntResource?.max === 2 && kenderTauntResource.reset === 'longRest', 'DSotDQ Kender should add proficiency-based Taunt resource');
assert(kenderTauntResource?.note.includes('DC = 8'), 'DSotDQ Kender Taunt resource should keep save DC note');
kenderCharacter = levelToFive(kenderCharacter, fighter, '5r');
const leveledKenderTauntResource = getResource(kenderCharacter, kenderTauntResourceId);
assert(leveledKenderTauntResource?.max === 3, 'DSotDQ Kender Taunt should refresh to PB 3 at level 5');

const kenkuResourceId = 'auto-resource-race-Kenku-MPMM-kenku-recall';
let kenkuCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: kenku,
});
const kenkuResource = getResource(kenkuCharacter, kenkuResourceId);
assert(kenkuResource?.max === 2 && kenkuResource.reset === 'longRest', 'MPMM Kenku should add proficiency-based Kenku Recall resource');
kenkuCharacter = levelToFive(kenkuCharacter, fighter, '5r');
const leveledKenkuResource = getResource(kenkuCharacter, kenkuResourceId);
assert(leveledKenkuResource?.max === 3, \`MPMM Kenku Recall should refresh to PB 3 at level 5, got \${leveledKenkuResource?.max}\`);

const mpmmKoboldResourceId = 'auto-resource-race-Kobold-MPMM-draconic-cry';
let mpmmKoboldCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: mpmmKobold,
});
const mpmmKoboldResource = getResource(mpmmKoboldCharacter, mpmmKoboldResourceId);
assert(mpmmKoboldResource?.max === 2 && mpmmKoboldResource.reset === 'longRest', 'MPMM Kobold should add proficiency-based Draconic Cry resource');
mpmmKoboldCharacter = levelToFive(mpmmKoboldCharacter, fighter, '5r');
const leveledMpmmKoboldResource = getResource(mpmmKoboldCharacter, mpmmKoboldResourceId);
assert(leveledMpmmKoboldResource?.max === 3, \`MPMM Kobold Draconic Cry should refresh to PB 3 at level 5, got \${leveledMpmmKoboldResource?.max}\`);

const vgmKoboldCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, wizard, {
  ruleSystem: '5e',
  race: vgmKobold,
  background: phbBackground,
  skillChoices: [],
  spellChoices: { cantrips: [], leveled: [] },
});
const vgmKoboldResource = getResource(vgmKoboldCharacter, 'auto-resource-race-Kobold-VGM-grovel-cower-and-beg');
assert(vgmKoboldResource?.max === 1 && vgmKoboldResource.reset === 'shortRest', 'VGM Kobold should add one-use Grovel, Cower, and Beg short-rest resource');

for (const [reborn, source] of [[rhwReborn, 'RHW'], [vrgrReborn, 'VRGR']]) {
  const resourceId = \`auto-resource-race-Reborn-\${source}-knowledge-from-a-past-life\`;
  let rebornCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
    ...baseOptions,
    race: reborn,
  });
  const rebornResource = getResource(rebornCharacter, resourceId);
  assert(rebornResource?.max === 2 && rebornResource.reset === 'longRest', \`\${source} Reborn should add proficiency-based Knowledge from a Past Life resource\`);
  rebornCharacter = levelToFive(rebornCharacter, fighter, '5r');
  const leveledRebornResource = getResource(rebornCharacter, resourceId);
  assert(leveledRebornResource?.max === 3, \`\${source} Reborn Knowledge from a Past Life should refresh to PB 3 at level 5, got \${leveledRebornResource?.max}\`);
}

const shadarKaiResourceId = 'auto-resource-race-Shadar-Kai-MPMM-blessing-of-the-raven-queen';
let shadarKaiCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: shadarKai,
});
const shadarKaiResource = getResource(shadarKaiCharacter, shadarKaiResourceId);
assert(shadarKaiResource?.max === 2 && shadarKaiResource.reset === 'longRest', 'MPMM Shadar-Kai should add proficiency-based Blessing of the Raven Queen resource');
shadarKaiCharacter = levelToFive(shadarKaiCharacter, fighter, '5r');
const leveledShadarKaiResource = getResource(shadarKaiCharacter, shadarKaiResourceId);
assert(leveledShadarKaiResource?.max === 3, \`MPMM Shadar-Kai Blessing of the Raven Queen should refresh to PB 3 at level 5, got \${leveledShadarKaiResource?.max}\`);

const mpmmFirbolgResourceId = 'auto-resource-race-Firbolg-MPMM-hidden-step';
let mpmmFirbolgCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: mpmmFirbolg,
});
const mpmmFirbolgResource = getResource(mpmmFirbolgCharacter, mpmmFirbolgResourceId);
assert(mpmmFirbolgResource?.max === 2 && mpmmFirbolgResource.reset === 'longRest', 'MPMM Firbolg should add proficiency-based Hidden Step resource');
for (let index = 0; index < 4; index += 1) {
  mpmmFirbolgCharacter = buildLevelUpCharacter(mpmmFirbolgCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const leveledMpmmFirbolgResource = getResource(mpmmFirbolgCharacter, mpmmFirbolgResourceId);
assert(leveledMpmmFirbolgResource?.max === 3, \`MPMM Firbolg Hidden Step should refresh to PB 3 at level 5, got \${leveledMpmmFirbolgResource?.max}\`);

const vgmFirbolgCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, wizard, {
  ruleSystem: '5e',
  race: vgmFirbolg,
  background: phbBackground,
  skillChoices: [],
  spellChoices: { cantrips: [], leveled: [] },
});
const vgmFirbolgResource = getResource(vgmFirbolgCharacter, 'auto-resource-race-Firbolg-VGM-hidden-step');
assert(vgmFirbolgResource?.max === 1 && vgmFirbolgResource.reset === 'shortRest', 'VGM Firbolg should add one-use Hidden Step short-rest resource');

const mpmmGoblinResourceId = 'auto-resource-race-Goblin-MPMM-fury-of-the-small';
let mpmmGoblinCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: mpmmGoblin,
});
const mpmmGoblinResource = getResource(mpmmGoblinCharacter, mpmmGoblinResourceId);
assert(mpmmGoblinResource?.max === 2 && mpmmGoblinResource.reset === 'longRest', 'MPMM Goblin should add proficiency-based Fury of the Small resource');
for (let index = 0; index < 4; index += 1) {
  mpmmGoblinCharacter = buildLevelUpCharacter(mpmmGoblinCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const leveledMpmmGoblinResource = getResource(mpmmGoblinCharacter, mpmmGoblinResourceId);
assert(leveledMpmmGoblinResource?.max === 3, \`MPMM Goblin Fury of the Small should refresh to PB 3 at level 5, got \${leveledMpmmGoblinResource?.max}\`);

const vgmGoblinCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, wizard, {
  ruleSystem: '5e',
  race: vgmGoblin,
  background: phbBackground,
  skillChoices: [],
  spellChoices: { cantrips: [], leveled: [] },
});
const vgmGoblinResource = getResource(vgmGoblinCharacter, 'auto-resource-race-Goblin-VGM-fury-of-the-small');
assert(vgmGoblinResource?.max === 1 && vgmGoblinResource.reset === 'shortRest', 'VGM Goblin should add one-use Fury of the Small short-rest resource');

const mpmmHobgoblinFeyGiftResourceId = 'auto-resource-race-Hobgoblin-MPMM-fey-gift';
const mpmmHobgoblinResourceId = 'auto-resource-race-Hobgoblin-MPMM-fortune-from-the-many';
let mpmmHobgoblinCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: mpmmHobgoblin,
});
const mpmmHobgoblinFeyGiftResource = getResource(mpmmHobgoblinCharacter, mpmmHobgoblinFeyGiftResourceId);
assert(mpmmHobgoblinFeyGiftResource?.max === 2 && mpmmHobgoblinFeyGiftResource.reset === 'longRest', 'MPMM Hobgoblin should add proficiency-based Fey Gift resource');
assert(mpmmHobgoblinFeyGiftResource?.note.includes('协助动作'), 'MPMM Hobgoblin Fey Gift resource should keep Help action note');
const mpmmHobgoblinResource = getResource(mpmmHobgoblinCharacter, mpmmHobgoblinResourceId);
assert(mpmmHobgoblinResource?.max === 2 && mpmmHobgoblinResource.reset === 'longRest', 'MPMM Hobgoblin should add proficiency-based Fortune from the Many resource');
for (let index = 0; index < 4; index += 1) {
  mpmmHobgoblinCharacter = buildLevelUpCharacter(mpmmHobgoblinCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const leveledMpmmHobgoblinFeyGiftResource = getResource(mpmmHobgoblinCharacter, mpmmHobgoblinFeyGiftResourceId);
assert(leveledMpmmHobgoblinFeyGiftResource?.max === 3, \`MPMM Hobgoblin Fey Gift should refresh to PB 3 at level 5, got \${leveledMpmmHobgoblinFeyGiftResource?.max}\`);
const leveledMpmmHobgoblinResource = getResource(mpmmHobgoblinCharacter, mpmmHobgoblinResourceId);
assert(leveledMpmmHobgoblinResource?.max === 3, \`MPMM Hobgoblin Fortune from the Many should refresh to PB 3 at level 5, got \${leveledMpmmHobgoblinResource?.max}\`);

const vgmHobgoblinCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, wizard, {
  ruleSystem: '5e',
  race: hobgoblin,
  background: phbBackground,
  skillChoices: [],
  spellChoices: { cantrips: [], leveled: [] },
});
const vgmHobgoblinResource = getResource(vgmHobgoblinCharacter, 'auto-resource-race-Hobgoblin-VGM-saving-face');
assert(vgmHobgoblinResource?.max === 1 && vgmHobgoblinResource.reset === 'shortRest', 'VGM Hobgoblin should add one-use Saving Face short-rest resource');

const mpmmLizardfolkResourceId = 'auto-resource-race-Lizardfolk-MPMM-hungry-jaws';
let mpmmLizardfolkCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: mpmmLizardfolk,
});
const mpmmLizardfolkResource = getResource(mpmmLizardfolkCharacter, mpmmLizardfolkResourceId);
assert(mpmmLizardfolkResource?.max === 2 && mpmmLizardfolkResource.reset === 'longRest', 'MPMM Lizardfolk should add proficiency-based Hungry Jaws resource');
for (let index = 0; index < 4; index += 1) {
  mpmmLizardfolkCharacter = buildLevelUpCharacter(mpmmLizardfolkCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const leveledMpmmLizardfolkResource = getResource(mpmmLizardfolkCharacter, mpmmLizardfolkResourceId);
assert(leveledMpmmLizardfolkResource?.max === 3, \`MPMM Lizardfolk Hungry Jaws should refresh to PB 3 at level 5, got \${leveledMpmmLizardfolkResource?.max}\`);

const vgmLizardfolkCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, wizard, {
  ruleSystem: '5e',
  race: vgmLizardfolk,
  background: phbBackground,
  skillChoices: [],
  spellChoices: { cantrips: [], leveled: [] },
});
const vgmLizardfolkResource = getResource(vgmLizardfolkCharacter, 'auto-resource-race-Lizardfolk-VGM-hungry-jaws');
assert(vgmLizardfolkResource?.max === 1 && vgmLizardfolkResource.reset === 'shortRest', 'VGM Lizardfolk should add one-use Hungry Jaws short-rest resource');

for (const [dhampir, source, resourceName] of [
  [rhwDhampir, 'RHW', '吸血啃咬增幅'],
  [vrgrDhampir, 'VRGR', '吸血啃咬强化'],
]) {
  const resourceId = \`auto-resource-race-Dhampir-\${source}-vampiric-bite\`;
  let dhampirCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
    ...baseOptions,
    race: dhampir,
  });
  const dhampirResource = getResource(dhampirCharacter, resourceId);
  assert(dhampirResource?.name === resourceName, \`\${source} Dhampir should add source-specific Vampiric Bite resource name\`);
  assert(dhampirResource?.max === 2 && dhampirResource.reset === 'longRest', \`\${source} Dhampir should add proficiency-based Vampiric Bite resource\`);

  const biteAttackId = \`auto-race-attack-dhampir-\${source.toLowerCase()}-vampiric-bite\`;
  const biteAttack = getAttack(dhampirCharacter, biteAttackId);
  assert(biteAttack?.name === '吸血啃咬', \`\${source} Dhampir should add Vampiric Bite attack\`);
  assert(biteAttack?.bonus === '+2', \`\${source} Dhampir Vampiric Bite should use CON plus proficiency at level 1, got \${biteAttack?.bonus}\`);
  assert(biteAttack?.damage === '1d4 穿刺', \`\${source} Dhampir Vampiric Bite damage should use CON, got \${biteAttack?.damage}\`);
  assert(biteAttack?.notes.includes(source === 'VRGR' ? '生命值不高于一半' : '增幅次数'), \`\${source} Dhampir Vampiric Bite should keep source-specific notes\`);

  const conDhampir = refreshAutomaticStyleAttacks({
    ...dhampirCharacter,
    abilities: {
      ...dhampirCharacter.abilities,
      CON: 14,
    },
  });
  const conBiteAttack = getAttack(conDhampir, biteAttackId);
  assert(conBiteAttack?.bonus === '+4', \`\${source} Dhampir Vampiric Bite should add CON modifier to attack, got \${conBiteAttack?.bonus}\`);
  assert(conBiteAttack?.damage === '1d4+2 穿刺', \`\${source} Dhampir Vampiric Bite should add CON modifier to damage, got \${conBiteAttack?.damage}\`);

  for (let index = 0; index < 4; index += 1) {
    dhampirCharacter = buildLevelUpCharacter(dhampirCharacter, content, fighter, {
      ruleSystem: '5r',
      spellChoices: { cantrips: [], leveled: [] },
    });
  }
  const leveledDhampirResource = getResource(dhampirCharacter, resourceId);
  const leveledBiteAttack = getAttack(dhampirCharacter, biteAttackId);
  assert(leveledDhampirResource?.max === 3, \`\${source} Dhampir Vampiric Bite resource should refresh to PB 3 at level 5, got \${leveledDhampirResource?.max}\`);
  assert(leveledBiteAttack?.bonus === '+3', \`\${source} Dhampir Vampiric Bite attack should refresh to PB 3 at level 5, got \${leveledBiteAttack?.bonus}\`);
}

let vampireCharacter = refreshAutomaticStyleAttacks(buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: vampire,
}));
const vampireBloodThirstAttackId = 'auto-race-attack-vampire-psz-blood-thirst';
let vampireBloodThirstAttack = getAttack(vampireCharacter, vampireBloodThirstAttackId);
assert(vampireBloodThirstAttack?.name === '嗜血', 'PSZ Vampire should add Blood Thirst attack');
assert(vampireBloodThirstAttack?.bonus === '+2', \`PSZ Vampire Blood Thirst should use STR plus proficiency at level 1, got \${vampireBloodThirstAttack?.bonus}\`);
assert(vampireBloodThirstAttack?.damage === '1 穿刺 + 1d6 暗蚀', \`PSZ Vampire Blood Thirst should use fixed damage, got \${vampireBloodThirstAttack?.damage}\`);
assert(vampireBloodThirstAttack?.type === '种族攻击', 'PSZ Vampire Blood Thirst should be typed as race attack');
assert(vampireBloodThirstAttack?.notes.includes('最大生命值降低'), 'PSZ Vampire Blood Thirst should keep healing and max HP reduction notes');
vampireCharacter = levelToFive(vampireCharacter, fighter, '5r');
vampireBloodThirstAttack = getAttack(vampireCharacter, vampireBloodThirstAttackId);
assert(vampireBloodThirstAttack?.bonus === '+3', \`PSZ Vampire Blood Thirst should refresh proficiency bonus at level 5, got \${vampireBloodThirstAttack?.bonus}\`);

for (const [hexblood, source] of [
  [rhwHexblood, 'RHW'],
  [vrgrHexblood, 'VRGR'],
]) {
  const resourceId = \`auto-resource-race-Hexblood-\${source}-eerie-token\`;
  const hexbloodCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
    ...baseOptions,
    race: hexblood,
  });
  const hexbloodResource = getResource(hexbloodCharacter, resourceId);
  assert(hexbloodResource?.max === 1 && hexbloodResource.reset === 'longRest', \`\${source} Hexblood should add one-use Eerie Token long-rest resource\`);
  assert(hexbloodResource?.note.includes('远程传信') && hexbloodResource?.note.includes('遥远视野'), \`\${source} Hexblood Eerie Token should keep token mode notes\`);
  const removedHexblood = removeCharacterAdjustments(hexbloodCharacter, 'auto-character-5r');
  assert(!getResource(removedHexblood, resourceId), \`removing auto-character should remove \${source} Hexblood Eerie Token resource\`);
}

const deepGnomeResourceId = 'auto-resource-race-Deep Gnome-MPMM-svirfneblin-camouflage';
let deepGnomeCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: deepGnome,
});
const deepGnomeResource = getResource(deepGnomeCharacter, deepGnomeResourceId);
assert(deepGnomeResource?.max === 2 && deepGnomeResource.reset === 'longRest', 'MPMM Deep Gnome should add proficiency-based Svirfneblin Camouflage resource');
assert(deepGnomeResource?.note.includes('隐匿'), 'MPMM Deep Gnome Svirfneblin Camouflage resource should keep stealth advantage note');
for (let index = 0; index < 4; index += 1) {
  deepGnomeCharacter = buildLevelUpCharacter(deepGnomeCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const leveledDeepGnomeResource = getResource(deepGnomeCharacter, deepGnomeResourceId);
assert(leveledDeepGnomeResource?.max === 3, \`MPMM Deep Gnome Svirfneblin Camouflage should refresh to PB 3 at level 5, got \${leveledDeepGnomeResource?.max}\`);

const hadozeeResourceId = 'auto-resource-race-Hadozee-AAG-hadozee-dodge';
let hadozeeCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: hadozee,
});
const hadozeeResource = getResource(hadozeeCharacter, hadozeeResourceId);
assert(hadozeeResource?.max === 2 && hadozeeResource.reset === 'longRest', 'AAG Hadozee should add proficiency-based Hadozee Dodge resource');
assert(hadozeeResource?.note.includes('1d6'), 'AAG Hadozee Dodge resource should keep damage reduction note');
for (let index = 0; index < 4; index += 1) {
  hadozeeCharacter = buildLevelUpCharacter(hadozeeCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const leveledHadozeeResource = getResource(hadozeeCharacter, hadozeeResourceId);
assert(leveledHadozeeResource?.max === 3, \`AAG Hadozee Dodge should refresh to PB 3 at level 5, got \${leveledHadozeeResource?.max}\`);

const giffResourceId = 'auto-resource-race-Giff-AAG-astral-spark';
let giffCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: giff,
});
const giffResource = getResource(giffCharacter, giffResourceId);
assert(giffResource?.max === 2 && giffResource.reset === 'longRest', 'AAG Giff should add proficiency-based Astral Spark resource');
assert(giffResource?.note.includes('力场'), 'AAG Giff Astral Spark resource should keep force damage note');
for (let index = 0; index < 4; index += 1) {
  giffCharacter = buildLevelUpCharacter(giffCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const leveledGiffResource = getResource(giffCharacter, giffResourceId);
assert(leveledGiffResource?.max === 3, \`AAG Giff Astral Spark should refresh to PB 3 at level 5, got \${leveledGiffResource?.max}\`);

const efaShifterResourceId = 'auto-resource-race-Shifter-EFA-shifting';
let efaShifterCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: efaShifter,
});
const efaShifterResource = getResource(efaShifterCharacter, efaShifterResourceId);
assert(efaShifterResource?.max === 2 && efaShifterResource.reset === 'longRest', 'EFA Shifter should add proficiency-based Shifting resource');
for (let index = 0; index < 4; index += 1) {
  efaShifterCharacter = buildLevelUpCharacter(efaShifterCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const leveledEfaShifterResource = getResource(efaShifterCharacter, efaShifterResourceId);
assert(leveledEfaShifterResource?.max === 3, \`EFA Shifter Shifting should refresh to PB 3 at level 5, got \${leveledEfaShifterResource?.max}\`);

const mpmmShifterResourceId = 'auto-resource-race-Shifter-MPMM-shifting';
let mpmmShifterCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: mpmmShifter,
});
const mpmmShifterResource = getResource(mpmmShifterCharacter, mpmmShifterResourceId);
assert(mpmmShifterResource?.max === 2 && mpmmShifterResource.reset === 'longRest', 'MPMM Shifter should add proficiency-based Shifting resource');
for (let index = 0; index < 4; index += 1) {
  mpmmShifterCharacter = buildLevelUpCharacter(mpmmShifterCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const leveledMpmmShifterResource = getResource(mpmmShifterCharacter, mpmmShifterResourceId);
assert(leveledMpmmShifterResource?.max === 3, \`MPMM Shifter Shifting should refresh to PB 3 at level 5, got \${leveledMpmmShifterResource?.max}\`);

const erlwShifterCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, wizard, {
  ruleSystem: '5e',
  race: erlwShifter,
  background: phbBackground,
  skillChoices: [],
  spellChoices: { cantrips: [], leveled: [] },
});
const erlwShifterResource = getResource(erlwShifterCharacter, 'auto-resource-race-Shifter-ERLW-shifting');
assert(erlwShifterResource?.max === 1 && erlwShifterResource.reset === 'shortRest', 'ERLW Shifter should add one-use Shifting short-rest resource');

const leoninCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, wizard, {
  ruleSystem: '5e',
  race: leonin,
  background: phbBackground,
  skillChoices: [],
  spellChoices: { cantrips: [], leveled: [] },
});
const leoninRoarResource = getResource(leoninCharacter, 'auto-resource-race-Leonin-MOT-daunting-roar');
assert(leoninRoarResource?.max === 1 && leoninRoarResource.reset === 'shortRest', 'MOT Leonin should add one-use Daunting Roar short-rest resource');
assert(leoninRoarResource?.note.includes('DC = 8') && leoninRoarResource.note.includes('恐慌'), 'MOT Leonin Daunting Roar resource should keep DC and frightened note');
const removedLeonin = removeCharacterAdjustments(leoninCharacter, 'auto-character-5e');
assert(!getResource(removedLeonin, 'auto-resource-race-Leonin-MOT-daunting-roar'), 'removing auto-character should remove Leonin Daunting Roar resource');

const lupinResourceId = 'auto-resource-race-Lupin-RHW-howl';
let lupinCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: lupin,
});
const lupinHowlResource = getResource(lupinCharacter, lupinResourceId);
assert(lupinHowlResource?.max === 2 && lupinHowlResource.reset === 'longRest', 'RHW Lupin should add proficiency-based Howl long-rest resource');
assert(lupinHowlResource?.note.includes('DC = 8') && lupinHowlResource.note.includes('劣势'), 'RHW Lupin Howl resource should keep DC and disadvantage note');
lupinCharacter = levelToFive(lupinCharacter, fighter, '5r');
const leveledLupinHowlResource = getResource(lupinCharacter, lupinResourceId);
assert(leveledLupinHowlResource?.max === 3, 'RHW Lupin Howl should refresh to PB 3 at level 5');

const khoravarCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: khoravar,
});
const khoravarLethargyResource = getResource(khoravarCharacter, 'auto-resource-race-Khoravar-EFA-lethargy-resilience');
assert(khoravarLethargyResource?.max === 1 && khoravarLethargyResource.reset === 'manual', 'EFA Khoravar should add manual Lethargy Resilience resource');
assert(khoravarLethargyResource?.note.includes('1d4 次长休'), 'EFA Khoravar Lethargy Resilience resource should keep recovery note');
const removedKhoravar = removeCharacterAdjustments(khoravarCharacter, 'auto-character-5r');
assert(!getResource(removedKhoravar, 'auto-resource-race-Khoravar-EFA-lethargy-resilience'), 'removing auto-character should remove Khoravar Lethargy Resilience resource');

const vedalkenCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, wizard, {
  ruleSystem: '5e',
  race: vedalken,
  background: phbBackground,
  skillChoices: [],
  spellChoices: { cantrips: [], leveled: [] },
});
const vedalkenAmphibiousResource = getResource(vedalkenCharacter, 'auto-resource-race-Vedalken-GGR-partially-amphibious');
assert(vedalkenAmphibiousResource?.max === 1 && vedalkenAmphibiousResource.reset === 'longRest', 'GGR Vedalken should add one-use Partially Amphibious long-rest resource');
assert(vedalkenAmphibiousResource?.note.includes('水下呼吸'), 'GGR Vedalken Partially Amphibious resource should keep underwater breathing note');
const removedVedalken = removeCharacterAdjustments(vedalkenCharacter, 'auto-character-5e');
assert(!getResource(removedVedalken, 'auto-resource-race-Vedalken-GGR-partially-amphibious'), 'removing auto-character should remove Vedalken Partially Amphibious resource');

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
const autognomeBuiltForSuccessResource = getResource(autognomeCharacter, 'auto-resource-race-Autognome-AAG-built-for-success');
assert(autognomeBuiltForSuccessResource?.max === 2 && autognomeBuiltForSuccessResource.reset === 'longRest', 'AAG Autognome should add proficiency-based Built for Success resource');
assert(autognomeBuiltForSuccessResource?.note.includes('1d4'), 'AAG Autognome Built for Success resource should keep d4 note');
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
assert(!getResource(removedAutognome, 'auto-resource-race-Autognome-AAG-built-for-success'), 'removing auto-character should remove Autognome Built for Success resource');
let leveledAutognomeCharacter = autognomeCharacter;
for (let index = 0; index < 4; index += 1) {
  leveledAutognomeCharacter = buildLevelUpCharacter(leveledAutognomeCharacter, content, fighter, {
    ruleSystem: '5r',
    spellChoices: { cantrips: [], leveled: [] },
  });
}
const leveledAutognomeBuiltForSuccessResource = getResource(leveledAutognomeCharacter, 'auto-resource-race-Autognome-AAG-built-for-success');
assert(leveledAutognomeBuiltForSuccessResource?.max === 3, \`AAG Autognome Built for Success should refresh to PB 3 at level 5, got \${leveledAutognomeBuiltForSuccessResource?.max}\`);

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

const naturalAttackCases = [
  {
    race: aarakocra,
    sourceId: 'auto-race-attack-aarakocra-mpmm-talons',
    name: '禽爪',
    damage: '1d6 挥砍',
  },
  {
    race: mpmmCentaur,
    sourceId: 'auto-race-attack-centaur-mpmm-hooves',
    name: '蹄击',
    damage: '1d6 钝击',
  },
  {
    race: mpmmMinotaur,
    sourceId: 'auto-race-attack-minotaur-mpmm-horns',
    name: '角击',
    damage: '1d6 穿刺',
  },
  {
    race: mpmmLizardfolk,
    sourceId: 'auto-race-attack-lizardfolk-mpmm-bite',
    name: '啃咬',
    damage: '1d6 挥砍',
  },
  {
    race: tortle,
    sourceId: 'auto-race-attack-tortle-mpmm-claws',
    name: '爪击',
    damage: '1d6 挥砍',
  },
];

for (const item of naturalAttackCases) {
  const character = refreshAutomaticStyleAttacks(buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
    ...baseOptions,
    race: item.race,
  }));
  const attack = getAttack(character, item.sourceId);
  assert(attack?.name === item.name, \`\${item.race.key} should add natural attack \${item.name}\`);
  assert(attack?.bonus === '+2', \`\${item.race.key} natural attack should use STR plus proficiency at level 1, got \${attack?.bonus}\`);
  assert(attack?.damage === item.damage, \`\${item.race.key} natural attack damage should be \${item.damage}, got \${attack?.damage}\`);
  assert(attack?.type === '徒手打击', \`\${item.race.key} natural attack should be typed as unarmed strike\`);
  assert(attack?.notes.includes('天然武器'), \`\${item.race.key} natural attack should keep feature notes\`);
  if (item.race.key === 'Minotaur') {
    assert(attack.notes.includes('角锤') && attack.notes.includes('DC = 8 + 熟练加值 + 力量调整值'), 'Minotaur horns should keep Hammering Horns push DC note');
  }
  const refreshedCharacter = refreshAutomaticStyleAttacks(character);
  const refreshedAttacks = refreshedCharacter.attacks.filter(nextAttack => nextAttack.sourceId === item.sourceId);
  assert(refreshedAttacks.length === 1, \`\${item.race.key} natural attack refresh should not duplicate attack entries\`);
}
const leveledAarakocraAttack = getAttack(
  refreshAutomaticStyleAttacks(levelToFive(buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
    ...baseOptions,
    race: aarakocra,
  }), fighter, '5r')),
  'auto-race-attack-aarakocra-mpmm-talons',
);
assert(leveledAarakocraAttack?.bonus === '+3', \`Aarakocra natural attack should refresh proficiency bonus at level 5, got \${leveledAarakocraAttack?.bonus}\`);

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

const xphbHumanCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, fighter, {
  ...baseOptions,
  race: xphbHuman,
});
assert(xphbHumanCharacter.inspiration === true, 'XPHB Human Resourceful should set heroic inspiration');
const removedXphbHuman = removeCharacterAdjustments(xphbHumanCharacter, 'auto-character-5r');
assert(removedXphbHuman.inspiration === false, 'removing XPHB Human should restore previous inspiration state');
const inspiredXphbHuman = buildLevelOneCharacter({ ...INITIAL_CHARACTER, inspiration: true }, content, fighter, {
  ...baseOptions,
  race: xphbHuman,
});
const removedInspiredXphbHuman = removeCharacterAdjustments(inspiredXphbHuman, 'auto-character-5r');
assert(removedInspiredXphbHuman.inspiration === true, 'removing XPHB Human should preserve pre-existing inspiration');

export default {
  races: [aasimar.name, xphbAasimar.name, astralElf.name, dragonborn.name, xphbDragonborn.name, chromaticDragonborn.name, gemDragonborn.name, metallicDragonborn.name, eladrin.name, dwarf.name, xphbDwarf.name, xphbOrc.name, mpmmOrc.name, halfOrc.name, mpmmGoliath.name, vgmGoliath.name, xphbGoliath.name, mpmmHarengon.name, wbtwHarengon.name, kender.name, kenku.name, mpmmKobold.name, vgmKobold.name, rhwReborn.name, vrgrReborn.name, shadarKai.name, mpmmFirbolg.name, vgmFirbolg.name, mpmmGoblin.name, vgmGoblin.name, mpmmHobgoblin.name, hobgoblin.name, mpmmLizardfolk.name, vgmLizardfolk.name, rhwDhampir.name, vrgrDhampir.name, vampire.name, rhwHexblood.name, vrgrHexblood.name, deepGnome.name, hadozee.name, giff.name, efaShifter.name, erlwShifter.name, mpmmShifter.name, autognome.name, yuanTi.name, aarakocra.name, mpmmCentaur.name, mpmmMinotaur.name, leonin.name, lupin.name, khoravar.name, loxodon.name, vedalken.name, xphbHuman.name, tortle.name, warforged.name],
  checks: [
    'fixed race darkvision adds reversible structured sense',
    'fixed race resistances add reversible structured resistances',
    'Healing Hands adds reversible long-rest race resource',
    'Aasimar Celestial Revelation adds level-gated long-rest race resource',
    'Astral Elf and Eladrin teleport resources refresh proficiency-based uses',
    'chosen race resistance adds reversible structured resistance',
    'Dragonborn Breath Weapon adds source-specific race resources and level-gated resources',
    'structured origin data keeps feature descriptions',
    'fixed race weapon proficiencies normalize source suffixes and affect attacks',
    'XPHB Dwarf adds reversible HP max bonus and scales it on level up',
    'XPHB Dwarf Stonecunning refreshes proficiency-based uses',
    'Orc Adrenaline Rush adds reversible proficiency-based resources and refreshes on level up',
    'Relentless Endurance adds reversible long-rest race resources',
    'Goliath Stone Endurance adds source-specific race resources and refreshes proficiency-based uses',
    'XPHB Goliath Large Form adds level-gated long-rest resource',
    'Harengon Rabbit Hop and Hare-Trigger refresh proficiency-based values',
    'Kender, Kenku, Kobold, Reborn, and Shadar-Kai resources add and refresh source-specific uses',
    'Kender Taunt refreshes proficiency-based uses',
    'Goblin and Hobgoblin source-specific resources refresh proficiency-based uses',
    'Hobgoblin Fey Gift refreshes proficiency-based uses',
    'Firbolg and Lizardfolk source-specific resources refresh proficiency-based uses',
    'Dhampir Vampiric Bite adds source-specific resource and CON-based attack',
    'PSZ Vampire Blood Thirst adds fixed-damage race attack',
    'Hexblood Eerie Token adds source-specific long-rest resource',
    'Deep Gnome Svirfneblin Camouflage refreshes proficiency-based uses',
    'Hadozee Dodge refreshes proficiency-based uses',
    'Giff Astral Spark refreshes proficiency-based uses',
    'Shifter source-specific Shifting resources refresh proficiency-based uses',
    'Leonin Daunting Roar adds one-use short-rest resource',
    'Lupin Howl refreshes proficiency-based uses',
    'Khoravar Lethargy Resilience adds manual recovery resource',
    'Vedalken Partially Amphibious adds one-use long-rest resource',
    'chosen race weapon proficiencies expose choices and apply selected weapons',
    'fixed condition immunities add reversible structured entries',
    'fixed damage immunities add structured entries and feature descriptions',
    'Autognome Built for Success refreshes proficiency-based uses',
    'constant racial armor formulas update armor class',
    'natural weapon race features add refreshable attack entries',
    'Warforged integrated protection adds reversible armor bonus',
    'XPHB Human Resourceful applies reversible heroic inspiration',
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
