import { Attack, AttackWeaponSnapshot, CharacterData, RuleSystem } from '../types';
import { calculateModifier, calculateProficiencyBonus, formatModifier, getTotalLevel } from './dndCalculations';
import { applyCharacterAdjustments, removeCharacterAdjustments } from './characterAdjustments';
import type { AutoBuilderArmor, AutoBuilderContent, AutoBuilderWeapon } from './autoBuilderRules';

const RULE_SOURCE: Record<RuleSystem, 'PHB' | 'XPHB'> = {
  '5e': 'PHB',
  '5r': 'XPHB',
};

const DAMAGE_TYPES: Record<string, string> = {
  B: '钝击',
  P: '穿刺',
  S: '挥砍',
  A: '强酸',
  C: '寒冷',
  F: '火焰',
  L: '闪电',
  N: '黯蚀',
  O: '力场',
  R: '光耀',
  T: '雷鸣',
};

const PROPERTIES: Record<string, string> = {
  A: '弹药',
  F: '灵巧',
  H: '重型',
  L: '轻型',
  LD: '装填',
  RLD: '装填',
  R: '触及',
  S: '特殊',
  T: '投掷',
  '2H': '双手',
  V: '两用',
  AF: '连发',
  BF: '爆发',
};

const ARMOR_TYPES: Record<string, string> = {
  LA: '轻甲',
  MA: '中甲',
  HA: '重甲',
  S: '盾牌',
};

type WeaponProperty = NonNullable<AutoBuilderWeapon['property']>[number];
type MagicWeaponEquipOptions = {
  inventoryItemId: string;
  displayName: string;
  detailName: string;
  magicBonus: number;
  isTemplate: boolean;
  baseWeaponId?: string;
};

const toAttackWeaponSnapshot = (weapon: AutoBuilderWeapon): AttackWeaponSnapshot => ({
  id: weapon.id,
  key: weapon.key,
  name: weapon.name,
  englishName: weapon.englishName,
  source: weapon.source,
  ruleSystem: weapon.ruleSystem,
  weaponCategory: weapon.weaponCategory,
  type: weapon.type,
  property: weapon.property?.map(property => (typeof property === 'string' ? property : { ...property })),
  mastery: weapon.mastery ? [...weapon.mastery] : undefined,
  dmg1: weapon.dmg1,
  dmg2: weapon.dmg2,
  dmgType: weapon.dmgType,
  bonusWeapon: weapon.bonusWeapon,
  range: weapon.range,
  entries: weapon.entries ? [...weapon.entries] : undefined,
});

const fromAttackWeaponSnapshot = (snapshot: AttackWeaponSnapshot): AutoBuilderWeapon => ({
  id: snapshot.id,
  key: snapshot.key,
  name: snapshot.name,
  englishName: snapshot.englishName,
  source: snapshot.source as AutoBuilderWeapon['source'],
  ruleSystem: snapshot.ruleSystem,
  weaponCategory: snapshot.weaponCategory,
  type: snapshot.type,
  property: snapshot.property,
  mastery: snapshot.mastery,
  dmg1: snapshot.dmg1,
  dmg2: snapshot.dmg2,
  dmgType: snapshot.dmgType,
  bonusWeapon: snapshot.bonusWeapon,
  range: snapshot.range,
  entries: snapshot.entries,
});

const getPropertyUid = (property: WeaponProperty): string => (
  typeof property === 'string' ? property : property.uid || ''
);

const getPropertyCode = (property: WeaponProperty): string => getPropertyUid(property).split('|')[0];

const formatPropertyNote = (note: string): string => {
  if (note === 'unless mounted') return '未骑乘时';
  return note;
};

const getPropertyLabel = (property: WeaponProperty): string => {
  const code = getPropertyCode(property);
  const label = code === 'R' ? '触及 10 尺' : PROPERTIES[code] || code;
  if (typeof property === 'string' || !property.note) return label;
  return `${label} (${formatPropertyNote(property.note)})`;
};

export const getItemType = (item: { type?: string }): string => item.type?.split('|')[0] || '';
const getMasteryName = (mastery: string): string => mastery.split('|')[0];

export const formatWeaponMasteryNames = (weapon: Pick<AutoBuilderWeapon, 'mastery'>): string => (
  weapon.mastery?.map(getMasteryName).filter(Boolean).join('/') || ''
);

export const formatWeaponPropertyNames = (weapon: Pick<AutoBuilderWeapon, 'property'>): string => (
  weapon.property?.map(getPropertyLabel).filter(Boolean).join('/') || ''
);

const hasMediumArmorMaster = (character: CharacterData): boolean => (
	  hasFeature(character, ['中甲大师', 'Medium Armor Master'])
	);

	const hasProperty = (weapon: AutoBuilderWeapon, code: string): boolean => (
  weapon.property || []
).some(property => getPropertyCode(property) === code);

const getWeaponBonus = (weapon: AutoBuilderWeapon): number => {
  if (!weapon.bonusWeapon) return 0;
  return Number(String(weapon.bonusWeapon).replace('+', '')) || 0;
};

const isRangedWeapon = (weapon: AutoBuilderWeapon): boolean => {
  return getItemType(weapon) === 'R';
};

const isSmallOrSmaller = (bodyType: string): boolean => {
  const normalized = bodyType.trim().toLowerCase();
  return ['小型', '超小型', 'small', 'tiny'].some(size => normalized.includes(size.toLowerCase()));
};

