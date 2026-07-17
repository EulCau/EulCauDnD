import type {
  RuleChoiceGroup,
  RuleChoiceSubmission,
} from '../model/choice.js';
import type { RuleIssue, RuleResult } from '../model/issue.js';

export function validateRuleChoiceSelections(
  groups: readonly RuleChoiceGroup[],
  selections: Readonly<Record<string, readonly string[]>>,
): RuleResult<RuleChoiceSubmission[]> {
  const issues: RuleIssue[] = [];
  const groupIds = new Set<string>();
  for (const group of groups) {
    if (
      groupIds.has(group.id)
      || !Number.isInteger(group.min)
      || !Number.isInteger(group.max)
      || group.min < 0
      || group.max < group.min
    ) {
      issues.push(issue('choice_conflict', [group.id], group.id));
      continue;
    }
    groupIds.add(group.id);
    const optionIds = new Set(group.options.map(({ id }) => id));
    if (optionIds.size !== group.options.length) {
      issues.push(issue('choice_conflict', [group.id, 'options'], group.id));
      continue;
    }
    const selected = selections[group.id] ?? [];
    const unique = new Set(selected);
    if (unique.size !== selected.length) {
      issues.push(issue('choice_conflict', [group.id], group.id));
    }
    if (selected.some((id) => !optionIds.has(id))) {
      issues.push(issue('choice_not_available', [group.id], group.id));
    }
    if (selected.length === 0) {
      if (group.required && group.min > 0) {
        issues.push(issue('choice_required', [group.id], group.id));
      }
    } else if (selected.length < group.min || selected.length > group.max) {
      issues.push(issue('choice_count_invalid', [group.id], group.id));
    }
  }
  for (const groupId of Object.keys(selections)) {
    if (!groupIds.has(groupId) && (selections[groupId]?.length ?? 0) > 0) {
      issues.push(issue('choice_not_available', [groupId], groupId));
    }
  }
  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    value: groups.map((group) => ({
      groupId: group.id,
      selectedIds: [...(selections[group.id] ?? [])],
    })),
    warnings: [],
  };
}

export function areRuleChoiceSelectionsComplete(
  groups: readonly RuleChoiceGroup[],
  selections: Readonly<Record<string, readonly string[]>> | undefined,
): boolean {
  return validateRuleChoiceSelections(groups, selections ?? {}).ok;
}

function issue(
  code: RuleIssue['code'],
  path: readonly (string | number)[],
  groupId: string,
): RuleIssue {
  return { code, path, groupId };
}
