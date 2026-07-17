export type RuleIssueCode =
  | 'ability_cap_exceeded'
  | 'catalog_invalid'
  | 'choice_conflict'
  | 'choice_count_invalid'
  | 'choice_not_available'
  | 'choice_required'
  | 'entity_already_selected'
  | 'entity_not_authorized'
  | 'entity_not_found'
  | 'level_cap_exceeded'
  | 'prerequisite_not_met'
  | 'rule_system_mismatch'
  | 'unsupported_rule_shape';

export interface RuleIssue {
  code: RuleIssueCode;
  path: readonly (string | number)[];
  entityId?: string;
  groupId?: string;
  detail?: Readonly<Record<string, string | number | boolean>>;
}

export type RuleResult<T> = {
  ok: true;
  value: T;
  warnings: readonly RuleIssue[];
} | {
  ok: false;
  issues: readonly RuleIssue[];
};