const getHeavyWeaponRuleNote = (character: CharacterData, weapon: AutoBuilderWeapon): string => {
  if (!hasProperty(weapon, 'H')) return '';
  if (weapon.source === 'XPHB' || weapon.ruleSystem === '5r') {
    const requiredAbility = isRangedWeapon(weapon) ? 'DEX' : 'STR';
    const abilityName = requiredAbility === 'DEX' ? '敏捷' : '力量';
    if (character.abilities[requiredAbility] < 13) {
      return `重型: 当前${abilityName}低于 13, 攻击检定具有劣势`;
    }
    return `重型: ${isRangedWeapon(weapon) ? '远程' : '近战'}武器需${abilityName} 13`;
  }
  if (isSmallOrSmaller(character.bodyType)) return '重型: 当前体型攻击检定具有劣势';
  return '重型: 小型或更小体型生物攻击检定具有劣势';
};

const hasHexWarrior = (character: CharacterData): boolean => (
  character.featureEntries.some(feature => feature.name === '巫咒战士')
);

const hasPactOfTheBlade = (character: CharacterData): boolean => (
  character.featureEntries.some(feature => feature.name === '刃之魔契')
);

const hasThirstingBlade = (character: CharacterData): boolean => (
  character.featureEntries.some(feature => feature.name === '饥渴魔刃')
);

const hasDevouringBlade = (character: CharacterData): boolean => (
  character.featureEntries.some(feature => feature.name === '灭世魔刃')
);

const hasLifedrinker = (character: CharacterData): boolean => (
  character.featureEntries.some(feature => feature.name === '饮命者')
);

const hasWeaponMastery = (character: CharacterData, weapon: AutoBuilderWeapon): boolean => (
  character.featureEntries.some(feature => feature.sourceId === `auto-weapon-mastery-${weapon.id}`)
);

const hasFeature = (character: CharacterData, names: string[]): boolean => (
  character.featureEntries.some(feature => names.includes(feature.name))
);

const hasDuelingStyle = (character: CharacterData): boolean => hasFeature(character, ['对决', 'Dueling']);
const hasThrownWeaponStyle = (character: CharacterData): boolean => hasFeature(character, ['投掷武器战斗', 'Thrown Weapon Fighting']);
const hasTwoWeaponStyle = (character: CharacterData): boolean => hasFeature(character, ['双武器战斗', 'Two-Weapon Fighting']);
const hasGreatWeaponStyle = (character: CharacterData): boolean => hasFeature(character, ['巨武器战斗', 'Great Weapon Fighting']);
const hasUnarmedFightingStyle = (character: CharacterData): boolean => hasFeature(character, ['徒手战斗', 'Unarmed Fighting']);
const hasDefenseStyle = (character: CharacterData): boolean => hasFeature(character, ['防御', 'Defense']);
const hasUnarmoredDefense = (character: CharacterData): boolean => hasFeature(character, ['无甲防御', 'Unarmored Defense']);
const hasMartialArts = (character: CharacterData): boolean => hasFeature(character, ['武艺', 'Martial Arts']);
const hasRage = (character: CharacterData): boolean => hasFeature(character, ['狂暴', 'Rage']);
const hasSneakAttack = (character: CharacterData): boolean => hasFeature(character, ['偷袭', 'Sneak Attack']);
const hasDivineSmite = (character: CharacterData): boolean => hasFeature(character, ['至圣斩', 'Divine Smite', '圣武斩', "Paladin's Smite"]);
const hasImprovedDivineSmite = (character: CharacterData): boolean => hasFeature(character, ['精通至圣斩', 'Improved Divine Smite', '光耀打击', 'Radiant Strikes']);

const getClassLevel = (character: CharacterData, classNames: string[]): number => (
  character.classes.find(cls => classNames.includes(cls.name))?.level || 0
);

const getClassSource = (character: CharacterData, classNames: string[]): string => (
  character.classes.find(cls => classNames.includes(cls.name))?.source || 'PHB'
);

const getRageDamageBonus = (character: CharacterData): number => {
  const level = getClassLevel(character, ['Barbarian', '野蛮人']);
  if (level >= 16) return 4;
  if (level >= 9) return 3;
  return level > 0 ? 2 : 0;
};

const getSneakAttackDice = (character: CharacterData): string => {
  const level = getClassLevel(character, ['Rogue', '游荡者']);
  return `${Math.max(1, Math.ceil(level / 2))}d6`;
};

const getMartialArtsDie = (character: CharacterData): string => {
  const level = getClassLevel(character, ['Monk', '武僧']);
  const source = getClassSource(character, ['Monk', '武僧']);
  if (source === 'XPHB') {
    if (level >= 17) return '1d12';
    if (level >= 11) return '1d10';
    if (level >= 5) return '1d8';
    return '1d6';
  }
  if (level >= 17) return '1d10';
  if (level >= 11) return '1d8';
  if (level >= 5) return '1d6';
  return '1d4';
};

const getAttackActionCount = (character: CharacterData): number => {
  const fighterLevel = getClassLevel(character, ['Fighter', '战士']);
  if (fighterLevel >= 20) return 4;
  if (fighterLevel >= 11) return 3;
  if (character.featureEntries.some(feature => (
    feature.name === '额外攻击'
    || feature.name === '额外攻击(2)'
    || feature.name === '额外攻击（二）'
    || feature.name === '额外攻击(3)'
    || feature.name === '额外攻击（三）'
    || feature.name === 'Extra Attack'
    || feature.name === 'Extra Attack (2)'
    || feature.name === 'Extra Attack (3)'
    || feature.name === 'Two Extra Attacks'
    || feature.name === 'Three Extra Attacks'
  ))) return 2;
  return 1;
};

const getDamageStyleBonus = (character: CharacterData, weapon: AutoBuilderWeapon): number => {
	  if (!isRangedWeapon(weapon) && hasDuelingStyle(character) && !hasProperty(weapon, '2H') && !getEquippedOffHandWeaponId(character)) return 2;
	  if (hasThrownWeaponStyle(character) && hasProperty(weapon, 'T')) return 2;
	  return 0;
	};

