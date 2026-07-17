import type {
  RuleAbilityName,
  RuleCatalog,
  RuleSystem,
} from '../catalog/model.js';
import type {
  RuleChoiceKind,
  RuleOptionSummary,
  RuleStringChoiceGroup,
} from '../model/choice.js';
import type { RuleIssue, RuleResult } from '../model/issue.js';

export const ruleSkillNames = [
  'Acrobatics',
  'Animal Handling',
  'Arcana',
  'Athletics',
  'Deception',
  'History',
  'Insight',
  'Intimidation',
  'Investigation',
  'Medicine',
  'Nature',
  'Perception',
  'Performance',
  'Persuasion',
  'Religion',
  'Sleight of Hand',
  'Stealth',
  'Survival',
] as const;

const skillAliases: Readonly<Record<string, string>> = {
  acrobatics: 'Acrobatics',
  'animal handling': 'Animal Handling',
  arcana: 'Arcana',
  athletics: 'Athletics',
  deception: 'Deception',
  history: 'History',
  insight: 'Insight',
  intimidation: 'Intimidation',
  investigation: 'Investigation',
  medicine: 'Medicine',
  nature: 'Nature',
  perception: 'Perception',
  performance: 'Performance',
  persuasion: 'Persuasion',
  religion: 'Religion',
  'sleight of hand': 'Sleight of Hand',
  stealth: 'Stealth',
  survival: 'Survival',
  体操: 'Acrobatics',
  驯兽: 'Animal Handling',
  奥秘: 'Arcana',
  运动: 'Athletics',
  欺瞒: 'Deception',
  历史: 'History',
  洞悉: 'Insight',
  威吓: 'Intimidation',
  调查: 'Investigation',
  医疗: 'Medicine',
  自然: 'Nature',
  察觉: 'Perception',
  表演: 'Performance',
  游说: 'Persuasion',
  宗教: 'Religion',
  巧手: 'Sleight of Hand',
  隐匿: 'Stealth',
  求生: 'Survival',
};

const abilityAliases: Readonly<Record<string, RuleAbilityName>> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

const artisanTools = [
  "alchemist's supplies",
  "brewer's supplies",
  "calligrapher's supplies",
  "carpenter's tools",
  "cartographer's tools",
  "cobbler's tools",
  "cook's utensils",
  "glassblower's tools",
  "jeweler's tools",
  "leatherworker's tools",
  "mason's tools",
  "painter's supplies",
  "potter's tools",
  "smith's tools",
  "tinker's tools",
  "weaver's tools",
  "woodcarver's tools",
];

const musicalInstruments = [
  'bagpipes',
  'drum',
  'dulcimer',
  'flute',
  'lute',
  'lyre',
  'horn',
  'pan flute',
  'shawm',
  'viol',
];

const gamingSets = [
  'dice set',
  'dragonchess set',
  'playing card set',
  'three-dragon ante set',
];

const allTools = [
  ...artisanTools,
  ...musicalInstruments,
  ...gamingSets,
  'disguise kit',
  'forgery kit',
  'herbalism kit',
  "navigator's tools",
  "poisoner's kit",
  "thieves' tools",
  'vehicles (land)',
  'vehicles (water)',
];

const standardLanguages = [
  'common',
  'dwarvish',
  'elvish',
  'giant',
  'gnomish',
  'goblin',
  'halfling',
  'orc',
];

const exoticLanguages = [
  'abyssal',
  'celestial',
  'draconic',
  'deep speech',
  'infernal',
  'primordial',
  'sylvan',
  'undercommon',
];

export function parseRuleSkillChoiceGroups(
  value: unknown,
  sourceId: string,
): RuleResult<RuleStringChoiceGroup[]> {
  return parseProficiencyChoiceGroups(value, sourceId, 'skill', {
    anyOptions: [...ruleSkillNames],
    normalize: normalizeRuleSkillName,
  });
}

export function parseRuleToolChoiceGroups(
  value: unknown,
  sourceId: string,
): RuleResult<RuleStringChoiceGroup[]> {
  return parseProficiencyChoiceGroups(value, sourceId, 'tool', {
    categoryOptions: { any: allTools },
    expand: expandToolChoiceKey,
    numbersAreChoices: true,
  });
}

