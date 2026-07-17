import type { RuleAbilityName, RuleOrigin } from '../catalog/model.js';

export interface RuleOriginArmorFormula {
  base: number;
  ability?: Extract<RuleAbilityName, 'DEX' | 'CON'>;
  featureNames: readonly string[];
  label: string;
}

export interface RuleOriginNaturalAttackDefinition {
  attackKey: string;
  sourceName: string;
  name: string;
  ability: Extract<RuleAbilityName, 'STR' | 'CON'>;
  die: string;
  damageType: string;
  fixedDamage?: string;
  featureNames: readonly string[];
  notes: string;
}

type OriginIdentity = Pick<RuleOrigin, 'key' | 'source'>;

const armorFormulas: Readonly<Record<string, RuleOriginArmorFormula>> = {
  'Autognome|AAG': {
    base: 13,
    ability: 'DEX',
    featureNames: ['装甲外壳', 'Armored Casing'],
    label: '自动侏儒装甲外壳: 13 + 敏捷调整值',
  },
  'Thri-kreen|AAG': {
    base: 13,
    ability: 'DEX',
    featureNames: ['变色甲壳', 'Chameleon Carapace'],
    label: '螳螂人变色甲壳: 13 + 敏捷调整值',
  },
  'Lizardfolk|MPMM': {
    base: 13,
    ability: 'DEX',
    featureNames: ['天生护甲', 'Natural Armor'],
    label: '蜥蜴人天生护甲: 13 + 敏捷调整值',
  },
  'Lizardfolk|VGM': {
    base: 13,
    ability: 'DEX',
    featureNames: ['天生护甲', 'Natural Armor'],
    label: '蜥蜴人天生护甲: 13 + 敏捷调整值',
  },
  'Loxodon|GGR': {
    base: 12,
    ability: 'CON',
    featureNames: ['天生护甲', 'Natural Armor'],
    label: '象族天生护甲: 12 + 体质调整值',
  },
  'Tortle|MPMM': {
    base: 17,
    featureNames: ['天生护甲', 'Natural Armor'],
    label: '龟人天生护甲: 17',
  },
  'Goblin|PSZ': {
    base: 11,
    ability: 'DEX',
    featureNames: ['坚毅', 'Grit'],
    label: '地精坚毅: 11 + 敏捷调整值',
  },
};

