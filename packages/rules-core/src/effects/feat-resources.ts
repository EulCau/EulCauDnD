import type { RuleFeatCatalogEntry, RuleSystem } from '../catalog/model.js';
import type { RuleEffect } from '../model/effect.js';
import type { RuleResourceState } from '../model/character.js';

type ResourceMaximum = number | 'proficiency';

interface FeatResourceDefinition {
  key: string;
  source?: string;
  resourceKey: string;
  name: string;
  max: ResourceMaximum;
  reset: RuleResourceState['reset'];
  note?: string;
}

const resources: readonly FeatResourceDefinition[] = [
  resource('Lucky', 'luck-points', '幸运点', 3, 'longRest', undefined, 'PHB'),
  resource('Lucky', 'luck-points', '幸运点', 'proficiency', 'longRest', undefined, 'XPHB'),
  resource('Martial Adept', 'superiority-die', '卓越骰', 1, 'shortRest', 'd6. 可用于本专长习得的战技, 短休或长休后恢复.'),
  resource('Metamagic Adept', 'sorcery-points', '专长术法点', 2, 'longRest', '只能用于超魔法.'),
  resource('Chef', 'chef-treats', '餐点', 'proficiency', 'longRest', '数量等于熟练加值, 做好后持续 8 小时.', 'TCE'),
  resource('Chef', 'chef-treats', '应急零嘴', 'proficiency', 'longRest', '数量等于熟练加值, 做好后持续 8 小时.', 'XPHB'),
  resource('Squire of Solamnia', 'precise-strike', '精准打击', 'proficiency', 'longRest', '次数等于熟练加值, 仅在攻击命中时消耗.'),
  resource('Cartomancer', 'hidden-ace', '隐藏王牌', 1, 'longRest', '完成长休后可注入一张卡牌, 魔力持续 8 小时.'),
  resource('Planar Wanderer', 'portal-sense', '传送门感知', 1, 'longRest', '以动作侦测 30 尺内传送门, 长休后恢复.'),
  resource('Rune Shaper', 'rune-magic', '符文魔法', 1, 'longRest', '不消耗法术位且无需材料成分施展一个刻印符文关联法术.'),
  resource('Gift of the Chromatic Dragon', 'chromatic-infusion', '繁彩注魔', 1, 'longRest'),
  resource('Gift of the Chromatic Dragon', 'reactive-resistance', '反应抗性', 'proficiency', 'longRest', '次数等于熟练加值.'),
  resource('Gift of the Gem Dragon', 'telekinetic-reprisal', '念力报复', 'proficiency', 'longRest', '次数等于熟练加值.'),
  resource('Gift of the Metallic Dragon', 'protective-wings', '庇护之翼', 'proficiency', 'longRest', '次数等于熟练加值.'),
  resource('Ember of the Fire Giant', 'searing-ignition', '炽热灼烧', 'proficiency', 'longRest', '次数等于熟练加值.'),
  resource('Fury of the Frost Giant', 'frigid-retaliation', '霜寒回击', 'proficiency', 'longRest', '次数等于熟练加值.'),
  resource('Guile of the Cloud Giant', 'cloudy-escape', '迷云逃逸', 'proficiency', 'longRest', '次数等于熟练加值.'),
  resource('Keenness of the Stone Giant', 'stone-throw', '投掷石块', 'proficiency', 'longRest', '次数等于熟练加值.'),
  resource('Soul of the Storm Giant', 'maelstrom-aura', '旋涡灵光', 'proficiency', 'longRest', '次数等于熟练加值.'),
  resource('Agent of Order', 'stasis-strike', '凝滞打击', 'proficiency', 'longRest', '次数等于熟练加值.'),
  resource('Baleful Scion', 'grasp-of-avarice', '贪婪之攫', 'proficiency', 'longRest', '次数等于熟练加值.'),
  resource('Righteous Heritor', 'soothe-pain', '舒缓伤痛', 'proficiency', 'longRest', '次数等于熟练加值.'),
  resource('Outlands Envoy', 'crossroads-emissary-misty-step', '交路使者: 迷踪步', 1, 'longRest', '不消耗法术位施展迷踪步.'),
  resource('Outlands Envoy', 'crossroads-emissary-tongues', '交路使者: 巧言术', 1, 'longRest', '不消耗法术位施展巧言术, 且无需材料成分.'),
  resource('Knight of the Crown', 'commanding-rally', '号令集结', 'proficiency', 'longRest', '次数等于熟练加值.'),
  resource('Knight of the Rose', 'bolstering-rally', '振奋集结', 'proficiency', 'longRest', '次数等于熟练加值.'),
  resource('Knight of the Sword', 'demoralizing-strike', '丧志打击', 'proficiency', 'longRest', '次数等于熟练加值.'),
  resource('Telepathic', 'detect-thoughts', '侦测思想', 1, 'longRest', '不消耗法术位且无需法术成分施展侦测思想.', 'XPHB'),
  resource('Boon of Recovery', 'last-stand', '背水一战', 1, 'longRest', undefined, 'XPHB'),
  resource('Boon of Recovery', 'recovery-dice', '重获生机', 10, 'longRest', '治疗池为 10 枚 d10, 可用附赠动作消耗任意枚.', 'XPHB'),
  resource('Boon of Fate', 'fate-points', '时来运转', 1, 'shortRest', '投掷先攻, 完成短休或完成长休后恢复.', 'XPHB'),
  resource('Ritual Caster', 'quick-ritual', '快速仪式', 1, 'longRest', '以通常施法时间施展一道仪式法术, 不消耗法术位.', 'XPHB'),
  resource('Fey Touched', 'misty-step', '迷踪步', 1, 'longRest', '不消耗法术位施展迷踪步.'),
  resource('Fey-Touched', 'misty-step', '迷踪步', 1, 'longRest', '不消耗法术位施展迷踪步.'),
  resource('Shadow Touched', 'invisibility', '隐形术', 1, 'longRest', '不消耗法术位施展隐形术.'),
  resource('Shadow-Touched', 'invisibility', '隐形术', 1, 'longRest', '不消耗法术位施展隐形术.'),
  resource('Drow High Magic', 'levitate', '浮空术', 1, 'longRest', '不消耗法术位施展浮空术.'),
  resource('Drow High Magic', 'dispel-magic', '解除魔法', 1, 'longRest', '不消耗法术位施展解除魔法.'),
  resource('Fey Teleportation', 'misty-step', '迷踪步', 1, 'shortRest', '短休或长休后恢复.'),
  resource('Poisoner', 'poison-doses', '酿毒', 'proficiency', 'manual', '剂数等于熟练加值, 需花费时间和材料制作.'),
  resource('Mage Slayer', 'guarded-mind', '审慎护心', 1, 'shortRest', '短休或长休后恢复.', 'XPHB'),
];

