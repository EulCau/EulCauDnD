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
  applyCharacterAdjustments,
  removeCharacterAdjustments,
} from '${projectImport('utils/characterAdjustments.ts')}';
import {
  equipArmor,
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
const nonLightMeleeWeapon = weapons.find(weapon => !hasProperty(weapon, 'L') && !hasProperty(weapon, '2H') && String(weapon.type || '').split('|')[0] === 'M' && weapon.dmg1);
const nonFinesseMeleeWeapon = weapons.find(weapon => !hasProperty(weapon, 'F') && String(weapon.type || '').split('|')[0] === 'M' && weapon.dmg1);
const twoHandWeapon = weapons.find(weapon => hasProperty(weapon, '2H'));
const rangedWeapon = weapons.find(weapon => String(weapon.type || '').split('|')[0] === 'R' && weapon.dmg1);
const phbFinesseWeapon = weapons.find(weapon => weapon.source === 'PHB' && hasProperty(weapon, 'F') && weapon.dmg1);
const xphbFinesseWeapon = weapons.find(weapon => weapon.source === 'XPHB' && hasProperty(weapon, 'F') && weapon.dmg1);
const handCrossbow = weapons.find(weapon => weapon.key === 'Hand Crossbow' && weapon.source === 'PHB');
const xphbHandCrossbow = weapons.find(weapon => weapon.key === 'Hand Crossbow' && weapon.source === 'XPHB');
const bludgeoningWeapon = weapons.find(weapon => weapon.dmgType === 'B' && weapon.dmg1);
const piercingWeapon = weapons.find(weapon => weapon.dmgType === 'P' && weapon.dmg1);
const slashingWeapon = weapons.find(weapon => weapon.dmgType === 'S' && weapon.dmg1);
const thrownWeapon = weapons.find(weapon => hasProperty(weapon, 'T') && weapon.range && weapon.dmg1);
const loadingAmmunitionWeapon = weapons.find(weapon => hasProperty(weapon, 'A') && hasProperty(weapon, 'LD') && weapon.range && weapon.dmg1);
const reachWeapon = weapons.find(weapon => hasProperty(weapon, 'R') && !hasProperty(weapon, 'S') && weapon.dmg1);
const phbGlaive = weapons.find(weapon => weapon.key === 'Glaive' && weapon.source === 'PHB');
const phbQuarterstaff = weapons.find(weapon => weapon.key === 'Quarterstaff' && weapon.source === 'PHB');
const xphbGlaive = weapons.find(weapon => weapon.key === 'Glaive' && weapon.source === 'XPHB');
const xphbWhip = weapons.find(weapon => weapon.key === 'Whip' && weapon.source === 'XPHB');
const versatileWeapon = weapons.find(weapon => hasProperty(weapon, 'V') && weapon.dmg1 && weapon.dmg2);
const specialWeapon = weapons.find(weapon => hasProperty(weapon, 'S') && weapon.entries?.length);
const heavyMelee5eWeapon = weapons.find(weapon => (
  weapon.source === 'PHB'
  && hasProperty(weapon, 'H')
  && String(weapon.type || '').split('|')[0] === 'M'
  && weapon.dmg1
));
const heavyRanged5rWeapon = weapons.find(weapon => (
  weapon.source === 'XPHB'
  && hasProperty(weapon, 'H')
  && String(weapon.type || '').split('|')[0] === 'R'
  && weapon.dmg1
));
const shield = content.armors.find(armor => String(armor.type || '').split('|')[0] === 'S');
const mediumArmor = content.armors.find(armor => String(armor.type || '').split('|')[0] === 'MA' && Number(armor.ac) > 0);

assert(lightWeapon, 'missing light weapon fixture');
assert(nonLightWeapon, 'missing non-light weapon fixture');
assert(nonLightMeleeWeapon, 'missing non-light one-handed melee weapon fixture');
assert(nonFinesseMeleeWeapon, 'missing non-finesse melee weapon fixture');
assert(twoHandWeapon, 'missing two-handed weapon fixture');
assert(rangedWeapon, 'missing ranged weapon fixture');
assert(phbFinesseWeapon, 'missing PHB finesse weapon fixture');
assert(xphbFinesseWeapon, 'missing XPHB finesse weapon fixture');
assert(handCrossbow, 'missing PHB hand crossbow fixture');
assert(xphbHandCrossbow, 'missing XPHB hand crossbow fixture');
assert(bludgeoningWeapon, 'missing bludgeoning weapon fixture');
assert(piercingWeapon, 'missing piercing weapon fixture');
assert(slashingWeapon, 'missing slashing weapon fixture');
assert(thrownWeapon, 'missing thrown weapon fixture');
assert(loadingAmmunitionWeapon, 'missing ammunition/loading weapon fixture');
assert(reachWeapon, 'missing reach weapon fixture');
assert(phbGlaive, 'missing PHB glaive fixture');
assert(phbQuarterstaff, 'missing PHB quarterstaff fixture');
assert(xphbGlaive, 'missing XPHB glaive fixture');
assert(xphbWhip, 'missing XPHB whip fixture');
assert(versatileWeapon, 'missing versatile weapon fixture');
assert(specialWeapon, 'missing special weapon fixture');
assert(heavyMelee5eWeapon, 'missing PHB heavy melee weapon fixture');
assert(heavyRanged5rWeapon, 'missing XPHB heavy ranged weapon fixture');
assert(shield, 'missing shield fixture');
assert(mediumArmor, 'missing medium armor fixture');

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
character = equipWeapon(character, thrownWeapon, content);
const thrownAttack = getAttack(character, \`equip-weapon-\${thrownWeapon.id}\`);
assert(thrownAttack, 'thrown weapon should add attack');
assert(
  thrownAttack.notes.includes('投掷射程'),
  \`thrown weapon notes should mention thrown range, got \${thrownAttack.notes}\`,
);

character = cloneCharacter();
character = equipWeapon(character, loadingAmmunitionWeapon, content);
const loadingAmmunitionAttack = getAttack(character, \`equip-weapon-\${loadingAmmunitionWeapon.id}\`);
assert(loadingAmmunitionAttack, 'ammunition/loading weapon should add attack');
assert(
  loadingAmmunitionAttack.notes.includes('弹药') && loadingAmmunitionAttack.notes.includes('装填'),
  \`ammunition/loading weapon notes should mention both properties, got \${loadingAmmunitionAttack.notes}\`,
);
assert(
  loadingAmmunitionAttack.notes.includes('射程'),
  \`ammunition/loading weapon notes should mention range, got \${loadingAmmunitionAttack.notes}\`,
);

character = cloneCharacter();
character = equipWeapon(character, reachWeapon, content);
const reachAttack = getAttack(character, \`equip-weapon-\${reachWeapon.id}\`);
assert(reachAttack, 'reach weapon should add attack');
assert(
  reachAttack.notes.includes('触及 10 尺'),
  \`reach weapon notes should mention 10-foot reach, got \${reachAttack.notes}\`,
);

character = cloneCharacter();
character = equipWeapon(character, versatileWeapon, content);
const versatileAttack = getAttack(character, \`equip-weapon-\${versatileWeapon.id}\`);
assert(versatileAttack, 'versatile weapon should add attack');
assert(
  versatileAttack.damage.includes(versatileWeapon.dmg2) && versatileAttack.damage.includes('双手'),
  \`versatile weapon damage should show two-handed damage option, got \${versatileAttack.damage}\`,
);

character = cloneCharacter();
character = equipWeapon(character, specialWeapon, content);
const specialAttack = getAttack(character, \`equip-weapon-\${specialWeapon.id}\`);
assert(specialAttack, 'special weapon should add attack');
assert(
  specialAttack.notes.includes('特殊') && specialAttack.notes.length > '特殊'.length,
  \`special weapon notes should include special entry summary, got \${specialAttack.notes}\`,
);

character = {
  ...cloneCharacter(),
  bodyType: '小型',
};
character = equipWeapon(character, heavyMelee5eWeapon, content);
const heavyMelee5eAttack = getAttack(character, \`equip-weapon-\${heavyMelee5eWeapon.id}\`);
assert(heavyMelee5eAttack, 'PHB heavy melee weapon should add attack');
assert(
  heavyMelee5eAttack.notes.includes('当前体型') && heavyMelee5eAttack.notes.includes('劣势'),
  \`PHB heavy weapon notes should mention current small size disadvantage, got \${heavyMelee5eAttack.notes}\`,
);

character = {
  ...cloneCharacter(),
  abilities: { ...cloneCharacter().abilities, DEX: 12 },
};
character = equipWeapon(character, heavyRanged5rWeapon, content);
const heavyRanged5rAttack = getAttack(character, \`equip-weapon-\${heavyRanged5rWeapon.id}\`);
assert(heavyRanged5rAttack, 'XPHB heavy ranged weapon should add attack');
assert(
  heavyRanged5rAttack.notes.includes('敏捷低于 13') && heavyRanged5rAttack.notes.includes('劣势'),
  \`XPHB heavy ranged weapon notes should mention Dexterity 13 disadvantage, got \${heavyRanged5rAttack.notes}\`,
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
const lightOffHandAttack = getAttack(character, \`equip-weapon-offhand-\${lightWeapon.id}\`);
assert(
  lightOffHandAttack.bonus === '+6',
  \`off-hand attack bonus should include ability modifier and proficiency, got \${lightOffHandAttack.bonus}\`,
);
character = equipWeapon(character, nonLightWeapon, content);
assert(
  !character.appliedAdjustments.some(adjustment => adjustment.sourceId.startsWith('equip-weapon-offhand-')),
  'equipping a non-light main hand should remove existing off-hand weapon',
);

character = cloneCharacter();
character = addFeature(character, '双持客', 'auto-feat-Dual Wielder-PHB');
character = equipWeapon(character, nonLightMeleeWeapon, content);
assert(
  getOffHandWeaponEquipBlockReason(character, nonLightMeleeWeapon, content) === '',
  'PHB Dual Wielder should allow non-light one-handed melee off-hand weapon',
);
character = equipOffHandWeapon(character, nonLightMeleeWeapon, content);
assert(
  character.appliedAdjustments.some(adjustment => adjustment.sourceId === \`equip-weapon-offhand-\${nonLightMeleeWeapon.id}\`),
  'PHB Dual Wielder should equip non-light one-handed melee off-hand weapon',
);
assert(
  character.appliedAdjustments.some(adjustment => adjustment.sourceId === 'auto-dual-wielder-armor-bonus'),
  'PHB Dual Wielder should add an automatic armor bonus while dual wielding',
);
assert(character.armorBonus === 1, \`PHB Dual Wielder should add +1 armor bonus while dual wielding, got \${character.armorBonus}\`);
character = removeCharacterAdjustments(character, \`equip-weapon-offhand-\${nonLightMeleeWeapon.id}\`);
character = refreshCharacterAutomation(character, content);
assert(
  !character.appliedAdjustments.some(adjustment => adjustment.sourceId === 'auto-dual-wielder-armor-bonus'),
  'PHB Dual Wielder armor bonus should be removed after unequipping off-hand weapon',
);
assert(character.armorBonus === 0, \`PHB Dual Wielder armor bonus should be removed after off-hand unequip, got \${character.armorBonus}\`);

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
character = addFeature(character, '盾牌大师', 'auto-feat-Shield Master-PHB');
character = equipWeapon(character, nonLightMeleeWeapon, content);
let phbShieldMasterMeleeAttack = getAttack(character, \`equip-weapon-\${nonLightMeleeWeapon.id}\`);
assert(phbShieldMasterMeleeAttack, 'PHB Shield Master melee fixture should add attack');
assert(
  !phbShieldMasterMeleeAttack.notes.includes('盾牌大师'),
  \`PHB Shield Master should not apply before shield is equipped, got \${phbShieldMasterMeleeAttack.notes}\`,
);
character = equipShield(character, shield, content);
phbShieldMasterMeleeAttack = getAttack(character, \`equip-weapon-\${nonLightMeleeWeapon.id}\`);
assert(phbShieldMasterMeleeAttack, 'PHB Shield Master melee fixture should keep attack after shield equip');
assert(
  phbShieldMasterMeleeAttack.notes.includes('盾牌大师') && phbShieldMasterMeleeAttack.notes.includes('附赠动作'),
  \`PHB Shield Master melee attack should refresh with shield bash note after shield equip, got \${phbShieldMasterMeleeAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '盾牌大师', 'auto-feat-Shield Master-XPHB');
character = equipShield(character, shield, content);
character = equipWeapon(character, nonLightMeleeWeapon, content);
const xphbShieldMasterMeleeAttack = getAttack(character, \`equip-weapon-\${nonLightMeleeWeapon.id}\`);
assert(xphbShieldMasterMeleeAttack, 'XPHB Shield Master melee fixture should add attack');
assert(
  xphbShieldMasterMeleeAttack.notes.includes('盾牌大师') && xphbShieldMasterMeleeAttack.notes.includes('DC 14') && xphbShieldMasterMeleeAttack.notes.includes('倒地'),
  \`XPHB Shield Master melee attack should include shield bash DC note, got \${xphbShieldMasterMeleeAttack.notes}\`,
);
character = equipWeapon(character, rangedWeapon, content);
const xphbShieldMasterRangedAttack = getAttack(character, \`equip-weapon-\${rangedWeapon.id}\`);
assert(xphbShieldMasterRangedAttack, 'XPHB Shield Master ranged fixture should add attack');
assert(
  !xphbShieldMasterRangedAttack.notes.includes('盾牌大师'),
  \`XPHB Shield Master should not apply to ranged attacks, got \${xphbShieldMasterRangedAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '擒抱者', 'auto-feat-Grappler-PHB');
character = equipWeapon(character, nonLightMeleeWeapon, content);
const phbGrapplerWeaponAttack = getAttack(character, \`equip-weapon-\${nonLightMeleeWeapon.id}\`);
assert(phbGrapplerWeaponAttack, 'PHB Grappler weapon fixture should add attack');
assert(
  phbGrapplerWeaponAttack.notes.includes('擒抱者') && phbGrapplerWeaponAttack.notes.includes('具有优势'),
  \`PHB Grappler weapon attack should include advantage against grappled target note, got \${phbGrapplerWeaponAttack.notes}\`,
);
character = addFeature(character, 'Unarmed Fighting');
character = refreshCharacterAutomation(character, content);
const phbGrapplerUnarmedAttack = getAttack(character, 'auto-style-attack-unarmed-fighting');
assert(phbGrapplerUnarmedAttack, 'PHB Grappler unarmed fixture should add attack');
assert(
  phbGrapplerUnarmedAttack.notes.includes('压制被你擒抱的生物'),
  \`PHB Grappler unarmed attack should include pin note, got \${phbGrapplerUnarmedAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '擒抱者', 'auto-feat-Grappler-XPHB');
character = equipWeapon(character, rangedWeapon, content);
const xphbGrapplerWeaponAttack = getAttack(character, \`equip-weapon-\${rangedWeapon.id}\`);
assert(xphbGrapplerWeaponAttack, 'XPHB Grappler weapon fixture should add attack');
assert(
  xphbGrapplerWeaponAttack.notes.includes('擒抱者') && xphbGrapplerWeaponAttack.notes.includes('具有优势'),
  \`XPHB Grappler weapon attack should include advantage against grappled target note, got \${xphbGrapplerWeaponAttack.notes}\`,
);
character = addFeature(character, 'Unarmed Fighting');
character = refreshCharacterAutomation(character, content);
const xphbGrapplerUnarmedAttack = getAttack(character, 'auto-style-attack-unarmed-fighting');
assert(xphbGrapplerUnarmedAttack, 'XPHB Grappler unarmed fixture should add attack');
assert(
  xphbGrapplerUnarmedAttack.notes.includes('同时造成伤害并擒抱') && xphbGrapplerUnarmedAttack.notes.includes('拖行'),
  \`XPHB Grappler unarmed attack should include punch-and-grab and fast drag notes, got \${xphbGrapplerUnarmedAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '巫师杀手', 'auto-feat-Mage Slayer-PHB');
character = equipWeapon(character, nonLightMeleeWeapon, content);
const phbMageSlayerMeleeAttack = getAttack(character, \`equip-weapon-\${nonLightMeleeWeapon.id}\`);
assert(phbMageSlayerMeleeAttack, 'PHB Mage Slayer melee fixture should add attack');
assert(
  phbMageSlayerMeleeAttack.notes.includes('巫师杀手') && phbMageSlayerMeleeAttack.notes.includes('反应近战武器攻击') && phbMageSlayerMeleeAttack.notes.includes('专注'),
  \`PHB Mage Slayer melee attack should include reaction and concentration notes, got \${phbMageSlayerMeleeAttack.notes}\`,
);
character = equipWeapon(character, rangedWeapon, content);
const phbMageSlayerRangedAttack = getAttack(character, \`equip-weapon-\${rangedWeapon.id}\`);
assert(phbMageSlayerRangedAttack, 'PHB Mage Slayer ranged fixture should add attack');
assert(
  phbMageSlayerRangedAttack.notes.includes('巫师杀手')
    && phbMageSlayerRangedAttack.notes.includes('专注')
    && !phbMageSlayerRangedAttack.notes.includes('反应近战武器攻击'),
  \`PHB Mage Slayer ranged attack should include concentration note only, got \${phbMageSlayerRangedAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '巫师杀手', 'auto-feat-Mage Slayer-XPHB');
character = addFeature(character, 'Unarmed Fighting');
character = refreshCharacterAutomation(character, content);
const xphbMageSlayerUnarmedAttack = getAttack(character, 'auto-style-attack-unarmed-fighting');
assert(xphbMageSlayerUnarmedAttack, 'XPHB Mage Slayer unarmed fixture should add attack');
assert(
  xphbMageSlayerUnarmedAttack.notes.includes('巫师杀手')
    && xphbMageSlayerUnarmedAttack.notes.includes('专注')
    && !xphbMageSlayerUnarmedAttack.notes.includes('反应近战武器攻击'),
  \`XPHB Mage Slayer unarmed attack should include concentration note only, got \${xphbMageSlayerUnarmedAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '酒馆斗殴者', 'auto-feat-Tavern Brawler-PHB');
character = refreshCharacterAutomation(character, content);
const phbTavernBrawlerUnarmedAttack = getAttack(character, 'auto-feat-attack-tavern-brawler-unarmed');
assert(phbTavernBrawlerUnarmedAttack, 'PHB Tavern Brawler should add an unarmed strike attack');
assert(
  phbTavernBrawlerUnarmedAttack.damage.includes('1d4+3')
    && phbTavernBrawlerUnarmedAttack.notes.includes('附赠动作擒抱'),
  \`PHB Tavern Brawler unarmed strike should use d4 and include bonus grapple note, got \${phbTavernBrawlerUnarmedAttack.damage} / \${phbTavernBrawlerUnarmedAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '酒馆斗殴者', 'auto-feat-Tavern Brawler-XPHB');
character = refreshCharacterAutomation(character, content);
const xphbTavernBrawlerUnarmedAttack = getAttack(character, 'auto-feat-attack-tavern-brawler-unarmed');
assert(xphbTavernBrawlerUnarmedAttack, 'XPHB Tavern Brawler should add an unarmed strike attack');
assert(
  xphbTavernBrawlerUnarmedAttack.damage.includes('1d4+3')
    && xphbTavernBrawlerUnarmedAttack.notes.includes('掷出 1 可重掷'),
  \`XPHB Tavern Brawler unarmed strike should use d4 and include reroll note, got \${xphbTavernBrawlerUnarmedAttack.damage} / \${xphbTavernBrawlerUnarmedAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '酒馆斗殴者', 'auto-feat-Tavern Brawler-XPHB');
character = addFeature(character, 'Unarmed Fighting');
character = refreshCharacterAutomation(character, content);
const xphbTavernBrawlerStyleAttack = getAttack(character, 'auto-style-attack-unarmed-fighting');
assert(xphbTavernBrawlerStyleAttack, 'XPHB Tavern Brawler with Unarmed Fighting should keep style attack');
assert(
  !getAttack(character, 'auto-feat-attack-tavern-brawler-unarmed')
    && xphbTavernBrawlerStyleAttack.notes.includes('酒馆斗殴者')
    && xphbTavernBrawlerStyleAttack.notes.includes('掷出 1 可重掷'),
  \`XPHB Tavern Brawler should annotate existing unarmed style attack without adding duplicate, got \${xphbTavernBrawlerStyleAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '隐伏者', 'auto-feat-Skulker-PHB');
character = equipWeapon(character, rangedWeapon, content);
const phbSkulkerRangedAttack = getAttack(character, \`equip-weapon-\${rangedWeapon.id}\`);
assert(phbSkulkerRangedAttack, 'PHB Skulker ranged fixture should add attack');
assert(
  phbSkulkerRangedAttack.notes.includes('隐伏者') && phbSkulkerRangedAttack.notes.includes('远程武器攻击未命中不会暴露位置'),
  \`PHB Skulker ranged attack should include hidden miss note, got \${phbSkulkerRangedAttack.notes}\`,
);
character = equipWeapon(character, nonLightMeleeWeapon, content);
const phbSkulkerMeleeAttack = getAttack(character, \`equip-weapon-\${nonLightMeleeWeapon.id}\`);
assert(phbSkulkerMeleeAttack, 'PHB Skulker melee fixture should add attack');
assert(
  !phbSkulkerMeleeAttack.notes.includes('隐伏者'),
  \`PHB Skulker should not apply hidden miss note to melee weapon attacks, got \${phbSkulkerMeleeAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '隐伏者', 'auto-feat-Skulker-XPHB');
character = addFeature(character, 'Unarmed Fighting');
character = refreshCharacterAutomation(character, content);
const xphbSkulkerUnarmedAttack = getAttack(character, 'auto-style-attack-unarmed-fighting');
assert(xphbSkulkerUnarmedAttack, 'XPHB Skulker unarmed fixture should add attack');
assert(
  xphbSkulkerUnarmedAttack.notes.includes('隐伏者') && xphbSkulkerUnarmedAttack.notes.includes('攻击检定未命中不会暴露位置'),
  \`XPHB Skulker unarmed attack should include any-attack hidden miss note, got \${xphbSkulkerUnarmedAttack.notes}\`,
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
  getOffHandWeaponEquipBlockReason(character, lightWeapon, content) === '',
  'light template magic main hand should allow light off-hand weapon',
);
character = equipOffHandWeapon(character, lightWeapon, content);
assert(
  character.attacks.some(attack => attack.sourceId === \`equip-weapon-offhand-\${lightWeapon.id}\` && attack.offHand),
  'light template magic main hand should allow equipping an off-hand attack',
);
character = refreshCharacterAutomation(character, content);
assert(
  getAttack(character, 'equip-magic-audit-magic-1'),
  'magic weapon should keep attack after off-hand refresh',
);
assert(
  getAttack(character, \`equip-weapon-offhand-\${lightWeapon.id}\`),
  'off-hand weapon should keep attack after magic main refresh',
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

const nonLightMagicWeapon = {
  ...nonLightWeapon,
  id: \`magic-audit-\${nonLightWeapon.id}\`,
  name: \`+1 \${nonLightWeapon.name}\`,
  bonusWeapon: '+1',
};
character = equipMagicWeapon(character, nonLightMagicWeapon, {
  inventoryItemId: 'audit-magic-non-light',
  displayName: nonLightMagicWeapon.name,
  detailName: '+1 Weapon',
  magicBonus: 1,
  isTemplate: true,
  baseWeaponId: nonLightWeapon.id,
});
assert(
  !character.appliedAdjustments.some(adjustment => adjustment.sourceId.startsWith('equip-weapon-offhand-')),
  'non-light template magic weapon should remove existing off-hand weapon',
);
assert(
  getOffHandWeaponEquipBlockReason(character, lightWeapon, content).includes('基础武器不具有轻型属性'),
  'non-light template magic main hand should block light off-hand weapon',
);

character = cloneCharacter();
const standaloneMagicWeapon = {
  ...lightWeapon,
  id: \`magic-standalone-\${lightWeapon.id}\`,
  key: \`magic-standalone-\${lightWeapon.key}\`,
  name: \`独立 +1 \${lightWeapon.name}\`,
  bonusWeapon: '+1',
};
character = equipMagicWeapon(character, standaloneMagicWeapon, {
  inventoryItemId: 'audit-magic-standalone-light',
  displayName: standaloneMagicWeapon.name,
  detailName: standaloneMagicWeapon.name,
  magicBonus: 1,
  isTemplate: false,
});
let standaloneMagicAttack = getAttack(character, 'equip-magic-audit-magic-standalone-light');
assert(standaloneMagicAttack, 'standalone magic weapon should add attack');
assert(
  standaloneMagicAttack.magicWeaponSnapshot?.id === standaloneMagicWeapon.id,
  'standalone magic weapon attack should keep weapon snapshot metadata',
);
assert(
  getOffHandWeaponEquipBlockReason(character, lightWeapon, content) === '',
  'light standalone magic main hand should allow light off-hand weapon',
);
character = {
  ...character,
  abilities: { ...character.abilities, STR: 18 },
};
character = refreshCharacterAutomation(character, content);
standaloneMagicAttack = getAttack(character, 'equip-magic-audit-magic-standalone-light');
assert(standaloneMagicAttack, 'standalone magic weapon should keep attack after refresh');
assert(
  standaloneMagicAttack.bonus === '+8',
  \`standalone magic weapon attack bonus should refresh after STR change to +8, got \${standaloneMagicAttack.bonus}\`,
);
assert(
  standaloneMagicAttack.damage.includes('+5'),
  \`standalone magic weapon damage should refresh after STR change to +5, got \${standaloneMagicAttack.damage}\`,
);

character = cloneCharacter();
character = equipOffHandWeapon(character, lightWeapon, content);
const standaloneNonLightMagicWeapon = {
  ...nonLightWeapon,
  id: \`magic-standalone-\${nonLightWeapon.id}\`,
  key: \`magic-standalone-\${nonLightWeapon.key}\`,
  name: \`独立 +1 \${nonLightWeapon.name}\`,
  bonusWeapon: '+1',
};
character = equipMagicWeapon(character, standaloneNonLightMagicWeapon, {
  inventoryItemId: 'audit-magic-standalone-non-light',
  displayName: standaloneNonLightMagicWeapon.name,
  detailName: standaloneNonLightMagicWeapon.name,
  magicBonus: 1,
  isTemplate: false,
});
assert(
  !character.appliedAdjustments.some(adjustment => adjustment.sourceId.startsWith('equip-weapon-offhand-')),
  'non-light standalone magic weapon should remove existing off-hand weapon',
);
assert(
  getOffHandWeaponEquipBlockReason(character, lightWeapon, content).includes('基础武器不具有轻型属性'),
  'non-light standalone magic main hand should block light off-hand weapon using snapshot metadata',
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

character = {
  ...cloneCharacter(),
  proficiencies: new Set(),
};
character = equipWeapon(character, nonLightWeapon, content);
let proficiencyRefreshAttack = getAttack(character, \`equip-weapon-\${nonLightWeapon.id}\`);
assert(proficiencyRefreshAttack, 'main weapon should add attack without proficiency');
assert(
  proficiencyRefreshAttack.bonus === '+3',
  \`main weapon without proficiency should use only ability modifier +3, got \${proficiencyRefreshAttack.bonus}\`,
);
character = applyCharacterAdjustments(character, {
  id: 'audit-weapon-name-proficiency',
  sourceId: 'audit-weapon-name-proficiency',
  sourceName: 'audit weapon proficiency',
  operations: [
    { type: 'addProficiency', key: \`weapon:\${nonLightWeapon.name}\` },
  ],
});
character = refreshCharacterAutomation(character, content);
proficiencyRefreshAttack = getAttack(character, \`equip-weapon-\${nonLightWeapon.id}\`);
assert(proficiencyRefreshAttack, 'main weapon should keep attack after adding proficiency');
assert(
  proficiencyRefreshAttack.bonus === '+6',
  \`main weapon should refresh after adding Chinese weapon-name proficiency to +6, got \${proficiencyRefreshAttack.bonus}\`,
);
character = removeCharacterAdjustments(character, 'audit-weapon-name-proficiency');
character = refreshCharacterAutomation(character, content);
proficiencyRefreshAttack = getAttack(character, \`equip-weapon-\${nonLightWeapon.id}\`);
assert(proficiencyRefreshAttack, 'main weapon should keep attack after removing proficiency');
assert(
  proficiencyRefreshAttack.bonus === '+3',
  \`main weapon should refresh after removing proficiency back to +3, got \${proficiencyRefreshAttack.bonus}\`,
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
character = addFeature(character, '长肢');
character = equipWeapon(character, nonLightMeleeWeapon, content);
const longLimbedMeleeAttack = getAttack(character, \`equip-weapon-\${nonLightMeleeWeapon.id}\`);
assert(longLimbedMeleeAttack, 'Long-Limbed melee fixture should add attack');
assert(
  longLimbedMeleeAttack.notes.includes('长肢') && longLimbedMeleeAttack.notes.includes('触及 +5 尺'),
  \`Long-Limbed melee attack should include reach note, got \${longLimbedMeleeAttack.notes}\`,
);
character = equipWeapon(character, rangedWeapon, content);
const longLimbedRangedAttack = getAttack(character, \`equip-weapon-\${rangedWeapon.id}\`);
assert(longLimbedRangedAttack, 'Long-Limbed ranged fixture should add attack');
assert(
  !longLimbedRangedAttack.notes.includes('长肢'),
  \`Long-Limbed should not apply to ranged attacks, got \${longLimbedRangedAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '凶蛮攻击');
character = equipWeapon(character, nonLightMeleeWeapon, content);
const savageAttacksMeleeAttack = getAttack(character, \`equip-weapon-\${nonLightMeleeWeapon.id}\`);
assert(savageAttacksMeleeAttack, 'Savage Attacks melee fixture should add attack');
assert(
  savageAttacksMeleeAttack.notes.includes('凶蛮攻击') && savageAttacksMeleeAttack.notes.includes('重击'),
  \`Savage Attacks melee attack should include critical damage note, got \${savageAttacksMeleeAttack.notes}\`,
);
character = equipWeapon(character, rangedWeapon, content);
const savageAttacksRangedAttack = getAttack(character, \`equip-weapon-\${rangedWeapon.id}\`);
assert(savageAttacksRangedAttack, 'Savage Attacks ranged fixture should add attack');
assert(
  !savageAttacksRangedAttack.notes.includes('凶蛮攻击'),
  \`Savage Attacks should not apply to ranged attacks, got \${savageAttacksRangedAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '凶蛮打手', 'auto-feat-Savage Attacker-PHB');
character = equipWeapon(character, nonLightMeleeWeapon, content);
const phbSavageAttackerMeleeAttack = getAttack(character, \`equip-weapon-\${nonLightMeleeWeapon.id}\`);
assert(phbSavageAttackerMeleeAttack, 'PHB Savage Attacker melee fixture should add attack');
assert(
  phbSavageAttackerMeleeAttack.notes.includes('凶蛮打手') && phbSavageAttackerMeleeAttack.notes.includes('重掷近战武器伤害骰'),
  \`PHB Savage Attacker melee attack should include melee reroll note, got \${phbSavageAttackerMeleeAttack.notes}\`,
);
character = equipWeapon(character, rangedWeapon, content);
const phbSavageAttackerRangedAttack = getAttack(character, \`equip-weapon-\${rangedWeapon.id}\`);
assert(phbSavageAttackerRangedAttack, 'PHB Savage Attacker ranged fixture should add attack');
assert(
  !phbSavageAttackerRangedAttack.notes.includes('凶蛮打手'),
  \`PHB Savage Attacker should not apply to ranged attacks, got \${phbSavageAttackerRangedAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '凶蛮打手', 'auto-feat-Savage Attacker-XPHB');
character = equipWeapon(character, rangedWeapon, content);
const xphbSavageAttackerRangedAttack = getAttack(character, \`equip-weapon-\${rangedWeapon.id}\`);
assert(xphbSavageAttackerRangedAttack, 'XPHB Savage Attacker ranged fixture should add attack');
assert(
  xphbSavageAttackerRangedAttack.notes.includes('凶蛮打手') && xphbSavageAttackerRangedAttack.notes.includes('武器命中'),
  \`XPHB Savage Attacker ranged attack should include weapon hit damage note, got \${xphbSavageAttackerRangedAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '粉碎者', 'auto-feat-Crusher-TCE');
character = equipWeapon(character, bludgeoningWeapon, content);
const crusherAttack = getAttack(character, \`equip-weapon-\${bludgeoningWeapon.id}\`);
assert(crusherAttack, 'Crusher fixture should add attack');
assert(
  crusherAttack.notes.includes('粉碎者') && crusherAttack.notes.includes('钝击'),
  \`Crusher bludgeoning attack should include Crusher note, got \${crusherAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '穿刺者', 'auto-feat-Piercer-TCE');
character = equipWeapon(character, piercingWeapon, content);
const piercerAttack = getAttack(character, \`equip-weapon-\${piercingWeapon.id}\`);
assert(piercerAttack, 'Piercer fixture should add attack');
assert(
  piercerAttack.notes.includes('穿刺者') && piercerAttack.notes.includes('穿刺重击'),
  \`Piercer piercing attack should include Piercer note, got \${piercerAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '劈砍者', 'auto-feat-Slasher-TCE');
character = equipWeapon(character, slashingWeapon, content);
const slasherAttack = getAttack(character, \`equip-weapon-\${slashingWeapon.id}\`);
assert(slasherAttack, 'Slasher fixture should add attack');
assert(
  slasherAttack.notes.includes('劈砍者') && slasherAttack.notes.includes('挥砍'),
  \`Slasher slashing attack should include Slasher note, got \${slasherAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '神射手', 'auto-feat-Sharpshooter-PHB');
character = equipWeapon(character, rangedWeapon, content);
const phbSharpshooterRangedAttack = getAttack(character, \`equip-weapon-\${rangedWeapon.id}\`);
assert(phbSharpshooterRangedAttack, 'PHB Sharpshooter ranged fixture should add attack');
assert(
  phbSharpshooterRangedAttack.notes.includes('神射手') && phbSharpshooterRangedAttack.notes.includes('-5 命中 +10 伤害'),
  \`PHB Sharpshooter ranged attack should include power attack note, got \${phbSharpshooterRangedAttack.notes}\`,
);
character = equipWeapon(character, nonLightMeleeWeapon, content);
const phbSharpshooterMeleeAttack = getAttack(character, \`equip-weapon-\${nonLightMeleeWeapon.id}\`);
assert(phbSharpshooterMeleeAttack, 'PHB Sharpshooter melee fixture should add attack');
assert(
  !phbSharpshooterMeleeAttack.notes.includes('神射手'),
  \`PHB Sharpshooter should not apply to melee attacks, got \${phbSharpshooterMeleeAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '神射手', 'auto-feat-Sharpshooter-XPHB');
character = equipWeapon(character, rangedWeapon, content);
const xphbSharpshooterRangedAttack = getAttack(character, \`equip-weapon-\${rangedWeapon.id}\`);
assert(xphbSharpshooterRangedAttack, 'XPHB Sharpshooter ranged fixture should add attack');
assert(
  xphbSharpshooterRangedAttack.notes.includes('神射手') && xphbSharpshooterRangedAttack.notes.includes('近距') && !xphbSharpshooterRangedAttack.notes.includes('-5'),
  \`XPHB Sharpshooter ranged attack should include 2024 ranged notes without PHB power attack, got \${xphbSharpshooterRangedAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '巨武器大师', 'auto-feat-Great Weapon Master-PHB');
character = equipWeapon(character, heavyMelee5eWeapon, content);
const phbGreatWeaponMasterMeleeAttack = getAttack(character, \`equip-weapon-\${heavyMelee5eWeapon.id}\`);
assert(phbGreatWeaponMasterMeleeAttack, 'PHB Great Weapon Master heavy melee fixture should add attack');
assert(
  phbGreatWeaponMasterMeleeAttack.notes.includes('巨武器大师') && phbGreatWeaponMasterMeleeAttack.notes.includes('-5 命中 +10 伤害'),
  \`PHB Great Weapon Master heavy melee attack should include power attack note, got \${phbGreatWeaponMasterMeleeAttack.notes}\`,
);
character = equipWeapon(character, heavyRanged5rWeapon, content);
const phbGreatWeaponMasterRangedAttack = getAttack(character, \`equip-weapon-\${heavyRanged5rWeapon.id}\`);
assert(phbGreatWeaponMasterRangedAttack, 'PHB Great Weapon Master ranged fixture should add attack');
assert(
  !phbGreatWeaponMasterRangedAttack.notes.includes('巨武器大师'),
  \`PHB Great Weapon Master should not apply to ranged attacks, got \${phbGreatWeaponMasterRangedAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '巨武器大师', 'auto-feat-Great Weapon Master-XPHB');
character = equipWeapon(character, heavyRanged5rWeapon, content);
const xphbGreatWeaponMasterRangedAttack = getAttack(character, \`equip-weapon-\${heavyRanged5rWeapon.id}\`);
assert(xphbGreatWeaponMasterRangedAttack, 'XPHB Great Weapon Master heavy ranged fixture should add attack');
assert(
  xphbGreatWeaponMasterRangedAttack.notes.includes('巨武器大师') && xphbGreatWeaponMasterRangedAttack.notes.includes('+3 伤害'),
  \`XPHB Great Weapon Master heavy ranged attack should include proficiency damage note, got \${xphbGreatWeaponMasterRangedAttack.notes}\`,
);
character = equipWeapon(character, nonLightMeleeWeapon, content);
const xphbGreatWeaponMasterMeleeAttack = getAttack(character, \`equip-weapon-\${nonLightMeleeWeapon.id}\`);
assert(xphbGreatWeaponMasterMeleeAttack, 'XPHB Great Weapon Master melee fixture should add attack');
assert(
  xphbGreatWeaponMasterMeleeAttack.notes.includes('巨武器大师') && xphbGreatWeaponMasterMeleeAttack.notes.includes('附赠动作攻击') && !xphbGreatWeaponMasterMeleeAttack.notes.includes('+3 伤害'),
  \`XPHB Great Weapon Master non-heavy melee attack should include cleaver note only, got \${xphbGreatWeaponMasterMeleeAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '强弩专家', 'auto-feat-Crossbow Expert-PHB');
character = equipWeapon(character, rangedWeapon, content);
const phbCrossbowExpertRangedAttack = getAttack(character, \`equip-weapon-\${rangedWeapon.id}\`);
assert(phbCrossbowExpertRangedAttack, 'PHB Crossbow Expert ranged fixture should add attack');
assert(
  phbCrossbowExpertRangedAttack.notes.includes('强弩专家') && phbCrossbowExpertRangedAttack.notes.includes('5 尺内远程攻击不具有劣势') && !phbCrossbowExpertRangedAttack.notes.includes('忽略装填'),
  \`PHB Crossbow Expert non-crossbow ranged attack should include close-range note only, got \${phbCrossbowExpertRangedAttack.notes}\`,
);
character = equipWeapon(character, handCrossbow, content);
const phbCrossbowExpertHandCrossbowAttack = getAttack(character, \`equip-weapon-\${handCrossbow.id}\`);
assert(phbCrossbowExpertHandCrossbowAttack, 'PHB Crossbow Expert hand crossbow fixture should add attack');
assert(
  phbCrossbowExpertHandCrossbowAttack.notes.includes('忽略装填') && phbCrossbowExpertHandCrossbowAttack.notes.includes('附赠动作手弩攻击'),
  \`PHB Crossbow Expert hand crossbow attack should include loading and bonus-action notes, got \${phbCrossbowExpertHandCrossbowAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '强弩专家', 'auto-feat-Crossbow Expert-XPHB');
character = equipWeapon(character, xphbHandCrossbow, content);
const xphbCrossbowExpertHandCrossbowAttack = getAttack(character, \`equip-weapon-\${xphbHandCrossbow.id}\`);
assert(xphbCrossbowExpertHandCrossbowAttack, 'XPHB Crossbow Expert hand crossbow fixture should add attack');
assert(
  xphbCrossbowExpertHandCrossbowAttack.notes.includes('强弩专家') && xphbCrossbowExpertHandCrossbowAttack.notes.includes('轻型弩额外攻击可加入属性调整值'),
  \`XPHB Crossbow Expert hand crossbow attack should include light crossbow extra attack note, got \${xphbCrossbowExpertHandCrossbowAttack.notes}\`,
);
character = equipWeapon(character, rangedWeapon, content);
const xphbCrossbowExpertRangedAttack = getAttack(character, \`equip-weapon-\${rangedWeapon.id}\`);
assert(xphbCrossbowExpertRangedAttack, 'XPHB Crossbow Expert non-crossbow ranged fixture should add attack');
assert(
  !xphbCrossbowExpertRangedAttack.notes.includes('强弩专家'),
  \`XPHB Crossbow Expert should not apply to non-crossbow ranged attacks, got \${xphbCrossbowExpertRangedAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '长柄武器大师', 'auto-feat-Polearm Master-PHB');
character = equipWeapon(character, phbGlaive, content);
const phbPolearmGlaiveAttack = getAttack(character, \`equip-weapon-\${phbGlaive.id}\`);
assert(phbPolearmGlaiveAttack, 'PHB Polearm Master glaive fixture should add attack');
assert(
  phbPolearmGlaiveAttack.notes.includes('长柄武器大师') && phbPolearmGlaiveAttack.notes.includes('尾击 1d4 钝击'),
  \`PHB Polearm Master glaive attack should include bonus-action butt attack note, got \${phbPolearmGlaiveAttack.notes}\`,
);
character = equipWeapon(character, phbQuarterstaff, content);
const phbPolearmQuarterstaffAttack = getAttack(character, \`equip-weapon-\${phbQuarterstaff.id}\`);
assert(phbPolearmQuarterstaffAttack, 'PHB Polearm Master quarterstaff fixture should add attack');
assert(
  phbPolearmQuarterstaffAttack.notes.includes('长柄武器大师') && phbPolearmQuarterstaffAttack.notes.includes('借机攻击'),
  \`PHB Polearm Master quarterstaff attack should include opportunity attack note, got \${phbPolearmQuarterstaffAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '长柄武器大师', 'auto-feat-Polearm Master-XPHB');
character = equipWeapon(character, xphbGlaive, content);
const xphbPolearmGlaiveAttack = getAttack(character, \`equip-weapon-\${xphbGlaive.id}\`);
assert(xphbPolearmGlaiveAttack, 'XPHB Polearm Master glaive fixture should add attack');
assert(
  xphbPolearmGlaiveAttack.notes.includes('长柄武器大师') && xphbPolearmGlaiveAttack.notes.includes('反应攻击'),
  \`XPHB Polearm Master heavy reach weapon should include reaction attack note, got \${xphbPolearmGlaiveAttack.notes}\`,
);
character = equipWeapon(character, xphbWhip, content);
const xphbPolearmWhipAttack = getAttack(character, \`equip-weapon-\${xphbWhip.id}\`);
assert(xphbPolearmWhipAttack, 'XPHB Polearm Master whip fixture should add attack');
assert(
  !xphbPolearmWhipAttack.notes.includes('长柄武器大师'),
  \`XPHB Polearm Master should not apply to non-heavy reach weapons, got \${xphbPolearmWhipAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '冲锋手', 'auto-feat-Charger-PHB');
character = equipWeapon(character, nonLightMeleeWeapon, content);
const phbChargerMeleeAttack = getAttack(character, \`equip-weapon-\${nonLightMeleeWeapon.id}\`);
assert(phbChargerMeleeAttack, 'PHB Charger melee fixture should add attack');
assert(
  phbChargerMeleeAttack.notes.includes('冲锋手') && phbChargerMeleeAttack.notes.includes('+5 伤害'),
  \`PHB Charger melee attack should include dash damage note, got \${phbChargerMeleeAttack.notes}\`,
);
character = equipWeapon(character, rangedWeapon, content);
const phbChargerRangedAttack = getAttack(character, \`equip-weapon-\${rangedWeapon.id}\`);
assert(phbChargerRangedAttack, 'PHB Charger ranged fixture should add attack');
assert(
  !phbChargerRangedAttack.notes.includes('冲锋手'),
  \`PHB Charger should not apply to ranged attacks, got \${phbChargerRangedAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '冲锋手', 'auto-feat-Charger-XPHB');
character = equipWeapon(character, nonLightMeleeWeapon, content);
const xphbChargerMeleeAttack = getAttack(character, \`equip-weapon-\${nonLightMeleeWeapon.id}\`);
assert(xphbChargerMeleeAttack, 'XPHB Charger melee fixture should add attack');
assert(
  xphbChargerMeleeAttack.notes.includes('冲锋手') && xphbChargerMeleeAttack.notes.includes('+1d8 伤害'),
  \`XPHB Charger melee attack should include 2024 charge damage note, got \${xphbChargerMeleeAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '哨兵', 'auto-feat-Sentinel-PHB');
character = equipWeapon(character, nonLightMeleeWeapon, content);
const phbSentinelMeleeAttack = getAttack(character, \`equip-weapon-\${nonLightMeleeWeapon.id}\`);
assert(phbSentinelMeleeAttack, 'PHB Sentinel melee fixture should add attack');
assert(
  phbSentinelMeleeAttack.notes.includes('哨兵') && phbSentinelMeleeAttack.notes.includes('撤离仍触发借机攻击'),
  \`PHB Sentinel melee attack should include disengage opportunity note, got \${phbSentinelMeleeAttack.notes}\`,
);
character = equipWeapon(character, rangedWeapon, content);
const phbSentinelRangedAttack = getAttack(character, \`equip-weapon-\${rangedWeapon.id}\`);
assert(phbSentinelRangedAttack, 'PHB Sentinel ranged fixture should add attack');
assert(
  !phbSentinelRangedAttack.notes.includes('哨兵'),
  \`PHB Sentinel should not apply to ranged attacks, got \${phbSentinelRangedAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '哨兵', 'auto-feat-Sentinel-XPHB');
character = equipWeapon(character, nonLightMeleeWeapon, content);
const xphbSentinelMeleeAttack = getAttack(character, \`equip-weapon-\${nonLightMeleeWeapon.id}\`);
assert(xphbSentinelMeleeAttack, 'XPHB Sentinel melee fixture should add attack');
assert(
  xphbSentinelMeleeAttack.notes.includes('哨兵') && xphbSentinelMeleeAttack.notes.includes('撤离或攻击他人后'),
  \`XPHB Sentinel melee attack should include 2024 guardian note, got \${xphbSentinelMeleeAttack.notes}\`,
);

character = cloneCharacter();
character = addFeature(character, '防御式决斗', 'auto-feat-Defensive Duelist-PHB');
character = equipWeapon(character, phbFinesseWeapon, content);
const phbDefensiveDuelistFinesseAttack = getAttack(character, \`equip-weapon-\${phbFinesseWeapon.id}\`);
assert(phbDefensiveDuelistFinesseAttack, 'PHB Defensive Duelist finesse fixture should add attack');
assert(
  phbDefensiveDuelistFinesseAttack.notes.includes('防御式决斗') && phbDefensiveDuelistFinesseAttack.notes.includes('AC +3'),
  \`PHB Defensive Duelist finesse attack should include proficiency AC reaction note, got \${phbDefensiveDuelistFinesseAttack.notes}\`,
);
character = {
  ...cloneCharacter(),
  proficiencies: new Set(),
};
character = addFeature(character, '防御式决斗', 'auto-feat-Defensive Duelist-PHB');
character = equipWeapon(character, phbFinesseWeapon, content);
const phbDefensiveDuelistUnproficientAttack = getAttack(character, \`equip-weapon-\${phbFinesseWeapon.id}\`);
assert(phbDefensiveDuelistUnproficientAttack, 'PHB Defensive Duelist unproficient fixture should add attack');
assert(
  !phbDefensiveDuelistUnproficientAttack.notes.includes('防御式决斗'),
  \`PHB Defensive Duelist should require weapon proficiency, got \${phbDefensiveDuelistUnproficientAttack.notes}\`,
);
character = cloneCharacter();
character = addFeature(character, '防御式决斗', 'auto-feat-Defensive Duelist-XPHB');
character = equipWeapon(character, xphbFinesseWeapon, content);
const xphbDefensiveDuelistFinesseAttack = getAttack(character, \`equip-weapon-\${xphbFinesseWeapon.id}\`);
assert(xphbDefensiveDuelistFinesseAttack, 'XPHB Defensive Duelist finesse fixture should add attack');
assert(
  xphbDefensiveDuelistFinesseAttack.notes.includes('防御式决斗') && xphbDefensiveDuelistFinesseAttack.notes.includes('持续到下回合开始'),
  \`XPHB Defensive Duelist finesse attack should include 2024 lasting AC reaction note, got \${xphbDefensiveDuelistFinesseAttack.notes}\`,
);
character = equipWeapon(character, nonFinesseMeleeWeapon, content);
const xphbDefensiveDuelistNonFinesseAttack = getAttack(character, \`equip-weapon-\${nonFinesseMeleeWeapon.id}\`);
assert(xphbDefensiveDuelistNonFinesseAttack, 'XPHB Defensive Duelist non-finesse fixture should add attack');
assert(
  !xphbDefensiveDuelistNonFinesseAttack.notes.includes('防御式决斗'),
  \`XPHB Defensive Duelist should not apply to non-finesse attacks, got \${xphbDefensiveDuelistNonFinesseAttack.notes}\`,
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

character = {
  ...cloneCharacter(),
  abilities: { ...cloneCharacter().abilities, DEX: 16 },
};
character = equipArmor(character, mediumArmor);
const mediumArmorBase = Number(mediumArmor.ac);
assert(
  character.armorBase === mediumArmorBase + 2,
  \`medium armor should cap Dexterity modifier at +2 without Medium Armor Master, got \${character.armorBase}\`,
);

character = {
  ...cloneCharacter(),
  abilities: { ...cloneCharacter().abilities, DEX: 16 },
};
character = addFeature(character, '中甲大师', 'audit-feat-Medium Armor Master-PHB');
character = equipArmor(character, mediumArmor);
assert(
  character.armorBase === mediumArmorBase + 3,
  \`Medium Armor Master should raise medium armor Dexterity cap to +3, got \${character.armorBase}\`,
);

export default {
  lightWeapon: lightWeapon.name,
  nonLightWeapon: nonLightWeapon.name,
  nonLightMeleeWeapon: nonLightMeleeWeapon.name,
  nonFinesseMeleeWeapon: nonFinesseMeleeWeapon.name,
  twoHandWeapon: twoHandWeapon.name,
  rangedWeapon: rangedWeapon.name,
  phbFinesseWeapon: phbFinesseWeapon.name,
  xphbFinesseWeapon: xphbFinesseWeapon.name,
  handCrossbow: handCrossbow.name,
  xphbHandCrossbow: xphbHandCrossbow.name,
  bludgeoningWeapon: bludgeoningWeapon.name,
  piercingWeapon: piercingWeapon.name,
  slashingWeapon: slashingWeapon.name,
  thrownWeapon: thrownWeapon.name,
  loadingAmmunitionWeapon: loadingAmmunitionWeapon.name,
  reachWeapon: reachWeapon.name,
  phbGlaive: phbGlaive.name,
  phbQuarterstaff: phbQuarterstaff.name,
  xphbGlaive: xphbGlaive.name,
  xphbWhip: xphbWhip.name,
  versatileWeapon: versatileWeapon.name,
  specialWeapon: specialWeapon.name,
  heavyMelee5eWeapon: heavyMelee5eWeapon.name,
  heavyRanged5rWeapon: heavyRanged5rWeapon.name,
  shield: shield.name,
  mediumArmor: mediumArmor.name,
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
    'thrown weapon notes include thrown range',
    'ammunition and loading weapon notes include properties and range',
    'reach weapon notes include 10-foot reach',
    'versatile weapon damage includes two-handed option',
    'special weapon notes include entry summary',
    'PHB heavy weapon notes include small size disadvantage',
    'XPHB heavy weapon notes include ability threshold disadvantage',
    'non-light off-hand reports light requirement',
    'light off-hand adds off-hand attack',
    'off-hand attack bonus includes ability modifier and proficiency',
    'non-light main removes off-hand',
    'PHB Dual Wielder allows non-light one-handed melee off-hand and adds removable armor bonus',
    'shield removes two-handed main',
    'magic weapon replaces ordinary main',
    'magic weapon attack bonus and damage',
    'light template magic weapon allows off-hand',
    'magic weapon refreshes after ability change',
    'non-light template magic weapon removes and blocks off-hand',
    'standalone magic weapon stores snapshot metadata',
    'standalone magic weapon refreshes after ability change',
    'standalone magic weapon snapshot controls off-hand conflicts',
    'second magic weapon replaces first magic weapon',
    'main weapon refreshes after ability change',
    'main weapon refreshes after adding and removing Chinese weapon-name proficiency',
    'ranged weapon refreshes after adding archery',
    'Long-Limbed adds melee reach note',
    'Long-Limbed does not add ranged attack note',
    'Savage Attacks adds melee critical damage note',
    'Savage Attacks does not add ranged attack note',
    'PHB Savage Attacker adds melee-only damage reroll note',
    'XPHB Savage Attacker adds ranged weapon hit damage note',
    'Crusher, Piercer, and Slasher add damage-type weapon notes',
    'PHB and XPHB Sharpshooter add source-specific ranged notes',
    'PHB and XPHB Great Weapon Master add source-specific heavy weapon notes',
    'PHB and XPHB Crossbow Expert add source-specific crossbow notes',
    'PHB and XPHB Polearm Master add source-specific weapon notes',
    'PHB and XPHB Charger add source-specific melee notes',
    'PHB and XPHB Sentinel add source-specific melee notes',
    'PHB and XPHB Defensive Duelist add source-specific finesse weapon notes',
    'PHB and XPHB Shield Master add shield-gated melee notes',
    'PHB and XPHB Grappler add weapon and unarmed strike notes',
    'PHB and XPHB Mage Slayer add source-specific concentration notes',
    'PHB and XPHB Tavern Brawler add unarmed strike notes',
    'PHB and XPHB Skulker add source-specific hidden attack notes',
    'off-hand weapon refreshes after adding two-weapon fighting',
    'Medium Armor Master raises medium armor Dexterity cap from +2 to +3',
  ],
}, null, 2));
