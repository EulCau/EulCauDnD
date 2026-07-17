import type { CanonicalRuleCharacterSnapshot } from '../model/character.js';
import type { RuleEffect } from '../model/effect.js';
import type { RuleIssue, RuleResult } from '../model/issue.js';
import { parseCanonicalRuleCharacter } from '../model/character.js';

export function applyRuleEffects(
  character: CanonicalRuleCharacterSnapshot,
  effects: readonly RuleEffect[],
): RuleResult<CanonicalRuleCharacterSnapshot> {
  const parsed = parseCanonicalRuleCharacter(character);
  if (!parsed.ok) return parsed;
  const next = parsed.value;
  const issues: RuleIssue[] = [];

  effects.forEach((effect, index) => {
    switch (effect.type) {
      case 'character.flag.set':
        next[effect.field] = effect.value;
        return;
      case 'ability.add':
        if (!Number.isFinite(effect.value)) {
          issues.push(invalidEffect(index, 'ability_value_invalid'));
          return;
        }
        next.abilities[effect.ability] += effect.value;
        return;
      case 'proficiency.add':
        addUnique(next.proficiencies, effect.proficiency);
        if (effect.expertise) addUnique(next.expertises, effect.proficiency);
        return;
      case 'feature.add':
        upsert(next.features, effect.feature);
        return;
      case 'resource.upsert':
        {
          const existing = next.resources.find(({ id }) => id === effect.resource.id);
          upsert(next.resources, {
            ...effect.resource,
            current: existing
              ? Math.min(effect.resource.max, existing.current)
              : effect.resource.current,
          });
        }
        return;
      case 'spell.profile.upsert':
        upsert(next.spellcastingProfiles, effect.profile);
        return;
      case 'spell.add': {
        const profile = next.spellcastingProfiles.find(({ id }) => id === effect.profileId);
        if (profile === undefined) {
          issues.push(invalidEffect(index, 'spell_profile_not_found'));
          return;
        }
        upsert(profile.spells, effect.spell);
        return;
      }
      case 'spell.remove': {
        const profile = next.spellcastingProfiles.find(({ id }) => id === effect.profileId);
        if (profile === undefined) {
          issues.push(invalidEffect(index, 'spell_profile_not_found'));
          return;
        }
        profile.spells = profile.spells.filter(({ id }) => id !== effect.spellId);
        return;
      }
      case 'class.upsert':
        upsert(next.classes, effect.classState);
        return;
      case 'combat.value.set':
        if (effect.field === 'speed') {
          if (typeof effect.value !== 'number' || !Number.isFinite(effect.value) || effect.value < 0) {
            issues.push(invalidEffect(index, 'combat_speed_invalid'));
            return;
          }
          next.combat.speed = effect.value;
        } else {
          if (typeof effect.value !== 'string' || effect.value.trim().length === 0) {
            issues.push(invalidEffect(index, 'combat_size_invalid'));
            return;
          }
          next.combat.size = effect.value;
        }
        return;
      case 'combat.number.add': {
        if (!Number.isFinite(effect.value)) {
          issues.push(invalidEffect(index, 'combat_modifier_invalid'));
          return;
        }
        const modifiers = next.combat.modifiers ?? {
          armorBonus: 0,
          hpMaxBonus: 0,
          initiativeBonus: 0,
        };
        modifiers[effect.field] += effect.value;
        next.combat.modifiers = modifiers;
        return;
      }
      case 'combat.text.add':
        addUnique(next.combat[effect.field], effect.value);
        return;
      case 'equipment.patch':
        upsert(next.equipment, effect.equipment);
        return;
      case 'combat.patch': {
        const hpPatch = isRecord(effect.patch.hp) ? effect.patch.hp : {};
        const candidate = parseCanonicalRuleCharacter({
          ...next,
          combat: {
            ...next.combat,
            ...effect.patch,
            hp: {
              ...next.combat.hp,
              ...hpPatch,
            },
          },
        });
        if (!candidate.ok) {
          issues.push(invalidEffect(index, 'combat_patch_invalid'));
          return;
        }
        next.combat = candidate.value.combat;
        return;
      }
    }
  });

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: next, warnings: [] };
}

function addUnique(values: string[], value: string): void {
  if (value.trim().length > 0 && !values.includes(value)) values.push(value);
}

function upsert<T extends { id: string }>(values: T[], value: T): void {
  const index = values.findIndex(({ id }) => id === value.id);
  if (index === -1) values.push(value);
  else values[index] = value;
}

function invalidEffect(index: number, reason: string): RuleIssue {
  return {
    code: 'unsupported_rule_shape',
    path: ['effects', index],
    detail: { reason },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
