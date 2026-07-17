import type { RuleOrigin, RuleSystem } from '../catalog/model.js';
import type { RuleEffect } from '../model/effect.js';
import type { RuleResourceState } from '../model/character.js';

export interface RuleOriginResourceOptions {
  featureChoices?: Readonly<Record<string, string>>;
  resourceNotes?: Readonly<Record<string, string | undefined>>;
}

type OriginResourceContext = {
  origin: RuleOrigin;
  level: number;
  proficiencyBonus: number;
  options: RuleOriginResourceOptions;
};

type OriginResourceDefinition = {
  key: string;
  name: string | ((context: OriginResourceContext) => string);
  matches: (context: OriginResourceContext) => boolean;
  max:
    | number
    | 'proficiency'
    | ((context: OriginResourceContext) => number | 'proficiency');
  reset:
    | RuleResourceState['reset']
    | ((context: OriginResourceContext) => RuleResourceState['reset']);
  note: string | ((context: OriginResourceContext) => string);
  minLevel?: number;
};

export function createRuleOriginResourceEffects(
  origin: RuleOrigin,
  ruleSystem: RuleSystem,
  characterLevel = 1,
  options: RuleOriginResourceOptions = {},
): RuleEffect[] {
  const level = Math.max(1, characterLevel);
  const context: OriginResourceContext = {
    origin,
    level,
    proficiencyBonus: proficiencyBonus(level),
    options,
  };
  const effects = originResourceDefinitions
    .filter((definition) => level >= (definition.minLevel ?? 1) && definition.matches(context))
    .map((definition): RuleEffect => {
      const sourceId = `auto-resource-race-${origin.key}-${origin.source}-${definition.key}`;
      const resolvedMax = resolve(definition.max, context);
      const max = resolvedMax === 'proficiency'
        ? context.proficiencyBonus
        : resolvedMax;
      return {
        type: 'resource.upsert',
        resource: {
          id: sourceId,
          sourceId,
          sourceName: `${origin.name} ${origin.source}`,
          name: resolve(definition.name, context),
          current: max,
          max,
          reset: resolve(definition.reset, context),
          note: options.resourceNotes?.[definition.key] ?? resolve(definition.note, context),
          ruleSystem,
        },
        sourceId,
      };
    });
  if (hasFeature(origin, 'Resourceful', '适应力')) {
    effects.push({
      type: 'character.flag.set',
      field: 'inspiration',
      value: true,
      sourceId: `auto-race-${origin.key}-${origin.source}-resourceful`,
    });
  }
  return effects;
}

