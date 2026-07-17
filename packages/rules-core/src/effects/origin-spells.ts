import type {
  RuleAbilityName,
  RuleCatalog,
  RuleOrigin,
  RuleSpell,
  RuleSystem,
} from '../catalog/model.js';
import type {
  RuleEntityRef,
  RuleSpellcastingProfile,
} from '../model/character.js';
import type { RuleEffect } from '../model/effect.js';
import type { RuleResult } from '../model/issue.js';
import { createRuleAdditionalSpellChoiceState } from '../options/additional-spells.js';
import { validateRuleChoiceSelections } from '../validation/common.js';

export interface RuleOriginSpellSelections {
  blockId?: string;
  ability?: RuleAbilityName;
  choices?: Readonly<Record<string, readonly string[]>>;
}

export interface RuleOriginSpellLevelUpChoiceBlock {
  id: string;
  label: string;
  ability?: RuleAbilityName;
  abilityOptions: RuleAbilityName[];
  fixedSpells: RuleSpell[];
  choices: Array<{
    id: string;
    label: string;
    count: number;
    options: RuleSpell[];
  }>;
  priorSpellIds: string[];
}

export interface RuleOriginSpellLevelUpChoiceState {
  blocks: RuleOriginSpellLevelUpChoiceBlock[];
}

export function createRuleOriginSpellLevelUpChoiceState(
  catalog: RuleCatalog,
  ruleSystem: RuleSystem,
  origin: RuleOrigin,
  oldCharacterLevel: number,
  newCharacterLevel: number,
): RuleResult<RuleOriginSpellLevelUpChoiceState | null> {
  if (newCharacterLevel <= oldCharacterLevel) return success(null);
  const owner = {
    kind: 'origin' as const,
    key: origin.key,
    source: origin.source,
    name: origin.name,
    ...(origin.additionalSpells === undefined
      ? {}
      : { additionalSpells: origin.additionalSpells }),
  };
  const previous = createRuleAdditionalSpellChoiceState(
    catalog,
    ruleSystem,
    owner,
    Math.max(0, oldCharacterLevel),
  );
  if (!previous.ok) return previous;
  const next = createRuleAdditionalSpellChoiceState(
    catalog,
    ruleSystem,
    owner,
    newCharacterLevel,
  );
  if (!next.ok) return next;
  if (next.value === null) return success(null);

  const previousById = new Map(previous.value?.blocks.map((block) => [block.id, block]) ?? []);
  const blocks = next.value.blocks.flatMap((block): RuleOriginSpellLevelUpChoiceBlock[] => {
    const oldBlock = previousById.get(block.id);
    const oldFixedIds = new Set(oldBlock?.fixedSpells.map(({ id }) => id) ?? []);
    const fixedSpells = block.fixedSpells.filter(({ id }) => !oldFixedIds.has(id));
    const oldChoiceCounts = choiceCountsBySignature(oldBlock?.choices ?? []);
    const choices = block.choices.flatMap((group) => {
      const signature = spellChoiceSignature(group);
      const addedCount = Math.max(0, group.count - (oldChoiceCounts.get(signature) ?? 0));
      return addedCount === 0 ? [] : [{
        ...group,
        id: `${group.id}-level-${newCharacterLevel}`,
        count: addedCount,
        options: [...group.options],
      }];
    });
    if (fixedSpells.length === 0 && choices.length === 0) return [];
    return [{
      id: block.id,
      label: block.label,
      ...(block.ability === undefined ? {} : { ability: block.ability }),
      abilityOptions: [...block.abilityOptions],
      fixedSpells,
      choices,
      priorSpellIds: uniqueStrings([
        ...(oldBlock?.fixedSpells.map(({ id }) => id) ?? []),
        ...(oldBlock?.choices.flatMap(({ options }) => options.map(({ id }) => id)) ?? []),
      ]),
    }];
  });
  return success(blocks.length > 0 ? { blocks } : null);
}

