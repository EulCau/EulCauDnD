import type {
  RuleAbilityName,
  RuleCatalog,
  RuleOrigin,
  RuleProficiencyRecord,
  RuleSystem,
} from '../catalog/model.js';
import type { RuleEffect } from '../model/effect.js';
import type { RuleIssue, RuleResult } from '../model/issue.js';
import { createRuleOriginChoiceGroups } from '../options/origin-choices.js';
import { normalizeRuleSkillName } from '../options/common-choices.js';
import { validateRuleChoiceSelections } from '../validation/common.js';

export interface RuleOriginEffectSelections {
  choices?: Readonly<Record<string, readonly string[]>>;
  weightedAbilities?: Partial<Record<RuleAbilityName, number>>;
  allowIncompleteChoices?: boolean;
}

const abilityMap: Readonly<Record<string, RuleAbilityName>> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

export function createRuleOriginBaseEffects(
  catalog: RuleCatalog,
  ruleSystem: RuleSystem,
  origin: RuleOrigin,
  selections: RuleOriginEffectSelections = {},
): RuleResult<RuleEffect[]> {
  const choiceState = createRuleOriginChoiceGroups(catalog, ruleSystem, [origin]);
  if (!choiceState.ok) return choiceState;
  const validated = validateRuleChoiceSelections(
    selections.allowIncompleteChoices
      ? choiceState.value.all.filter(({ id }) => id in (selections.choices ?? {}))
      : choiceState.value.all,
    selections.choices ?? {},
  );
  if (!validated.ok) return validated;
  const weighted = validateWeightedAbilities(
    origin,
    selections.weightedAbilities,
    selections.allowIncompleteChoices ?? false,
  );
  if (!weighted.ok) return weighted;

  const sourceId = `auto-origin-${origin.key}-${origin.source}`;
  const effects: RuleEffect[] = [];
  addFixedAbilityEffects(effects, origin, sourceId);
  addChosenAbilityEffects(effects, origin, choiceState.value.ability, selections.choices, sourceId);
  for (const [ability, value] of Object.entries(weighted.value)) {
    effects.push({
      type: 'ability.add',
      ability: ability as RuleAbilityName,
      value,
      sourceId,
    });
  }

  addFixedProficiencies(effects, origin.skillProficiencies, '', sourceId);
  addFixedProficiencies(effects, origin.toolProficiencies, 'tool', sourceId);
  addFixedProficiencies(effects, origin.languageProficiencies, 'language', sourceId);
  addFixedProficiencies(effects, origin.weaponProficiencies, 'weapon', sourceId);
  addFixedProficiencies(effects, origin.armorProficiencies, 'armor', sourceId);
  addChosenProficiencies(effects, catalog, choiceState.value.skill, selections.choices, '', sourceId);
  addChosenProficiencies(effects, catalog, choiceState.value.tool, selections.choices, 'tool', sourceId);
  addChosenProficiencies(effects, catalog, choiceState.value.language, selections.choices, 'language', sourceId);
  addChosenProficiencies(effects, catalog, choiceState.value.weapon, selections.choices, 'weapon', sourceId);

  const walkSpeed = getWalkSpeed(origin.speed);
  if (walkSpeed !== undefined) {
    effects.push({ type: 'combat.value.set', field: 'speed', value: walkSpeed, sourceId });
  }
  const selectedSize = choiceState.value.size[0] === undefined
    ? origin.size?.[0]
    : selections.choices?.[choiceState.value.size[0].id]?.[0];
  if (selectedSize !== undefined) {
    effects.push({ type: 'combat.value.set', field: 'size', value: selectedSize, sourceId });
  }

  addSense(effects, 'darkvision', origin.darkvision, '黑暗视觉', sourceId);
  addSense(effects, 'blindsight', origin.blindsight, '盲视', sourceId);
  addSense(effects, 'tremorsense', origin.tremorsense, '震颤感知', sourceId);
  addSense(effects, 'truesight', origin.truesight, '真实视觉', sourceId);
  addFixedTextEffects(effects, origin.resist, 'damageResistances', sourceId);
  addFixedTextEffects(effects, origin.immune, 'damageImmunities', sourceId);
  addFixedTextEffects(effects, origin.vulnerable, 'damageVulnerabilities', sourceId);
  addFixedTextEffects(effects, origin.conditionImmune, 'conditionImmunities', sourceId);
  for (const group of choiceState.value.resistance) {
    for (const value of selections.choices?.[group.id] ?? []) {
      effects.push({
        type: 'combat.text.add',
        field: 'damageResistances',
        value,
        sourceId,
      });
    }
  }
  return { ok: true, value: effects, warnings: [] };
}