export function parseRuleLanguageChoiceGroups(
  value: unknown,
  sourceId: string,
): RuleResult<RuleStringChoiceGroup[]> {
  return parseProficiencyChoiceGroups(value, sourceId, 'language', {
    expand: expandLanguageChoiceKey,
    numbersAreChoices: true,
  });
}

export function parseRuleSavingThrowChoiceGroups(
  value: unknown,
  sourceId: string,
): RuleResult<RuleStringChoiceGroup[]> {
  return parseProficiencyChoiceGroups(value, sourceId, 'proficiency', {
    normalize: normalizeAbilityName,
    nestedChoose: true,
  });
}

export function parseRuleExpertiseChoiceGroups(
  value: unknown,
  sourceId: string,
  proficientOptions: readonly string[],
): RuleResult<RuleStringChoiceGroup[]> {
  return parseProficiencyChoiceGroups(value, sourceId, 'expertise', {
    categoryOptions: { anyProficientSkill: uniqueStrings(proficientOptions) },
    numbersAreChoices: true,
  });
}

export function parseRuleAbilityChoiceGroups(
  value: unknown,
  sourceId: string,
): RuleResult<RuleStringChoiceGroup[]> {
  if (value === undefined) return success([]);
  if (!Array.isArray(value)) return invalid([sourceId], 'choice_entries_not_array');
  const groups: RuleStringChoiceGroup[] = [];
  const issues: RuleIssue[] = [];
  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      issues.push(issue([sourceId, index], 'choice_entry_not_object'));
      return;
    }
    for (const [key, raw] of Object.entries(entry)) {
      if (key !== 'choose') {
        if (key === 'hidden' && typeof raw === 'boolean') continue;
        if (key === 'max' && finiteNumber(raw)) continue;
        if (!finiteNumber(raw)) issues.push(issue([sourceId, index, key], 'fixed_value_invalid'));
        continue;
      }
      const choose = parseChoose(raw, [sourceId, index, key], issues);
      if (choose === undefined) continue;
      const from = choose.from
        .map(normalizeAbilityName)
        .filter((ability): ability is RuleAbilityName => ability !== undefined);
      pushGroup(groups, issues, {
        id: `${sourceId}-ability-${index}-choose`,
        kind: 'ability',
        label: 'choose',
        from,
        count: choose.count ?? 1,
      }, [sourceId, index, key]);
    }
  });
  return issues.length > 0 ? { ok: false, issues } : success(groups);
}

export function parseRuleTextChoiceGroups(
  value: unknown,
  sourceId: string,
  kind: 'resistance' | 'proficiency',
  label: string,
): RuleResult<RuleStringChoiceGroup[]> {
  if (value === undefined) return success([]);
  if (!Array.isArray(value)) return invalid([sourceId], 'choice_entries_not_array');
  const groups: RuleStringChoiceGroup[] = [];
  const issues: RuleIssue[] = [];
  value.forEach((entry, index) => {
    if (typeof entry === 'string') return;
    if (!isRecord(entry) || !('choose' in entry)) {
      issues.push(issue([sourceId, index], 'choice_entry_unsupported'));
      return;
    }
    const choose = parseChoose(entry.choose, [sourceId, index, 'choose'], issues);
    if (choose === undefined) return;
    pushGroup(groups, issues, {
      id: `${sourceId}-${index}`,
      kind,
      label,
      from: choose.from,
      count: choose.count ?? 1,
    }, [sourceId, index]);
  });
  return issues.length > 0 ? { ok: false, issues } : success(groups);
}

