import type {
  RuleClass,
  RuleFeatCatalogEntry,
  RuleFightingStyle,
  RuleSpell,
  RuleWeapon,
} from '../catalog/model.js';
import type { RuleChoiceGroup, RuleOptionSummary } from '../model/choice.js';
import type { RuleContext } from '../model/context.js';
import type { RuleEffect } from '../model/effect.js';
import type { RuleIssue, RuleResult } from '../model/issue.js';
import { isRuleEntityAuthorized } from '../policy/authorization.js';
import { dedupeRuleEntitiesByNameAndSourcePriority } from '../policy/source-priority.js';
import { validateRuleChoiceSelections } from '../validation/common.js';

export interface RuleExpertiseAdvancementState {
  ruleClass: RuleClass;
  oldClassLevel: number;
  newClassLevel: number;
  group?: RuleChoiceGroup<RuleOptionSummary>;
}

export interface RuleFightingStyleAdvancementState {
  ruleClass: RuleClass;
  oldClassLevel: number;
  newClassLevel: number;
  mode?: 'feat' | 'feature';
  group?: RuleChoiceGroup<RuleFightingStyleChoice>;
}

export type RuleFightingStyleChoice = (
  RuleFeatCatalogEntry | RuleFightingStyle
) & { id: string };

export interface RuleWeaponMasteryAdvancementState {
  ruleClass: RuleClass;
  oldClassLevel: number;
  newClassLevel: number;
  targetCount: number;
  group?: RuleChoiceGroup<RuleWeapon>;
}

export interface RuleFightingStyleCantripChoiceState {
  style: RuleFeatCatalogEntry | RuleFightingStyle;
  group?: RuleChoiceGroup<RuleSpell>;
}

export function createRuleExpertiseAdvancementState(
  context: RuleContext,
  ruleClass: RuleClass,
  oldClassLevel: number,
  newClassLevel: number,
  proficientIds: readonly string[],
  existingExpertiseIds: readonly string[],
): RuleResult<RuleExpertiseAdvancementState> {
  const checked = validateClassAdvancement(context, ruleClass, oldClassLevel, newClassLevel);
  if (!checked.ok) return checked;
  const count = checked.value.levelFeatures
    .filter((feature) => (
      feature.level !== undefined
      && feature.level > oldClassLevel
      && feature.level <= newClassLevel
      && isNamed(feature, 'Expertise', '专精')
    )).length * 2;
  const existing = new Set(existingExpertiseIds);
  const options = [...new Set(proficientIds)]
    .filter((id) => !existing.has(id))
    .sort()
    .map((id) => ({ id, name: id }));
  if (count > options.length) {
    return invalid('choice_count_invalid', ['expertise'], 'expertise_options_insufficient');
  }
  const group = count > 0 ? {
    id: `class-${checked.value.key}-${checked.value.source}-expertise-${newClassLevel}`,
    kind: 'expertise' as const,
    required: true,
    min: count,
    max: count,
    options,
  } : undefined;
  return success({
    ruleClass: checked.value,
    oldClassLevel,
    newClassLevel,
    ...(group === undefined ? {} : { group }),
  });
}

export function createRuleExpertiseAdvancementEffects(
  state: RuleExpertiseAdvancementState,
  selectedIds: readonly string[] = [],
): RuleResult<RuleEffect[]> {
  const selected = validateSingleGroup(state.group, selectedIds, 'expertise');
  if (!selected.ok) return selected;
  return success(selected.value.map((proficiency) => ({
    type: 'proficiency.add',
    proficiency,
    expertise: true,
    sourceId: `auto-class-${state.ruleClass.key}-${state.ruleClass.source}-expertise`,
  })));
}

