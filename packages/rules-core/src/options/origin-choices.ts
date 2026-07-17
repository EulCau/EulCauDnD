import type {
  RuleCatalog,
  RuleOrigin,
  RuleSystem,
} from '../catalog/model.js';
import type {
  RuleOptionSummary,
  RuleStringChoiceGroup,
} from '../model/choice.js';
import type { RuleIssue, RuleResult } from '../model/issue.js';
import {
  parseRuleAbilityChoiceGroups,
  parseRuleLanguageChoiceGroups,
  parseRuleSkillChoiceGroups,
  parseRuleTextChoiceGroups,
  parseRuleToolChoiceGroups,
  parseRuleWeaponChoiceGroups,
} from './common-choices.js';

export interface RuleOriginChoiceGroups {
  ability: RuleStringChoiceGroup[];
  skill: RuleStringChoiceGroup[];
  tool: RuleStringChoiceGroup[];
  language: RuleStringChoiceGroup[];
  weapon: RuleStringChoiceGroup[];
  resistance: RuleStringChoiceGroup[];
  size: RuleStringChoiceGroup[];
  feature: RuleStringChoiceGroup[];
  all: RuleStringChoiceGroup[];
}

const sizeLabels: Readonly<Record<string, string>> = {
  S: '小型',
  M: '中型',
};

const goliathGiantAncestryOptions: readonly RuleOptionSummary[] = [
  { id: 'cloud', name: '云之远迹（云巨人）' },
  { id: 'fire', name: '火之燃烧（火巨人）' },
  { id: 'frost', name: '霜之刺骨（霜巨人）' },
  { id: 'hill', name: '山之翻撞（山丘巨人）' },
  { id: 'stone', name: '石之坚韧（石巨人）' },
  { id: 'storm', name: '岚之暴鸣（风暴巨人）' },
];

export function createRuleOriginChoiceGroups(
  catalog: RuleCatalog,
  ruleSystem: RuleSystem,
  values: readonly (RuleOrigin | undefined)[],
): RuleResult<RuleOriginChoiceGroups> {
  const origins = values.filter((origin): origin is RuleOrigin => origin !== undefined);
  const ability = collect(origins, (origin, sourceId) => (
    parseOriginAbilityChoiceGroups(origin, sourceId)
  ));
  const skill = collect(origins, (origin, sourceId) => (
    parseRuleSkillChoiceGroups(origin.skillProficiencies, sourceId)
  ));
  const tool = collect(origins, (origin, sourceId) => (
    parseRuleToolChoiceGroups(origin.toolProficiencies, sourceId)
  ));
  const language = collect(origins, (origin, sourceId) => (
    parseRuleLanguageChoiceGroups(origin.languageProficiencies, sourceId)
  ));
  const weapon = collect(origins, (origin, sourceId) => (
    parseRuleWeaponChoiceGroups(catalog, origin.weaponProficiencies, sourceId, ruleSystem)
  ));
  const resistance = collect(origins, (origin, sourceId) => (
    parseRuleTextChoiceGroups(
      origin.resist,
      `${sourceId}-resistance`,
      'resistance',
      '伤害抗性',
    )
  ));
  const parsed = [ability, skill, tool, language, weapon, resistance];
  const issues = parsed.flatMap((result) => (
    'issues' in result ? [...result.issues] : []
  ));
  if (issues.length > 0) return { ok: false, issues };

  const size = createSizeChoiceGroups(origins);
  const feature = createFeatureChoiceGroups(origins);
  const value = {
    ability: ability.ok ? ability.value : [],
    skill: skill.ok ? skill.value : [],
    tool: tool.ok ? tool.value : [],
    language: language.ok ? language.value : [],
    weapon: weapon.ok ? weapon.value : [],
    resistance: resistance.ok ? resistance.value : [],
    size,
    feature,
  };
  return {
    ok: true,
    value: {
      ...value,
      all: [
        ...value.ability,
        ...value.skill,
        ...value.tool,
        ...value.language,
        ...value.weapon,
        ...value.resistance,
        ...value.size,
        ...value.feature,
      ],
    },
    warnings: [],
  };
}

