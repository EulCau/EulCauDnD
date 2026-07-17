import type { RuleAbilityName } from '../catalog/model.js';
import type {
  RuleClassState,
  RuleEntityRef,
  RuleEquipmentState,
  RuleResourceState,
  RuleSpellcastingProfile,
} from './character.js';
import type { JsonObject } from './json.js';

export type RuleEffect =
  | { type: 'ability.add'; ability: RuleAbilityName; value: number; sourceId: string }
  | { type: 'proficiency.add'; proficiency: string; expertise?: boolean; sourceId: string }
  | { type: 'feature.add'; feature: RuleEntityRef; sourceId: string }
  | { type: 'resource.upsert'; resource: RuleResourceState; sourceId: string }
  | { type: 'spell.profile.upsert'; profile: RuleSpellcastingProfile; sourceId: string }
  | { type: 'spell.add'; profileId: string; spell: RuleEntityRef; sourceId: string }
  | { type: 'spell.remove'; profileId: string; spellId: string; sourceId: string }
  | { type: 'class.upsert'; classState: RuleClassState; sourceId: string }
  | {
      type: 'combat.value.set';
      field: 'speed' | 'size';
      value: number | string;
      sourceId: string;
    }
  | {
      type: 'combat.text.add';
      field:
        | 'senses'
        | 'damageResistances'
        | 'damageImmunities'
        | 'damageVulnerabilities'
        | 'conditionImmunities';
      value: string;
      sourceId: string;
    }
  | { type: 'combat.patch'; patch: JsonObject; sourceId: string }
  | { type: 'equipment.patch'; equipment: RuleEquipmentState; sourceId: string };