export function createRuleFightingStyleAdvancementState(
  context: RuleContext,
  ruleClass: RuleClass,
  oldClassLevel: number,
  newClassLevel: number,
  knownIds: readonly string[],
): RuleResult<RuleFightingStyleAdvancementState> {
  const checked = validateClassAdvancement(context, ruleClass, oldClassLevel, newClassLevel);
  if (!checked.ok) return checked;
  const count = checked.value.levelFeatures.filter((feature) => (
    feature.level !== undefined
    && feature.level > oldClassLevel
    && feature.level <= newClassLevel
    && isNamed(feature, 'Fighting Style', '战斗风格')
  )).length;
  if (count === 0) {
    return success({
      ruleClass: checked.value,
      oldClassLevel,
      newClassLevel,
    });
  }
  const known = new Set(knownIds);
  if (context.ruleSystem === '5r') {
    const categories = new Set(['FS']);
    if (checked.value.key === 'Paladin') categories.add('FS:P');
    if (checked.value.key === 'Ranger') categories.add('FS:R');
    const options = dedupeRuleEntitiesByNameAndSourcePriority(
      'feat',
      context.catalog.feats.filter((feat) => (
        isRuleEntityAuthorized('feat', feat, context.authorization)
        && categories.has(feat.category ?? '')
        && !known.has(feat.id ?? `${feat.key}|${feat.source}`)
      )),
      context.authorization,
    ).map((feat) => ({
      ...feat,
      id: feat.id ?? `${feat.key}|${feat.source}`,
    }));
    return styleState(checked.value, oldClassLevel, newClassLevel, 'feat', count, options);
  }
  const featureTypes = fightingStyleFeatureTypes(checked.value);
  const options = dedupeRuleEntitiesByNameAndSourcePriority(
    'fighting-style',
    context.catalog.fightingStyles.filter((style) => (
      isRuleEntityAuthorized('fighting-style', style, context.authorization)
      && style.featureTypes.some((type) => featureTypes.has(type))
      && !known.has(style.id)
    )),
    context.authorization,
  );
  return styleState(checked.value, oldClassLevel, newClassLevel, 'feature', count, options);
}

export function createRuleFightingStyleAdvancementEffects(
  state: RuleFightingStyleAdvancementState,
  selectedIds: readonly string[] = [],
): RuleResult<RuleEffect[]> {
  const selected = validateSingleGroup(state.group, selectedIds, 'fightingStyle');
  if (!selected.ok) return selected;
  if (!state.mode) return success([]);
  return success(selected.value.map((id) => {
    const option = state.group!.options.find((candidate) => (
      (candidate.id ?? `${candidate.key}|${candidate.source}`) === id
    ))!;
    return state.mode === 'feat'
      ? {
          type: 'feat.add' as const,
          feat: entityRef(option),
          sourceId: `auto-feat-${option.key}-${option.source}`,
        }
      : {
          type: 'feature.add' as const,
          feature: entityRef(option),
          sourceId: `auto-fighting-style-${option.id}`,
        };
  }));
}

export function createRuleFightingStyleCantripChoiceState(
  context: RuleContext,
  style: RuleFeatCatalogEntry | RuleFightingStyle,
): RuleResult<RuleFightingStyleCantripChoiceState> {
  const key = style.key || style.englishName || style.name;
  const classKey = key === 'Blessed Warrior' || style.name === '受祝福的勇士'
    ? 'Cleric'
    : key === 'Druidic Warrior' || style.name === '德鲁伊教战士'
      ? 'Druid'
      : undefined;
  if (!classKey) return success({ style });
  const options = context.catalog.spells
    .filter((spell) => (
      spell.ruleSystem === context.ruleSystem
      && spell.level === 0
      && spell.classKeys.includes(classKey)
      && isRuleEntityAuthorized('spell', spell, context.authorization)
    ))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'));
  if (options.length < 2) {
    return invalid('choice_count_invalid', ['fightingStyle', 'cantrips'], 'cantrip_options_insufficient');
  }
  return success({
    style,
    group: {
      id: `fighting-style-${style.key}-${style.source}-cantrips`,
      kind: 'spell',
      required: true,
      min: 2,
      max: 2,
      options,
    },
  });
}

