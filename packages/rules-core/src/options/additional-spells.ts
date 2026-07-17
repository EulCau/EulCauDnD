import type {
  RuleAbilityName,
  RuleCatalog,
  RuleSpell,
  RuleSystem,
} from '../catalog/model.js';
import type { RuleIssue, RuleResult } from '../model/issue.js';

export interface RuleAdditionalSpellChoiceGroup {
  id: string;
  label: string;
  count: number;
  options: RuleSpell[];
}

export interface RuleAdditionalSpellChoiceBlock {
  id: string;
  label: string;
  ability?: RuleAbilityName;
  abilityOptions: RuleAbilityName[];
  fixedSpells: RuleSpell[];
  choices: RuleAdditionalSpellChoiceGroup[];
}

export interface RuleAdditionalSpellChoiceState {
  blocks: RuleAdditionalSpellChoiceBlock[];
}

const abilityMap: Readonly<Record<string, RuleAbilityName>> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

const classAliases: Readonly<Record<string, string>> = {
  吟游诗人: 'Bard',
  牧师: 'Cleric',
  德鲁伊: 'Druid',
  武僧: 'Monk',
  圣武士: 'Paladin',
  游侠: 'Ranger',
  术士: 'Sorcerer',
  魔契师: 'Warlock',
  法师: 'Wizard',
  奇械师: 'Artificer',
};

export function createRuleAdditionalSpellChoiceState(
  catalog: RuleCatalog,
  ruleSystem: RuleSystem,
  owner: {
    kind: 'origin' | 'feat';
    key: string;
    source: string;
    name: string;
    additionalSpells?: readonly unknown[] | null;
  },
  characterLevel = Number.POSITIVE_INFINITY,
): RuleResult<RuleAdditionalSpellChoiceState | null> {
  if (owner.additionalSpells == null) return success(null);
  if (!Array.isArray(owner.additionalSpells)) {
    return invalid([owner.kind, owner.key, 'additionalSpells'], 'additional_spells_not_array');
  }
  const blocks: RuleAdditionalSpellChoiceBlock[] = [];
  const issues: RuleIssue[] = [];
  owner.additionalSpells.forEach((entry, index) => {
    const path = [owner.kind, owner.key, 'additionalSpells', index] as const;
    if (!isRecord(entry)) {
      issues.push(issue(path, 'additional_spell_block_not_object'));
      return;
    }
    const allowedKeys = new Set([
      'ENG_name',
      'ability',
      'expanded',
      'innate',
      'known',
      'name',
      'prepared',
    ]);
    const unknownKey = Object.keys(entry).find((key) => !allowedKeys.has(key));
    if (unknownKey !== undefined) {
      issues.push(issue([...path, unknownKey], 'additional_spell_block_key_unsupported'));
      return;
    }
    const ability = parseAbility(entry.ability, [...path, 'ability'], issues);
    const id = `${owner.kind}-${owner.key}-${owner.source}-spell-block-${index}`;
    const collected = collectAdditionalSpells(
      catalog,
      ruleSystem,
      Object.fromEntries(Object.entries(entry).filter(([key]) => (
        !['ENG_name', 'ability', 'name'].includes(key)
      ))),
      id,
      characterLevel,
      path,
    );
    if (!collected.ok) {
      issues.push(...collected.issues);
      return;
    }
    if (collected.value.fixedSpells.length === 0 && collected.value.choices.length === 0) {
      return;
    }
    blocks.push({
      id,
      label: String(entry.name || entry.ENG_name || `${owner.name} ${index + 1}`),
      ...(ability.fixed === undefined ? {} : { ability: ability.fixed }),
      abilityOptions: ability.options,
      fixedSpells: collected.value.fixedSpells,
      choices: collected.value.choices,
    });
  });
  return issues.length > 0
    ? { ok: false, issues }
    : success(blocks.length > 0 ? { blocks } : null);
}

