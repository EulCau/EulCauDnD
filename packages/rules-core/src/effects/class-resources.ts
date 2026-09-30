import type { RuleClass } from '../catalog/model.js';
import type { CanonicalRuleCharacterSnapshot, RuleClassState, RuleResourceState } from '../model/character.js';

interface ResourceDefinition {
  key: string;
  name: string;
  max: number;
  reset: RuleResourceState['reset'];
  note?: string;
}

/** Shared equivalent of autoBuilderRules.createClassResourceOperations. */
export function createRuleClassResourceEffects(
  ruleClass: RuleClass,
  character: Pick<CanonicalRuleCharacterSnapshot, 'abilities'>
    & { classes: readonly Pick<RuleClassState, 'level'>[] },
  classLevel: number,
  projectedTotalLevel: number,
): RuleResourceState[] {
  const charismaModifier = Math.max(1, modifier(character.abilities.CHA));
  const definitions: ResourceDefinition[] = [];
  const has = (english: string, localized: string) => hasFeature(ruleClass, classLevel, english, localized);
  const channelUses = progression(ruleClass.channelDivinityProgression, classLevel)
    || (ruleClass.source === 'XPHB' ? proficiencyBonus(projectedTotalLevel)
      : classLevel >= 18 ? 3 : classLevel >= 6 ? 2 : 1);

  if (ruleClass.key === 'Barbarian' && has('Rage', '狂暴')) {
    definitions.push(resource('rage', '狂暴', rageUses(classLevel), 'longRest'));
  }
  if (ruleClass.key === 'Bard' && has('Bardic Inspiration', '诗人激励')) {
    const font = has('Font of Inspiration', '激励之源');
    definitions.push(resource('bardic-inspiration', '诗人激励', charismaModifier,
      font ? 'shortRest' : 'longRest',
      `次数等于魅力调整值, 至少 1. 激励骰 ${bardicDie(classLevel)}.${ruleClass.source === 'XPHB' && font ? ' 也可消耗法术位恢复一次使用次数.' : ''}`));
  }
  if ((ruleClass.key === 'Cleric' || ruleClass.key === 'Paladin') && has('Channel Divinity', '引导神力')) {
    definitions.push(resource('channel-divinity', '引导神力', channelUses,
      ruleClass.source === 'XPHB' ? 'longRest' : 'shortRest'));
  }
  if (ruleClass.key === 'Druid' && has('Wild Shape', '荒野形态')) {
    definitions.push(resource('wild-shape', '荒野形态',
      ruleClass.source === 'XPHB' ? classLevel >= 17 ? 4 : classLevel >= 6 ? 3 : 2 : 2,
      ruleClass.source === 'XPHB' ? 'manual' : 'shortRest',
      ruleClass.source === 'XPHB' ? '短休恢复 1 次已消耗次数, 长休恢复全部.' : undefined));
  }
  if (ruleClass.key === 'Fighter') {
    if (has('Second Wind', '回气')) {
      const uses = ruleClass.source === 'XPHB'
        ? classLevel >= 10 ? 4 : classLevel >= 4 ? 3 : 2 : 1;
      definitions.push(resource('second-wind', '回气', uses,
        ruleClass.source === 'XPHB' ? 'manual' : 'shortRest',
        ruleClass.source === 'XPHB' ? '短休恢复 1 次已消耗次数, 长休恢复全部.' : undefined));
    }
    if (has('Action Surge', '动作如潮')) {
      definitions.push(resource('action-surge', '动作如潮', classLevel >= 17 ? 2 : 1, 'shortRest'));
    }
    if (has('Indomitable', '不屈')) {
      definitions.push(resource('indomitable', '不屈', Math.max(1, Math.ceil((classLevel - 8) / 4)), 'longRest'));
    }
  }
  if (ruleClass.key === 'Monk') {
    if (has('Ki', '气')) definitions.push(resource('ki', ruleClass.source === 'XPHB' ? '功力' : '气', classLevel, 'shortRest'));
    if (has("Monk's Focus", '武僧专注')) definitions.push(resource('focus-points', '功力', classLevel, 'shortRest'));
    if (ruleClass.source === 'XPHB' && has('Uncanny Metabolism', '运转周天')) {
      definitions.push(resource('uncanny-metabolism', '运转周天', 1, 'longRest',
        '骰先攻时可恢复全部功力, 并恢复武艺骰 + 武僧等级的生命值.'));
    }
  }
  if (ruleClass.key === 'Paladin' && has('Lay on Hands', '圣疗')) {
    definitions.push(resource('lay-on-hands', '圣疗池', classLevel * 5, 'longRest', '以生命值计数.'));
  }
  if (ruleClass.key === 'Paladin' && ruleClass.source === 'PHB' && has('Divine Sense', '神圣感知')) {
    definitions.push(resource('divine-sense', '神圣感知', Math.max(1, 1 + modifier(character.abilities.CHA)),
      'longRest', '次数等于 1 + 魅力调整值, 至少 1.'));
  }
  if (ruleClass.key === 'Ranger' && ruleClass.source === 'XPHB' && has('Favored Enemy', '宿敌')) {
    definitions.push(resource('favored-enemy', '宿敌: 猎人印记',
      progression(ruleClass.favoredEnemyProgression, classLevel) || favoredEnemyUses(classLevel),
      'longRest', '无需消耗法术位施展猎人印记的次数.'));
  }
  if (ruleClass.key === 'Sorcerer') {
    if (ruleClass.source === 'XPHB' && has('Innate Sorcery', '先天术法')) {
      definitions.push(resource('innate-sorcery', '先天术法', 2, 'longRest'));
    }
    if (has('Font of Magic', '魔力泉涌')) {
      definitions.push(resource('sorcery-points', '术法点',
        progression(ruleClass.sorceryPointProgression, classLevel) || classLevel, 'longRest'));
    }
    if (ruleClass.source === 'XPHB' && has('Sorcerous Restoration', '术法复苏')) {
      definitions.push(resource('sorcerous-restoration', '术法复苏', 1, 'longRest',
        '完成短休时可恢复不大于术士等级一半的已消耗术法点.'));
    }
  }
  if (ruleClass.key === 'Warlock' && ruleClass.source === 'XPHB' && has('Magical Cunning', '秘法回流')) {
    definitions.push(resource('magical-cunning', '秘法回流', 1, 'longRest',
      '1 分钟仪式后重获一半已消耗的魔契师法术位, 向上取整.'));
  }
  if (ruleClass.key === 'Wizard' && has('Arcane Recovery', '奥术回想')) {
    definitions.push(resource('arcane-recovery', '奥术回想', 1, 'longRest', '恢复法术位总环阶不超过法师等级一半.'));
  }

  const sourceId = `auto-resource-${ruleClass.key}-${ruleClass.source}`;
  return definitions.map(({ key, name, max: rawMax, reset, note }) => {
    const max = Math.max(0, rawMax);
    return {
      id: `${sourceId}-${key}`,
      sourceId: `${sourceId}-${key}`,
      sourceName: `${ruleClass.name} ${ruleClass.source}`,
      name,
      current: max,
      max,
      reset,
      ...(note === undefined ? {} : { note }),
      ruleSystem: ruleClass.ruleSystem,
    };
  });
}

function resource(key: string, name: string, max: number, reset: RuleResourceState['reset'], note?: string): ResourceDefinition {
  return { key, name, max, reset, ...(note === undefined ? {} : { note }) };
}

function hasFeature(ruleClass: RuleClass, level: number, english: string, localized: string): boolean {
  return ruleClass.levelFeatures.some((feature) => (
    feature.level !== undefined && feature.level <= level
    && (feature.englishName === english || feature.name === localized)
  ));
}

function progression(values: number[] | undefined, level: number): number {
  return values?.[level - 1] || 0;
}

function rageUses(level: number): number {
  if (level >= 17) return 6;
  if (level >= 12) return 5;
  if (level >= 6) return 4;
  if (level >= 3) return 3;
  return 2;
}

function favoredEnemyUses(level: number): number {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
}

function bardicDie(level: number): string {
  if (level >= 15) return 'd12';
  if (level >= 10) return 'd10';
  if (level >= 5) return 'd8';
  return 'd6';
}

function modifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function proficiencyBonus(level: number): number {
  return Math.floor((Math.max(level, 1) - 1) / 4) + 2;
}
