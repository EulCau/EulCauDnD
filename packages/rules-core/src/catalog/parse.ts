import { ruleEntityIdentityKey, type RuleEntityKind } from './identity.js';
import type { RuleCatalog } from './model.js';
import { cloneJsonValue, type JsonObject } from '../model/json.js';
import type { RuleIssue, RuleResult } from '../model/issue.js';

const collections: readonly {
  key: keyof Pick<
    RuleCatalog,
    | 'armors'
    | 'backgrounds'
    | 'classes'
    | 'feats'
    | 'fightingStyles'
    | 'invocations'
    | 'maneuvers'
    | 'metamagics'
    | 'races'
    | 'spells'
    | 'subclasses'
    | 'subraces'
    | 'weaponMasteries'
    | 'weapons'
  >;
  kind: RuleEntityKind;
  requiresId: boolean;
  requiresKey?: boolean;
}[] = [
  { key: 'classes', kind: 'class', requiresId: false },
  { key: 'subclasses', kind: 'subclass', requiresId: true },
  { key: 'races', kind: 'race', requiresId: false },
  { key: 'subraces', kind: 'subrace', requiresId: false },
  { key: 'backgrounds', kind: 'background', requiresId: false },
  { key: 'feats', kind: 'feat', requiresId: false },
  { key: 'invocations', kind: 'invocation', requiresId: true },
  { key: 'fightingStyles', kind: 'fighting-style', requiresId: true },
  { key: 'metamagics', kind: 'metamagic', requiresId: true },
  { key: 'maneuvers', kind: 'maneuver', requiresId: true },
  { key: 'weapons', kind: 'weapon', requiresId: true },
  { key: 'weaponMasteries', kind: 'weapon-mastery', requiresId: true },
  { key: 'armors', kind: 'armor', requiresId: true },
  { key: 'spells', kind: 'spell', requiresId: true, requiresKey: false },
];

export function parseRuleCatalog(value: unknown): RuleResult<RuleCatalog> {
  const cloned = cloneJsonValue(value);
  if (!cloned.ok) {
    return {
      ok: false,
      issues: cloned.issues.map((entry) => ({ ...entry, code: 'catalog_invalid' })),
    };
  }
  if (!isRecord(cloned.value)) return invalid([], 'catalog_not_object');
  const catalog = cloned.value;
  const issues: RuleIssue[] = [];
  if (typeof catalog.generatedAt !== 'string' || catalog.generatedAt.length === 0) {
    issues.push(issue(['generatedAt'], 'generated_at_invalid'));
  }
  if (catalog.rules !== undefined && !isRecord(catalog.rules)) {
    issues.push(issue(['rules'], 'rules_not_object'));
  }
  for (const collection of collections) {
    const valueAtKey = catalog[collection.key];
    if (!Array.isArray(valueAtKey)) {
      issues.push(issue([collection.key], 'collection_not_array'));
      continue;
    }
    const identities = new Set<string>();
    valueAtKey.forEach((entry, index) => {
      const path = [collection.key, index] as const;
      if (!isRecord(entry)) {
        issues.push(issue(path, 'entity_not_object'));
        return;
      }
      if (
        (collection.requiresKey !== false && !validText(entry.key))
        || !validText(entry.name)
        || !validText(entry.source)
        || (collection.requiresId && !validText(entry.id))
      ) {
        issues.push(issue(path, 'entity_identity_invalid'));
        return;
      }
      const identity = ruleEntityIdentityKey(
        collection.kind,
        {
          ...(validText(entry.id) ? { id: entry.id } : {}),
          key: validText(entry.key) ? entry.key : String(entry.id),
          source: String(entry.source),
        },
        collection.kind === 'subrace'
          ? [String(entry.raceName ?? ''), String(entry.raceSource ?? '')]
          : [],
      );
      if (identities.has(identity)) {
        issues.push({
          ...issue(path, 'entity_identity_duplicate'),
          entityId: identity,
        });
      }
      identities.add(identity);
    });
  }
  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    value: catalog as unknown as RuleCatalog,
    warnings: [],
  };
}

function validText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(
  path: readonly (string | number)[],
  reason: string,
): RuleResult<never> {
  return { ok: false, issues: [issue(path, reason)] };
}

function issue(path: readonly (string | number)[], reason: string): RuleIssue {
  return {
    code: 'catalog_invalid',
    path,
    detail: { reason },
  };
}