export function inferRuleOriginSpellLevelUpBlock(
  state: RuleOriginSpellLevelUpChoiceState,
  existingSpellIds: readonly string[],
): RuleOriginSpellLevelUpChoiceBlock | undefined {
  if (state.blocks.length === 1) return state.blocks[0];
  const existing = new Set(existingSpellIds);
  const ranked = state.blocks.map((block) => ({
    block,
    score: block.priorSpellIds.filter((id) => existing.has(id)).length,
  })).sort((left, right) => right.score - left.score);
  if (!ranked[0] || ranked[0].score === 0 || ranked[0].score === ranked[1]?.score) {
    return undefined;
  }
  return ranked[0].block;
}

export function createRuleOriginSpellLevelUpEffects(
  catalog: RuleCatalog,
  ruleSystem: RuleSystem,
  origin: RuleOrigin,
  kind: 'race' | 'background',
  oldCharacterLevel: number,
  newCharacterLevel: number,
  existingProfile: RuleSpellcastingProfile | undefined,
  selections: RuleOriginSpellSelections = {},
): RuleResult<RuleEffect[]> {
  const state = createRuleOriginSpellLevelUpChoiceState(
    catalog,
    ruleSystem,
    origin,
    oldCharacterLevel,
    newCharacterLevel,
  );
  if (!state.ok) return state;
  if (state.value === null) {
    return selections.blockId || selections.ability || Object.keys(selections.choices ?? {}).length > 0
      ? invalid(['originSpells'], 'origin_spell_level_up_not_available', 'choice_not_available')
      : success([]);
  }
  const inferred = existingProfile
    ? inferRuleOriginSpellLevelUpBlock(
        state.value,
        existingProfile.spells.map(({ id }) => id),
      )
    : undefined;
  const block = selections.blockId
    ? state.value.blocks.find(({ id }) => id === selections.blockId)
    : inferred;
  if (block === undefined) {
    return invalid(
      ['originSpells', 'blockId'],
      selections.blockId
        ? 'origin_spell_block_not_available'
        : 'origin_spell_block_required',
      selections.blockId ? 'choice_not_available' : 'choice_required',
    );
  }
  const groups = block.choices.map((group) => ({
    id: group.id,
    kind: 'spell' as const,
    required: true,
    min: group.count,
    max: group.count,
    options: group.options.map((spell) => ({
      id: spell.id,
      name: spell.name,
      source: spell.source,
    })),
  }));
  const validated = validateRuleChoiceSelections(groups, selections.choices ?? {});
  if (!validated.ok) return validated;
  const ability = existingProfile?.ability
    ? success(existingProfile.ability)
    : resolveAbility(block, selections.ability);
  if (!ability.ok) return ability;
  if (selections.ability !== undefined && selections.ability !== ability.value) {
    return invalid(
      ['originSpells', 'ability'],
      'origin_spell_ability_not_available',
      'choice_not_available',
    );
  }
  const selectedIds = new Set(Object.values(selections.choices ?? {}).flat());
  const spells = uniqueRefs([
    ...block.fixedSpells.map(toRef),
    ...block.choices.flatMap((group) => (
      group.options.filter(({ id }) => selectedIds.has(id)).map(toRef)
    )),
  ]).filter(({ id }) => !existingProfile?.spells.some((spell) => spell.id === id));
  if (spells.length === 0) return success([]);
  const profileId = existingProfile?.id
    ?? `auto-${kind}-${normalizeKey(origin.key)}-${origin.source}-spells`;
  if (existingProfile) {
    return success(spells.map((spell) => ({
      type: 'spell.add',
      profileId,
      spell,
      sourceId: profileId,
    })));
  }
  return success([{
    type: 'spell.profile.upsert',
    profile: {
      id: profileId,
      ability: ability.value,
      preparationMode: 'knownSelection',
      spells,
      slots: {},
    },
    sourceId: profileId,
  }]);
}