function collectAdditionalSpells(
  catalog: RuleCatalog,
  ruleSystem: RuleSystem,
  value: unknown,
  sourceId: string,
  characterLevel: number,
  basePath: readonly (string | number)[],
): RuleResult<{
  fixedSpells: RuleSpell[];
  choices: RuleAdditionalSpellChoiceGroup[];
}> {
  const fixedSpells: RuleSpell[] = [];
  const choices: RuleAdditionalSpellChoiceGroup[] = [];
  const issues: RuleIssue[] = [];
  let choiceIndex = 0;

  const visit = (
    entry: unknown,
    path: readonly (string | number)[],
    levelGated = false,
  ): void => {
    if (typeof entry === 'string') {
      const spell = resolveSpellRef(catalog, entry, ruleSystem);
      if (spell === undefined) issues.push(issue(path, 'additional_spell_not_found'));
      else fixedSpells.push(spell);
      return;
    }
    if (Array.isArray(entry)) {
      entry.forEach((item, index) => visit(item, [...path, index], levelGated));
      return;
    }
    if (!isRecord(entry)) {
      issues.push(issue(path, 'additional_spell_entry_unsupported'));
      return;
    }
    if ('choose' in entry) {
      const keys = Object.keys(entry);
      if (isRecord(entry.choose)) {
        if (
          keys.some((key) => key !== 'choose')
          || !Array.isArray(entry.choose.from)
          || !entry.choose.from.every((value) => typeof value === 'string')
          || entry.choose.from.length === 0
          || (
            entry.choose.count !== undefined
            && (!Number.isInteger(entry.choose.count) || Number(entry.choose.count) <= 0)
          )
        ) {
          issues.push(issue(path, 'additional_spell_choice_invalid'));
          return;
        }
        const options = uniqueSpells(entry.choose.from.flatMap((ref) => {
          const spell = resolveSpellRef(catalog, ref, ruleSystem);
          return spell === undefined ? [] : [spell];
        }));
        if (options.length !== entry.choose.from.length) {
          issues.push(issue(path, 'additional_spell_not_found'));
          return;
        }
        choiceIndex += 1;
        choices.push({
          id: `${sourceId}-spell-choice-${choiceIndex}`,
          label: entry.choose.from.join('|'),
          count: typeof entry.choose.count === 'number' ? entry.choose.count : 1,
          options,
        });
        return;
      }
      if (
        keys.some((key) => key !== 'choose' && key !== 'count')
        || typeof entry.choose !== 'string'
        || entry.choose.trim().length === 0
        || (
          entry.count !== undefined
          && (!Number.isInteger(entry.count) || Number(entry.count) <= 0)
        )
      ) {
        issues.push(issue(path, 'additional_spell_choice_invalid'));
        return;
      }
      const options = getSpellOptionsForFilter(catalog, ruleSystem, entry.choose);
      if (!options.ok) {
        issues.push(...options.issues.map((entry) => ({
          ...entry,
          path: [...path, ...entry.path],
        })));
        return;
      }
      if (options.value.length === 0) return;
      choiceIndex += 1;
      choices.push({
        id: `${sourceId}-spell-choice-${choiceIndex}`,
        label: entry.choose,
        count: typeof entry.count === 'number' ? entry.count : 1,
        options: options.value,
      });
      return;
    }

    const keys = Object.keys(entry);
    const numericLevelMap = keys.length > 0 && keys.every((key) => /^\d+$/.test(key));
    for (const [key, child] of Object.entries(entry)) {
      if (!validContainerKey(key)) {
        issues.push(issue([...path, key], 'additional_spell_container_key_unsupported'));
        continue;
      }
      if (numericLevelMap && Number(key) > characterLevel) continue;
      visit(child, [...path, key], numericLevelMap || levelGated);
    }
  };
  visit(value, basePath);
  return issues.length > 0
    ? { ok: false, issues }
    : success({
        fixedSpells: uniqueSpells(fixedSpells),
        choices,
      });
}

function parseAbility(
  value: unknown,
  path: readonly (string | number)[],
  issues: RuleIssue[],
): { fixed?: RuleAbilityName; options: RuleAbilityName[] } {
  if (value === undefined || value === '继承') return { options: [] };
  if (typeof value === 'string') {
    const fixed = abilityMap[value.toLocaleLowerCase('en-US')];
    if (fixed === undefined) issues.push(issue(path, 'spell_ability_invalid'));
    return { ...(fixed === undefined ? {} : { fixed }), options: [] };
  }
  if (!isRecord(value) || !Array.isArray(value.choose)) {
    issues.push(issue(path, 'spell_ability_choice_invalid'));
    return { options: [] };
  }
  const options = value.choose
    .map((entry) => typeof entry === 'string'
      ? abilityMap[entry.toLocaleLowerCase('en-US')]
      : undefined)
    .filter((entry): entry is RuleAbilityName => entry !== undefined);
  if (options.length !== value.choose.length || options.length === 0) {
    issues.push(issue(path, 'spell_ability_choice_invalid'));
  }
  return { options: [...new Set(options)] };
}