function validateWeightedAbilities(
  origin: RuleOrigin,
  selected: Partial<Record<RuleAbilityName, number>> | undefined,
  allowIncomplete: boolean,
): RuleResult<Partial<Record<RuleAbilityName, number>>> {
  const variants = (origin.ability ?? []).flatMap((entry) => {
    if (!('choose' in entry) || !isRecord(entry.choose) || !isRecord(entry.choose.weighted)) {
      return [];
    }
    const from = entry.choose.weighted.from;
    const weights = entry.choose.weighted.weights;
    return stringArray(from) && numberArray(weights) ? [{ from, weights }] : [];
  });
  if (variants.length === 0) {
    return selected && Object.keys(selected).length > 0
      ? failure(['weightedAbilities'], 'weighted_ability_not_available', 'choice_not_available')
      : { ok: true, value: {}, warnings: [] };
  }
  if (selected === undefined) {
    return allowIncomplete
      ? { ok: true, value: {}, warnings: [] }
      : failure(['weightedAbilities'], 'weighted_ability_required', 'choice_required');
  }
  const entries = Object.entries(selected).filter((entry): entry is [RuleAbilityName, number] => (
    typeof entry[1] === 'number'
  ));
  const valid = variants.some(({ from, weights }) => {
    const allowed = new Set(from.map((ability) => abilityMap[ability]).filter(Boolean));
    const selectedWeights = entries.map(([, value]) => value).sort((a, b) => a - b);
    const expectedWeights = [...weights].sort((a, b) => a - b);
    return entries.length === weights.length
      && entries.every(([ability, value]) => allowed.has(ability) && Number.isInteger(value) && value > 0)
      && selectedWeights.every((value, index) => value === expectedWeights[index]);
  });
  return valid
    ? { ok: true, value: Object.fromEntries(entries), warnings: [] }
    : failure(['weightedAbilities'], 'weighted_ability_invalid', 'choice_not_available');
}

function addFixedAbilityEffects(
  effects: RuleEffect[],
  origin: RuleOrigin,
  sourceId: string,
): void {
  for (const entry of origin.ability ?? []) {
    if ('choose' in entry) continue;
    for (const [key, value] of Object.entries(entry)) {
      const ability = abilityMap[key];
      if (ability !== undefined && typeof value === 'number') {
        effects.push({ type: 'ability.add', ability, value, sourceId });
      }
    }
  }
}

function addChosenAbilityEffects(
  effects: RuleEffect[],
  origin: RuleOrigin,
  groups: readonly { id: string }[],
  choices: Readonly<Record<string, readonly string[]>> | undefined,
  sourceId: string,
): void {
  groups.forEach((group) => {
    const index = Number(group.id.match(/-ability-(\d+)-choose$/)?.[1] ?? -1);
    const entry = origin.ability?.[index];
    const choose = entry && 'choose' in entry && isRecord(entry.choose) ? entry.choose : {};
    const amount = typeof choose.amount === 'number' ? choose.amount : 1;
    for (const selected of choices?.[group.id] ?? []) {
      effects.push({
        type: 'ability.add',
        ability: selected as RuleAbilityName,
        value: amount,
        sourceId,
      });
    }
  });
}

function addFixedProficiencies(
  effects: RuleEffect[],
  records: RuleProficiencyRecord[] | undefined,
  prefix: '' | 'tool' | 'language' | 'weapon' | 'armor',
  sourceId: string,
): void {
  for (const record of records ?? []) {
    for (const [key, value] of Object.entries(record)) {
      if (value !== true) continue;
      const normalized = normalizeRef(key);
      effects.push({
        type: 'proficiency.add',
        proficiency: proficiencyKey(normalized, prefix),
        sourceId,
      });
    }
  }
}

function addChosenProficiencies(
  effects: RuleEffect[],
  catalog: RuleCatalog,
  groups: readonly { id: string }[],
  choices: Readonly<Record<string, readonly string[]>> | undefined,
  prefix: '' | 'tool' | 'language' | 'weapon',
  sourceId: string,
): void {
  for (const group of groups) {
    for (const selected of choices?.[group.id] ?? []) {
      const value = prefix === 'weapon'
        ? catalog.weapons.find(({ id }) => id === selected)?.key
        : selected;
      if (value === undefined) continue;
      effects.push({
        type: 'proficiency.add',
        proficiency: proficiencyKey(value, prefix),
        sourceId,
      });
    }
  }
}

function proficiencyKey(
  value: string,
  prefix: '' | 'tool' | 'language' | 'weapon' | 'armor',
): string {
  if (prefix === '') return normalizeRuleSkillName(value);
  const normalized = normalizeRef(value);
  return `${prefix}:${prefix === 'weapon' ? normalized.toLocaleLowerCase('en-US') : normalized}`;
}

function addSense(
  effects: RuleEffect[],
  _key: string,
  distance: number | undefined,
  label: string,
  sourceId: string,
): void {
  if (distance === undefined) return;
  effects.push({
    type: 'combat.text.add',
    field: 'senses',
    value: `${label} ${distance} 尺`,
    sourceId,
  });
}

function addFixedTextEffects(
  effects: RuleEffect[],
  values: unknown[] | undefined,
  field:
    | 'damageResistances'
    | 'damageImmunities'
    | 'damageVulnerabilities'
    | 'conditionImmunities',
  sourceId: string,
): void {
  for (const value of values ?? []) {
    if (typeof value === 'string') {
      effects.push({ type: 'combat.text.add', field, value, sourceId });
    }
  }
}

function getWalkSpeed(speed: RuleOrigin['speed']): number | undefined {
  if (typeof speed === 'number') return speed;
  return speed && typeof speed.walk === 'number' ? speed.walk : undefined;
}

function normalizeRef(value: string): string {
  return (value.split('|')[0] ?? '').split(/[;；]/)[0]?.trim() ?? '';
}

function failure<T>(
  path: readonly (string | number)[],
  reason: string,
  code: RuleIssue['code'] = 'unsupported_rule_shape',
): RuleResult<T> {
  return { ok: false, issues: [{ code, path, detail: { reason } }] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function numberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'number');
}
