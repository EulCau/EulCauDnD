import type {
  RuleAbilityName,
  RuleCatalog,
  RuleFeatCatalogEntry,
  RuleSpell,
  RuleSystem,
} from '../catalog/model.js';
import type {
  RuleEntityRef,
  RuleSpellcastingProfile,
} from '../model/character.js';
import type { RuleEffect } from '../model/effect.js';
import type { RuleResult } from '../model/issue.js';
import {
  createRuleAdditionalSpellChoiceState,
  type RuleAdditionalSpellChoiceBlock,
  type RuleAdditionalSpellChoiceState,
} from '../options/additional-spells.js';
import { validateRuleChoiceSelections } from '../validation/common.js';

export interface RuleFeatSpellSelections {
  blockId?: string;
  ability?: RuleAbilityName;
  choices?: Readonly<Record<string, readonly string[]>>;
  replaceRemoveId?: string;
  replaceAddId?: string;
}

export interface RuleFeatSpellReplacementState {
  profileId: string;
  label: string;
  removeOptions: RuleSpell[];
  addOptions: RuleSpell[];
}

export interface RuleFeatSpellLevelUpChoiceBlock extends RuleAdditionalSpellChoiceBlock {
  priorSpellIds: string[];
}

export interface RuleFeatSpellLevelUpChoiceState {
  blocks: RuleFeatSpellLevelUpChoiceBlock[];
  replacement?: RuleFeatSpellReplacementState;
}

export function createRuleFeatSpellChoiceState(
  catalog: RuleCatalog,
  ruleSystem: RuleSystem,
  feat: RuleFeatCatalogEntry,
  characterLevel = Number.POSITIVE_INFINITY,
): RuleResult<RuleAdditionalSpellChoiceState | null> {
  const state = createRuleAdditionalSpellChoiceState(
    catalog,
    ruleSystem,
    owner(feat),
    characterLevel,
  );
  if (!state.ok || state.value === null) return state;
  if (feat.key !== 'Rune Shaper' || feat.source !== 'BGG') return state;
  const block = state.value.blocks[0];
  if (block === undefined) return success(null);
  const fixedSpells = block.fixedSpells.filter(isComprehendLanguages);
  const fixedIds = new Set(fixedSpells.map(({ id }) => id));
  const runeOptions = block.fixedSpells.filter(({ id }) => !fixedIds.has(id));
  if (fixedSpells.length === 0 && runeOptions.length === 0) return success(null);
  const effectiveLevel = Number.isFinite(characterLevel) ? Math.max(1, characterLevel) : 1;
  const count = Math.max(1, Math.floor(proficiencyBonus(effectiveLevel) / 2));
  return success({
    blocks: [{
      ...block,
      fixedSpells,
      choices: runeOptions.length === 0 ? [] : [{
        id: `${block.id}-rune-spells`,
        label: '符文法术',
        count,
        options: runeOptions,
      }],
    }],
  });
}