export function createRuleOriginSpellEffects(
  catalog: RuleCatalog,
  ruleSystem: RuleSystem,
  origin: RuleOrigin,
  kind: 'race' | 'background',
  characterLevel: number,
  selections: RuleOriginSpellSelections = {},
): RuleResult<RuleEffect[]> {
  const state = createRuleAdditionalSpellChoiceState(
    catalog,
    ruleSystem,
    {
      kind: 'origin',
      key: origin.key,
      source: origin.source,
      name: origin.name,
      ...(origin.additionalSpells === undefined
        ? {}
        : { additionalSpells: origin.additionalSpells }),
    },
    characterLevel,
  );
  if (!state.ok) return state;
  if (state.value === null) {
    return selections.blockId
      || selections.ability
      || Object.keys(selections.choices ?? {}).length > 0
      ? invalid(['originSpells'], 'origin_spells_not_available', 'choice_not_available')
      : success([]);
  }
  const block = selections.blockId
    ? state.value.blocks.find(({ id }) => id === selections.blockId)
    : state.value.blocks.length === 1
      ? state.value.blocks[0]
      : undefined;
  if (block === undefined) {
    return invalid(
      ['originSpells', 'blockId'],
      selections.blockId ? 'origin_spell_block_not_available' : 'origin_spell_block_required',
      selections.blockId ? 'choice_not_available' : 'choice_required',
    );
  }
  const groups = block.choices.map((group) => ({
    id: group.id,
    kind: 'spell' as const,
    required: true,
    min: group.count,
    max: group.count,
    options: group.options.map((spell) => ({
      id: spell.id,
      name: spell.name,
      source: spell.source,
    })),
  }));
  const validated = validateRuleChoiceSelections(groups, selections.choices ?? {});
  if (!validated.ok) return validated;

  const ability = resolveAbility(block, selections.ability);
  if (!ability.ok) return ability;
  const selectedIds = new Set(Object.values(selections.choices ?? {}).flat());
  const spells = uniqueRefs([
    ...block.fixedSpells.map(toRef),
    ...block.choices.flatMap((group) => (
      group.options.filter(({ id }) => selectedIds.has(id)).map(toRef)
    )),
  ]);
  if (spells.length === 0) {
    return invalid(['originSpells'], 'origin_spell_selection_empty');
  }
  const profileId = `auto-${kind}-${normalizeKey(origin.key)}-${origin.source}-spells`;
  return success([{
    type: 'spell.profile.upsert',
    profile: {
      id: profileId,
      ability: ability.value,
      preparationMode: 'knownSelection',
      spells,
      slots: {},
    },
    sourceId: profileId,
  }]);
}

function resolveAbility(
  block: {
    ability?: RuleAbilityName;
    abilityOptions: RuleAbilityName[];
  },
  selected: RuleAbilityName | undefined,
): RuleResult<RuleAbilityName> {
  if (block.abilityOptions.length > 0) {
    return selected && block.abilityOptions.includes(selected)
      ? success(selected)
      : invalid(
          ['originSpells', 'ability'],
          selected ? 'origin_spell_ability_not_available' : 'origin_spell_ability_required',
          selected ? 'choice_not_available' : 'choice_required',
        );
  }
  if (selected !== undefined && block.ability !== undefined && selected !== block.ability) {
    return invalid(
      ['originSpells', 'ability'],
      'origin_spell_ability_not_available',
      'choice_not_available',
    );
  }
  return success(block.ability ?? selected ?? 'CHA');
}

function toRef(spell: { id: string; key?: string; name: string; source: string }): RuleEntityRef {
  return {
    id: spell.id,
    key: spell.key || spell.name,
    source: spell.source,
  };
}

function uniqueRefs(values: readonly RuleEntityRef[]): RuleEntityRef[] {
  const seen = new Set<string>();
  return values.filter(({ id }) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function choiceCountsBySignature(
  groups: readonly {
    label: string;
    count: number;
    options: readonly { id: string }[];
  }[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const group of groups) {
    const signature = spellChoiceSignature(group);
    counts.set(signature, (counts.get(signature) ?? 0) + group.count);
  }
  return counts;
}

function spellChoiceSignature(group: {
  label: string;
  options: readonly { id: string }[];
}): string {
  return `${group.label}\u0000${group.options.map(({ id }) => id).sort().join('\u0000')}`;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function normalizeKey(value: string): string {
  return value.split('|')[0]?.trim() ?? '';
}

function success<T>(value: T): RuleResult<T> {
  return { ok: true, value, warnings: [] };
}

function invalid<T>(
  path: readonly (string | number)[],
  reason: string,
  code: 'choice_not_available' | 'choice_required' | 'unsupported_rule_shape'
    = 'unsupported_rule_shape',
): RuleResult<T> {
  return {
    ok: false,
    issues: [{ code, path, detail: { reason } }],
  };
}