function parseOriginAbilityChoiceGroups(
  origin: RuleOrigin,
  sourceId: string,
): RuleResult<RuleStringChoiceGroup[]> {
  if (origin.ability === undefined) {
    return { ok: true, value: [], warnings: [] };
  }
  const issues: RuleIssue[] = [];
  const ability = origin.ability.map((entry, index) => {
    if (!('choose' in entry) || !isRecord(entry.choose) || !('weighted' in entry.choose)) {
      return entry;
    }
    const weighted = entry.choose.weighted;
    if (
      !isRecord(weighted)
      || !nonEmptyStringArray(weighted.from)
      || !positiveIntegerArray(weighted.weights)
      || weighted.weights.length > weighted.from.length
      || weighted.weights.reduce((total, value) => total + value, 0) !== 3
      || new Set(weighted.from).size !== weighted.from.length
    ) {
      issues.push({
        code: 'unsupported_rule_shape',
        path: [sourceId, index, 'choose', 'weighted'],
        detail: { reason: 'weighted_ability_choice_invalid' },
      });
    }
    // Weighted background abilities still use the dedicated +2/+1 or +1/+1/+1
    // adapter. They are recognized here so unrelated origin groups remain usable.
    return {};
  });
  if (issues.length > 0) return { ok: false, issues };
  return parseRuleAbilityChoiceGroups(ability, sourceId);
}

function createSizeChoiceGroups(origins: readonly RuleOrigin[]): RuleStringChoiceGroup[] {
  const origin = [...origins].reverse().find((entry) => (entry.size?.length ?? 0) > 1);
  if (origin === undefined) return [];
  return [choiceGroup(
    `origin-${origin.key}-${origin.source}-size`,
    'size',
    '体型',
    origin.size ?? [],
  )];
}

function createFeatureChoiceGroups(origins: readonly RuleOrigin[]): RuleStringChoiceGroup[] {
  return origins.flatMap((origin) => {
    const hasGiantAncestry = origin.key === 'Goliath'
      && origin.source === 'XPHB'
      && origin.features.some((feature) => (
        feature.englishName === 'Giant Ancestry' || feature.name === '巨人先祖'
      ));
    if (!hasGiantAncestry) return [];
    return [{
      id: 'giant-ancestry',
      kind: 'originFeature',
      required: true,
      min: 1,
      max: 1,
      options: [...goliathGiantAncestryOptions],
      label: '巨人先祖',
      from: goliathGiantAncestryOptions.map(({ id }) => id),
      count: 1,
    }];
  });
}

function choiceGroup(
  id: string,
  kind: 'size',
  label: string,
  from: readonly string[],
): RuleStringChoiceGroup {
  return {
    id,
    kind,
    required: true,
    min: 1,
    max: 1,
    options: from.map((value) => ({ id: value, name: sizeLabels[value] ?? value })),
    label,
    from: [...from],
    count: 1,
  };
}

function collect(
  origins: readonly RuleOrigin[],
  parse: (origin: RuleOrigin, sourceId: string) => RuleResult<RuleStringChoiceGroup[]>,
): RuleResult<RuleStringChoiceGroup[]> {
  const results = origins.map((origin) => (
    parse(origin, `origin-${origin.key}-${origin.source}`)
  ));
  const issues: RuleIssue[] = results.flatMap((result) => (
    'issues' in result ? [...result.issues] : []
  ));
  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    value: results.flatMap((result) => result.ok ? result.value : []),
    warnings: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every((entry) => typeof entry === 'string' && entry.trim().length > 0);
}

function positiveIntegerArray(value: unknown): value is number[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every((entry) => Number.isInteger(entry) && Number(entry) > 0);
}