export function parseRuleClassSkillChoiceGroups(
  value: unknown,
  sourceId: string,
): RuleResult<RuleStringChoiceGroup[]> {
  if (value === undefined) return success([]);
  if (!isRecord(value)) return invalid([sourceId], 'class_proficiencies_not_object');
  if (value.skills === undefined) return success([]);
  if (!Array.isArray(value.skills)) return invalid([sourceId, 'skills'], 'choice_entries_not_array');
  const groups: RuleStringChoiceGroup[] = [];
  const issues: RuleIssue[] = [];
  value.skills.forEach((entry, index) => {
    if (!isRecord(entry) || !('choose' in entry)) {
      issues.push(issue([sourceId, 'skills', index], 'choice_entry_unsupported'));
      return;
    }
    const choose = parseChoose(entry.choose, [sourceId, 'skills', index, 'choose'], issues);
    if (choose === undefined) return;
    pushGroup(groups, issues, {
      id: `${sourceId}-skill-${index}-choose`,
      kind: 'skill',
      label: 'choose',
      from: choose.from.map(normalizeRuleSkillName),
      count: choose.count ?? 1,
    }, [sourceId, 'skills', index]);
  });
  return issues.length > 0 ? { ok: false, issues } : success(groups);
}

export function parseRuleWeaponChoiceGroups(
  catalog: RuleCatalog,
  value: unknown,
  sourceId: string,
  ruleSystem: RuleSystem,
): RuleResult<RuleStringChoiceGroup[]> {
  if (value === undefined) return success([]);
  if (!Array.isArray(value)) return invalid([sourceId], 'choice_entries_not_array');
  const groups: RuleStringChoiceGroup[] = [];
  const issues: RuleIssue[] = [];
  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      issues.push(issue([sourceId, index], 'choice_entry_not_object'));
      return;
    }
    for (const [key, raw] of Object.entries(entry)) {
      if (key !== 'choose') {
        if (raw !== true) issues.push(issue([sourceId, index, key], 'fixed_value_invalid'));
        continue;
      }
      if (!isRecord(raw)) {
        issues.push(issue([sourceId, index, key], 'choose_not_object'));
        continue;
      }
      const count = positiveIntegerOrDefault(raw.count, 1);
      if (count === undefined) {
        issues.push(issue([sourceId, index, key, 'count'], 'choice_count_invalid'));
        continue;
      }
      let options: RuleOptionSummary[] = [];
      if (raw.from !== undefined) {
        if (!stringArray(raw.from)) {
          issues.push(issue([sourceId, index, key, 'from'], 'choice_options_invalid'));
          continue;
        }
        options = uniqueStrings(raw.from).flatMap((ref) => {
          const parsed = parseEntityRef(ref);
          const weapon = catalog.weapons.find((entry) => (
            (parsed.source === undefined || entry.source === parsed.source)
            && (
              entry.key === parsed.name
              || entry.name === parsed.name
              || entry.englishName === parsed.name
            )
          ));
          return weapon === undefined
            ? []
            : [{ id: weapon.id, name: weapon.name, source: weapon.source }];
        });
      } else if (typeof raw.fromFilter === 'string' && raw.fromFilter.trim().length > 0) {
        options = weaponOptionsFromFilter(catalog, raw.fromFilter, ruleSystem);
      } else {
        issues.push(issue([sourceId, index, key], 'choice_options_missing'));
        continue;
      }
      pushOptionGroup(groups, issues, {
        id: `${sourceId}-weapon-${index}-choose`,
        kind: 'weapon',
        label: 'choose',
        options,
        count,
      }, [sourceId, index, key]);
    }
  });
  return issues.length > 0 ? { ok: false, issues } : success(groups);
}

export function normalizeRuleSkillName(value: string): string {
  const normalized = normalizeKey(value);
  return skillAliases[normalized.toLocaleLowerCase('en-US')]
    ?? skillAliases[normalized]
    ?? normalized;
}

