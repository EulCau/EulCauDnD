import type {
  RuleClass,
  RuleOptionalFeature,
  RuleSubclass,
} from '../catalog/model.js';
import type { RuleChoiceGroup, RuleChoiceKind } from '../model/choice.js';
import type { RuleContext } from '../model/context.js';
import type { RuleEffect } from '../model/effect.js';
import type { RuleIssue, RuleResult } from '../model/issue.js';
import { isRuleEntityAuthorized } from '../policy/authorization.js';
import { getRuleOptionalFeatureOptions } from '../options/feat-specialized.js';
import { validateRuleChoiceSelections } from '../validation/common.js';

export interface RuleOptionalFeatureAdvancementState {
  kind: 'maneuver' | 'metamagic';
  oldClassLevel: number;
  newClassLevel: number;
  targetCount: number;
  group?: RuleChoiceGroup<RuleOptionalFeature>;
}

export function createRuleMetamagicAdvancementState(
  context: RuleContext,
  ruleClass: RuleClass,
  oldClassLevel: number,
  newClassLevel: number,
  existingIds: readonly string[],
  extraTargetCount = 0,
): RuleResult<RuleOptionalFeatureAdvancementState> {
  const levels = validateLevels(oldClassLevel, newClassLevel);
  if (!levels.ok) return levels;
  if (!Number.isInteger(extraTargetCount) || extraTargetCount < 0) {
    return invalid('choice_count_invalid', ['metamagic'], 'extra_count_invalid');
  }
  const authorized = context.catalog.classes.find((candidate) => (
    candidate.key === ruleClass.key
    && candidate.source === ruleClass.source
    && candidate.ruleSystem === context.ruleSystem
    && isRuleEntityAuthorized('class', candidate, context.authorization)
  ));
  if (!authorized) {
    return invalid('entity_not_authorized', ['class'], 'class_not_authorized');
  }
  return optionalFeatureState(
    context,
    'metamagic',
    oldClassLevel,
    newClassLevel,
    progressionTarget(authorized.metamagicProgression, newClassLevel) + extraTargetCount,
    existingIds,
    context.catalog.metamagics,
    `${authorized.key}-${authorized.source}`,
  );
}

export function createRuleManeuverAdvancementState(
  context: RuleContext,
  subclass: RuleSubclass | undefined,
  oldClassLevel: number,
  newClassLevel: number,
  existingIds: readonly string[],
  extraTargetCount = 0,
): RuleResult<RuleOptionalFeatureAdvancementState> {
  const levels = validateLevels(oldClassLevel, newClassLevel);
  if (!levels.ok) return levels;
  if (!Number.isInteger(extraTargetCount) || extraTargetCount < 0) {
    return invalid('choice_count_invalid', ['maneuver'], 'extra_count_invalid');
  }
  const authorizedSubclass = subclass === undefined
    ? undefined
    : context.catalog.subclasses.find((candidate) => (
        candidate.id === subclass.id
        && candidate.classSource === (context.ruleSystem === '5r' ? 'XPHB' : 'PHB')
        && isRuleEntityAuthorized('subclass', candidate, context.authorization)
      ));
  if (subclass !== undefined && authorizedSubclass === undefined) {
    return invalid('entity_not_authorized', ['subclass'], 'subclass_not_authorized');
  }
  const targetCount = progressionTarget(
    authorizedSubclass?.maneuverProgression,
    newClassLevel,
  ) + extraTargetCount;
  return optionalFeatureState(
    context,
    'maneuver',
    oldClassLevel,
    newClassLevel,
    targetCount,
    existingIds,
    context.catalog.maneuvers,
    authorizedSubclass ? `${authorizedSubclass.key}-${authorizedSubclass.source}` : 'extra',
  );
}

export function createRuleOptionalFeatureAdvancementEffects(
  state: RuleOptionalFeatureAdvancementState,
  selectedIds: readonly string[] = [],
): RuleResult<RuleEffect[]> {
  if (!state.group) {
    return selectedIds.length === 0
      ? success([])
      : invalid('choice_not_available', [state.kind], `${state.kind}_selection_not_available`);
  }
  const validated = validateRuleChoiceSelections(
    [state.group],
    { [state.group.id]: selectedIds },
  );
  if (!validated.ok) return validated;
  const options = new Map(state.group.options.map((option) => [option.id, option]));
  return success(selectedIds.map((id) => {
    const option = options.get(id)!;
    return {
      type: 'feature.add',
      feature: {
        id: option.id,
        key: option.key,
        source: option.source,
      },
      sourceId: `auto-${state.kind}-${option.key}-${option.source}`,
    };
  }));
}

function optionalFeatureState(
  context: RuleContext,
  kind: 'maneuver' | 'metamagic',
  oldClassLevel: number,
  newClassLevel: number,
  targetCount: number,
  existingIds: readonly string[],
  entries: readonly RuleOptionalFeature[],
  ownerId: string,
): RuleResult<RuleOptionalFeatureAdvancementState> {
  const known = new Set(existingIds);
  const options = getRuleOptionalFeatureOptions(
    entries,
    kind,
    context.authorization,
    new Set([...known].map(normalizeIdentity)),
  );
  const needed = Math.max(0, targetCount - known.size);
  if (needed > options.length) {
    return invalid('choice_count_invalid', [kind], `${kind}_options_insufficient`);
  }
  const group = needed > 0 ? {
    id: `${ownerId}-${kind}-${newClassLevel}`,
    kind: kind as RuleChoiceKind,
    required: true,
    min: needed,
    max: needed,
    options,
  } : undefined;
  return success({
    kind,
    oldClassLevel,
    newClassLevel,
    targetCount,
    ...(group === undefined ? {} : { group }),
  });
}

function progressionTarget(
  progression: readonly (number | null)[] | undefined,
  level: number,
): number {
  let target = 0;
  for (const value of progression?.slice(0, level) ?? []) {
    if (typeof value === 'number' && value >= 0) target = value;
  }
  return target;
}

function normalizeIdentity(value: string): string {
  return (value.split('|')[0] ?? value)
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-US');
}

function validateLevels(
  oldClassLevel: number,
  newClassLevel: number,
): RuleResult<true> {
  return (
    Number.isInteger(oldClassLevel)
    && Number.isInteger(newClassLevel)
    && oldClassLevel >= 0
    && newClassLevel >= oldClassLevel
    && newClassLevel <= 20
  )
    ? success(true)
    : invalid('level_cap_exceeded', ['classLevel'], 'class_level_range_invalid');
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
