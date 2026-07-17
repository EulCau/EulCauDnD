import type { RuleIssue, RuleResult } from './issue.js';

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype']);

export function cloneJsonValue(value: unknown): RuleResult<JsonValue> {
  const issues: RuleIssue[] = [];
  const active = new WeakSet<object>();
  const cloned = cloneValue(value, [], active, issues);
  return issues.length > 0 || cloned === undefined
    ? { ok: false, issues }
    : { ok: true, value: cloned, warnings: [] };
}

function cloneValue(
  value: unknown,
  path: readonly (string | number)[],
  active: WeakSet<object>,
  issues: RuleIssue[],
): JsonValue | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return value;
    issues.push(issue(path, 'number_not_finite'));
    return undefined;
  }
  if (typeof value !== 'object') {
    issues.push(issue(path, 'value_not_json'));
    return undefined;
  }
  if (active.has(value)) {
    issues.push(issue(path, 'cyclic_value'));
    return undefined;
  }
  if (!Array.isArray(value)) {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      issues.push(issue(path, 'object_not_plain'));
      return undefined;
    }
  }
  active.add(value);
  if (Array.isArray(value)) {
    const result: JsonValue[] = [];
    value.forEach((entry, index) => {
      const cloned = cloneValue(entry, [...path, index], active, issues);
      if (cloned !== undefined) result.push(cloned);
    });
    active.delete(value);
    return result;
  }
  const result: JsonObject = {};
  for (const [key, entry] of Object.entries(value)) {
    if (unsafeKeys.has(key)) {
      issues.push(issue([...path, key], 'unsafe_object_key'));
      continue;
    }
    const cloned = cloneValue(entry, [...path, key], active, issues);
    if (cloned !== undefined) result[key] = cloned;
  }
  active.delete(value);
  return result;
}

function issue(path: readonly (string | number)[], reason: string): RuleIssue {
  return {
    code: 'unsupported_rule_shape',
    path,
    detail: { reason },
  };
}
