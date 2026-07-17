import type {
  RuleAbilityName,
  RuleFeatCatalogEntry,
  RuleSystem,
} from './catalog/model.js';
import type { RuleContext } from './model/context.js';
import { isRuleEntityAuthorized } from './policy/authorization.js';

export * from './catalog/identity.js';
export * from './catalog/model.js';
export * from './catalog/parse.js';
export * from './effects/apply.js';
export * from './effects/feat.js';
export * from './effects/feat-spells.js';
export * from './effects/origin.js';
export * from './effects/origin-resources.js';
export * from './effects/origin-advancement.js';
export * from './effects/origin-combat-traits.js';
export * from './effects/origin-spells.js';
export * from './model/character.js';
export * from './model/choice.js';
export * from './model/context.js';
export * from './model/effect.js';
export * from './model/issue.js';
export * from './options/catalog-options.js';
export * from './options/additional-spells.js';
export * from './options/common-choices.js';
export * from './options/feat-choices.js';
export * from './options/origin-choices.js';
export * from './options/origin-feats.js';
export * from './policy/authorization.js';
export * from './policy/default-policy.js';
export * from './policy/source-priority.js';
export * from './validation/common.js';
export type { JsonObject, JsonPrimitive, JsonValue } from './model/json.js';

export const ruleAbilityNames: readonly RuleAbilityName[] = [
  'STR',
  'DEX',
  'CON',
  'INT',
  'WIS',
  'CHA',
] as const;
export type RulesVersion = RuleSystem;

export interface RuleCharacterSnapshot {
  abilities: Readonly<Record<RuleAbilityName, number>>;
  race: string;
  subrace: string;
  size?: string;
  background: string;
  campaigns?: readonly string[];
  proficiencies: readonly string[];
  features?: readonly string[];
  knownFeats: readonly {
    id?: string;
    key?: string;
    name: string;
    englishName?: string;
    source?: string;
    category?: string;
  }[];
  hasSpellcasting: boolean;
  hasSpellcastingFeature?: boolean;
}

export interface RuleFeat {
  key: string;
  name: string;
  englishName?: string;
  source: string;
  id?: string;
  prerequisite?: readonly unknown[];
  ability?: readonly (Record<string, number> | { choose?: unknown })[];
  abilityChoices?: readonly RuleAbilityName[];
}

export type FeatPrerequisiteFailure =
  | 'ability'
  | 'background'
  | 'campaign'
  | 'feat'
  | 'feat_category'
  | 'feature'
  | 'level'
  | 'manual_review'
  | 'proficiency'
  | 'race'
  | 'spellcasting'
  | 'spellcasting_feature'
  | 'unsupported';

export interface FeatPrerequisiteEvaluation {
  eligible: boolean;
  failures: readonly FeatPrerequisiteFailure[];
}

export interface FeatAuthorizationPolicy {
  allowedSources: readonly string[];
  sourcePriority: readonly string[];
}

export type BasicFeatAdvancementError =
  | 'feat_ability_invalid'
  | 'feat_ability_required'
  | 'feat_choices_not_supported'
  | 'feat_not_eligible';

export type BasicFeatAdvancementResult<T extends RuleFeat> = {
  valid: true;
  feat: T;
  abilityIncreases: Partial<Record<RuleAbilityName, number>>;
} | {
  valid: false;
  error: BasicFeatAdvancementError;
};

type BasicFeatAbilityResult = {
  valid: true;
  abilityIncreases: Partial<Record<RuleAbilityName, number>>;
} | {
  valid: false;
  error: 'feat_ability_invalid' | 'feat_ability_required';
};

const abilityMap: Readonly<Record<string, RuleAbilityName>> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

const armorProficiencyAliases: Readonly<Record<string, readonly string[]>> = {
  light: ['armor:light', 'armor:轻甲'],
  medium: ['armor:medium', 'armor:中甲'],
  heavy: ['armor:heavy', 'armor:重甲'],
  shield: ['armor:shield', 'armor:盾牌'],
};

const weaponProficiencyAliases: Readonly<Record<string, readonly string[]>> = {
  simple: ['weapon:simple', 'weapon:简易'],
  martial: ['weapon:martial', 'weapon:军用'],
};

