import type {
  RuleClass,
  RuleFeature,
  RuleSubclass,
} from '../catalog/model.js';
import type { RuleChoiceGroup } from '../model/choice.js';
import type { RuleContext } from '../model/context.js';
import type { RuleEffect } from '../model/effect.js';
import type { RuleIssue, RuleResult } from '../model/issue.js';
import { getRuleClassOptions, getRuleSubclassOptions } from '../options/catalog-options.js';
import { validateRuleChoiceSelections } from '../validation/common.js';

export interface RuleSubclassAdvancementState {
  ruleClass: RuleClass;
  oldClassLevel: number;
  newClassLevel: number;
  options: RuleSubclass[];
  group?: RuleChoiceGroup<RuleSubclass>;
  existingSubclass?: RuleSubclass;
}

export function createRuleSubclassAdvancementState(
  context: RuleContext,
  ruleClass: RuleClass,
  oldClassLevel: number,
  newClassLevel: number,
  existingSubclassId?: string,
): RuleResult<RuleSubclassAdvancementState> {
  if (
    !Number.isInteger(oldClassLevel)
    || !Number.isInteger(newClassLevel)
    || oldClassLevel < 0
    || newClassLevel < oldClassLevel
    || newClassLevel > 20
  ) {
    return invalid('level_cap_exceeded', ['classLevel'], 'class_level_range_invalid');
  }
  const authorizedClass = getRuleClassOptions(context).find(({ id, key, source }) => (
    (ruleClass.id !== undefined && id === ruleClass.id)
    || (key === ruleClass.key && source === ruleClass.source)
  ));
  if (authorizedClass === undefined || authorizedClass.ruleSystem !== context.ruleSystem) {
    return invalid('entity_not_authorized', ['class'], 'class_not_authorized');
  }
  const options = getRuleSubclassOptions(context, authorizedClass);
  const existingSubclass = existingSubclassId === undefined
    ? undefined
    : options.find(({ id }) => id === existingSubclassId);
  if (existingSubclassId !== undefined && existingSubclass === undefined) {
    return invalid('entity_not_authorized', ['subclass'], 'subclass_not_authorized');
  }
  const firstSubclassLevel = authorizedClass.subclassLevels?.[0];
  const needsSelection = existingSubclass === undefined
    && firstSubclassLevel !== undefined
    && newClassLevel >= firstSubclassLevel;
  const group = needsSelection
    ? {
        id: `class-${authorizedClass.key}-${authorizedClass.source}-subclass`,
        kind: 'subclass' as const,
        required: true,
        min: 1,
        max: 1,
        options,
      }
    : undefined;
  if (needsSelection && options.length === 0) {
    return invalid('entity_not_found', ['subclass'], 'subclass_options_empty');
  }
  return success({
    ruleClass: authorizedClass,
    oldClassLevel,
    newClassLevel,
    options,
    ...(group === undefined ? {} : { group }),
    ...(existingSubclass === undefined ? {} : { existingSubclass }),
  });
}

export function createRuleSubclassAdvancementEffects(
  state: RuleSubclassAdvancementState,
  selectedSubclassIds: readonly string[] = [],
): RuleResult<RuleEffect[]> {
  let subclass = state.existingSubclass;
  if (state.group) {
    const validated = validateRuleChoiceSelections(
      [state.group],
      { [state.group.id]: selectedSubclassIds },
    );
    if (!validated.ok) return validated;
    subclass = state.group.options.find(({ id }) => id === selectedSubclassIds[0]);
  } else if (selectedSubclassIds.length > 0) {
    return invalid('choice_not_available', ['subclass'], 'subclass_selection_not_available');
  }
  if (subclass === undefined) return success([]);
  const features = subclass.features
    .map((feature, index) => ({ feature, index }))
    .filter(({ feature }) => (
      typeof feature.level === 'number'
      && feature.level > state.oldClassLevel
      && feature.level <= state.newClassLevel
    ));
  const effects: RuleEffect[] = features.map(({ feature, index }) => ({
    type: 'feature.add',
    feature: getRuleSubclassFeatureRef(subclass, feature, index),
    sourceId: subclassFeatureSourceId(subclass, feature.level!),
  }));
  if (features.some(({ feature }) => feature.englishName === 'Hex Warrior')) {
    const sourceId = `auto-subclass-${subclass.key}-${subclass.source}`;
    effects.push(
      {
        type: 'proficiency.add',
        proficiency: 'armor:medium',
        sourceId,
      },
      {
        type: 'proficiency.add',
        proficiency: 'armor:shield',
        sourceId,
      },
      {
        type: 'proficiency.add',
        proficiency: 'weapon:martial',
        sourceId,
      },
    );
  }
  return success(effects);
}

export function getRuleSubclassFeatureRef(
  subclass: RuleSubclass,
  feature: RuleFeature,
  index: number,
) {
  const level = feature.level ?? 0;
  return {
    id: `${subclass.id}:feature:${level}:${index + 1}`,
    key: feature.englishName ?? feature.name,
    source: feature.source ?? subclass.source,
  };
}

function subclassFeatureSourceId(subclass: RuleSubclass, level: number): string {
  return `auto-subclass-${subclass.key}-${subclass.source}-level-${level}`;
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
