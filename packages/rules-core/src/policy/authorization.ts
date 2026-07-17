import type { RuleEntityKind } from '../catalog/identity.js';

export interface RuleAuthorizationPolicy {
  allowedSources: Partial<Record<RuleEntityKind, readonly string[]>>;
  allowedEntityIds?: Partial<Record<RuleEntityKind, readonly string[]>>;
  sourcePriority: Partial<Record<RuleEntityKind, readonly string[]>>;
}

export interface RuleAuthorizationEntity {
  id?: string;
  key?: string;
  source: string;
}

export function isRuleEntityAuthorized(
  kind: RuleEntityKind,
  entity: RuleAuthorizationEntity,
  policy: RuleAuthorizationPolicy,
): boolean {
  const allowedSources = policy.allowedSources[kind] ?? [];
  if (allowedSources.includes(entity.source)) return true;
  const allowedIds = policy.allowedEntityIds?.[kind] ?? [];
  return authorizationEntityIds(kind, entity).some((id) => allowedIds.includes(id));
}

function authorizationEntityIds(
  kind: RuleEntityKind,
  entity: RuleAuthorizationEntity,
): string[] {
  const ids = new Set<string>();
  if (nonEmpty(entity.id)) ids.add(entity.id.trim());
  if (nonEmpty(entity.key)) ids.add(`${entity.key.trim()}|${entity.source.trim()}`);
  for (const id of [...ids]) ids.add(`${kind}:${id}`);
  return [...ids];
}

function nonEmpty(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