export function evaluateFeatPrerequisite(
  feat: RuleFeat,
  character: RuleCharacterSnapshot,
  level: number,
): FeatPrerequisiteEvaluation {
  if (!feat.prerequisite?.length) return { eligible: true, failures: [] };
  const alternatives = feat.prerequisite.map((entry) => evaluatePrerequisiteAlternative(
    entry,
    character,
    level,
  ));
  if (alternatives.some(({ eligible }) => eligible)) return { eligible: true, failures: [] };
  return {
    eligible: false,
    failures: [...new Set(alternatives.flatMap(({ failures }) => failures))],
  };
}

export function getEligibleAbilityScoreImprovementFeats<T extends RuleFeat>(
  feats: readonly T[],
  ruleSystem: RulesVersion,
  character: RuleCharacterSnapshot,
  level: number,
  policy: FeatAuthorizationPolicy,
): T[] {
  const allowedSources = new Set(policy.allowedSources);
  const byName = new Map<string, T>();
  for (const feat of feats) {
    if (!allowedSources.has(feat.source)) continue;
    if (ruleSystem === '5e' && feat.source === 'XPHB') continue;
    if (character.knownFeats.some((knownFeat) => (
      knownFeat.id === `${feat.key}|${feat.source}`
      || knownFeat.key === feat.key
      || knownFeat.name === feat.key
      || knownFeat.name === feat.name
      || knownFeat.name === feat.englishName
    ))) continue;
    if (!evaluateFeatPrerequisite(feat, character, level).eligible) continue;
    const key = feat.englishName || feat.name;
    const existing = byName.get(key);
    const currentPriority = sourceRank(policy.sourcePriority, feat.source);
    const existingPriority = existing === undefined
      ? Number.MAX_SAFE_INTEGER
      : sourceRank(policy.sourcePriority, existing.source);
    if (existing === undefined || currentPriority < existingPriority) byName.set(key, feat);
  }
  return [...byName.values()].sort((left, right) => (
    left.name.localeCompare(right.name, 'zh-Hans-CN')
  ));
}

export function getRuleFeatOptions(
  context: RuleContext,
  character: RuleCharacterSnapshot,
  level: number,
): RuleFeatCatalogEntry[] {
  const authorized = context.catalog.feats.filter((feat) => (
    isRuleEntityAuthorized('feat', feat, context.authorization)
  ));
  return getEligibleAbilityScoreImprovementFeats(
    authorized,
    context.ruleSystem,
    character,
    level,
    {
      allowedSources: [...new Set(authorized.map(({ source }) => source))],
      sourcePriority: context.authorization.sourcePriority.feat ?? [],
    },
  );
}

export function getFeatAbilityChoiceOptions(feat: RuleFeat | undefined): RuleAbilityName[] {
  for (const entry of feat?.ability ?? []) {
    if (!('choose' in entry) || entry.choose === null || typeof entry.choose !== 'object') continue;
    const from = (entry.choose as { from?: unknown }).from;
    if (!Array.isArray(from)) continue;
    return from
      .map((ability) => typeof ability === 'string' ? abilityMap[ability] : undefined)
      .filter((ability): ability is RuleAbilityName => ability !== undefined);
  }
  return [];
}

export function validateBasicFeatAdvancementChoice<T extends RuleFeat>(
  feats: readonly T[],
  ruleSystem: RulesVersion,
  character: RuleCharacterSnapshot,
  level: number,
  policy: FeatAuthorizationPolicy,
  choice: { featId: string; ability?: RuleAbilityName },
): BasicFeatAdvancementResult<T> {
  const feat = getEligibleAbilityScoreImprovementFeats(
    feats,
    ruleSystem,
    character,
    level,
    policy,
  ).find((entry) => `${entry.key}|${entry.source}` === choice.featId);
  if (feat === undefined) return { valid: false, error: 'feat_not_eligible' };
  if (!isBasicFeatAdvancementSupported(feat)) {
    return { valid: false, error: 'feat_choices_not_supported' };
  }
  const ability = basicFeatAbilityIncrease(feat, choice.ability);
  if (!ability.valid) return ability;
  if (Object.entries(ability.abilityIncreases).some(([key, increase]) => (
    character.abilities[key as RuleAbilityName] + increase > 20
  ))) {
    return { valid: false, error: 'feat_ability_invalid' };
  }
  return { valid: true, feat, abilityIncreases: ability.abilityIncreases };
}

