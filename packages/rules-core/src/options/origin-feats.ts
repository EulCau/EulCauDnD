import type { RuleFeatCatalogEntry, RuleOrigin } from '../catalog/model.js';
import type { RuleEffect } from '../model/effect.js';
import type { RuleIssue, RuleResult } from '../model/issue.js';

export interface RuleOriginFeatChoiceState {
  id: string;
  count: number;
  mode: 'choice' | 'fixed';
  options: RuleFeatCatalogEntry[];
}

export function createRuleOriginFeatChoiceState(
  origin: Pick<RuleOrigin, 'key' | 'source' | 'feats'> | undefined,
  availableFeats: readonly RuleFeatCatalogEntry[],
  decoupledOrigin = false,
): RuleResult<RuleOriginFeatChoiceState | null> {
  if (decoupledOrigin) {
    const options = availableFeats.filter((feat) => (
      feat.category === 'O' && !feat.prerequisite?.length
    ));
    return success(options.length === 0 ? null : {
      id: 'origin-decoupled-feat',
      count: 1,
      mode: 'choice',
      options: cloneFeats(options),
    });
  }
  if (origin?.feats === undefined) return success(null);
  if (!Array.isArray(origin.feats)) {
    return invalid(['origin', origin.key, 'feats'], 'origin_feats_not_array');
  }

  const fixed: RuleFeatCatalogEntry[] = [];
  const choices: Array<{ count: number; options: RuleFeatCatalogEntry[] }> = [];
  const issues: RuleIssue[] = [];
  origin.feats.forEach((entry, index) => {
    const path = ['origin', origin.key, 'feats', index] as const;
    if (!isRecord(entry)) {
      issues.push(issue(path, 'origin_feat_entry_not_object'));
      return;
    }
    const keys = Object.keys(entry);
    if (keys.length === 1 && keys[0] === 'any') {
      const count = positiveInteger(entry.any);
      if (count === undefined) {
        issues.push(issue([...path, 'any'], 'origin_feat_count_invalid'));
        return;
      }
      choices.push({
        count,
        options: availableFeats.filter((feat) => !feat.prerequisite?.length),
      });
      return;
    }
    if (keys.length === 1 && keys[0] === 'anyFromCategory') {
      const rawChoice = entry.anyFromCategory;
      if (!isRecord(rawChoice)) {
        issues.push(issue([...path, 'anyFromCategory'], 'origin_feat_category_choice_invalid'));
        return;
      }
      const choice: Record<string, unknown> = rawChoice;
      const choiceKeys = Object.keys(choice);
      const categories = Array.isArray(choice.category)
        ? choice.category.filter((value): value is string => (
            typeof value === 'string' && value.length > 0
          ))
        : [];
      const count = choice.count === undefined ? 1 : positiveInteger(choice.count);
      if (
        choiceKeys.some((key) => key !== 'category' && key !== 'count')
        || categories.length !== (Array.isArray(choice.category) ? choice.category.length : -1)
        || categories.length === 0
        || count === undefined
      ) {
        issues.push(issue([...path, 'anyFromCategory'], 'origin_feat_category_choice_invalid'));
        return;
      }
      const allowedCategories = new Set(categories);
      choices.push({
        count,
        options: availableFeats.filter((feat) => (
          feat.category !== undefined
          && allowedCategories.has(feat.category)
          && !feat.prerequisite?.length
        )),
      });
      return;
    }
    for (const [reference, enabled] of Object.entries(entry)) {
      if (enabled !== true) {
        issues.push(issue([...path, reference], 'origin_feat_reference_value_invalid'));
        continue;
      }
      const feat = resolveFeatReference(availableFeats, reference);
      if (feat === undefined) issues.push(issue([...path, reference], 'origin_feat_not_found'));
      else fixed.push(feat);
    }
  });

  if (issues.length > 0) return { ok: false, issues };
  if (fixed.length > 0 && choices.length > 0) {
    return invalid(['origin', origin.key, 'feats'], 'origin_feat_mixed_grant_unsupported');
  }
  if (choices.length > 1) {
    return invalid(['origin', origin.key, 'feats'], 'origin_feat_multiple_choices_unsupported');
  }
  if (choices.length === 1) {
    const choice = choices[0];
    if (choice === undefined) {
      return invalid(['origin', origin.key, 'feats'], 'origin_feat_choice_missing');
    }
    if (choice.options.length < choice.count) {
      return invalid(['origin', origin.key, 'feats'], 'origin_feat_options_insufficient');
    }
    return success({
      id: `origin-${origin.key}-${origin.source}-feat`,
      count: choice.count,
      mode: 'choice',
      options: cloneFeats(choice.options),
    });
  }
  const options = uniqueFeats(fixed);
  return success(options.length === 0 ? null : {
    id: `origin-${origin.key}-${origin.source}-feat`,
    count: options.length,
    mode: 'fixed',
    options: cloneFeats(options),
  });
}

