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

function normalizePart(value: string): string {
  return value.normalize('NFKC').trim();
}

function nonEmpty(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const normalized = normalizePart(value);
  return normalized.length > 0 ? normalized : undefined;
}
