import type {
  RuleCatalog,
  RuleFeatCatalogEntry,
  RuleOptionalFeature,
  RuleSpell,
  RuleSystem,
} from '../catalog/model.js';
import type { RuleChoiceGroup } from '../model/choice.js';
import type { RuleEffect } from '../model/effect.js';
import type { RuleResult } from '../model/issue.js';
import type { RuleAuthorizationPolicy } from '../policy/authorization.js';
import { isRuleEntityAuthorized } from '../policy/authorization.js';
import { createDefaultRuleAuthorizationPolicy } from '../policy/default-policy.js';
import { dedupeRuleEntitiesByNameAndSourcePriority } from '../policy/source-priority.js';
import { validateRuleChoiceSelections } from '../validation/common.js';

export interface RuleSpecializedFeatContext {
  knownFeatureIds?: readonly string[];
  knownFeatureNames?: readonly string[];
  selectedFeatureIds?: readonly string[];
  knownSpellIds?: readonly string[];
  selectedSpellIds?: readonly string[];
  warlockLevel?: number;
}

export interface RuleSpecializedFeatChoiceState {
  groups: RuleChoiceGroup<RuleOptionalFeature>[];
}

export function createRuleSpecializedFeatChoiceState(
  catalog: RuleCatalog,
  ruleSystem: RuleSystem,
  feat: RuleFeatCatalogEntry,
  context: RuleSpecializedFeatContext = {},
  policy: RuleAuthorizationPolicy = createDefaultRuleAuthorizationPolicy(catalog, ruleSystem),
): RuleResult<RuleSpecializedFeatChoiceState> {
  const known = knownFeatureIdentities(context);
  const groups: RuleChoiceGroup<RuleOptionalFeature>[] = [];
  addGroup(groups, feat, 'fightingStyle', feat.fightingStyleCount, fightingStyles(
    catalog,
    policy,
    known,
  ));
  addGroup(groups, feat, 'invocation', feat.invocationCount, invocations(
    catalog,
    policy,
    known,
    context,
  ));
  addGroup(groups, feat, 'maneuver', feat.maneuverCount, optionalFeatures(
    catalog.maneuvers,
    'maneuver',
    policy,
    known,
  ));
  addGroup(groups, feat, 'metamagic', feat.metamagicCount, optionalFeatures(
    catalog.metamagics,
    'metamagic',
    policy,
    known,
  ));
  return success({ groups });
}

export function createRuleSpecializedFeatEffects(
  catalog: RuleCatalog,
  ruleSystem: RuleSystem,
  feat: RuleFeatCatalogEntry,
  context: RuleSpecializedFeatContext,
  selections: Readonly<Record<string, readonly string[]>>,
  policy: RuleAuthorizationPolicy = createDefaultRuleAuthorizationPolicy(catalog, ruleSystem),
): RuleResult<RuleEffect[]> {
  const state = createRuleSpecializedFeatChoiceState(
    catalog,
    ruleSystem,
    feat,
    context,
    policy,
  );
  if (!state.ok) return state;
  const validated = validateRuleChoiceSelections(state.value.groups, selections);
  if (!validated.ok) return validated;
  const options = new Map(state.value.groups.flatMap((group) => (
    group.options.map((option) => [option.id, option] as const)
  )));
  const sourceId = `auto-feat-${feat.key}-${feat.source}`;
  return success(validated.value.flatMap(({ selectedIds }) => selectedIds.map((id) => ({
    type: 'feature.add',
    feature: toRef(requiredOption(options, id)),
    sourceId,
  }))));
}

function addGroup(
  groups: RuleChoiceGroup<RuleOptionalFeature>[],
  feat: RuleFeatCatalogEntry,
  kind: 'fightingStyle' | 'invocation' | 'maneuver' | 'metamagic',
  count: number | undefined,
  options: RuleOptionalFeature[],
): void {
  if (!count || count < 1) return;
  groups.push({
    id: `feat-${feat.key}-${feat.source}-${kind}`,
    kind,
    required: true,
    min: count,
    max: count,
    options,
  });
}

function fightingStyles(
  catalog: RuleCatalog,
  policy: RuleAuthorizationPolicy,
  known: ReadonlySet<string>,
): RuleOptionalFeature[] {
  return optionalFeatures(
    catalog.fightingStyles.filter(({ featureTypes }) => featureTypes.includes('FS:F')),
    'fighting-style',
    policy,
    known,
  );
}

function invocations(
  catalog: RuleCatalog,
  policy: RuleAuthorizationPolicy,
  known: ReadonlySet<string>,
  context: RuleSpecializedFeatContext,
): RuleOptionalFeature[] {
  return optionalFeatures(
    catalog.invocations.filter((invocation) => (
      (!invocation.prerequisite?.length || (context.warlockLevel ?? 0) > 0)
      && invocationPrerequisiteMet(catalog, invocation, context)
    )),
    'invocation',
    policy,
    known,
  );
}

