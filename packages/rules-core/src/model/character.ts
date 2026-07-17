import type { RuleAbilityName, RuleSystem } from '../catalog/model.js';
import type { RuleResult } from './issue.js';
import { cloneJsonValue, type JsonObject } from './json.js';

export interface RuleEntityRef {
  id: string;
  key: string;
  source: string;
}

export interface CanonicalRuleCharacterSnapshot {
  schemaVersion: 1;
  ruleSystem: RuleSystem;
  classes: RuleClassState[];
  abilities: Record<RuleAbilityName, number>;
  species?: RuleEntityRef;
  subrace?: RuleEntityRef;
  background?: RuleEntityRef;
  inspiration?: boolean;
  proficiencies: string[];
  expertises: string[];
  feats: RuleEntityRef[];
  features: RuleEntityRef[];
  resources: RuleResourceState[];
  spellcastingProfiles: RuleSpellcastingProfile[];
  equipment: RuleEquipmentState[];
  combat: RuleCombatSnapshot;
  choices: RuleChoiceRecord[];
}

export interface RuleClassState extends RuleEntityRef {
  level: number;
  subclass?: RuleEntityRef;
}

export interface RuleResourceState {
  id: string;
  sourceId: string;
  current: number;
  max: number;
  reset: 'shortRest' | 'longRest' | 'dawn' | 'manual';
  name?: string;
  sourceName?: string;
  note?: string;
  ruleSystem?: RuleSystem;
}

export interface RuleSpellcastingProfile {
  id: string;
  classId?: string;
  ability: RuleAbilityName;
  preparationMode: 'preparedAll' | 'knownSelection' | 'manual';
  spells: RuleEntityRef[];
  slots: Record<string, { total: number; expended: number }>;
}

export interface RuleEquipmentState extends RuleEntityRef {
  equipped: boolean;
  slot?: 'armor' | 'mainHand' | 'offHand' | 'shield';
}

export interface RuleCombatSnapshot {
  hp: { current: number; max: number; temporary: number };
  armorClass: number;
  speed: number;
  size: string;
  senses: string[];
  damageResistances: string[];
  damageImmunities: string[];
  damageVulnerabilities: string[];
  conditionImmunities: string[];
  modifiers?: {
    armorBonus: number;
    hpMaxBonus: number;
    initiativeBonus: number;
    speedBonus?: number;
  };
}

export interface RuleChoiceRecord {
  level: number;
  groupId: string;
  selectedIds: string[];
  value?: string | number | boolean;
}

export function parseCanonicalRuleCharacter(
  value: unknown,
): RuleResult<CanonicalRuleCharacterSnapshot> {
  const cloned = cloneJsonValue(value);
  if (!cloned.ok) return cloned;
  if (!isRecord(cloned.value)) return invalid([], 'character_not_object');
  const input = cloned.value;
  const issues: { path: readonly (string | number)[]; reason: string }[] = [];
  if (input.schemaVersion !== 1) return invalid(['schemaVersion'], 'schema_version_invalid');
  if (input.ruleSystem !== '5e' && input.ruleSystem !== '5r') {
    return invalid(['ruleSystem'], 'rule_system_invalid');
  }
  for (const key of [
    'classes',
    'proficiencies',
    'expertises',
    'feats',
    'features',
    'resources',
    'spellcastingProfiles',
    'equipment',
    'choices',
  ]) {
    if (!Array.isArray(input[key])) return invalid([key], 'array_required');
  }
  if (!validAbilities(input.abilities)) return invalid(['abilities'], 'abilities_invalid');
  validateClasses(input.classes as JsonObject[], issues);
  validateTextArray(input.proficiencies as unknown[], ['proficiencies'], issues);
  validateTextArray(input.expertises as unknown[], ['expertises'], issues);
  validateRefs(input.feats as JsonObject[], ['feats'], issues);
  validateRefs(input.features as JsonObject[], ['features'], issues);
  validateResources(input.resources as JsonObject[], issues);
  validateSpellcastingProfiles(input.spellcastingProfiles as JsonObject[], issues);
  validateEquipment(input.equipment as JsonObject[], issues);
  validateChoices(input.choices as JsonObject[], issues);
  for (const key of ['species', 'subrace', 'background'] as const) {
    if (input[key] !== undefined && !validRef(input[key])) {
      issues.push({ path: [key], reason: 'entity_ref_invalid' });
    }
  }
  if (input.inspiration !== undefined && typeof input.inspiration !== 'boolean') {
    issues.push({ path: ['inspiration'], reason: 'boolean_required' });
  }
  validateCombat(input.combat, issues);
  if (issues.length > 0) {
    return {
      ok: false,
      issues: issues.map(({ path, reason }) => ({
        code: 'unsupported_rule_shape',
        path,
        detail: { reason },
      })),
    };
  }
  return {
    ok: true,
    value: input as unknown as CanonicalRuleCharacterSnapshot,
    warnings: [],
  };
}

