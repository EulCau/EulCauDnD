import type { RuleOrigin } from '../catalog/model.js';
import type { RuleEffect } from '../model/effect.js';

export function createRuleOriginAdvancementEffects(
  origin: Pick<RuleOrigin, 'key' | 'source'>,
  oldCharacterLevel: number,
  newCharacterLevel: number,
): RuleEffect[] {
  const oldLevel = Math.max(0, oldCharacterLevel);
  const newLevel = Math.max(1, newCharacterLevel);
  if (newLevel < oldLevel) return [];
  const initial = oldLevel === 0;
  const levelDelta = newLevel - oldLevel;
  const sourceId = `auto-origin-${origin.key}-${origin.source}-advancement`;
  const effects: RuleEffect[] = [];

  if (origin.key === 'Warforged' && initial) {
    effects.push({
      type: 'combat.number.add',
      field: 'armorBonus',
      value: 1,
      sourceId,
    });
  }
  if (origin.key === 'Dwarf' && origin.source === 'XPHB' && levelDelta > 0) {
    effects.push({
      type: 'combat.number.add',
      field: 'hpMaxBonus',
      value: levelDelta,
      sourceId,
    });
  }
  if (
    origin.key === 'Harengon'
    && (origin.source === 'MPMM' || origin.source === 'WBtW')
  ) {
    const difference = proficiencyBonus(newLevel)
      - (initial ? 0 : proficiencyBonus(Math.max(1, oldLevel)));
    if (difference > 0) {
      effects.push({
        type: 'combat.number.add',
        field: 'initiativeBonus',
        value: difference,
        sourceId,
      });
    }
  }
  if (
    origin.key === 'Verdan'
    && origin.source === 'AI'
    && (
      initial
      || (!initial && oldLevel < 5 && newLevel >= 5)
    )
  ) {
    effects.push({
      type: 'combat.value.set',
      field: 'size',
      value: newLevel >= 5 ? 'M' : 'S',
      sourceId,
    });
  }
  return effects;
}

function proficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}
