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
const twoHandWeapon = weapons.find(weapon => hasProperty(weapon, '2H'));
const rangedWeapon = weapons.find(weapon => String(weapon.type || '').split('|')[0] === 'R' && weapon.dmg1);
const thrownWeapon = weapons.find(weapon => hasProperty(weapon, 'T') && weapon.range && weapon.dmg1);
const loadingAmmunitionWeapon = weapons.find(weapon => hasProperty(weapon, 'A') && hasProperty(weapon, 'LD') && weapon.range && weapon.dmg1);
const reachWeapon = weapons.find(weapon => hasProperty(weapon, 'R') && !hasProperty(weapon, 'S') && weapon.dmg1);
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
assert(twoHandWeapon, 'missing two-handed weapon fixture');
assert(rangedWeapon, 'missing ranged weapon fixture');
assert(thrownWeapon, 'missing thrown weapon fixture');
assert(loadingAmmunitionWeapon, 'missing ammunition/loading weapon fixture');
assert(reachWeapon, 'missing reach weapon fixture');
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
  twoHandWeapon: twoHandWeapon.name,
  rangedWeapon: rangedWeapon.name,
  thrownWeapon: thrownWeapon.name,
  loadingAmmunitionWeapon: loadingAmmunitionWeapon.name,
  reachWeapon: reachWeapon.name,
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
    'off-hand weapon refreshes after adding two-weapon fighting',
    'Medium Armor Master raises medium armor Dexterity cap from +2 to +3',
  ],
}, null, 2));