function validateClasses(
  values: JsonObject[],
  issues: { path: readonly (string | number)[]; reason: string }[],
): void {
  const ids = new Set<string>();
  values.forEach((entry, index) => {
    const path = ['classes', index] as const;
    if (
      !validRef(entry)
      || !integerBetween(entry.level, 1, 20)
      || (entry.subclass !== undefined && !validRef(entry.subclass))
    ) {
      issues.push({ path, reason: 'class_state_invalid' });
      return;
    }
    if (ids.has(entry.id)) issues.push({ path, reason: 'class_id_duplicate' });
    ids.add(entry.id);
  });
}

function validateRefs(
  values: JsonObject[],
  path: readonly (string | number)[],
  issues: { path: readonly (string | number)[]; reason: string }[],
): void {
  const ids = new Set<string>();
  values.forEach((entry, index) => {
    if (!validRef(entry)) {
      issues.push({ path: [...path, index], reason: 'entity_ref_invalid' });
      return;
    }
    if (ids.has(entry.id)) {
      issues.push({ path: [...path, index], reason: 'entity_ref_duplicate' });
    }
    ids.add(entry.id);
  });
}

function validateResources(
  values: JsonObject[],
  issues: { path: readonly (string | number)[]; reason: string }[],
): void {
  const ids = new Set<string>();
  values.forEach((entry, index) => {
    const path = ['resources', index] as const;
    if (
      !validText(entry.id)
      || !validText(entry.sourceId)
      || !nonNegativeInteger(entry.current)
      || !nonNegativeInteger(entry.max)
      || Number(entry.current) > Number(entry.max)
      || !['shortRest', 'longRest', 'dawn', 'manual'].includes(String(entry.reset))
      || (entry.name !== undefined && !validText(entry.name))
      || (entry.sourceName !== undefined && !validText(entry.sourceName))
      || (entry.note !== undefined && typeof entry.note !== 'string')
      || (
        entry.ruleSystem !== undefined
        && entry.ruleSystem !== '5e'
        && entry.ruleSystem !== '5r'
      )
    ) {
      issues.push({ path, reason: 'resource_invalid' });
      return;
    }
    if (ids.has(entry.id)) issues.push({ path, reason: 'resource_id_duplicate' });
    ids.add(entry.id);
  });
}

function validateSpellcastingProfiles(
  values: JsonObject[],
  issues: { path: readonly (string | number)[]; reason: string }[],
): void {
  const ids = new Set<string>();
  values.forEach((entry, index) => {
    const path = ['spellcastingProfiles', index] as const;
    if (
      !validText(entry.id)
      || !isAbility(entry.ability)
      || !['preparedAll', 'knownSelection', 'manual'].includes(String(entry.preparationMode))
      || !Array.isArray(entry.spells)
      || !isRecord(entry.slots)
    ) {
      issues.push({ path, reason: 'spellcasting_profile_invalid' });
      return;
    }
    validateRefs(entry.spells as JsonObject[], [...path, 'spells'], issues);
    for (const [level, slot] of Object.entries(entry.slots)) {
      if (
        !/^[1-9]$/.test(level)
        || !isRecord(slot)
        || !nonNegativeInteger(slot.total)
        || !nonNegativeInteger(slot.expended)
        || Number(slot.expended) > Number(slot.total)
      ) {
        issues.push({ path: [...path, 'slots', level], reason: 'spell_slot_invalid' });
      }
    }
    if (ids.has(entry.id)) issues.push({ path, reason: 'spellcasting_profile_id_duplicate' });
    ids.add(entry.id);
  });
}