export function createRuleFightingStyleCantripEffects(
  state: RuleFightingStyleCantripChoiceState,
  profileId: string,
  selectedIds: readonly string[] = [],
): RuleResult<RuleEffect[]> {
  const selected = validateSingleGroup(state.group, selectedIds, 'fightingStyleCantrips');
  if (!selected.ok) return selected;
  return success(selected.value.map((id) => {
    const spell = state.group!.options.find((option) => option.id === id)!;
    return {
      type: 'spell.add',
      profileId,
      spell: entityRef(spell),
      sourceId: `auto-fighting-style-${state.style.key}-${state.style.source}-cantrips`,
    };
  }));
}

export function createRuleWeaponMasteryAdvancementState(
  context: RuleContext,
  ruleClass: RuleClass,
  oldClassLevel: number,
  newClassLevel: number,
  knownWeaponIds: readonly string[],
): RuleResult<RuleWeaponMasteryAdvancementState> {
  const checked = validateClassAdvancement(context, ruleClass, oldClassLevel, newClassLevel);
  if (!checked.ok) return checked;
  const targetCount = weaponMasteryLimit(checked.value, newClassLevel);
  const known = new Set(knownWeaponIds);
  const needed = Math.max(0, targetCount - known.size);
  const options = context.catalog.weapons
    .filter((weapon) => (
      weapon.ruleSystem === context.ruleSystem
      && isRuleEntityAuthorized('weapon', weapon, context.authorization)
      && !known.has(weapon.id)
      && canClassMasterWeapon(checked.value, weapon)
    ))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'));
  if (needed > options.length) {
    return invalid('choice_count_invalid', ['weaponMastery'], 'weapon_mastery_options_insufficient');
  }
  const group = needed > 0 ? {
    id: `class-${checked.value.key}-${checked.value.source}-weapon-mastery-${newClassLevel}`,
    kind: 'weaponMastery' as const,
    required: true,
    min: needed,
    max: needed,
    options,
  } : undefined;
  return success({
    ruleClass: checked.value,
    oldClassLevel,
    newClassLevel,
    targetCount,
    ...(group === undefined ? {} : { group }),
  });
}

export function createRuleWeaponMasteryAdvancementEffects(
  state: RuleWeaponMasteryAdvancementState,
  selectedIds: readonly string[] = [],
): RuleResult<RuleEffect[]> {
  const selected = validateSingleGroup(state.group, selectedIds, 'weaponMastery');
  if (!selected.ok) return selected;
  return success(selected.value.map((id) => {
    const weapon = state.group!.options.find((option) => option.id === id)!;
    return {
      type: 'feature.add',
      feature: entityRef(weapon),
      sourceId: `auto-weapon-mastery-${weapon.id}`,
    };
  }));
}

function validateClassAdvancement(
  context: RuleContext,
  ruleClass: RuleClass,
  oldClassLevel: number,
  newClassLevel: number,
): RuleResult<RuleClass> {
  if (
    !Number.isInteger(oldClassLevel)
    || !Number.isInteger(newClassLevel)
    || oldClassLevel < 0
    || newClassLevel < oldClassLevel
    || newClassLevel > 20
  ) {
    return invalid('level_cap_exceeded', ['classLevel'], 'class_level_range_invalid');
  }
  const authorized = context.catalog.classes.find((candidate) => (
    candidate.key === ruleClass.key
    && candidate.source === ruleClass.source
    && candidate.ruleSystem === context.ruleSystem
    && isRuleEntityAuthorized('class', candidate, context.authorization)
  ));
  return authorized
    ? success(authorized)
    : invalid('entity_not_authorized', ['class'], 'class_not_authorized');
}