const getAttackAbility = (character: CharacterData, weapon: AutoBuilderWeapon): { label: string; modifier: number } => {
  const str = calculateModifier(character.abilities.STR);
  const dex = calculateModifier(character.abilities.DEX);
  const cha = calculateModifier(character.abilities.CHA);
  if (hasHexWarrior(character) && !hasProperty(weapon, '2H')) return { label: '魅力', modifier: cha };
  if (hasPactOfTheBlade(character) && !isRangedWeapon(weapon)) return { label: '魅力', modifier: cha };
  if (isRangedWeapon(weapon)) return { label: '敏捷', modifier: dex };
  if (hasProperty(weapon, 'F')) {
    return dex > str ? { label: '敏捷', modifier: dex } : { label: '力量', modifier: str };
  }
  return { label: '力量', modifier: str };
};

export const getAttackAbilityMod = (character: CharacterData, weapon: AutoBuilderWeapon): number => {
  return getAttackAbility(character, weapon).modifier;
};

export const isWeaponProficient = (character: CharacterData, weapon: AutoBuilderWeapon): boolean => {
  if (hasPactOfTheBlade(character) && !isRangedWeapon(weapon)) return true;

  const category = weapon.weaponCategory;
  const englishKey = weapon.englishName?.toLowerCase();
  const normalizedProficiencies = new Set([
    ...Array.from(character.proficiencies),
    ...Array.from(character.proficiencies).map(key => key.toLowerCase()),
  ]);
  const keys = [
    category ? `weapon:${category}` : '',
    category === 'simple' ? 'weapon:简易' : '',
    category === 'martial' ? 'weapon:军用' : '',
    englishKey ? `weapon:${englishKey}` : '',
    `weapon:${weapon.name}`,
    `weapon:${weapon.key.toLowerCase()}`,
  ].filter(Boolean);

  return keys.some(key => normalizedProficiencies.has(key) || normalizedProficiencies.has(key.toLowerCase()));
};

const formatDamage = (character: CharacterData, weapon: AutoBuilderWeapon): string => {
  const abilityMod = getAttackAbilityMod(character, weapon);
  const bonus = getWeaponBonus(weapon) + getDamageStyleBonus(character, weapon);
  const modText = abilityMod + bonus === 0 ? '' : formatModifier(abilityMod + bonus);
  const type = weapon.dmgType ? DAMAGE_TYPES[weapon.dmgType] || weapon.dmgType : '';
  const versatile = weapon.dmg2 ? ` (${weapon.dmg2}${modText} ${type}, 双手)` : '';
  return `${weapon.dmg1 || ''}${modText} ${type}${versatile}`.trim();
};

const formatWeaponRange = (weapon: AutoBuilderWeapon): string => {
  if (!weapon.range) return '';
  return `${hasProperty(weapon, 'T') ? '投掷射程' : '射程'} ${weapon.range}`;
};

export const formatWeaponType = (weapon: AutoBuilderWeapon): string => {
  const category = weapon.weaponCategory === 'martial' ? '军用' : '简易';
  const kind = isRangedWeapon(weapon) ? '远程' : '近战';
  return `${category}${kind}武器`;
};

const stripEntryTags = (entry: string): string => (
  entry
    .replace(/\{@(?:condition|damage|dice|skill|action|item|creature|spell|dc|hit|filter|sense|status|quickref|variantrule) ([^}|]+)(?:\|[^}]*)?}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
);

const summarizeEntry = (entry: unknown): string => {
  if (typeof entry === 'string') return stripEntryTags(entry);
  if (Array.isArray(entry)) return entry.map(summarizeEntry).filter(Boolean).join(' ');
  if (!entry || typeof entry !== 'object') return '';
  const record = entry as { entries?: unknown[]; entry?: unknown; items?: unknown[] };
  if (Array.isArray(record.entries)) return record.entries.map(summarizeEntry).filter(Boolean).join(' ');
  if (Array.isArray(record.items)) return record.items.map(summarizeEntry).filter(Boolean).join(' ');
  return summarizeEntry(record.entry);
};

const summarizeWeaponEntries = (weapon: AutoBuilderWeapon): string[] => (
  (weapon.entries || [])
    .map(summarizeEntry)
    .filter(Boolean)
);

const formatWeaponNotes = (character: CharacterData, weapon: AutoBuilderWeapon): string => {
  const properties = (weapon.property || []).map(getPropertyLabel);
  const ability = getAttackAbility(character, weapon);
  properties.push(`${ability.label}攻击`);
  const heavyRuleNote = getHeavyWeaponRuleNote(character, weapon);
  if (heavyRuleNote) properties.push(heavyRuleNote);
  const attackCount = getAttackActionCount(character);
  if (attackCount > 1) properties.push(`攻击动作 ${attackCount} 次`);
  if (!isRangedWeapon(weapon) && ability.label === '力量' && hasRage(character)) {
    properties.push(`狂暴时 +${getRageDamageBonus(character)} 伤害`);
  }
  if (hasSneakAttack(character) && (isRangedWeapon(weapon) || hasProperty(weapon, 'F'))) {
    properties.push(`每回合一次偷袭 +${getSneakAttackDice(character)}`);
  }
  if (!isRangedWeapon(weapon) && hasDivineSmite(character)) {
    properties.push('命中后可消耗法术位使用神圣打击');
  }
  if (!isRangedWeapon(weapon) && hasImprovedDivineSmite(character)) {
    properties.push('每次命中 +1d8 光耀');
  }
  if (isRangedWeapon(weapon) && hasFeature(character, ['箭术', 'Archery'])) properties.push('箭术 +2 命中');
  if (!isRangedWeapon(weapon) && hasDuelingStyle(character) && !hasProperty(weapon, '2H')) properties.push('对决 +2 伤害 (单手且无副手武器)');
  if (hasThrownWeaponStyle(character) && hasProperty(weapon, 'T')) properties.push('投掷武器战斗 +2 伤害');
  if (hasTwoWeaponStyle(character) && hasProperty(weapon, 'L')) properties.push('双武器战斗: 轻型额外攻击可加属性调整值');
  if (hasGreatWeaponStyle(character) && !isRangedWeapon(weapon) && (hasProperty(weapon, '2H') || hasProperty(weapon, 'V'))) {
    properties.push('巨武器战斗: 伤害骰 1/2 视为 3');
  }
  if (hasPactOfTheBlade(character) && !isRangedWeapon(weapon)) {
    properties.push('刃之魔契');
    if (hasDevouringBlade(character)) {
      properties.push('攻击动作 3 次');
    } else if (hasThirstingBlade(character)) {
      properties.push('攻击动作 2 次');
    }
    if (hasLifedrinker(character)) properties.push('每回合一次 +1d6 暗蚀/心灵/光耀');
  }
  const range = formatWeaponRange(weapon);
  if (range) properties.push(range);
  if (hasProperty(weapon, 'S')) {
    properties.push(...summarizeWeaponEntries(weapon));
  }
  if (weapon.mastery?.length) {
    const mastery = formatWeaponMasteryNames(weapon);
    properties.push(hasWeaponMastery(character, weapon) ? `精通 ${mastery}` : `精通 ${mastery} (未选择)`);
  }
  return properties.join(', ');
};

