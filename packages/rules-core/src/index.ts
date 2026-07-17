export const ruleAbilityNames = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;
export type RuleAbilityName = typeof ruleAbilityNames[number];
export type RulesVersion = '5e' | '5r';

export interface RuleCharacterSnapshot {
  abilities: Readonly<Record<RuleAbilityName, number>>;
  race: string;
  subrace: string;
  background: string;
  proficiencies: readonly string[];
  knownFeats: readonly { name: string; source?: string }[];
  hasSpellcasting: boolean;
}

export interface RuleFeat {
  key: string;
  name: string;
  englishName?: string;
  source: string;
  prerequisite?: readonly unknown[];
  ability?: readonly (Record<string, number> | { choose?: unknown })[];
}

export type FeatPrerequisiteFailure =
  | 'ability'
  | 'background'
  | 'feat'
  | 'level'
  | 'proficiency'
  | 'race'
  | 'spellcasting'
  | 'unsupported';

export interface FeatPrerequisiteEvaluation {
  eligible: boolean;
  failures: readonly FeatPrerequisiteFailure[];
}

export interface FeatAuthorizationPolicy {
  allowedSources: readonly string[];
  sourcePriority: readonly string[];
}

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
      if (!character.hasSpellcasting) failures.push('spellcasting');
    } else if (key === 'proficiency') {
      if (!isProficiencyPrerequisiteMet(character, requirement)) failures.push('proficiency');
    } else if (key === 'race') {
      if (!isNamedPrerequisiteMet(`${character.race} ${character.subrace}`.trim(), requirement)) {
        failures.push('race');
      }
    } else if (key === 'background') {
      if (!isNamedPrerequisiteMet(character.background, requirement)) failures.push('background');
    } else if (key === 'feat') {
      if (!hasFeatPrerequisite(character, requirement)) failures.push('feat');
    } else {
      failures.push('unsupported');
    }
  }
  return { eligible: failures.length === 0, failures };
}

function isAbilityPrerequisiteMet(character: RuleCharacterSnapshot, value: unknown): boolean {
  if (!Array.isArray(value)) return true;
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
  if (!Array.isArray(value)) return true;
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
  if (!Array.isArray(value)) return true;
  return value.some((entry) => {
    if (typeof entry === 'string') return current === entry;
    if (!isRecord(entry)) return false;
    const name = typeof entry.name === 'string' ? entry.name : '';
    const englishName = typeof entry.ENG_name === 'string' ? entry.ENG_name : '';
    return (name.length > 0 && current.includes(name))
      || (englishName.length > 0 && current.includes(englishName));
  });
}

function hasFeatPrerequisite(character: RuleCharacterSnapshot, value: unknown): boolean {
  if (!Array.isArray(value)) return true;
  return value.every((entry) => {
    const expected = normalizeEntityRef(String(entry));
    return character.knownFeats.some((feat) => (
      `${feat.name} ${feat.source ?? ''}`.includes(expected)
    ));
  });
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
