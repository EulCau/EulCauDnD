import type { RuleClass, RuleOptionalFeature } from '../catalog/model.js';
import type { RuleChoiceGroup } from '../model/choice.js';
import type { RuleContext } from '../model/context.js';
import type { RuleEffect } from '../model/effect.js';
import type { RuleIssue, RuleResult } from '../model/issue.js';
import {
  getRuleInvocationOptions,
  type RuleSpecializedFeatContext,
} from '../options/feat-specialized.js';
import { isRuleEntityAuthorized } from '../policy/authorization.js';
import { validateRuleChoiceSelections } from '../validation/common.js';

export interface RuleInvocationAdvancementState {
  ruleClass: RuleClass;
  oldClassLevel: number;
  newClassLevel: number;
  targetCount: number;
  group?: RuleChoiceGroup<RuleOptionalFeature>;
}

export function createRuleInvocationAdvancementState(
  context: RuleContext,
  ruleClass: RuleClass,
  oldClassLevel: number,
  newClassLevel: number,
  existingInvocationIds: readonly string[],
  prerequisiteContext: RuleSpecializedFeatContext = {},
): RuleResult<RuleInvocationAdvancementState> {
  if (
    !Number.isInteger(oldClassLevel)
    || !Number.isInteger(newClassLevel)
    || oldClassLevel < 0
    || newClassLevel < oldClassLevel
    || newClassLevel > 20
  ) {
    return invalid('level_cap_exceeded', ['classLevel'], 'class_level_range_invalid');
  }
  const authorizedClass = context.catalog.classes.find((candidate) => (
    candidate.key === ruleClass.key
    && candidate.source === ruleClass.source
    && candidate.ruleSystem === context.ruleSystem
    && isRuleEntityAuthorized('class', candidate, context.authorization)
  ));
  if (!authorizedClass) {
    return invalid('entity_not_authorized', ['class'], 'class_not_authorized');
  }
  const targetCount = authorizedClass.invocationProgression?.[newClassLevel - 1] ?? 0;
  const knownIds = [...new Set(existingInvocationIds)];
  const needed = Math.max(0, targetCount - knownIds.length);
  const known = new Set([
    ...knownIds,
    ...(prerequisiteContext.knownFeatureIds ?? []),
    ...(prerequisiteContext.knownFeatureNames ?? []),
  ].map(normalizeRef));
  const options = getRuleInvocationOptions(
    context.catalog,
    context.authorization,
    known,
    {
      ...prerequisiteContext,
      knownFeatureIds: [
        ...(prerequisiteContext.knownFeatureIds ?? []),
        ...knownIds,
      ],
      warlockLevel: newClassLevel,
    },
  );
  if (needed > options.length) {
    return invalid('choice_count_invalid', ['invocation'], 'invocation_options_insufficient');
  }
  const group = needed > 0 ? {
    id: `class-${authorizedClass.key}-${authorizedClass.source}-invocation-${newClassLevel}`,
    kind: 'invocation' as const,
    required: true,
    min: needed,
    max: needed,
    options,
  } : undefined;
  return success({
    ruleClass: authorizedClass,
    oldClassLevel,
    newClassLevel,
    targetCount,
    ...(group === undefined ? {} : { group }),
  });
}

export function createRuleInvocationAdvancementEffects(
  state: RuleInvocationAdvancementState,
  selectedIds: readonly string[] = [],
): RuleResult<RuleEffect[]> {
  if (!state.group) {
    return selectedIds.length === 0
      ? success([])
      : invalid('choice_not_available', ['invocation'], 'invocation_selection_not_available');
  }
  const validated = validateRuleChoiceSelections(
    [state.group],
    { [state.group.id]: selectedIds },
  );
  if (!validated.ok) return validated;
  const options = new Map(state.group.options.map((option) => [option.id, option]));
  return success(selectedIds.map((id) => {
    const invocation = options.get(id)!;
    return {
      type: 'feature.add',
      feature: {
        id: invocation.id,
        key: invocation.key,
        source: invocation.source,
      },
      sourceId: `auto-invocation-${invocation.key}-${invocation.source}`,
    };
  }));
}

function normalizeRef(value: string): string {
  return (value.split('#')[0] ?? value)
    .split('|')[0]!
    .replace(/^auto-invocation-/, '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-US');
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