const createWeaponAttack = (
  character: CharacterData,
  weapon: AutoBuilderWeapon,
  sourceId: string,
  attackName = weapon.name,
  sourceName = attackName,
  notes = formatWeaponNotes(character, weapon),
): Attack => {
  const profBonus = calculateProficiencyBonus(getTotalLevel(character.classes));
  const abilityMod = getAttackAbilityMod(character, weapon);
  const magicBonus = getWeaponBonus(weapon);
  const fightingStyleBonus = isRangedWeapon(weapon) && hasFeature(character, ['箭术', 'Archery']) ? 2 : 0;
  const attackBonus = abilityMod + magicBonus + fightingStyleBonus + (isWeaponProficient(character, weapon) ? profBonus : 0);
  return {
    id: `${sourceId}-attack`,
    sourceId,
    sourceName,
    automatic: true,
    name: attackName,
    bonus: formatModifier(attackBonus),
    damage: formatDamage(character, weapon),
    type: formatWeaponType(weapon),
    notes,
  };
};

export const getWeaponOptions = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
): AutoBuilderWeapon[] => content.weapons
  .filter(weapon => weapon.source === RULE_SOURCE[ruleSystem])
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));

export const getArmorOptions = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
): AutoBuilderArmor[] => content.armors
  .filter(armor => armor.source === RULE_SOURCE[ruleSystem] && getItemType(armor) !== 'S')
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));

export const getShieldOptions = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
): AutoBuilderArmor[] => content.armors
  .filter(armor => armor.source === RULE_SOURCE[ruleSystem] && getItemType(armor) === 'S')
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));

export const isWeaponEquipped = (character: CharacterData, weapon: AutoBuilderWeapon): boolean => {
	  return character.appliedAdjustments.some(adjustment => adjustment.sourceId === `equip-weapon-${weapon.id}`);
	};

	export const isOffHandWeaponEquipped = (character: CharacterData, weapon: AutoBuilderWeapon): boolean => {
	  return character.appliedAdjustments.some(adjustment => adjustment.sourceId === `equip-weapon-offhand-${weapon.id}`);
	};

	export const getEquippedOffHandWeaponId = (character: CharacterData): string | undefined => {
	  return character.appliedAdjustments
	    .map(adjustment => adjustment.sourceId)
	    .find(sourceId => sourceId.startsWith('equip-weapon-offhand-'))
	    ?.replace(/^equip-weapon-offhand-/, '');
	};

	const getEquippedMainHandWeaponId = (character: CharacterData): string | undefined => (
	  character.appliedAdjustments
	    .map(adjustment => adjustment.sourceId)
	    .find(sourceId => sourceId.startsWith('equip-weapon-') && !sourceId.startsWith('equip-weapon-offhand-'))
	    ?.replace(/^equip-weapon-/, '')
	);

	const getEquippedMagicWeaponSourceId = (character: CharacterData): string | undefined => (
	  character.appliedAdjustments
	    .map(adjustment => adjustment.sourceId)
	    .find(sourceId => sourceId.startsWith('equip-magic-'))
	);

	export const isArmorEquipped = (character: CharacterData, armor: AutoBuilderArmor): boolean => {
  return character.appliedAdjustments.some(adjustment => adjustment.sourceId === `equip-armor-${armor.id}`);
};

export const isShieldEquipped = (character: CharacterData, shield: AutoBuilderArmor): boolean => {
  return character.appliedAdjustments.some(adjustment => adjustment.sourceId === `equip-shield-${shield.id}`);
};

export const getArmorBase = (character: CharacterData, armor: AutoBuilderArmor): number => {
	  const dexMod = calculateModifier(character.abilities.DEX);
	  const base = Number(armor.ac) || 10;
	  const type = getItemType(armor);

	  if (type === 'LA') return base + dexMod;
	  if (type === 'MA') return base + Math.min(dexMod, hasMediumArmorMaster(character) ? 3 : 2);
	  return base;
	};

const formatArmorNotes = (armor: AutoBuilderArmor): string => {
  const notes = [ARMOR_TYPES[getItemType(armor)] || getItemType(armor)];
  if (armor.stealth) notes.push('隐匿劣势');
  if (armor.strength) notes.push(`力量需求 ${armor.strength}`);
  return notes.filter(Boolean).join(', ');
};