function parseProficiencyChoiceGroups(
  value: unknown,
  sourceId: string,
  kind: 'expertise' | 'language' | 'proficiency' | 'skill' | 'tool',
  options: {
    anyOptions?: readonly string[];
    categoryOptions?: Readonly<Record<string, readonly string[]>>;
    expand?: (value: string) => string[];
    nestedChoose?: boolean;
    normalize?: (value: string) => string | undefined;
    numbersAreChoices?: boolean;
  },
): RuleResult<RuleStringChoiceGroup[]> {
  if (value === undefined) return success([]);
  if (!Array.isArray(value)) return invalid([sourceId], 'choice_entries_not_array');
  const groups: RuleStringChoiceGroup[] = [];
  const issues: RuleIssue[] = [];
  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      issues.push(issue([sourceId, index], 'choice_entry_not_object'));
      return;
    }
    for (const [key, raw] of Object.entries(entry)) {
      const nested = options.nestedChoose && isRecord(raw) && 'choose' in raw
        ? raw.choose
        : undefined;
      if (key === 'choose' || nested !== undefined) {
        const choose = parseChoose(
          key === 'choose' ? raw : nested,
          [sourceId, index, key, 'choose'],
          issues,
        );
        if (choose === undefined) continue;
        const from = normalizeOptions(choose.from, options);
        pushGroup(groups, issues, {
          id: `${sourceId}-${kind}-${index}-${key}`,
          kind,
          label: key,
          from,
          count: choose.count ?? 1,
        }, [sourceId, index, key]);
        continue;
      }
      if (raw === true) continue;
      if (typeof raw === 'number' && options.numbersAreChoices) {
        const from = options.categoryOptions?.[key]
          ?? options.anyOptions
          ?? normalizeOptions([key], options);
        pushGroup(groups, issues, {
          id: `${sourceId}-${kind}-${index}-${normalizeKey(key)}`,
          kind,
          label: key,
          from: [...from],
          count: raw,
        }, [sourceId, index, key]);
        continue;
      }
      if (key === 'any' && typeof raw === 'number' && options.anyOptions !== undefined) {
        pushGroup(groups, issues, {
          id: `${sourceId}-${kind}-${index}-any`,
          kind,
          label: key,
          from: [...options.anyOptions],
          count: raw,
        }, [sourceId, index, key]);
        continue;
      }
      issues.push(issue([sourceId, index, key], 'choice_entry_unsupported'));
    }
  });
  return issues.length > 0 ? { ok: false, issues } : success(groups);
}

function normalizeOptions(
  values: readonly string[],
  options: {
    expand?: (value: string) => string[];
    normalize?: (value: string) => string | undefined;
  },
): string[] {
  return uniqueStrings(values.flatMap((value) => (
    options.expand?.(value) ?? [options.normalize?.(value) ?? normalizeKey(value)]
  )).filter((value): value is string => value !== undefined && value.length > 0));
}

function pushGroup(
  groups: RuleStringChoiceGroup[],
  issues: RuleIssue[],
  input: {
    id: string;
    kind: RuleChoiceKind;
    label: string;
    from: readonly string[];
    count: number;
  },
  path: readonly (string | number)[],
): void {
  pushOptionGroup(groups, issues, {
    ...input,
    options: uniqueStrings(input.from).map((id) => ({ id, name: id })),
  }, path);
}

function pushOptionGroup(
  groups: RuleStringChoiceGroup[],
  issues: RuleIssue[],
  input: {
    id: string;
    kind: RuleChoiceKind;
    label: string;
    options: readonly RuleOptionSummary[];
    count: number;
  },
  path: readonly (string | number)[],
): void {
  const options = dedupeOptions(input.options);
  if (
    !Number.isInteger(input.count)
    || input.count <= 0
    || input.count > options.length
    || options.length === 0
  ) {
    issues.push(issue(path, 'choice_group_invalid'));
    return;
  }
  groups.push({
    id: input.id,
    kind: input.kind,
    required: true,
    min: input.count,
    max: input.count,
    options,
    label: input.label,
    from: options.map(({ id }) => id),
    count: input.count,
  });
}