function getSpellOptionsForFilter(
  catalog: RuleCatalog,
  ruleSystem: RuleSystem,
  filter: string,
): RuleResult<RuleSpell[]> {
  let levels: Set<number> | undefined;
  let classNames: string[] | undefined;
  let schools: Set<string> | undefined;
  let ritual: boolean | undefined;
  let spellAttacks: Set<string> | undefined;
  for (const part of filter.split('|')) {
    const pieces = part.split('=');
    if (pieces.length !== 2) return invalid([], 'spell_filter_invalid');
    const key = pieces[0]?.trim();
    const value = pieces[1]?.trim();
    if (!key || !value) return invalid([], 'spell_filter_invalid');
    if (key === 'level') {
      const parsed = value.split(';').map(Number);
      if (
        parsed.length === 0
        || parsed.some((level) => !Number.isInteger(level) || level < 0 || level > 9)
      ) {
        return invalid([], 'spell_filter_level_invalid');
      }
      levels = new Set(parsed);
    } else if (key === 'class') {
      classNames = value.split(';').map((entry) => entry.trim()).filter(Boolean);
      if (classNames.length === 0) return invalid([], 'spell_filter_class_invalid');
    } else if (key === 'school') {
      schools = new Set(value.split(';').map((entry) => entry.trim()).filter(Boolean));
      if (schools.size === 0) return invalid([], 'spell_filter_school_invalid');
    } else if (key === 'components & miscellaneous') {
      if (value !== '仪式' && normalize(value) !== 'ritual') {
        return invalid([], 'spell_filter_misc_invalid');
      }
      ritual = true;
    } else if (key === 'spell attack') {
      spellAttacks = new Set(value.split(';').map((entry) => entry.trim().toUpperCase()));
      if (spellAttacks.size === 0) return invalid([], 'spell_filter_attack_invalid');
    } else {
      return invalid([], 'spell_filter_key_unsupported');
    }
  }
  const classKeys = classNames === undefined
    ? undefined
    : new Set(classNames.flatMap((name) => {
        const alias = classAliases[name] ?? name;
        const matches = catalog.classes.filter((entry) => (
          normalize(entry.key) === normalize(alias)
          || normalize(entry.name) === normalize(name)
          || normalize(entry.englishName) === normalize(alias)
        )).map(({ key }) => key);
        return matches.length > 0 ? matches : [alias];
      }));
  if (classNames !== undefined && classKeys?.size === 0) {
    return invalid([], 'spell_filter_class_not_found');
  }
  const priority = spellSourcePriority(catalog, ruleSystem);
  const byName = new Map<string, RuleSpell>();
  catalog.spells
    .filter(({ source }) => priority.includes(source))
    .filter((spell) => levels === undefined || levels.has(spell.level))
    .filter((spell) => schools === undefined || Boolean(spell.school && schools.has(spell.school)))
    .filter((spell) => classKeys === undefined || spell.classKeys.some((key) => classKeys.has(key)))
    .filter((spell) => ritual !== true || spell.meta?.ritual === true)
    .filter((spell) => spellAttacks === undefined || spell.spellAttack?.some((attack) => (
      spellAttacks?.has(attack.toUpperCase())
    )))
    .forEach((spell) => {
      const key = spell.englishName || spell.name;
      const existing = byName.get(key);
      if (
        existing === undefined
        || priority.indexOf(spell.source) < priority.indexOf(existing.source)
      ) {
        byName.set(key, spell);
      }
    });
  const options = [...byName.values()].sort((left, right) => (
    left.level - right.level || left.name.localeCompare(right.name, 'zh-Hans-CN')
  ));
  return success(options);
}

function resolveSpellRef(
  catalog: RuleCatalog,
  ref: string,
  ruleSystem: RuleSystem,
): RuleSpell | undefined {
  const parts = ref.split('|');
  const name = (parts[0] ?? '').split('#')[0]?.trim();
  const source = parts[1]?.split('#')[0]?.trim().toUpperCase();
  if (!name) return undefined;
  if (source) {
    return catalog.spells.find((spell) => (
      spell.name === name && spell.source.toUpperCase() === source
    ));
  }
  const priority = spellSourcePriority(catalog, ruleSystem);
  return priority
    .map((entry) => catalog.spells.find((spell) => (
      spell.name === name && spell.source === entry
    )))
    .find((spell): spell is RuleSpell => spell !== undefined);
}

function spellSourcePriority(catalog: RuleCatalog, ruleSystem: RuleSystem): string[] {
  return catalog.rules?.[ruleSystem]?.spellSources
    ?? [...new Set(catalog.spells.map(({ source }) => source))];
}

function validContainerKey(key: string): boolean {
  return /^\d+$/.test(key)
    || /^s\d+$/.test(key)
    || /^\d+e?$/.test(key)
    || key === '_'
    || key === 'daily'
    || key === 'rest'
    || key === 'ritual'
    || key === 'will'
    || ['expanded', 'innate', 'known', 'prepared'].includes(key);
}

function uniqueSpells(spells: readonly RuleSpell[]): RuleSpell[] {
  const seen = new Set<string>();
  return spells.filter(({ id }) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function normalize(value: string): string {
  return value.split('|')[0]?.trim().toLocaleLowerCase('en-US') ?? '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function success<T>(value: T): RuleResult<T> {
  return { ok: true, value, warnings: [] };
}

function invalid<T>(
  path: readonly (string | number)[],
  reason: string,
): RuleResult<T> {
  return { ok: false, issues: [issue(path, reason)] };
}

function issue(path: readonly (string | number)[], reason: string): RuleIssue {
  return {
    code: 'unsupported_rule_shape',
    path,
    detail: { reason },
  };
}