export const removeEquippedArmors = (character: CharacterData): CharacterData => {
  return character.appliedAdjustments
    .filter(adjustment => adjustment.sourceId.startsWith('equip-armor-'))
    .reduce((next, adjustment) => removeCharacterAdjustments(next, adjustment.sourceId), character);
};

const removeEquippedShields = (character: CharacterData): CharacterData => {
  return character.appliedAdjustments
    .filter(adjustment => adjustment.sourceId.startsWith('equip-shield-'))
    .reduce((next, adjustment) => removeCharacterAdjustments(next, adjustment.sourceId), character);
};

export const removeAutomaticArmorClass = (character: CharacterData): CharacterData => {
  return character.appliedAdjustments
    .filter(adjustment => adjustment.sourceId === 'auto-armor-class')
    .reduce((next, adjustment) => removeCharacterAdjustments(next, adjustment.sourceId), character);
};

const removeAutomaticDefenseArmorBonus = (character: CharacterData): CharacterData => {
  return character.appliedAdjustments
    .filter(adjustment => adjustment.sourceId === 'auto-defense-armor-bonus')
    .reduce((next, adjustment) => removeCharacterAdjustments(next, adjustment.sourceId), character);
};

const getEquippedArmorId = (character: CharacterData): string | undefined => (
  character.appliedAdjustments
    .map(adjustment => adjustment.sourceId)
    .find(sourceId => sourceId.startsWith('equip-armor-'))
    ?.replace(/^equip-armor-/, '')
);

const getEquippedShieldId = (character: CharacterData): string | undefined => (
  character.appliedAdjustments
    .map(adjustment => adjustment.sourceId)
    .find(sourceId => sourceId.startsWith('equip-shield-'))
    ?.replace(/^equip-shield-/, '')
);

const refreshAutomaticDefenseArmorBonus = (character: CharacterData): CharacterData => {
  const next = removeAutomaticDefenseArmorBonus(character);
  if (!getEquippedArmorId(next) || !hasDefenseStyle(next)) return next;
  return applyCharacterAdjustments(next, {
    id: 'auto-defense-armor-bonus',
    sourceId: 'auto-defense-armor-bonus',
    sourceName: '防御',
    operations: [
      { type: 'addNumber', path: 'armorBonus', value: 1 },
      {
        type: 'addFeature',
        feature: {
          id: 'auto-defense-armor-bonus-feature',
          sourceId: 'auto-defense-armor-bonus',
          sourceName: '防御',
          name: '防御战斗风格',
          description: '穿着护甲时, 护甲等级 +1.',
        },
      },
    ],
  });
};

const getUnarmoredDefenseBase = (character: CharacterData): { value: number; label: string } | null => {
  if (!hasUnarmoredDefense(character)) return null;
  const dexMod = calculateModifier(character.abilities.DEX);
  const conMod = calculateModifier(character.abilities.CON);
  const wisMod = calculateModifier(character.abilities.WIS);
  const chaMod = calculateModifier(character.abilities.CHA);
  const classNames = character.classes.map(cls => cls.name);
  const isBarbarian = classNames.some(name => name === 'Barbarian' || name === '野蛮人');
  const isMonk = classNames.some(name => name === 'Monk' || name === '武僧');
  const isDanceBard = character.classes.some(cls => (
    (cls.name === 'Bard' || cls.name === '吟游诗人') && cls.subclass.includes('舞')
  ));
  const options = [
    isBarbarian ? { value: 10 + dexMod + conMod, label: '野蛮人无甲防御: 10 + 敏捷调整值 + 体质调整值' } : null,
    isMonk ? { value: 10 + dexMod + wisMod, label: '武僧无甲防御: 10 + 敏捷调整值 + 感知调整值' } : null,
    isDanceBard ? { value: 10 + dexMod + chaMod, label: '舞蹈学院无甲防御: 10 + 敏捷调整值 + 魅力调整值' } : null,
  ].filter((option): option is { value: number; label: string } => Boolean(option));
  return options.sort((a, b) => b.value - a.value)[0] || null;
};

export const refreshAutomaticArmorClass = (
  character: CharacterData,
): CharacterData => {
  const next = refreshAutomaticDefenseArmorBonus(removeAutomaticArmorClass(character));
  if (getEquippedArmorId(next)) return next;
  const shieldEquipped = Boolean(getEquippedShieldId(next));
  const dexMod = calculateModifier(next.abilities.DEX);
  const normal = { value: 10 + dexMod, label: '未穿甲: 10 + 敏捷调整值' };
  const unarmored = getUnarmoredDefenseBase(next);
  const selected = (!shieldEquipped && unarmored && unarmored.value > normal.value) || (shieldEquipped && unarmored && next.classes.some(cls => cls.name === 'Barbarian' || cls.name === '野蛮人'))
    ? unarmored
    : normal;

  return applyCharacterAdjustments(next, {
    id: 'auto-armor-class',
    sourceId: 'auto-armor-class',
    sourceName: selected.label,
    operations: [
      { type: 'set', path: 'armorBase', value: selected.value },
      {
        type: 'addFeature',
        feature: {
          id: 'auto-armor-class-feature',
          sourceId: 'auto-armor-class',
          sourceName: selected.label,
          name: '自动护甲等级',
          description: `护甲等级基础值 ${selected.value}. ${selected.label}.`,
        },
      },
    ],
  });
};