function optionalFeatures(
  entries: readonly RuleOptionalFeature[],
  kind: 'fighting-style' | 'invocation' | 'maneuver' | 'metamagic',
  policy: RuleAuthorizationPolicy,
  known: ReadonlySet<string>,
): RuleOptionalFeature[] {
  return dedupeRuleEntitiesByNameAndSourcePriority(
    kind,
    entries
      .filter((entry) => isRuleEntityAuthorized(kind, entry, policy))
      .filter((entry) => !entityIdentities(entry).some((id) => known.has(id))),
    policy,
  );
}

function invocationPrerequisiteMet(
  catalog: RuleCatalog,
  invocation: RuleOptionalFeature,
  context: RuleSpecializedFeatContext,
): boolean {
  if (!invocation.prerequisite?.length) return true;
  const known = new Set([
    ...knownFeatureIdentities(context),
    ...(context.selectedFeatureIds ?? []).map(normalizeRef),
  ]);
  return invocation.prerequisite.some((alternative) => {
    if (!isRecord(alternative)) return false;
    return Object.entries(alternative).every(([key, value]) => {
      if (key === 'level') {
        const required = prerequisiteLevel(value);
        return required === undefined || (context.warlockLevel ?? 0) >= required;
      }
      if (key === 'optionalfeature' && Array.isArray(value)) {
        return value.every((ref) => (
          typeof ref === 'string' && known.has(normalizeRef(ref))
        ));
      }
      if (key === 'pact') return known.has(normalizeRef(String(value)));
      if (key === 'spell') return spellPrerequisiteMet(catalog, value, context);
      return false;
    });
  });
}

function spellPrerequisiteMet(
  catalog: RuleCatalog,
  value: unknown,
  context: RuleSpecializedFeatContext,
): boolean {
  if (!Array.isArray(value)) return false;
  const knownIds = new Set([
    ...(context.knownSpellIds ?? []),
    ...(context.selectedSpellIds ?? []),
  ]);
  const known = catalog.spells.filter((spell) => (
    knownIds.has(spell.id)
    || knownIds.has(`${spell.key ?? spell.englishName ?? spell.name}|${spell.source}`)
  ));
  return value.every((entry) => (
    typeof entry === 'string'
      ? known.some((spell) => spellIdentities(spell).has(normalizeRef(entry)))
      : isRecord(entry) && known.some((spell) => spellMatchesFilter(spell, entry))
  ));
}

function spellMatchesFilter(spell: RuleSpell, prerequisite: Record<string, unknown>): boolean {
  const filters = parseSpellFilters(
    typeof prerequisite.choose === 'string' ? prerequisite.choose : '',
  );
  const summary = `${String(prerequisite.entry ?? '')} ${String(prerequisite.entrySummary ?? '')}`;
  return (
    (filters.level === undefined || spell.level === filters.level)
    && (!filters.classKey || spell.classKeys.includes(filters.classKey))
    && (!summary.includes('伤害') || Boolean(spell.damageInflict?.length))
    && (!filters.spellAttack || Boolean(spell.spellAttack?.some((attack) => (
      filters.spellAttack?.has(attack.toUpperCase())
    ))))
  );
}

function parseSpellFilters(choose: string): {
  level?: number;
  classKey?: string;
  spellAttack?: ReadonlySet<string>;
} {
  const filters: {
    level?: number;
    classKey?: string;
    spellAttack?: ReadonlySet<string>;
  } = {};
  for (const part of choose.split('|')) {
    const [key, value] = part.split('=');
    if (key === 'level' && value !== undefined) filters.level = Number(value);
    if (key === 'class' && value) filters.classKey = value;
    if (key === 'spell attack' && value) {
      filters.spellAttack = new Set(value.split(';').map((item) => item.trim().toUpperCase()));
    }
  }
  return filters;
}

function knownFeatureIdentities(context: RuleSpecializedFeatContext): Set<string> {
  return new Set([
    ...(context.knownFeatureIds ?? []),
    ...(context.knownFeatureNames ?? []),
  ].map(normalizeRef));
}

function entityIdentities(entity: RuleOptionalFeature): string[] {
  return [
    entity.id,
    entity.key,
    entity.name,
    entity.englishName,
    `${entity.key}|${entity.source}`,
  ].filter((value): value is string => Boolean(value)).map(normalizeRef);
}

function spellIdentities(spell: RuleSpell): Set<string> {
  return new Set([
    spell.id,
    spell.key,
    spell.name,
    spell.englishName,
    `${spell.key ?? spell.englishName ?? spell.name}|${spell.source}`,
  ].filter((value): value is string => Boolean(value)).map(normalizeRef));
}

function normalizeRef(value: string): string {
  return (value.split('#')[0] ?? value)
    .split('|')[0]!
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-US');
}

function prerequisiteLevel(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  return isRecord(value) && typeof value.level === 'number' ? value.level : undefined;
}

function toRef(feature: RuleOptionalFeature) {
  return {
    id: feature.id,
    key: feature.key,
    source: feature.source,
  };
}

function requiredOption(
  options: ReadonlyMap<string, RuleOptionalFeature>,
  id: string,
): RuleOptionalFeature {
  const option = options.get(id);
  if (option === undefined) throw new Error(`validated specialized feat option is missing: ${id}`);
  return option;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function success<T>(value: T): RuleResult<T> {
  return { ok: true, value, warnings: [] };
}
