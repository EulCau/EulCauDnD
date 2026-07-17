import type { RuleEntityKind } from '../catalog/identity.js';
import type { RuleAuthorizationPolicy } from './authorization.js';

export interface RuleNamedSourceEntity {
  id?: string;
  key?: string;
  name: string;
  englishName?: string;
  source: string;
}

export function getRuleSourceRank(
  kind: RuleEntityKind,
  source: string,
  policy: RuleAuthorizationPolicy,
): number {
  const priority = policy.sourcePriority[kind] ?? [];
  const index = priority.indexOf(source);
  return index >= 0 ? index : priority.length;
}

export function dedupeRuleEntitiesByNameAndSourcePriority<T extends RuleNamedSourceEntity>(
  kind: RuleEntityKind,
  entities: readonly T[],
  policy: RuleAuthorizationPolicy,
): T[] {
  const byName = new Map<string, T>();
  for (const entity of entities) {
    const identity = normalizedDisplayIdentity(entity);
    const existing = byName.get(identity);
    if (
      existing === undefined
      || getRuleSourceRank(kind, entity.source, policy)
        < getRuleSourceRank(kind, existing.source, policy)
    ) {
      byName.set(identity, entity);
    }
  }
  return [...byName.values()].sort((left, right) => (
    left.name.localeCompare(right.name, 'zh-Hans-CN')
    || left.source.localeCompare(right.source)
    || String(left.id ?? left.key ?? '').localeCompare(String(right.id ?? right.key ?? ''))
  ));
}

function normalizedDisplayIdentity(entity: RuleNamedSourceEntity): string {
  return (String(entity.englishName || entity.key || entity.name)
    .split('|')[0] ?? '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-US');
}