export const equipWeapon = (
	  character: CharacterData,
	  weapon: AutoBuilderWeapon,
	  content?: AutoBuilderContent,
	): CharacterData => {
	  // Conflict: two-handed weapon cannot be used with shield
	  let next = character;
	  if (hasProperty(weapon, '2H') && getEquippedShieldId(next)) {
	    const shieldSrcId = next.appliedAdjustments
	      .find(a => a.sourceId.startsWith('equip-shield-'))?.sourceId;
	    if (shieldSrcId) next = removeCharacterAdjustments(next, shieldSrcId);
	  }
	  // Conflict: unequip off-hand if main weapon doesn't have Light property
	  if (!hasProperty(weapon, 'L')) {
	    const offId = getEquippedOffHandWeaponId(next);
	    if (offId) {
	      next = next.appliedAdjustments
	        .filter(a => a.sourceId.startsWith('equip-weapon-offhand-'))
	        .reduce((c, a) => removeCharacterAdjustments(c, a.sourceId), next);
	    }
	  }

	  const sourceId = `equip-weapon-${weapon.id}`;
	  const attack = createWeaponAttack(next, weapon, sourceId);

	  return applyCharacterAdjustments(next, {
	    id: sourceId,
	    sourceId,
	    sourceName: weapon.name,
	    operations: [
	      { type: 'addAttack', attack },
	    ],
	  });
	};

	export const unequipWeapon = (
	  character: CharacterData,
	  weapon: AutoBuilderWeapon,
	): CharacterData => {
	  return removeCharacterAdjustments(character, `equip-weapon-${weapon.id}`);
	};

	export const equipMagicWeapon = (
	  character: CharacterData,
	  weapon: AutoBuilderWeapon,
	  options: MagicWeaponEquipOptions,
	): CharacterData => {
	  let next = character;
	  const existingMainSourceIds = next.appliedAdjustments
	    .map(adjustment => adjustment.sourceId)
	    .filter(sourceId => (
	      (sourceId.startsWith('equip-weapon-') && !sourceId.startsWith('equip-weapon-offhand-'))
	      || sourceId.startsWith('equip-magic-')
	    ));
	  next = existingMainSourceIds.reduce((current, sourceId) => removeCharacterAdjustments(current, sourceId), next);
	  if (!hasProperty(weapon, 'L')) {
	    next = next.appliedAdjustments
	      .filter(adjustment => adjustment.sourceId.startsWith('equip-weapon-offhand-'))
	      .reduce((current, adjustment) => removeCharacterAdjustments(current, adjustment.sourceId), next);
	  }

	  const sourceId = `equip-magic-${options.inventoryItemId}`;
	  const notes = options.isTemplate
	    ? `${formatWeaponNotes(next, weapon)}, 魔法武器 ${formatModifier(options.magicBonus)}`
	    : `${options.detailName}, ${formatWeaponNotes(next, weapon)}`.replace(/, $/, '');
	  const attack = createWeaponAttack(next, weapon, sourceId, options.displayName, options.displayName, notes);
	  if (options.baseWeaponId) {
	    attack.magicBaseWeaponId = options.baseWeaponId;
	    attack.magicTemplate = options.isTemplate;
	  }
	  attack.magicBonus = options.magicBonus;
	  attack.magicDetailName = options.detailName;
	  if (!options.baseWeaponId) {
	    attack.magicWeaponSnapshot = toAttackWeaponSnapshot(weapon);
	  }

	  return applyCharacterAdjustments(next, {
	    id: sourceId,
	    sourceId,
	    sourceName: options.displayName,
	    operations: [
	      { type: 'addAttack', attack },
	    ],
	  });
	};

	export const getOffHandWeaponEquipBlockReason = (
	  character: CharacterData,
	  weapon: AutoBuilderWeapon,
	  content: AutoBuilderContent,
	): string => {
	  if (!hasProperty(weapon, 'L')) return '副手武器必须具有轻型属性.';

	  const mainHandId = getEquippedMainHandWeaponId(character);
	  const mainHandWeapon = mainHandId ? content.weapons.find(w => w.id === mainHandId) : undefined;
	  if (mainHandWeapon && !hasProperty(mainHandWeapon, 'L')) {
	    return '主手武器不具有轻型属性, 不能进行双武器战斗.';
	  }

	  const magicSourceId = getEquippedMagicWeaponSourceId(character);
	  if (magicSourceId) {
	    const magicAttack = character.attacks.find(attack => attack.sourceId === magicSourceId);
	    const magicBaseWeapon = magicAttack?.magicBaseWeaponId
	      ? content.weapons.find(item => item.id === magicAttack.magicBaseWeaponId)
	      : magicAttack?.magicWeaponSnapshot
	        ? fromAttackWeaponSnapshot(magicAttack.magicWeaponSnapshot)
	        : undefined;
	    if (!magicBaseWeapon) {
	      return '已装备魔法主手武器, 且无法判断其基础武器属性, 请先卸下后再装备副手武器.';
	    }
	    if (!hasProperty(magicBaseWeapon, 'L')) {
	      return '魔法主手武器的基础武器不具有轻型属性, 不能进行双武器战斗.';
	    }
	  }

	  return '';
	};

	export const equipOffHandWeapon = (
	  character: CharacterData,
	  weapon: AutoBuilderWeapon,
	  content: AutoBuilderContent,
	): CharacterData => {
	  if (getOffHandWeaponEquipBlockReason(character, weapon, content)) return character;

	  // Unequip any existing off-hand weapon first
	  let next = character;
	  const shieldSrcId = next.appliedAdjustments
	    .find(a => a.sourceId.startsWith('equip-shield-'))?.sourceId;
	  if (shieldSrcId) next = removeCharacterAdjustments(next, shieldSrcId);

	  const existingOffId = getEquippedOffHandWeaponId(next);
	  if (existingOffId) {
	    const old = content.weapons.find(w => w.id === existingOffId);
	    if (old) next = unequipOffHandWeapon(next, old);
	  }

	  const sourceId = `equip-weapon-offhand-${weapon.id}`;
	  const abilityMod = getAttackAbilityMod(next, weapon);
	  // Off-hand uses same dice but without ability mod (unless Two-Weapon Fighting style)
	  const offHandMod = hasTwoWeaponStyle(next) ? abilityMod : 0;
	  const magicBonus = getWeaponBonus(weapon);
	  const profBonus = calculateProficiencyBonus(getTotalLevel(next.classes));
	  const attackBonus = abilityMod + magicBonus + (isWeaponProficient(next, weapon) ? profBonus : 0);
	  const damageStr = `${weapon.dmg1 || ''}${offHandMod + magicBonus === 0 ? '' : formatModifier(offHandMod + magicBonus)} ${weapon.dmgType ? (DAMAGE_TYPES[weapon.dmgType] || weapon.dmgType) : ''}`.trim();
	  const notes = ['副手'];
	  if (hasTwoWeaponStyle(next) && hasProperty(weapon, 'L')) notes.push('双武器战斗: 可加属性调整值');
	  else if (!hasTwoWeaponStyle(next)) notes.push('双武器战斗: 不添加属性调整值');

	  const attack: Attack = {
	    id: `${sourceId}-attack`,
	    sourceId,
	    sourceName: weapon.name,
	    automatic: true,
	    offHand: true,
	    name: `${weapon.name}(副手)`,
	    bonus: formatModifier(attackBonus),
	    damage: damageStr,
	    type: formatWeaponType(weapon),
	    notes: notes.join(', '),
	  };

	  return applyCharacterAdjustments(next, {
	    id: sourceId,
	    sourceId,
	    sourceName: weapon.name,
	    operations: [
	      { type: 'addAttack', attack },
	    ],
	  });
	};

	export const unequipOffHandWeapon = (
	  character: CharacterData,
	  weapon: AutoBuilderWeapon,
	): CharacterData => {
	  return removeCharacterAdjustments(character, `equip-weapon-offhand-${weapon.id}`);
	};