export function createRuleFeatSpellEffects(
  catalog: RuleCatalog,
  ruleSystem: RuleSystem,
  feat: RuleFeatCatalogEntry,
  characterLevel: number,
  selections: RuleFeatSpellSelections = {},
): RuleResult<RuleEffect[]> {
  const state = createRuleFeatSpellChoiceState(
    catalog,
    ruleSystem,
    feat,
    characterLevel,
  );
  if (!state.ok) return state;
  if (state.value === null) {
    return hasSelections(selections)
      ? invalid(['featSpells'], 'feat_spells_not_available', 'choice_not_available')
      : success([]);
  }
  const block = selectBlock(state.value.blocks, selections.blockId);
  if (!block.ok) return block;
  const validated = validateSpellChoices(block.value, selections.choices);
  if (!validated.ok) return validated;
  const ability = resolveAbility(block.value, selections.ability, 'featSpells');
  if (!ability.ok) return ability;
  const spells = selectedSpellRefs(block.value, selections.choices);
  if (spells.length === 0) return invalid(['featSpells'], 'feat_spell_selection_empty');
  const profileId = featSpellProfileId(feat);
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

export function createRuleFeatSpellLevelUpChoiceState(
  catalog: RuleCatalog,
  ruleSystem: RuleSystem,
  feat: RuleFeatCatalogEntry,
  oldCharacterLevel: number,
  newCharacterLevel: number,
  existingProfile?: RuleSpellcastingProfile,
): RuleResult<RuleFeatSpellLevelUpChoiceState | null> {
  if (newCharacterLevel <= oldCharacterLevel) return success(null);
  const previous = createRuleFeatSpellChoiceState(
    catalog,
    ruleSystem,
    feat,
    Math.max(0, oldCharacterLevel),
  );
  if (!previous.ok) return previous;
  const next = createRuleFeatSpellChoiceState(
    catalog,
    ruleSystem,
    feat,
    newCharacterLevel,
  );
  if (!next.ok) return next;
  const previousById = new Map(previous.value?.blocks.map((block) => [block.id, block]) ?? []);
  const blocks = (next.value?.blocks ?? []).flatMap((block): RuleFeatSpellLevelUpChoiceBlock[] => {
    const oldBlock = previousById.get(block.id);
    const oldFixedIds = new Set(oldBlock?.fixedSpells.map(({ id }) => id) ?? []);
    const fixedSpells = block.fixedSpells.filter(({ id }) => !oldFixedIds.has(id));
    const oldCounts = choiceCountsBySignature(oldBlock?.choices ?? []);
    const nextBySignature = choiceGroupsBySignature(block.choices);
    const existingIds = new Set(existingProfile?.spells.map(({ id }) => id) ?? []);
    const choices = [...nextBySignature.entries()].flatMap(([signature, groups]) => {
      const addedCount = Math.max(
        0,
        groups.reduce((total, group) => total + group.count, 0)
          - (oldCounts.get(signature) ?? 0),
      );
      if (addedCount === 0 || groups[0] === undefined) return [];
      return [{
        ...groups[0],
        id: `${groups[0].id}-level-${newCharacterLevel}`,
        count: addedCount,
        options: groups[0].options.filter(({ id }) => !existingIds.has(id)),
      }];
    }).filter(({ count, options }) => options.length >= count);
    if (fixedSpells.length === 0 && choices.length === 0) return [];
    return [{
      ...block,
      fixedSpells,
      choices,
      priorSpellIds: uniqueStrings([
        ...(oldBlock?.fixedSpells.map(({ id }) => id) ?? []),
        ...(oldBlock?.choices.flatMap(({ options }) => options.map(({ id }) => id)) ?? []),
      ]),
    }];
  });
  const replacement = feat.key === 'Rune Shaper' && feat.source === 'BGG' && existingProfile
    ? createRuneReplacementState(feat, next.value, existingProfile)
    : undefined;
  return blocks.length === 0 && replacement === undefined
    ? success(null)
    : success({ blocks, ...(replacement === undefined ? {} : { replacement }) });
}

export function inferRuleFeatSpellLevelUpBlock(
  state: RuleFeatSpellLevelUpChoiceState,
  existingSpellIds: readonly string[],
): RuleFeatSpellLevelUpChoiceBlock | undefined {
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

export function createRuleFeatSpellLevelUpEffects(
  catalog: RuleCatalog,
  ruleSystem: RuleSystem,
  feat: RuleFeatCatalogEntry,
  oldCharacterLevel: number,
  newCharacterLevel: number,
  existingProfile: RuleSpellcastingProfile | undefined,
  selections: RuleFeatSpellSelections = {},
): RuleResult<RuleEffect[]> {
  const state = createRuleFeatSpellLevelUpChoiceState(
    catalog,
    ruleSystem,
    feat,
    oldCharacterLevel,
    newCharacterLevel,
    existingProfile,
  );
  if (!state.ok) return state;
  if (state.value === null) {
    return hasSelections(selections)
      ? invalid(['featSpells'], 'feat_spell_level_up_not_available', 'choice_not_available')
      : success([]);
  }
  const effects: RuleEffect[] = [];
  const replacement = validateReplacement(state.value.replacement, selections);
  if (!replacement.ok) return replacement;
  if (replacement.value) {
    effects.push(
      {
        type: 'spell.remove',
        profileId: replacement.value.profileId,
        spellId: replacement.value.remove.id,
        sourceId: replacement.value.profileId,
      },
      {
        type: 'spell.add',
        profileId: replacement.value.profileId,
        spell: toRef(replacement.value.add),
        sourceId: replacement.value.profileId,
      },
    );
  }
  if (state.value.blocks.length === 0) return success(effects);
  const inferred = existingProfile
    ? inferRuleFeatSpellLevelUpBlock(
        state.value,
        existingProfile.spells.map(({ id }) => id),
      )
    : undefined;
  const block = selections.blockId
    ? state.value.blocks.find(({ id }) => id === selections.blockId)
    : inferred ?? (state.value.blocks.length === 1 ? state.value.blocks[0] : undefined);
  if (block === undefined) {
    return invalid(
      ['featSpells', 'blockId'],
      selections.blockId ? 'feat_spell_block_not_available' : 'feat_spell_block_required',
      selections.blockId ? 'choice_not_available' : 'choice_required',
    );
  }
  const validated = validateSpellChoices(block, selections.choices);
  if (!validated.ok) return validated;
  const ability = existingProfile
    ? success(existingProfile.ability)
    : resolveAbility(block, selections.ability, 'featSpells');
  if (!ability.ok) return ability;
  const spells = selectedSpellRefs(block, selections.choices).filter(({ id }) => (
    !existingProfile?.spells.some((spell) => spell.id === id)
  ));
  if (replacement.value && spells.some(({ id }) => id === replacement.value?.add.id)) {
    return invalid(
      ['featSpells', 'replacement'],
      'feat_spell_replacement_duplicates_new_choice',
      'choice_not_available',
    );
  }
  const profileId = existingProfile?.id ?? featSpellProfileId(feat);
  if (existingProfile) {
    effects.push(...spells.map((spell): RuleEffect => ({
      type: 'spell.add',
      profileId,
      spell,
      sourceId: profileId,
    })));
  } else if (spells.length > 0) {
    effects.push({
      type: 'spell.profile.upsert',
      profile: {
        id: profileId,
        ability: ability.value,
        preparationMode: 'knownSelection',
        spells,
        slots: {},
      },
      sourceId: profileId,
    });
  }
  return success(effects);
}

function owner(feat: RuleFeatCatalogEntry) {
  return {
    kind: 'feat' as const,
    key: feat.key,
    source: feat.source,
    name: feat.name,
    ...(feat.additionalSpells === undefined ? {} : { additionalSpells: feat.additionalSpells }),
  };
}

function selectBlock(
  blocks: readonly RuleAdditionalSpellChoiceBlock[],
  blockId: string | undefined,
): RuleResult<RuleAdditionalSpellChoiceBlock> {
  const block = blockId
    ? blocks.find(({ id }) => id === blockId)
    : blocks.length === 1 ? blocks[0] : undefined;
  return block === undefined
    ? invalid(
        ['featSpells', 'blockId'],
        blockId ? 'feat_spell_block_not_available' : 'feat_spell_block_required',
        blockId ? 'choice_not_available' : 'choice_required',
      )
    : success(block);
}

function validateSpellChoices(
  block: RuleAdditionalSpellChoiceBlock,
  choices: Readonly<Record<string, readonly string[]>> | undefined,
) {
  return validateRuleChoiceSelections(
    block.choices.map((group) => ({
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
    })),
    choices ?? {},
  );
}

function resolveAbility(
  block: Pick<RuleAdditionalSpellChoiceBlock, 'ability' | 'abilityOptions'>,
  selected: RuleAbilityName | undefined,
  path: string,
): RuleResult<RuleAbilityName> {
  if (block.abilityOptions.length > 0) {
    return selected && block.abilityOptions.includes(selected)
      ? success(selected)
      : invalid(
          [path, 'ability'],
          selected ? 'feat_spell_ability_not_available' : 'feat_spell_ability_required',
          selected ? 'choice_not_available' : 'choice_required',
        );
  }
  if (selected !== undefined && block.ability !== undefined && selected !== block.ability) {
    return invalid(
      [path, 'ability'],
      'feat_spell_ability_not_available',
      'choice_not_available',
    );
  }
  return success(block.ability ?? selected ?? 'CHA');
}

function selectedSpellRefs(
  block: RuleAdditionalSpellChoiceBlock,
  choices: Readonly<Record<string, readonly string[]>> | undefined,
): RuleEntityRef[] {
  const selected = new Set(Object.values(choices ?? {}).flat());
  return uniqueRefs([
    ...block.fixedSpells.map(toRef),
    ...block.choices.flatMap((group) => (
      group.options.filter(({ id }) => selected.has(id)).map(toRef)
    )),
  ]);
}

function createRuneReplacementState(
  feat: RuleFeatCatalogEntry,
  state: RuleAdditionalSpellChoiceState | null,
  profile: RuleSpellcastingProfile,
): RuleFeatSpellReplacementState | undefined {
  const block = state?.blocks[0];
  const runeChoice = block?.choices[0];
  if (!block || !runeChoice) return undefined;
  const fixedIds = new Set(block.fixedSpells.map(({ id }) => id));
  const removeOptions = profile.spells.flatMap((ref) => {
    if (fixedIds.has(ref.id)) return [];
    const option = runeChoice.options.find(({ id }) => id === ref.id);
    return option ? [option] : [];
  });
  const existing = new Set(profile.spells.map(({ id }) => id));
  const addOptions = runeChoice.options.filter(({ id }) => !existing.has(id));
  return removeOptions.length > 0 && addOptions.length > 0
    ? {
        profileId: featSpellProfileId(feat),
        label: '替换已知符文',
        removeOptions,
        addOptions,
      }
    : undefined;
}

function validateReplacement(
  state: RuleFeatSpellReplacementState | undefined,
  selections: RuleFeatSpellSelections,
): RuleResult<{
  profileId: string;
  remove: RuleSpell;
  add: RuleSpell;
} | null> {
  const removeId = selections.replaceRemoveId;
  const addId = selections.replaceAddId;
  if (removeId === undefined && addId === undefined) return success(null);
  if (state === undefined || removeId === undefined || addId === undefined) {
    return invalid(['featSpells', 'replacement'], 'feat_spell_replacement_invalid', 'choice_not_available');
  }
  const remove = state.removeOptions.find(({ id }) => id === removeId);
  const add = state.addOptions.find(({ id }) => id === addId);
  return remove && add
    ? success({ profileId: state.profileId, remove, add })
    : invalid(['featSpells', 'replacement'], 'feat_spell_replacement_invalid', 'choice_not_available');
}

function featSpellProfileId(feat: RuleFeatCatalogEntry): string {
  return `auto-feat-${normalizeKey(feat.key)}-${feat.source}-spells`;
}

function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.max(1, level) - 1) / 4);
}

function isComprehendLanguages(spell: RuleSpell): boolean {
  return spell.englishName === 'Comprehend Languages' || spell.name === '通晓语言';
}

function hasSelections(selections: RuleFeatSpellSelections): boolean {
  return Boolean(
    selections.blockId
    || selections.ability
    || selections.replaceRemoveId
    || selections.replaceAddId
    || Object.keys(selections.choices ?? {}).length > 0
  );
}

function toRef(spell: RuleSpell): RuleEntityRef {
  return { id: spell.id, key: spell.key || spell.name, source: spell.source };
}

function uniqueRefs(values: readonly RuleEntityRef[]): RuleEntityRef[] {
  const seen = new Set<string>();
  return values.filter(({ id }) => !seen.has(id) && Boolean(seen.add(id)));
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

function choiceGroupsBySignature<T extends {
  label: string;
  count: number;
  options: readonly { id: string }[];
}>(groups: readonly T[]): Map<string, T[]> {
  const bySignature = new Map<string, T[]>();
  for (const group of groups) {
    const signature = spellChoiceSignature(group);
    bySignature.set(signature, [...(bySignature.get(signature) ?? []), group]);
  }
  return bySignature;
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
  return { ok: false, issues: [{ code, path, detail: { reason } }] };
}