export function createRuleFeatFixedEffects(
  feat: RuleFeatCatalogEntry,
  ruleSystem: RuleSystem,
  characterLevel: number,
): RuleEffect[] {
  const level = Math.max(1, characterLevel);
  const sourceId = featSourceId(feat);
  return [
    ...fixedNumericEffects(feat, level, sourceId),
    ...resources
      .filter((definition) => matches(feat, definition))
      .map((definition) => resourceEffect(feat, ruleSystem, level, definition)),
  ];
}

export function createRuleFeatAdvancementEffects(
  feats: readonly RuleFeatCatalogEntry[],
  ruleSystem: RuleSystem,
  oldCharacterLevel: number,
  newCharacterLevel: number,
): RuleEffect[] {
  if (newCharacterLevel <= oldCharacterLevel) return [];
  const effects: RuleEffect[] = [];
  for (const feat of feats) {
    const sourceId = featSourceId(feat);
    if (feat.key === 'Tough') {
      effects.push({
        type: 'combat.number.add',
        field: 'hpMaxBonus',
        value: (newCharacterLevel - oldCharacterLevel) * 2,
        sourceId,
      });
    }
    if (feat.key === 'Alert' && feat.source === 'XPHB') {
      const delta = proficiencyBonus(newCharacterLevel) - proficiencyBonus(oldCharacterLevel);
      if (delta > 0) {
        effects.push({
          type: 'combat.number.add',
          field: 'initiativeBonus',
          value: delta,
          sourceId,
        });
      }
    }
    effects.push(...resources
      .filter((definition) => definition.max === 'proficiency' && matches(feat, definition))
      .map((definition) => resourceEffect(
        feat,
        ruleSystem,
        newCharacterLevel,
        definition,
      )));
  }
  return effects;
}

function fixedNumericEffects(
  feat: RuleFeatCatalogEntry,
  level: number,
  sourceId: string,
): RuleEffect[] {
  const effects: RuleEffect[] = [];
  const addNumber = (
    field: 'hpMaxBonus' | 'initiativeBonus' | 'speedBonus',
    value: number,
  ) => effects.push({ type: 'combat.number.add', field, value, sourceId });
  if (feat.key === 'Tough') addNumber('hpMaxBonus', level * 2);
  if (feat.key === 'Alert') {
    addNumber('initiativeBonus', feat.source === 'XPHB' ? proficiencyBonus(level) : 5);
  }
  if (feat.key === 'Mobile' || feat.key === 'Speedy') {
    addNumber('speedBonus', 10);
  }
  if (feat.key === 'Squat Nimbleness') {
    addNumber('speedBonus', 5);
  }
  if (feat.key === 'Tavern Brawler' && feat.source === 'PHB') {
    effects.push({
      type: 'proficiency.add',
      proficiency: 'weapon:improvised',
      sourceId,
    });
  }
  if (feat.key === 'Boon of Fortitude') addNumber('hpMaxBonus', 40);
  if (feat.key === 'Boon of Speed') {
    addNumber('speedBonus', 30);
  }
  return effects;
}

function resourceEffect(
  feat: RuleFeatCatalogEntry,
  ruleSystem: RuleSystem,
  characterLevel: number,
  definition: FeatResourceDefinition,
): RuleEffect {
  const max = definition.max === 'proficiency'
    ? proficiencyBonus(characterLevel)
    : definition.max;
  const id = `auto-resource-feat-${feat.key}-${feat.source}-${definition.resourceKey}`;
  return {
    type: 'resource.upsert',
    resource: {
      id,
      sourceId: id,
      sourceName: `${feat.name} ${feat.source}`,
      name: definition.name,
      current: max,
      max,
      reset: definition.reset,
      ...(definition.note === undefined ? {} : { note: definition.note }),
      ruleSystem,
    },
    sourceId: featSourceId(feat),
  };
}

function matches(
  feat: RuleFeatCatalogEntry,
  definition: FeatResourceDefinition,
): boolean {
  return feat.key === definition.key
    && (definition.source === undefined || feat.source === definition.source);
}

function resource(
  key: string,
  resourceKey: string,
  name: string,
  max: ResourceMaximum,
  reset: RuleResourceState['reset'],
  note?: string,
  source?: string,
): FeatResourceDefinition {
  return {
    key,
    resourceKey,
    name,
    max,
    reset,
    ...(note === undefined ? {} : { note }),
    ...(source === undefined ? {} : { source }),
  };
}

function featSourceId(feat: Pick<RuleFeatCatalogEntry, 'key' | 'source'>): string {
  return `auto-feat-${feat.key}-${feat.source}`;
}

function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.max(1, level) - 1) / 4);
}