export const refreshEquippedWeapons = (
	  character: CharacterData,
	  content: AutoBuilderContent,
	): CharacterData => {
	  const equippedWeaponIds = character.appliedAdjustments
	    .map(adjustment => adjustment.sourceId)
	    .filter(sourceId => sourceId.startsWith('equip-weapon-') && !sourceId.startsWith('equip-weapon-offhand-'))
	    .map(sourceId => sourceId.replace(/^equip-weapon-/, ''));

	  return equippedWeaponIds.reduce((next, weaponId) => {
	    const weapon = content.weapons.find(item => item.id === weaponId);
	    return weapon ? equipWeapon(next, weapon) : next;
	  }, character);
	};

export const refreshEquippedMagicWeapons = (
	  character: CharacterData,
	  content: AutoBuilderContent,
	): CharacterData => {
	  const magicAttacks = character.attacks
	    .filter(attack => (
	      attack.sourceId?.startsWith('equip-magic-')
	      && (attack.magicBaseWeaponId || attack.magicWeaponSnapshot)
	    ));

	  return magicAttacks.reduce((next, attack) => {
	    const sourceId = attack.sourceId;
	    const inventoryItemId = sourceId?.replace(/^equip-magic-/, '');
	    const baseWeapon = attack.magicBaseWeaponId
	      ? content.weapons.find(item => item.id === attack.magicBaseWeaponId)
	      : undefined;
	    const snapshotWeapon = attack.magicWeaponSnapshot
	      ? fromAttackWeaponSnapshot(attack.magicWeaponSnapshot)
	      : undefined;
	    const baseOrSnapshotWeapon = baseWeapon || snapshotWeapon;
	    if (!sourceId || !inventoryItemId || !baseOrSnapshotWeapon) return next;
	    const magicBonus = attack.magicBonus || 0;
	    const weapon: AutoBuilderWeapon = {
	      ...baseOrSnapshotWeapon,
	      id: attack.magicBaseWeaponId ? `magic-${inventoryItemId}-${baseOrSnapshotWeapon.id}` : baseOrSnapshotWeapon.id,
	      name: attack.name,
	      bonusWeapon: magicBonus ? formatModifier(magicBonus) : '0',
	    };
	    return equipMagicWeapon(next, weapon, {
	      inventoryItemId,
	      displayName: attack.name,
	      detailName: attack.magicDetailName || attack.sourceName || attack.name,
	      magicBonus,
	      isTemplate: Boolean(attack.magicTemplate),
	      baseWeaponId: attack.magicBaseWeaponId ? baseOrSnapshotWeapon.id : undefined,
	    });
	  }, character);
	};

export const refreshEquippedOffHandWeapons = (
	  character: CharacterData,
	  content: AutoBuilderContent,
	): CharacterData => {
	  const offHandIds = character.appliedAdjustments
	    .map(a => a.sourceId)
	    .filter(sid => sid.startsWith('equip-weapon-offhand-'))
	    .map(sid => sid.replace(/^equip-weapon-offhand-/, ''));
	  return offHandIds.reduce((next, weaponId) => {
	    const weapon = content.weapons.find(w => w.id === weaponId);
	    return weapon ? equipOffHandWeapon(next, weapon, content) : next;
	  }, character);
	};

	export const refreshCharacterAutomation = (
	  character: CharacterData,
	  content: AutoBuilderContent,
	): CharacterData => (
	  refreshAutomaticStyleAttacks(
	    refreshEquippedOffHandWeapons(
	      refreshEquippedMagicWeapons(
	        refreshEquippedWeapons(
	          refreshEquippedArmor(
	            refreshAutomaticArmorClass(character),
	            content,
	          ),
	          content,
	        ),
	        content,
	      ),
	      content,
	    ),
	  )
	);

const removeAutomaticStyleAttacks = (character: CharacterData): CharacterData => {
  return character.appliedAdjustments
    .filter(adjustment => adjustment.sourceId.startsWith('auto-style-attack-') || adjustment.sourceId.startsWith('auto-class-attack-'))
    .reduce((next, adjustment) => removeCharacterAdjustments(next, adjustment.sourceId), character);
};