export function isBasicFeatAdvancementSupported(feat: RuleFeat): boolean {
  const ignored = new Set([
    'ability',
    'abilityChoices',
    'category',
    'englishName',
    'features',
    'id',
    'key',
    'name',
    'prerequisite',
    'source',
  ]);
  for (const [key, value] of Object.entries(feat)) {
    if (ignored.has(key)) continue;
    if (
      ['fightingStyleCount', 'invocationCount', 'maneuverCount', 'metamagicCount']
        .includes(key)
    ) {
      if (value !== undefined && value !== 0) return false;
      continue;
    }
    if (value !== undefined && value !== null && (!Array.isArray(value) || value.length > 0)) {
      return false;
    }
  }
  return basicFeatAbilityShapeSupported(feat);
}

function evaluatePrerequisiteAlternative(
  value: unknown,
  character: RuleCharacterSnapshot,
  level: number,
): FeatPrerequisiteEvaluation {
  if (!isRecord(value)) return { eligible: false, failures: ['unsupported'] };
  const failures: FeatPrerequisiteFailure[] = [];
  for (const [key, requirement] of Object.entries(value)) {
    if (key === 'level') {
      if (typeof requirement !== 'number' || level < requirement) failures.push('level');
    } else if (key === 'ability') {
      if (!isAbilityPrerequisiteMet(character, requirement)) failures.push('ability');
    } else if (key === 'spellcasting' || key === 'spellcasting2020') {
      if (requirement !== true || !character.hasSpellcasting) failures.push('spellcasting');
    } else if (key === 'spellcastingFeature') {
      if (requirement !== true || !character.hasSpellcastingFeature) {
        failures.push('spellcasting_feature');
      }
    } else if (key === 'proficiency') {
      if (!isProficiencyPrerequisiteMet(character, requirement)) failures.push('proficiency');
    } else if (key === 'race') {
      if (!isRacePrerequisiteMet(character, requirement)) {
        failures.push('race');
      }
    } else if (key === 'background') {
      if (!isNamedPrerequisiteMet(character.background, requirement)) failures.push('background');
    } else if (key === 'feat') {
      if (!hasFeatPrerequisite(character, requirement)) failures.push('feat');
    } else if (key === 'feature') {
      if (!isNamedListPrerequisiteMet(character.features ?? [], requirement)) {
        failures.push('feature');
      }
    } else if (key === 'campaign') {
      if (!isNamedListPrerequisiteMet(character.campaigns ?? [], requirement)) {
        failures.push('campaign');
      }
    } else if (key === 'featCategory') {
      if (!hasFeatCategory(character, requirement)) failures.push('feat_category');
    } else if (key === 'exclusiveFeatCategory') {
      if (!isFeatCategoryValue(requirement) || hasFeatCategory(character, requirement)) {
        failures.push('feat_category');
      }
    } else if (key === 'other' || key === 'otherSummary') {
      failures.push('manual_review');
    } else {
      failures.push('unsupported');
    }
  }
  return { eligible: failures.length === 0, failures };
}

function basicFeatAbilityShapeSupported(feat: RuleFeat): boolean {
  const entries = feat.ability ?? [];
  if (entries.length === 0) return true;
  if (entries.length !== 1) return false;
  const entry = entries[0]!;
  if ('choose' in entry) {
    if (!isRecord(entry.choose) || !Array.isArray(entry.choose.from)) return false;
    const amount = entry.choose.amount ?? 1;
    return Number.isInteger(amount)
      && Number(amount) > 0
      && entry.choose.from.every((ability) => (
        typeof ability === 'string' && abilityMap[ability] !== undefined
      ));
  }
  const fixed = Object.entries(entry);
  const amount = fixed[0]?.[1];
  return fixed.length === 1
    && abilityMap[fixed[0]![0]] !== undefined
    && typeof amount === 'number'
    && Number.isInteger(amount)
    && amount > 0;
}

function basicFeatAbilityIncrease(
  feat: RuleFeat,
  selected: RuleAbilityName | undefined,
): BasicFeatAbilityResult {
  const entries = feat.ability ?? [];
  if (entries.length === 0) {
    return selected === undefined
      ? { valid: true, abilityIncreases: {} }
      : { valid: false, error: 'feat_ability_invalid' };
  }
  const entry = entries[0]!;
  if ('choose' in entry) {
    const options = getFeatAbilityChoiceOptions(feat);
    if (selected === undefined) return { valid: false, error: 'feat_ability_required' };
    if (!options.includes(selected)) return { valid: false, error: 'feat_ability_invalid' };
    const amount = isRecord(entry.choose) && typeof entry.choose.amount === 'number'
      ? entry.choose.amount
      : 1;
    return { valid: true, abilityIncreases: { [selected]: amount } };
  }
  if (selected !== undefined) return { valid: false, error: 'feat_ability_invalid' };
  const [key, amount] = Object.entries(entry)[0]!;
  return {
    valid: true,
    abilityIncreases: { [abilityMap[key]!]: amount as number },
  };
}

