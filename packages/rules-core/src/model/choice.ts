export type RuleChoiceKind =
  | 'ability'
  | 'armor'
  | 'background'
  | 'class'
  | 'expertise'
  | 'feat'
  | 'fightingStyle'
  | 'invocation'
  | 'language'
  | 'maneuver'
  | 'metamagic'
  | 'proficiency'
  | 'race'
  | 'resistance'
  | 'skill'
  | 'spell'
  | 'subclass'
  | 'subrace'
  | 'tool'
  | 'weapon'
  | 'weaponMastery';

export interface RuleOptionSummary {
  id: string;
  name: string;
  source?: string;
  disabledReasons?: string[];
}

export interface RuleChoiceDependency {
  groupId: string;
  selectedIds?: string[];
  value?: string | number | boolean;
}

export interface RuleChoiceGroup<TOption = RuleOptionSummary> {
  id: string;
  kind: RuleChoiceKind;
  required: boolean;
  min: number;
  max: number;
  options: TOption[];
  dependsOn?: RuleChoiceDependency[];
}

export interface RuleChoiceSubmission {
  groupId: string;
  selectedIds: string[];
  value?: string | number | boolean;
}
