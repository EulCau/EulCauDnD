import type {
  RuleAbilityName,
  RuleCatalog,
  RuleFeatCatalogEntry,
  RuleProficiencyRecord,
  RuleSystem,
} from '../catalog/model.js';
import type { RuleEffect } from '../model/effect.js';
import type { RuleResult } from '../model/issue.js';
import {
  createRuleFeatChoiceGroups,
  type RuleFeatChoiceGroups,
} from '../options/feat-choices.js';
import { normalizeRuleSkillName } from '../options/common-choices.js';
import { validateRuleChoiceSelections } from '../validation/common.js';

export interface RuleFeatEffectCharacter {
  abilities: Readonly<Record<RuleAbilityName, number>>;
  proficiencies: readonly string[];
}

export interface RuleFeatEffectSelections {
  choices?: Readonly<Record<string, readonly string[]>>;
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

export function createRuleFeatEffects(
  catalog: RuleCatalog,
  ruleSystem: RuleSystem,
  feat: RuleFeatCatalogEntry,
  character: RuleFeatEffectCharacter,
  selections: RuleFeatEffectSelections = {},
): RuleResult<RuleEffect[]> {
  const initial = createRuleFeatChoiceGroups(catalog, ruleSystem, feat, {
    proficientSkills: character.proficiencies,
  });
  if (!initial.ok) return initial;
  const selectedSkills = initial.value.skill.flatMap((group) => (
    selections.choices?.[group.id] ?? []
  ));
  const state = createRuleFeatChoiceGroups(catalog, ruleSystem, feat, {
    proficientSkills: character.proficiencies,
    selectedSkills,
  });
  if (!state.ok) return state;
  const validated = validateRuleChoiceSelections(
    selections.allowIncompleteChoices
      ? state.value.all.filter(({ id }) => id in (selections.choices ?? {}))
      : state.value.all,
    selections.choices ?? {},
  );
  if (!validated.ok) return validated;

  const sourceId = `auto-feat-${feat.key}-${feat.source}`;
  const effects: RuleEffect[] = [];
  addAbilityEffects(effects, feat, character, state.value, selections.choices, sourceId);
  addFixedProficiencies(effects, feat.skillProficiencies, '', sourceId);
  addFixedProficiencies(effects, feat.toolProficiencies, 'tool', sourceId);
  addFixedProficiencies(effects, feat.languageProficiencies, 'language', sourceId);
  addFixedProficiencies(effects, feat.weaponProficiencies, 'weapon', sourceId);
  addFixedProficiencies(effects, feat.armorProficiencies, 'armor', sourceId);
  addFixedProficiencies(effects, feat.savingThrowProficiencies, '', sourceId);
  addFixedExpertises(effects, feat.expertise, sourceId);
  addSelectedProficiencies(
    effects,
    catalog,
    feat,
    character,
    state.value,
    selections.choices,
    sourceId,
  );
  addSense(effects, feat.blindsight, '盲视', sourceId);
  addSense(effects, feat.truesight, '真实视觉', sourceId);
  addSense(effects, feat.darkvision, '黑暗视觉', sourceId);
  addSense(effects, feat.tremorsense, '震颤感知', sourceId);
  addFixedText(effects, feat.resist, 'damageResistances', sourceId);
  addFixedText(effects, feat.immune, 'damageImmunities', sourceId);
  addFixedText(effects, feat.vulnerable, 'damageVulnerabilities', sourceId);
  addFixedText(effects, feat.conditionImmune, 'conditionImmunities', sourceId);
  for (const group of state.value.resistance) {
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

function addAbilityEffects(
  effects: RuleEffect[],
  feat: RuleFeatCatalogEntry,
  character: RuleFeatEffectCharacter,
  state: RuleFeatChoiceGroups,
  choices: Readonly<Record<string, readonly string[]>> | undefined,
  sourceId: string,
): void {
  for (const [index, entry] of (feat.ability ?? []).entries()) {
    if ('choose' in entry) {
      const group = state.ability.find(({ id }) => id.endsWith(`-ability-${index}-choose`));
      if (!group || !isRecord(entry.choose)) continue;
      const amount = typeof entry.choose.amount === 'number' ? entry.choose.amount : 1;
      const maximum = typeof (entry as Record<string, unknown>).max === 'number'
        ? Number((entry as Record<string, unknown>).max)
        : 20;
      for (const selected of choices?.[group.id] ?? []) {
        const ability = selected as RuleAbilityName;
        const value = Math.min(amount, Math.max(0, maximum - character.abilities[ability]));
        if (value > 0) effects.push({ type: 'ability.add', ability, value, sourceId });
      }
      continue;
    }
    for (const [key, amount] of Object.entries(entry)) {
      const ability = abilityMap[key];
      if (ability === undefined || typeof amount !== 'number') continue;
      const value = Math.min(amount, Math.max(0, 20 - character.abilities[ability]));
      if (value > 0) effects.push({ type: 'ability.add', ability, value, sourceId });
    }
  }
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
      effects.push({
        type: 'proficiency.add',
        proficiency: proficiencyKey(key, prefix),
        sourceId,
      });
    }
  }
}

function addFixedExpertises(
  effects: RuleEffect[],
  records: RuleProficiencyRecord[] | undefined,
  sourceId: string,
): void {
  for (const record of records ?? []) {
    for (const [key, value] of Object.entries(record)) {
      if (value !== true) continue;
      effects.push({
        type: 'proficiency.add',
        proficiency: normalizeRuleSkillName(key),
        expertise: true,
        sourceId,
      });
    }
  }
}

function addSelectedProficiencies(
  effects: RuleEffect[],
  catalog: RuleCatalog,
  feat: RuleFeatCatalogEntry,
  character: RuleFeatEffectCharacter,
  state: RuleFeatChoiceGroups,
  choices: Readonly<Record<string, readonly string[]>> | undefined,
  sourceId: string,
): void {
  const add = (
    groups: readonly { id: string }[],
    prefix: '' | 'tool' | 'language' | 'weapon',
    expertise = false,
  ) => {
    for (const group of groups) {
      for (const selected of choices?.[group.id] ?? []) {
        const value = prefix === 'weapon'
          ? catalog.weapons.find(({ id }) => id === selected)?.key
          : selected;
        if (value === undefined) continue;
        const proficiency = proficiencyKey(value, prefix);
        const observantExpertise = feat.key === 'Observant'
          && feat.source === 'XPHB'
          && character.proficiencies.includes(proficiency);
        effects.push({
          type: 'proficiency.add',
          proficiency,
          ...(expertise || observantExpertise ? { expertise: true } : {}),
          sourceId,
        });
      }
    }
  };
  add(state.skill, '');
  add(state.tool, 'tool');
  add(state.weapon, 'weapon');
  add(state.language, 'language');
  add(state.savingThrow, '');
  add(state.expertise, '', true);
}

function proficiencyKey(
  value: string,
  prefix: '' | 'tool' | 'language' | 'weapon' | 'armor',
): string {
  const normalized = normalizeRef(value);
  if (prefix === '') {
    const ability = abilityMap[normalized.toLocaleLowerCase('en-US')];
    return ability ?? normalizeRuleSkillName(normalized);
  }
  return `${prefix}:${prefix === 'weapon' ? normalized.toLocaleLowerCase('en-US') : normalized}`;
}

function addSense(
  effects: RuleEffect[],
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

function addFixedText(
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
      effects.push({ type: 'combat.text.add', field, value: normalizeRef(value), sourceId });
    }
  }
}

function normalizeRef(value: string): string {
  return value.split('|')[0]?.trim() ?? '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
