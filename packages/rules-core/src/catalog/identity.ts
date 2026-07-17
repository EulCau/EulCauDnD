import type { RuleEntity } from './model.js';

export type RuleEntityKind =
  | 'armor'
  | 'background'
  | 'class'
  | 'feat'
  | 'fighting-style'
  | 'invocation'
  | 'maneuver'
  | 'metamagic'
  | 'race'
  | 'spell'
  | 'subclass'
  | 'subrace'
  | 'weapon'
  | 'weapon-mastery';

export function getRuleEntityId(
  _kind: RuleEntityKind,
  entity: Pick<RuleEntity, 'id' | 'key' | 'source'>,
  scope: readonly string[] = [],
): string {
  return nonEmpty(entity.id) ?? [
    ...scope.map(normalizePart),
    normalizePart(entity.key),
    normalizePart(entity.source),
  ].join('|');
}

export function ruleEntityIdentityKey(
  kind: RuleEntityKind,
  entity: Pick<RuleEntity, 'id' | 'key' | 'source'>,
  scope: readonly string[] = [],
): string {
  return `${kind}:${getRuleEntityId(kind, entity, scope)}`;
}

export function parseRuleEntitySourceId(
  kind: RuleEntityKind,
  sourceId: string,
): { id: string; key: string; source: string } | undefined {
  const prefix = `auto-${kind}-`;
  if (!sourceId.startsWith(prefix)) return undefined;
  const identity = sourceId.slice(prefix.length);
  const separator = identity.lastIndexOf('-');
  if (separator <= 0 || separator === identity.length - 1) return undefined;
  const key = identity.slice(0, separator);
  const source = identity.slice(separator + 1);
  return { id: `${key}|${source}`, key, source };
}

export function ruleEntityRefMatches(
  entity: { id?: string; key?: string; source?: string },
  key: string,
  source?: string,
): boolean {
  const normalizedKey = normalizePart(key);
  const normalizedSource = source === undefined ? undefined : normalizePart(source);
  if (entity.key !== undefined && normalizePart(entity.key) !== normalizedKey) return false;
  if (entity.key === undefined) {
    const expectedId = normalizedSource === undefined
      ? undefined
      : `${normalizedKey}|${normalizedSource}`;
    if (expectedId === undefined || entity.id !== expectedId) return false;
  }
  return normalizedSource === undefined
    || (entity.source !== undefined && normalizePart(entity.source) === normalizedSource);
}

function normalizePart(value: string): string {
  return value.normalize('NFKC').trim();
}

function nonEmpty(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const normalized = normalizePart(value);
  return normalized.length > 0 ? normalized : undefined;
}