function weaponOptionsFromFilter(
  catalog: RuleCatalog,
  filter: string,
  ruleSystem: RuleSystem,
): RuleOptionSummary[] {
  const lowerFilter = filter.toLocaleLowerCase('en-US');
  const wantsMartial = filter.includes('军用') || lowerFilter.includes('martial');
  const wantsSimple = filter.includes('简易') || lowerFilter.includes('simple');
  const mundane = filter.includes('平凡')
    || filter.includes('寻常')
    || lowerFilter.includes('mundane');
  const preferredSource = ruleSystem === '5r' ? 'XPHB' : 'PHB';
  return catalog.weapons
    .filter((weapon) => {
      if (wantsMartial && weapon.weaponCategory !== 'martial') return false;
      if (wantsSimple && weapon.weaponCategory !== 'simple') return false;
      if (mundane && weapon.bonusWeapon) return false;
      return true;
    })
    .sort((left, right) => (
      weaponSourceRank(left.source, preferredSource)
      - weaponSourceRank(right.source, preferredSource)
      || left.name.localeCompare(right.name, 'zh-Hans-CN')
    ))
    .filter((weapon, index, weapons) => (
      weapons.findIndex((candidate) => candidate.key === weapon.key) === index
    ))
    .map((weapon) => ({ id: weapon.id, name: weapon.name, source: weapon.source }));
}

function weaponSourceRank(source: string, preferredSource: string): number {
  if (source === preferredSource) return 0;
  if (source === 'PHB') return 1;
  return 2;
}

function parseChoose(
  value: unknown,
  path: readonly (string | number)[],
  issues: RuleIssue[],
): { from: string[]; count?: number } | undefined {
  if (!isRecord(value)) {
    issues.push(issue(path, 'choose_not_object'));
    return undefined;
  }
  if (!stringArray(value.from) || value.from.length === 0) {
    issues.push(issue([...path, 'from'], 'choice_options_invalid'));
    return undefined;
  }
  const count = value.count === undefined
    ? undefined
    : positiveIntegerOrDefault(value.count, undefined);
  if (value.count !== undefined && count === undefined) {
    issues.push(issue([...path, 'count'], 'choice_count_invalid'));
    return undefined;
  }
  return {
    from: uniqueStrings(value.from),
    ...(count === undefined ? {} : { count }),
  };
}

function parseEntityRef(value: string): { name: string; source?: string } {
  const parts = value.split('|');
  const name = normalizeKey(parts[0] ?? '').split(/[;；]/)[0]?.trim() ?? '';
  const source = parts[1]?.trim().toUpperCase();
  return { name, ...(source ? { source } : {}) };
}

function expandToolChoiceKey(value: string): string[] {
  const normalized = normalizeKey(value).toLocaleLowerCase('en-US');
  if (normalized === 'anyartisanstool') return artisanTools;
  if (normalized === 'anymusicalinstrument') return musicalInstruments;
  if (normalized === 'anygamingset') return gamingSets;
  return [normalizeKey(value)];
}

function expandLanguageChoiceKey(value: string): string[] {
  const normalized = normalizeKey(value).toLocaleLowerCase('en-US');
  if (normalized === 'anystandard') return standardLanguages;
  if (normalized === 'anyexotic') return exoticLanguages;
  if (normalized === 'anylanguage' || normalized === 'any') {
    return [...standardLanguages, ...exoticLanguages];
  }
  return [normalizeKey(value)];
}

function normalizeAbilityName(value: string): RuleAbilityName | undefined {
  const normalized = normalizeKey(value);
  return abilityAliases[normalized.toLocaleLowerCase('en-US')]
    ?? (Object.values(abilityAliases).includes(normalized as RuleAbilityName)
      ? normalized as RuleAbilityName
      : undefined);
}

function normalizeKey(value: string): string {
  return value.split('|')[0]?.trim() ?? '';
}

function positiveIntegerOrDefault(
  value: unknown,
  defaultValue: number | undefined,
): number | undefined {
  if (value === undefined) return defaultValue;
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : undefined;
}

function dedupeOptions(values: readonly RuleOptionSummary[]): RuleOptionSummary[] {
  const seen = new Set<string>();
  return values.filter(({ id }) => {
    if (id.trim().length === 0 || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => (
    typeof entry === 'string' && entry.trim().length > 0
  ));
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function success<T>(value: T): RuleResult<T> {
  return { ok: true, value, warnings: [] };
}

function invalid(
  path: readonly (string | number)[],
  reason: string,
): RuleResult<never> {
  return { ok: false, issues: [issue(path, reason)] };
}

function issue(path: readonly (string | number)[], reason: string): RuleIssue {
  return {
    code: 'unsupported_rule_shape',
    path,
    detail: { reason },
  };
}