function validateEquipment(
  values: JsonObject[],
  issues: { path: readonly (string | number)[]; reason: string }[],
): void {
  const ids = new Set<string>();
  values.forEach((entry, index) => {
    const path = ['equipment', index] as const;
    if (
      !validRef(entry)
      || typeof entry.equipped !== 'boolean'
      || (
        entry.slot !== undefined
        && !['armor', 'mainHand', 'offHand', 'shield'].includes(String(entry.slot))
      )
    ) {
      issues.push({ path, reason: 'equipment_invalid' });
      return;
    }
    if (ids.has(entry.id)) issues.push({ path, reason: 'equipment_id_duplicate' });
    ids.add(entry.id);
  });
}

function validateChoices(
  values: JsonObject[],
  issues: { path: readonly (string | number)[]; reason: string }[],
): void {
  values.forEach((entry, index) => {
    const path = ['choices', index] as const;
    if (
      !integerBetween(entry.level, 1, 20)
      || !validText(entry.groupId)
      || !Array.isArray(entry.selectedIds)
    ) {
      issues.push({ path, reason: 'choice_record_invalid' });
      return;
    }
    validateTextArray(entry.selectedIds, [...path, 'selectedIds'], issues);
    if (
      entry.value !== undefined
      && !['string', 'number', 'boolean'].includes(typeof entry.value)
    ) {
      issues.push({ path: [...path, 'value'], reason: 'choice_value_invalid' });
    }
  });
}

function validateCombat(
  value: unknown,
  issues: { path: readonly (string | number)[]; reason: string }[],
): void {
  if (
    !isRecord(value)
    || !isRecord(value.hp)
    || !nonNegativeNumber(value.hp.current)
    || !nonNegativeNumber(value.hp.max)
    || !nonNegativeNumber(value.hp.temporary)
    || Number(value.hp.current) > Number(value.hp.max) + Number(value.hp.temporary)
    || !nonNegativeNumber(value.armorClass)
    || !nonNegativeNumber(value.speed)
    || !validText(value.size)
  ) {
    issues.push({ path: ['combat'], reason: 'combat_invalid' });
    return;
  }
  for (const key of [
    'senses',
    'damageResistances',
    'damageImmunities',
    'damageVulnerabilities',
    'conditionImmunities',
  ]) {
    if (!Array.isArray(value[key])) {
      issues.push({ path: ['combat', key], reason: 'array_required' });
    } else {
      validateTextArray(value[key], ['combat', key], issues);
    }
  }
  if (
    value.modifiers !== undefined
    && (
      !isRecord(value.modifiers)
      || !finiteNumber(value.modifiers.armorBonus)
      || !finiteNumber(value.modifiers.hpMaxBonus)
      || !finiteNumber(value.modifiers.initiativeBonus)
      || (
        value.modifiers.speedBonus !== undefined
        && !finiteNumber(value.modifiers.speedBonus)
      )
    )
  ) {
    issues.push({ path: ['combat', 'modifiers'], reason: 'combat_modifiers_invalid' });
  }
}

function validateTextArray(
  values: unknown[],
  path: readonly (string | number)[],
  issues: { path: readonly (string | number)[]; reason: string }[],
): void {
  const seen = new Set<string>();
  values.forEach((entry, index) => {
    if (!validText(entry) || seen.has(entry)) {
      issues.push({ path: [...path, index], reason: 'unique_text_required' });
      return;
    }
    seen.add(entry);
  });
}

function validRef(value: unknown): value is JsonObject & {
  id: string;
  key: string;
  source: string;
} {
  return isRecord(value)
    && validText(value.id)
    && validText(value.key)
    && validText(value.source);
}

function validAbilities(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].every((ability) => (
    typeof value[ability] === 'number' && Number.isFinite(value[ability])
  ));
}

function isAbility(value: unknown): value is RuleAbilityName {
  return typeof value === 'string'
    && ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].includes(value);
}

function validText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function nonNegativeInteger(value: unknown): boolean {
  return Number.isInteger(value) && Number(value) >= 0;
}

function nonNegativeNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function finiteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

function integerBetween(value: unknown, min: number, max: number): boolean {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(
  path: readonly (string | number)[],
  reason: string,
): RuleResult<never> {
  return {
    ok: false,
    issues: [{ code: 'unsupported_rule_shape', path, detail: { reason } }],
  };
}