const naturalAttacks: Readonly<Record<string, readonly RuleOriginNaturalAttackDefinition[]>> = {
  'Aarakocra|EEPC': [{
    attackKey: 'aarakocra-eepc-talons',
    sourceName: '禽爪',
    name: '禽爪',
    ability: 'STR',
    die: '1d4',
    damageType: '挥砍',
    featureNames: ['禽爪', 'Talons'],
    notes: '天然武器: 可用力量进行徒手打击.',
  }],
  'Aarakocra|MPMM': [{
    attackKey: 'aarakocra-mpmm-talons',
    sourceName: '禽爪',
    name: '禽爪',
    ability: 'STR',
    die: '1d6',
    damageType: '挥砍',
    featureNames: ['禽爪', 'Talons'],
    notes: '天然武器: 可用力量进行徒手打击.',
  }],
  'Centaur|GGR': [{
    attackKey: 'centaur-ggr-hooves',
    sourceName: '蹄击',
    name: '蹄击',
    ability: 'STR',
    die: '1d4',
    damageType: '钝击',
    featureNames: ['蹄击', 'Hooves'],
    notes: '天然武器: 可用力量进行徒手打击. 冲锋后可用附赠动作蹄击.',
  }],
  'Centaur|MPMM': [{
    attackKey: 'centaur-mpmm-hooves',
    sourceName: '蹄击',
    name: '蹄击',
    ability: 'STR',
    die: '1d6',
    damageType: '钝击',
    featureNames: ['蹄击', 'Hooves'],
    notes: '天然武器: 可用力量进行徒手打击. 冲锋后可用附赠动作蹄击.',
  }],
  'Dhampir|RHW': [{
    attackKey: 'dhampir-rhw-vampiric-bite',
    sourceName: '吸血啃咬',
    name: '吸血啃咬',
    ability: 'CON',
    die: '1d4',
    damageType: '穿刺',
    featureNames: ['吸血啃咬', 'Vampiric Bite'],
    notes: '天然武器: 可用体质进行徒手打击. 命中非构装和非亡灵生物时可消耗增幅次数, 恢复等同伤害的生命值, 或让下一次属性检定或攻击检定获得等同伤害的加值.',
  }],
  'Dhampir|VRGR': [{
    attackKey: 'dhampir-vrgr-vampiric-bite',
    sourceName: '吸血啃咬',
    name: '吸血啃咬',
    ability: 'CON',
    die: '1d4',
    damageType: '穿刺',
    featureNames: ['吸血啃咬', 'Vampiric Bite'],
    notes: '天然武器: 可用体质进行徒手打击. 生命值不高于一半时攻击检定具有优势. 命中非构装和非亡灵生物时可消耗强化次数, 恢复等同伤害的生命值, 或让下一次属性检定或攻击检定获得等同伤害的加值.',
  }],
  'Vampire|PSZ': [{
    attackKey: 'vampire-psz-blood-thirst',
    sourceName: '嗜血',
    name: '嗜血',
    ability: 'STR',
    die: '1d6',
    damageType: '暗蚀',
    fixedDamage: '1 穿刺 + 1d6 暗蚀',
    featureNames: ['嗜血', 'Blood Thirst'],
    notes: '种族攻击: 对自愿, 受擒, 失能或束缚的生物进行近战攻击. 命中时目标最大生命值降低等同暗蚀伤害, 你恢复等量生命值.',
  }],
  'Lizardfolk|MPMM': [{
    attackKey: 'lizardfolk-mpmm-bite',
    sourceName: '啃咬',
    name: '啃咬',
    ability: 'STR',
    die: '1d6',
    damageType: '挥砍',
    featureNames: ['啃咬', 'Bite'],
    notes: '天然武器: 可用力量进行徒手打击. 饥渴之喉可用该攻击触发额外效果.',
  }],
  'Lizardfolk|VGM': [{
    attackKey: 'lizardfolk-vgm-bite',
    sourceName: '啃咬',
    name: '啃咬',
    ability: 'STR',
    die: '1d6',
    damageType: '穿刺',
    featureNames: ['啃咬', 'Bite'],
    notes: '天然武器: 可用力量进行徒手打击. 饥渴之喉可用该攻击触发额外效果.',
  }],
  'Minotaur|GGR': [{
    attackKey: 'minotaur-ggr-horns',
    sourceName: '角击',
    name: '角击',
    ability: 'STR',
    die: '1d6',
    damageType: '穿刺',
    featureNames: ['角击', 'Horns'],
    notes: '天然武器: 可用力量进行徒手打击. 猛抵冲撞可用附赠动作角击. 角锤: 命中后可用附赠动作迫使目标进行力量豁免, DC = 8 + 熟练加值 + 力量调整值, 失败则推离 10 尺.',
  }],
  'Minotaur|MPMM': [{
    attackKey: 'minotaur-mpmm-horns',
    sourceName: '角击',
    name: '角击',
    ability: 'STR',
    die: '1d6',
    damageType: '穿刺',
    featureNames: ['角击', 'Horns'],
    notes: '天然武器: 可用力量进行徒手打击. 猛抵冲撞可用附赠动作角击. 角锤: 命中后可用附赠动作迫使目标进行力量豁免, DC = 8 + 熟练加值 + 力量调整值, 失败则推离 10 尺.',
  }],
  'Naga|PSA': [
    {
      attackKey: 'naga-psa-bite',
      sourceName: '天生武器',
      name: '咬击',
      ability: 'STR',
      die: '1d4',
      damageType: '穿刺',
      featureNames: ['天生武器', 'Natural Weapons'],
      notes: '天然武器: 可用力量进行徒手打击. 命中时目标进行体质豁免, DC = 8 + 熟练加值 + 体质调整值, 失败则额外受到 1d4 毒素伤害.',
    },
    {
      attackKey: 'naga-psa-constrict',
      sourceName: '天生武器',
      name: '紧束',
      ability: 'STR',
      die: '1d6',
      damageType: '钝击',
      featureNames: ['天生武器', 'Natural Weapons'],
      notes: '天然武器: 可用力量进行徒手打击. 命中时目标受擒并陷入束缚, 逃脱 DC = 8 + 熟练加值 + 力量调整值. 紧束期间不能紧束另一个目标.',
    },
  ],
  'Satyr|MOT': [{
    attackKey: 'satyr-mot-ram',
    sourceName: '攻城槌',
    name: '攻城槌',
    ability: 'STR',
    die: '1d4',
    damageType: '钝击',
    featureNames: ['攻城槌', 'Ram'],
    notes: '天然武器: 可用力量进行徒手打击.',
  }],
  'Satyr|MPMM': [{
    attackKey: 'satyr-mpmm-ram',
    sourceName: '攻城槌',
    name: '攻城槌',
    ability: 'STR',
    die: '1d6',
    damageType: '穿刺',
    featureNames: ['攻城槌', 'Ram'],
    notes: '天然武器: 可用力量进行徒手打击.',
  }],
  'Tabaxi|MPMM': [{
    attackKey: 'tabaxi-mpmm-cats-claws',
    sourceName: '猫之利爪',
    name: '猫之利爪',
    ability: 'STR',
    die: '1d6',
    damageType: '挥砍',
    featureNames: ['猫之利爪', "Cat's Claws"],
    notes: '天然武器: 可用力量进行徒手打击.',
  }],
  'Tabaxi|VGM': [{
    attackKey: 'tabaxi-vgm-cats-claws',
    sourceName: '猫之利爪',
    name: '猫之利爪',
    ability: 'STR',
    die: '1d4',
    damageType: '挥砍',
    featureNames: ['猫之利爪', "Cat's Claws"],
    notes: '天然武器: 可用力量进行徒手打击.',
  }],
  'Tortle|MPMM': [{
    attackKey: 'tortle-mpmm-claws',
    sourceName: '爪击',
    name: '爪击',
    ability: 'STR',
    die: '1d6',
    damageType: '挥砍',
    featureNames: ['爪击', 'Claws'],
    notes: '天然武器: 可用力量进行徒手打击.',
  }],
};

export function getRuleOriginArmorFormula(
  origin: OriginIdentity,
): RuleOriginArmorFormula | undefined {
  const formula = armorFormulas[originId(origin)];
  return formula ? cloneArmorFormula(formula) : undefined;
}

export function getRuleOriginNaturalAttackDefinitions(
  origin: OriginIdentity,
): RuleOriginNaturalAttackDefinition[] {
  return (naturalAttacks[originId(origin)] ?? []).map(cloneNaturalAttack);
}

function originId(origin: OriginIdentity): string {
  return `${origin.key}|${origin.source}`;
}

function cloneArmorFormula(formula: RuleOriginArmorFormula): RuleOriginArmorFormula {
  return {
    ...formula,
    featureNames: [...formula.featureNames],
  };
}

function cloneNaturalAttack(
  definition: RuleOriginNaturalAttackDefinition,
): RuleOriginNaturalAttackDefinition {
  return {
    ...definition,
    featureNames: [...definition.featureNames],
  };
}