const originResourceDefinitions: readonly OriginResourceDefinition[] = [
  exact('Orc', 'XPHB', 'adrenaline-rush', '激昂冲锋', 'proficiency', 'shortRest',
    '次数等于熟练加值. 使用时获得等同熟练加值的临时生命值.'),
  exact('Orc', 'MPMM', 'adrenaline-rush', '激昂冲锋', 'proficiency', 'longRest',
    '次数等于熟练加值. 使用时获得等同熟练加值的临时生命值.'),
  exact('Dwarf', 'XPHB', 'stonecunning', '石中精妙', 'proficiency', 'longRest',
    '次数等于熟练加值. 以附赠动作获得 60 尺震颤感知, 持续 10 分钟, 需位于或触碰岩石表面.'),
  feature('Relentless Endurance', '坚韧不屈', 'relentless-endurance', '坚韧不屈', 1, 'longRest',
    '生命值降至 0 且未立即死亡时, 可改为降至 1.'),
  feature('Healing Hands', '治愈之手', 'healing-hands', '治愈之手', 1, 'longRest',
    ({ origin }) => origin.source === 'VGM'
      ? '恢复等同角色等级的生命值.'
      : '恢复若干 d4, 骰数等同熟练加值.'),
  feature('Celestial Revelation', '天界启示', 'celestial-revelation', '天界启示', 1, 'longRest',
    '以附赠动作变身, 持续 1 分钟.', 3),
  feature("Stone's Endurance", '石之坚韧', 'stones-endurance', '石之坚韧',
    ({ origin }) => origin.source === 'MPMM' ? 'proficiency' : 1,
    ({ origin }) => origin.source === 'VGM' ? 'shortRest' : 'longRest',
    '以反应降低受到的伤害.'),
  feature('Giant Ancestry', '巨人先祖', 'giant-ancestry', '巨人先祖', 'proficiency', 'longRest',
    ({ options }) => giantAncestryNote(options.featureChoices?.['giant-ancestry'])),
  feature('Starlight Step', '星光步', 'starlight-step', '星光步', 'proficiency', 'longRest',
    '次数等于熟练加值.'),
  feature('Rabbit Hop', '兔子跳跃', 'rabbit-hop', '兔子跳跃', 'proficiency', 'longRest',
    '次数等于熟练加值.'),
  feature('Taunt', '嘲讽', 'taunt', '嘲讽', 'proficiency', 'longRest',
    '次数等于熟练加值. 以附赠动作迫使目标进行感知豁免, DC = 8 + 熟练加值 + 智力, 感知或魅力调整值.'),
  feature('Kenku Recall', '天狗回想', 'kenku-recall', '天狗回想', 'proficiency', 'longRest',
    '次数等于熟练加值.'),
  feature('Draconic Cry', '龙吼', 'draconic-cry', '龙吼', 'proficiency', 'longRest',
    '次数等于熟练加值.'),
  feature('Grovel, Cower, and Beg', '摇尾乞怜', 'grovel-cower-and-beg', '摇尾乞怜', 1, 'shortRest',
    '完成短休或长休后恢复.'),
  feature('Knowledge from a Past Life', '往昔学识', 'knowledge-from-a-past-life', '往昔学识',
    'proficiency', 'longRest', '次数等于熟练加值.'),
  feature('Blessing of the Raven Queen', '鸦后祝福', 'blessing-of-the-raven-queen', '鸦后祝福',
    'proficiency', 'longRest', '次数等于熟练加值.'),
  feature('Fearless', '无畏', 'fearless', '无畏', 1, 'longRest',
    '豁免失败时可改为成功.'),
  feature('Daunting Roar', '畏惧咆哮', 'daunting-roar', '畏惧咆哮', 1, 'shortRest',
    '完成短休或长休后恢复. 以附赠动作迫使 10 尺内目标进行感知豁免, DC = 8 + 熟练加值 + 体质调整值, 失败则陷入恐慌直到你的下回合结束.'),
  feature('Howl', '尖啸', 'howl', '尖啸', 'proficiency', 'longRest',
    '次数等于熟练加值. 以附赠动作迫使 15 尺内目标进行感知豁免, DC = 8 + 熟练加值 + 体质调整值, 失败则攻击检定和豁免检定具有劣势直到你的下一回合开始.'),
  feature('Lethargy Resilience', '怠惰恢复力', 'lethargy-resilience', '怠惰恢复力', 1, 'manual',
    '为避免或结束昏迷状态的豁免失败时可改为成功. 使用后需要完成 1d4 次长休才可再次使用.'),
  feature('Partially Amphibious', '临时两栖', 'partially-amphibious', '临时两栖', 1, 'longRest',
    '可在水下呼吸最多 1 小时. 达到时限后, 直到完成长休前不能再次使用.'),
  feature('Eerie Token', '神秘信物', 'eerie-token', '神秘信物', 1, 'longRest',
    '以附赠动作创造魔法信物. 信物可用于远程传信或遥远视野, 完成长休后恢复.'),
  feature('Feline Agility', '猫之迅捷', 'feline-agility', '猫之迅捷', 1, 'manual',
    '移动时可让速度翻倍直到回合结束. 使用后, 除非在自己的一个回合移动 0 尺, 否则不能再次使用.'),
  {
    key: 'surprise-attack',
    name: '突袭攻击',
    matches: ({ origin }) => (
      origin.key === 'Bugbear'
      && (origin.source === 'ERLW' || origin.source === 'VGM')
      && hasFeature(origin, 'Surprise Attack', '突袭攻击')
    ),
    max: 1,
    reset: 'manual',
    note: '每场战斗一次. 在战斗第一回合用攻击命中被你突袭的生物时, 额外造成 2d6 伤害.',
  },
  feature('Fey Step', '妖精步伐', 'fey-step', '妖精步伐',
    ({ origin }) => origin.source === 'MPMM' ? 'proficiency' : 1,
    ({ origin }) => origin.source === 'MPMM' ? 'longRest' : 'shortRest',
    ({ origin }) => origin.source === 'MPMM' ? '次数等于熟练加值.' : '完成短休或长休后恢复.'),
  feature('Hidden Step', '神隐步', 'hidden-step', '神隐步',
    ({ origin }) => origin.source === 'MPMM' ? 'proficiency' : 1,
    ({ origin }) => origin.source === 'MPMM' ? 'longRest' : 'shortRest',
    ({ origin }) => origin.source === 'MPMM' ? '次数等于熟练加值.' : '完成短休或长休后恢复.'),
  feature('Hungry Jaws', '饥渴之喉', 'hungry-jaws', '饥渴之喉',
    ({ origin }) => origin.source === 'MPMM' ? 'proficiency' : 1,
    ({ origin }) => origin.source === 'MPMM' ? 'longRest' : 'shortRest',
    ({ origin }) => origin.source === 'MPMM' ? '次数等于熟练加值.' : '完成短休或长休后恢复.'),
  feature('Vampiric Bite', '吸血啃咬', 'vampiric-bite',
    ({ origin }) => origin.source === 'RHW' ? '吸血啃咬增幅' : '吸血啃咬强化',
    'proficiency', 'longRest',
    '次数等于熟练加值. 命中非构装和非亡灵生物时, 可恢复生命值或强化下一次属性检定/攻击检定.'),
  feature('Svirfneblin Camouflage', '斯涅布力伪装', 'svirfneblin-camouflage', '斯涅布力伪装',
    'proficiency', 'longRest', '次数等于熟练加值. 使用时使一次敏捷(隐匿)检定具有优势.'),
  feature('Built for Success', '铸订成功', 'built-for-success', '铸订成功', 'proficiency', 'longRest',
    '次数等于熟练加值. 看到 d20 后, 可为一次攻击检定, 属性检定或豁免检定追加 1d4.'),
  feature('Hadozee Dodge', '哈多兹闪避', 'hadozee-dodge', '哈多兹闪避', 'proficiency', 'longRest',
    '次数等于熟练加值. 受伤时可以反应降低 1d6 + 熟练加值的伤害.'),
  feature('Astral Spark', '星界火花', 'astral-spark', '星界火花', 'proficiency', 'longRest',
    '次数等于熟练加值. 每回合一次, 使用简易或军用武器命中时额外造成等同熟练加值的力场伤害.'),
  feature('Fey Gift', '精类赠礼', 'fey-gift', '精类赠礼', 'proficiency', 'longRest',
    '次数等于熟练加值. 可用附赠动作执行协助动作; 3 级后可附加好客, 通行或恶意效果.'),
  feature('Shifting', '化形', 'shifting', '化形',
    ({ origin }) => origin.source === 'MPMM' || origin.source === 'EFA' ? 'proficiency' : 1,
    ({ origin }) => origin.source === 'MPMM' || origin.source === 'EFA' ? 'longRest' : 'shortRest',
    ({ origin }) => origin.source === 'MPMM' || origin.source === 'EFA'
      ? '次数等于熟练加值.'
      : '完成短休或长休后恢复.'),
  feature('Fury of the Small', '小个子的怒火', 'fury-of-the-small', '小个子的怒火',
    ({ origin }) => origin.source === 'MPMM' ? 'proficiency' : 1,
    ({ origin }) => origin.source === 'MPMM' ? 'longRest' : 'shortRest',
    ({ origin }) => origin.source === 'MPMM' ? '次数等于熟练加值.' : '完成短休或长休后恢复.'),
  feature('Fortune from the Many', '集众之运', 'fortune-from-the-many', '集众之运',
    'proficiency', 'longRest', '次数等于熟练加值.'),
  feature('Saving Face', '挽回颜面', 'saving-face', '挽回颜面', 1, 'shortRest',
    '完成短休或长休后恢复.'),
  feature('Breath Weapon', '吐息武器', 'breath-weapon', '吐息武器',
    ({ origin }) => origin.source === 'XPHB' || origin.source === 'FTD' ? 'proficiency' : 1,
    ({ origin }) => origin.source === 'XPHB' || origin.source === 'FTD' ? 'longRest' : 'shortRest',
    ({ origin }) => origin.source === 'XPHB' || origin.source === 'FTD'
      ? '次数等于熟练加值.'
      : '完成短休或长休后恢复.'),
  feature('Draconic Flight', '龙族飞翼', 'draconic-flight', '龙族飞翼', 1, 'longRest',
    '以附赠动作获得临时飞行速度, 持续 10 分钟.', 5),
  feature('Chromatic Warding', '色彩守护', 'chromatic-warding', '色彩守护', 1, 'longRest',
    '以动作获得所选血统伤害类型免疫, 持续 1 分钟.', 5),
  feature('Gem Flight', '宝石之翼', 'gem-flight', '宝石之翼', 1, 'longRest',
    '以附赠动作获得等同步行速度的飞行速度, 持续 1 分钟.', 5),
  feature('Metallic Breath Weapon', '金属吐息武器', 'metallic-breath-weapon', '金属吐息武器',
    1, 'longRest', '5 级起可使用第二种吐息武器.', 5),
  feature('Large Form', '大型形态', 'large-form', '大型形态', 1, 'longRest',
    '以附赠动作变为大型, 持续 10 分钟. 持续期间力量检定具有优势, 速度增加 10 尺.', 5),
];

