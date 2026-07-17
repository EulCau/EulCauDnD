import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyRuleEffects,
  createRuleOriginAdvancementEffects,
  type CanonicalRuleCharacterSnapshot,
} from '../src/index.ts';

test('projects initial origin combat modifiers', () => {
  assert.deepEqual(
    createRuleOriginAdvancementEffects(
      { key: 'Dwarf', source: 'XPHB' },
      0,
      1,
    ).map((effect) => (
      effect.type === 'combat.number.add'
        ? [effect.field, effect.value]
        : [effect.type]
    )),
    [['hpMaxBonus', 1]],
  );
  assert.deepEqual(
    createRuleOriginAdvancementEffects(
      { key: 'Warforged', source: 'ERLW' },
      0,
      1,
    ).map((effect) => (
      effect.type === 'combat.number.add'
        ? [effect.field, effect.value]
        : [effect.type]
    )),
    [['armorBonus', 1]],
  );
  assert.deepEqual(
    createRuleOriginAdvancementEffects(
      { key: 'Harengon', source: 'MPMM' },
      0,
      1,
    ).map((effect) => (
      effect.type === 'combat.number.add'
        ? [effect.field, effect.value]
        : [effect.type]
    )),
    [['initiativeBonus', 2]],
  );
  assert.ok(createRuleOriginAdvancementEffects(
    { key: 'Verdan', source: 'AI' },
    0,
    1,
  ).some((effect) => (
    effect.type === 'combat.value.set'
    && effect.field === 'size'
    && effect.value === 'S'
  )));
});

test('projects level delta, proficiency threshold, and Verdan size refresh', () => {
  assert.deepEqual(
    createRuleOriginAdvancementEffects(
      { key: 'Dwarf', source: 'XPHB' },
      1,
      5,
    ).map((effect) => (
      effect.type === 'combat.number.add' ? effect.value : undefined
    )),
    [4],
  );
  assert.deepEqual(
    createRuleOriginAdvancementEffects(
      { key: 'Harengon', source: 'WBtW' },
      4,
      5,
    ).map((effect) => (
      effect.type === 'combat.number.add' ? effect.value : undefined
    )),
    [1],
  );
  assert.ok(createRuleOriginAdvancementEffects(
    { key: 'Verdan', source: 'AI' },
    4,
    5,
  ).some((effect) => (
    effect.type === 'combat.value.set'
    && effect.field === 'size'
    && effect.value === 'M'
  )));
  assert.deepEqual(createRuleOriginAdvancementEffects(
    { key: 'Verdan', source: 'AI' },
    5,
    6,
  ), []);
});

test('applies origin combat modifiers without mutating the input', () => {
  const character = emptyCharacter();
  const applied = applyRuleEffects(character, [
    ...createRuleOriginAdvancementEffects(
      { key: 'Dwarf', source: 'XPHB' },
      0,
      3,
    ),
    ...createRuleOriginAdvancementEffects(
      { key: 'Harengon', source: 'MPMM' },
      0,
      3,
    ),
  ]);
  assert.equal(applied.ok, true);
  assert.deepEqual(applied.ok ? applied.value.combat.modifiers : undefined, {
    armorBonus: 0,
    hpMaxBonus: 3,
    initiativeBonus: 2,
  });
  assert.equal(character.combat.modifiers, undefined);
});

function emptyCharacter(): CanonicalRuleCharacterSnapshot {
  return {
    schemaVersion: 1,
    ruleSystem: '5r',
    classes: [],
    abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    proficiencies: [],
    expertises: [],
    feats: [],
    features: [],
    resources: [],
    spellcastingProfiles: [],
    equipment: [],
    combat: {
      hp: { current: 10, max: 10, temporary: 0 },
      armorClass: 10,
      speed: 30,
      size: 'M',
      senses: [],
      damageResistances: [],
      damageImmunities: [],
      damageVulnerabilities: [],
      conditionImmunities: [],
    },
    choices: [],
  };
}