function styleState<T extends RuleFightingStyleChoice>(
  ruleClass: RuleClass,
  oldClassLevel: number,
  newClassLevel: number,
  mode: 'feat' | 'feature',
  count: number,
  options: T[],
): RuleResult<RuleFightingStyleAdvancementState> {
  if (count > options.length) {
    return invalid('choice_count_invalid', ['fightingStyle'], 'fighting_style_options_insufficient');
  }
  return success({
    ruleClass,
    oldClassLevel,
    newClassLevel,
    mode,
    group: {
      id: `class-${ruleClass.key}-${ruleClass.source}-fighting-style-${newClassLevel}`,
      kind: 'fightingStyle',
      required: true,
      min: count,
      max: count,
      options,
    },
  });
}

function validateSingleGroup(
  group: RuleChoiceGroup | undefined,
  selectedIds: readonly string[],
  path: string,
): RuleResult<string[]> {
  if (!group) {
    return selectedIds.length === 0
      ? success([])
      : invalid('choice_not_available', [path], `${path}_selection_not_available`);
  }
  const result = validateRuleChoiceSelections([group], {
    [group.id]: selectedIds,
  });
  return result.ok ? success([...selectedIds]) : result;
}

function fightingStyleFeatureTypes(ruleClass: RuleClass): Set<string> {
  if (ruleClass.key === 'Fighter') return new Set(['FS:F']);
  if (ruleClass.key === 'Paladin') return new Set(['FS:P']);
  if (ruleClass.key === 'Ranger') return new Set(['FS:R']);
  return new Set();
}

function weaponMasteryLimit(ruleClass: RuleClass, level: number): number {
  if (ruleClass.source !== 'XPHB') return 0;
  const progression = ruleClass.weaponMasteryProgression?.[level - 1];
  if (typeof progression === 'number' && progression > 0) return progression;
  const hasFeature = ruleClass.levelFeatures.some((feature) => (
    feature.level !== undefined
    && feature.level <= level
    && isNamed(feature, 'Weapon Mastery', '武器精通')
  ));
  if (!hasFeature) return 0;
  if (ruleClass.key === 'Fighter') return 3;
  return ['Barbarian', 'Paladin', 'Ranger', 'Rogue'].includes(ruleClass.key) ? 2 : 0;
}

function canClassMasterWeapon(ruleClass: RuleClass, weapon: RuleWeapon): boolean {
  if (!weapon.mastery?.length || !['simple', 'martial'].includes(weapon.weaponCategory ?? '')) {
    return false;
  }
  const isMelee = weapon.type?.split('|')[0] === 'M';
  if (ruleClass.key === 'Barbarian') return isMelee;
  if (ruleClass.key !== 'Rogue') return true;
  return weapon.weaponCategory === 'simple'
    || (weapon.weaponCategory === 'martial'
      && (hasWeaponProperty(weapon, 'F') || hasWeaponProperty(weapon, 'L')));
}

function hasWeaponProperty(weapon: RuleWeapon, code: string): boolean {
  return (weapon.property ?? []).some((property) => (
    (typeof property === 'string' ? property : property.uid ?? '').split('|')[0] === code
  ));
}

function isNamed(
  value: { name: string; englishName?: string },
  englishName: string,
  name: string,
): boolean {
  return value.englishName === englishName || value.name === name;
}

function entityRef(entity: { id?: string; key?: string; name?: string; source: string }) {
  const key = entity.key ?? entity.name;
  if (!key) throw new Error('Rule entity is missing key and name');
  return {
    id: entity.id ?? `${key}|${entity.source}`,
    key,
    source: entity.source,
  };
}

function invalid(
  code: RuleIssue['code'],
  path: readonly (string | number)[],
  reason: string,
): RuleResult<never> {
  return {
    ok: false,
    issues: [{ code, path, detail: { reason } }],
  };
}

function success<T>(value: T): RuleResult<T> {
  return { ok: true, value, warnings: [] };
}