export function createRuleOriginFeatEffects(
  state: RuleOriginFeatChoiceState | null,
  selectedFeatIds: readonly string[] = [],
): RuleResult<RuleEffect[]> {
  if (state === null) {
    return selectedFeatIds.length === 0
      ? success([])
      : invalid(['originFeat'], 'origin_feat_not_available', 'choice_not_available');
  }
  const expectedIds = state.mode === 'fixed'
    ? state.options.map(featId)
    : selectedFeatIds;
  if (expectedIds.length !== state.count || new Set(expectedIds).size !== expectedIds.length) {
    return invalid(
      ['originFeat'],
      expectedIds.length < state.count ? 'origin_feat_choice_required' : 'origin_feat_choice_count_invalid',
      expectedIds.length < state.count ? 'choice_required' : 'choice_count_invalid',
    );
  }
  const available = new Map(state.options.map((feat) => [featId(feat), feat]));
  const selected = expectedIds.map((id) => available.get(id));
  if (selected.some((feat) => feat === undefined)) {
    return invalid(['originFeat'], 'origin_feat_choice_not_available', 'choice_not_available');
  }
  return success((selected as RuleFeatCatalogEntry[]).map((feat) => ({
    type: 'feat.add',
    feat: { id: featId(feat), key: feat.key, source: feat.source },
    sourceId: state.id,
  })));
}

function resolveFeatReference(
  feats: readonly RuleFeatCatalogEntry[],
  reference: string,
): RuleFeatCatalogEntry | undefined {
  const separator = reference.lastIndexOf('|');
  const name = (
    (separator >= 0 ? reference.slice(0, separator) : reference)
      .split(/[;；]/)[0] ?? ''
  ).trim();
  const source = separator >= 0 ? reference.slice(separator + 1).trim() : undefined;
  return feats.find((feat) => (
    (source === undefined || feat.source.toLocaleLowerCase('en-US') === source.toLocaleLowerCase('en-US'))
    && (feat.key === name || feat.name === name || feat.englishName === name)
  ));
}

function featId(feat: Pick<RuleFeatCatalogEntry, 'key' | 'source'>): string {
  return `${feat.key}|${feat.source}`;
}

function cloneFeats(feats: readonly RuleFeatCatalogEntry[]): RuleFeatCatalogEntry[] {
  return feats.map((feat) => structuredClone(feat));
}

function uniqueFeats(feats: readonly RuleFeatCatalogEntry[]): RuleFeatCatalogEntry[] {
  return [...new Map(feats.map((feat) => [featId(feat), feat])).values()];
}

function positiveInteger(value: unknown): number | undefined {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function success<T>(value: T): RuleResult<T> {
  return { ok: true, value, warnings: [] };
}

function invalid<T>(
  path: readonly (string | number)[],
  reason: string,
  code: 'choice_count_invalid' | 'choice_not_available' | 'choice_required' | 'unsupported_rule_shape'
    = 'unsupported_rule_shape',
): RuleResult<T> {
  return { ok: false, issues: [{ code, path, detail: { reason } }] };
}

function issue(path: readonly (string | number)[], reason: string): RuleIssue {
  return { code: 'unsupported_rule_shape', path, detail: { reason } };
}
