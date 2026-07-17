import type {
  RuleCatalog,
  RuleFeatCatalogEntry,
  RuleSystem,
} from '../catalog/model.js';
import type { RuleStringChoiceGroup } from '../model/choice.js';
import type { RuleIssue, RuleResult } from '../model/issue.js';
import {
  normalizeRuleSkillName,
  parseRuleAbilityChoiceGroups,
  parseRuleExpertiseChoiceGroups,
  parseRuleLanguageChoiceGroups,
  parseRuleSavingThrowChoiceGroups,
  parseRuleSkillChoiceGroups,
  parseRuleTextChoiceGroups,
  parseRuleToolChoiceGroups,
  parseRuleWeaponChoiceGroups,
} from './common-choices.js';

export interface RuleFeatChoiceGroups {
  ability: RuleStringChoiceGroup[];
  skill: RuleStringChoiceGroup[];
  tool: RuleStringChoiceGroup[];
  weapon: RuleStringChoiceGroup[];
  language: RuleStringChoiceGroup[];
  savingThrow: RuleStringChoiceGroup[];
  expertise: RuleStringChoiceGroup[];
  resistance: RuleStringChoiceGroup[];
  all: RuleStringChoiceGroup[];
}

export interface RuleFeatChoiceContext {
  proficientSkills?: readonly string[];
  selectedSkills?: readonly string[];
}

export function createRuleFeatChoiceGroups(
  catalog: RuleCatalog,
  ruleSystem: RuleSystem,
  feat: RuleFeatCatalogEntry,
  context: RuleFeatChoiceContext = {},
): RuleResult<RuleFeatChoiceGroups> {
  const sourceId = `feat-${feat.key}-${feat.source}`;
  const skill = parseRuleSkillChoiceGroups(feat.skillProficiencies, sourceId);
  const fixedSkills = (feat.skillProficiencies ?? []).flatMap((entry) => (
    Object.entries(entry).flatMap(([key, value]) => (
      value === true ? [normalizeRuleSkillName(key)] : []
    ))
  ));
  const results = {
    ability: parseRuleAbilityChoiceGroups(feat.ability, sourceId),
    skill,
    tool: parseRuleToolChoiceGroups(feat.toolProficiencies, sourceId),
    weapon: parseRuleWeaponChoiceGroups(
      catalog,
      feat.weaponProficiencies,
      sourceId,
      ruleSystem,
    ),
    language: parseRuleLanguageChoiceGroups(feat.languageProficiencies, sourceId),
    savingThrow: parseRuleSavingThrowChoiceGroups(
      feat.savingThrowProficiencies,
      `${sourceId}-save`,
    ),
    expertise: parseRuleExpertiseChoiceGroups(
      feat.expertise,
      sourceId,
      unique([
        ...(context.proficientSkills ?? []),
        ...fixedSkills,
        ...(context.selectedSkills ?? []),
      ]),
    ),
    resistance: parseRuleTextChoiceGroups(
      feat.resist,
      `${sourceId}-resistance`,
      'resistance',
      '伤害抗性',
    ),
  };
  const issues = Object.values(results).flatMap((result) => (
    result.ok ? [] : result.issues
  ));
  if (issues.length > 0) return { ok: false, issues };
  const value = Object.fromEntries(Object.entries(results).map(([key, result]) => [
    key,
    result.ok ? result.value : [],
  ])) as unknown as Omit<RuleFeatChoiceGroups, 'all'>;
  return {
    ok: true,
    value: { ...value, all: Object.values(value).flat() },
    warnings: [],
  };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
