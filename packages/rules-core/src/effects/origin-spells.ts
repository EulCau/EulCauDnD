import type {
  RuleAbilityName,
  RuleCatalog,
  RuleOrigin,
  RuleSystem,
} from '../catalog/model.js';
import type { RuleEntityRef } from '../model/character.js';
import type { RuleEffect } from '../model/effect.js';
import type { RuleResult } from '../model/issue.js';
import { createRuleAdditionalSpellChoiceState } from '../options/additional-spells.js';
import { validateRuleChoiceSelections } from '../validation/common.js';

export interface RuleOriginSpellSelections {
  blockId?: string;
  ability?: RuleAbilityName;
  choices?: Readonly<Record<string, readonly string[]>>;
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