function isAbilityPrerequisiteMet(character: RuleCharacterSnapshot, value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((entry) => (
    isRecord(entry)
    && Object.entries(entry).every(([ability, minimum]) => {
      const abilityName = abilityMap[ability];
      return abilityName !== undefined
        && typeof minimum === 'number'
        && character.abilities[abilityName] >= minimum;
    })
  ));
}

function isProficiencyPrerequisiteMet(character: RuleCharacterSnapshot, value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  const proficiencies = new Set(character.proficiencies);
  return value.every((entry) => (
    isRecord(entry)
    && Object.entries(entry).every(([kind, requirement]) => {
      if ((kind !== 'armor' && kind !== 'weapon') || typeof requirement !== 'string') return false;
      const normalized = normalizeKey(requirement).toLowerCase();
      const aliases = kind === 'armor'
        ? armorProficiencyAliases[normalized] ?? [`armor:${normalized}`]
        : weaponProficiencyAliases[normalized] ?? [`weapon:${normalized}`];
      return aliases.some((alias) => proficiencies.has(alias));
    })
  ));
}

function isNamedPrerequisiteMet(current: string, value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((entry) => {
    if (typeof entry === 'string') return sameName(current, entry);
    if (!isRecord(entry)) return false;
    const name = typeof entry.name === 'string' ? entry.name : '';
    const englishName = typeof entry.ENG_name === 'string' ? entry.ENG_name : '';
    return (name.length > 0 && sameName(current, name))
      || (englishName.length > 0 && sameName(current, englishName));
  });
}

function isRacePrerequisiteMet(character: RuleCharacterSnapshot, value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((entry) => {
    if (typeof entry === 'string') return sameName(character.race, entry);
    if (!isRecord(entry)) return false;
    const name = typeof entry.name === 'string' ? entry.name : '';
    const englishName = typeof entry.ENG_name === 'string' ? entry.ENG_name : '';
    const smallRace = sameName(name, '小型种族') || sameName(englishName, 'small race');
    const raceMatches = smallRace
      ? isSmallSize(character.size)
      : (name.length > 0 && sameName(character.race, name))
        || (englishName.length > 0 && sameName(character.race, englishName));
    if (!raceMatches) return false;
    if (typeof entry.subrace !== 'string') return true;
    return normalizeName(character.subrace).includes(normalizeName(entry.subrace));
  });
}

function hasFeatPrerequisite(character: RuleCharacterSnapshot, value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.every((entry) => {
    const [name = '', source = '', displayName = ''] = String(entry)
      .split('|')
      .map((part) => normalizeEntityRef(part));
    return character.knownFeats.some((feat) => (
      (source.length === 0 || feat.source === source)
      && [feat.key, feat.name, feat.englishName]
        .some((candidate) => candidate === name || candidate === displayName)
    ));
  });
}

function hasFeatCategory(character: RuleCharacterSnapshot, value: unknown): boolean {
  if (!isFeatCategoryValue(value)) return false;
  const categories = new Set(value);
  return character.knownFeats.some(({ category }) => (
    category !== undefined && categories.has(category)
  ));
}

function isFeatCategoryValue(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isNamedListPrerequisiteMet(current: readonly string[], value: unknown): boolean {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) return false;
  const normalized = new Set(current.map((entry) => entry.normalize('NFKC').trim().toLowerCase()));
  return value.some((entry) => normalized.has(entry.normalize('NFKC').trim().toLowerCase()));
}

function sourceRank(priority: readonly string[], source: string): number {
  const rank = priority.indexOf(source);
  return rank < 0 ? Number.MAX_SAFE_INTEGER : rank;
}

function normalizeKey(value: string): string {
  return value.split('|')[0]!.trim();
}

function normalizeEntityRef(value: string): string {
  return normalizeKey(value).split(/[;；]/)[0]!.trim();
}

function isSmallSize(value: string | undefined): boolean {
  if (value === undefined) return false;
  return ['s', 'small', '小型'].includes(normalizeName(value));
}

function sameName(left: string, right: string): boolean {
  return normalizeName(left) === normalizeName(right);
}

function normalizeName(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