function exact(
  originKey: string,
  source: string,
  key: string,
  name: string,
  max: number | 'proficiency',
  reset: RuleResourceState['reset'],
  note: string,
): OriginResourceDefinition {
  return {
    key,
    name,
    matches: ({ origin }) => origin.key === originKey && origin.source === source,
    max,
    reset,
    note,
  };
}

function feature(
  englishName: string,
  name: string,
  key: string,
  resourceName: OriginResourceDefinition['name'],
  max: OriginResourceDefinition['max'],
  reset: OriginResourceDefinition['reset'],
  note: OriginResourceDefinition['note'],
  minLevel?: number,
): OriginResourceDefinition {
  return {
    key,
    name: resourceName,
    matches: ({ origin }) => hasFeature(origin, englishName, name),
    max,
    reset,
    note,
    ...(minLevel === undefined ? {} : { minLevel }),
  };
}

function hasFeature(origin: RuleOrigin, englishName: string, name: string): boolean {
  return origin.features.some((entry) => (
    entry.englishName === englishName || entry.name === name
  ));
}

function resolve<T>(
  value: T | ((context: OriginResourceContext) => T),
  context: OriginResourceContext,
): T {
  return typeof value === 'function'
    ? (value as (context: OriginResourceContext) => T)(context)
    : value;
}

function proficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

function giantAncestryNote(choice: string | undefined): string {
  const notes: Readonly<Record<string, string>> = {
    cloud: '云之远迹: 以附赠动作魔法传送到 30 尺内可见的未占据空间.',
    fire: '火之燃烧: 攻击检定命中并造成伤害时, 额外造成 1d10 火焰伤害.',
    frost: '霜之刺骨: 攻击检定命中并造成伤害时, 额外造成 1d6 寒冷伤害, 且目标速度降低 10 尺直到你的下一回合开始.',
    hill: '山之翻撞: 攻击检定命中不超过大型的生物并造成伤害时, 可令其倒地.',
    stone: '石之坚韧: 受到伤害时用反应掷 1d12, 此次伤害减少骰值 + 体质调整值.',
    storm: '岚之暴鸣: 60 尺内生物对你造成伤害时, 可用反应对该生物造成 1d8 雷鸣伤害.',
  };
  return choice && notes[choice]
    ? `次数等于熟练加值. ${notes[choice]}`
    : '次数等于熟练加值. 使用你选择的巨人先祖恩惠, 如传送, 额外伤害, 减速, 击倒, 减伤或反击雷鸣伤害.';
}