export const refreshAutomaticStyleAttacks = (character: CharacterData): CharacterData => {
  let next = removeAutomaticStyleAttacks(character);
  const profBonus = calculateProficiencyBonus(getTotalLevel(next.classes));

  if (hasUnarmedFightingStyle(next)) {
    const strMod = calculateModifier(next.abilities.STR);
    const sourceId = 'auto-style-attack-unarmed-fighting';
    const attack: Attack = {
      id: `${sourceId}-attack`,
      sourceId,
      sourceName: '徒手战斗',
      automatic: true,
      name: '徒手打击',
      bonus: formatModifier(strMod + profBonus),
      damage: `1d6${strMod === 0 ? '' : formatModifier(strMod)} 钝击`,
      type: '徒手打击',
      notes: '徒手战斗: 未持握武器和盾牌时伤害骰为 1d8. 回合开始时可对受擒目标造成 1d4 钝击.',
    };

    next = applyCharacterAdjustments(next, {
      id: sourceId,
      sourceId,
      sourceName: '徒手战斗',
      operations: [
        { type: 'addAttack', attack },
      ],
    });
  }

  if (hasMartialArts(next)) {
    const strMod = calculateModifier(next.abilities.STR);
    const dexMod = calculateModifier(next.abilities.DEX);
    const ability = dexMod > strMod ? { label: '敏捷', modifier: dexMod } : { label: '力量', modifier: strMod };
    const sourceId = 'auto-class-attack-monk-martial-arts';
    const die = getMartialArtsDie(next);
    const attack: Attack = {
      id: `${sourceId}-attack`,
      sourceId,
      sourceName: '武艺',
      automatic: true,
      name: '武艺徒手打击',
      bonus: formatModifier(ability.modifier + profBonus),
      damage: `${die}${ability.modifier === 0 ? '' : formatModifier(ability.modifier)} 钝击`,
      type: '徒手打击',
      notes: `武艺: 可用${ability.label}进行徒手打击和武僧武器攻击. 武艺骰 ${die}.`,
    };

    next = applyCharacterAdjustments(next, {
      id: sourceId,
      sourceId,
      sourceName: '武艺',
      operations: [
        { type: 'addAttack', attack },
      ],
    });
  }

  return next;
};

export const equipArmor = (
  character: CharacterData,
  armor: AutoBuilderArmor,
): CharacterData => {
  const sourceId = `equip-armor-${armor.id}`;
  const next = removeAutomaticArmorClass(removeEquippedArmors(character));
  return applyCharacterAdjustments(next, {
    id: sourceId,
    sourceId,
    sourceName: armor.name,
    operations: [
      { type: 'set', path: 'armorBase', value: getArmorBase(next, armor) },
      {
        type: 'addFeature',
        feature: {
          id: `${sourceId}-feature`,
          sourceId,
          sourceName: armor.name,
          name: `${armor.name} 已装备`,
          ruleSystem: armor.ruleSystem,
          description: `护甲等级基础值 ${getArmorBase(next, armor)}. ${formatArmorNotes(armor)}`,
        },
      },
    ],
  });
};

export const unequipArmor = (
  character: CharacterData,
  armor: AutoBuilderArmor,
): CharacterData => {
  return refreshAutomaticArmorClass(removeCharacterAdjustments(character, `equip-armor-${armor.id}`));
};

export const refreshEquippedArmor = (
  character: CharacterData,
  content: AutoBuilderContent,
): CharacterData => {
  const equippedArmorId = character.appliedAdjustments
    .map(adjustment => adjustment.sourceId)
    .find(sourceId => sourceId.startsWith('equip-armor-'))
    ?.replace(/^equip-armor-/, '');
  if (!equippedArmorId) return refreshAutomaticArmorClass(character);

  const armor = content.armors.find(item => item.id === equippedArmorId);
  return armor ? equipArmor(character, armor) : character;
};

export const equipShield = (
	  character: CharacterData,
	  shield: AutoBuilderArmor,
	  content?: AutoBuilderContent,
	): CharacterData => {
	  let next = character;
	  const mainWeaponId = getEquippedMainHandWeaponId(next);
	  const mainWeapon = mainWeaponId ? content?.weapons.find(weapon => weapon.id === mainWeaponId) : undefined;
	  if (mainWeapon && hasProperty(mainWeapon, '2H')) {
	    next = removeCharacterAdjustments(next, `equip-weapon-${mainWeapon.id}`);
	  }

	  // Shield occupies the off hand.
	  const offId = getEquippedOffHandWeaponId(next);
	  if (offId) {
	    next = next.appliedAdjustments
	      .filter(a => a.sourceId.startsWith('equip-weapon-offhand-'))
	      .reduce((c, a) => removeCharacterAdjustments(c, a.sourceId), next);
	  }

	  const sourceId = `equip-shield-${shield.id}`;
	  const bonus = Number(shield.ac) || 2;
	  next = removeAutomaticArmorClass(removeEquippedShields(next));
	  return refreshAutomaticArmorClass(applyCharacterAdjustments(next, {
	    id: sourceId,
	    sourceId,
	    sourceName: shield.name,
	    operations: [
	      { type: 'addNumber', path: 'armorBonus', value: bonus },
	      {
	        type: 'addFeature',
	        feature: {
	          id: `${sourceId}-feature`,
	          sourceId,
	          sourceName: shield.name,
	          name: `${shield.name} 已装备`,
	          ruleSystem: shield.ruleSystem,
	          description: `护甲等级加值 +${bonus}. ${formatArmorNotes(shield)}`,
	        },
	      },
	    ],
	  }));
	};

export const unequipShield = (
  character: CharacterData,
  shield: AutoBuilderArmor,
): CharacterData => {
  return refreshAutomaticArmorClass(removeCharacterAdjustments(character, `equip-shield-${shield.id}`));
};
