import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  applyRuleEffects,
  createRuleOriginFeatChoiceState,
  createRuleOriginFeatEffects,
  parseRuleCatalog,
  type CanonicalRuleCharacterSnapshot,
  type RuleFeatCatalogEntry,
} from '../src/index.ts';

const feats: RuleFeatCatalogEntry[] = [
  feat('Alert', '警觉', 'XPHB', 'O'),
  feat('Lucky', '幸运', 'XPHB', 'O'),
  feat('Tough', '健壮', 'XPHB', 'G'),
];

test('parses every catalog origin feat grant', async () => {
  const content = await readFile(
    new URL('../../../public/data/auto-builder-core.json', import.meta.url),
    'utf8',
  );
  const parsed = parseRuleCatalog(JSON.parse(content));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const origins = [
    ...parsed.value.races,
    ...parsed.value.subraces,
    ...parsed.value.backgrounds,
  ].filter((origin) => origin.feats?.length);
  assert.equal(origins.length, 19);
  for (const origin of origins) {
    const state = createRuleOriginFeatChoiceState(origin, parsed.value.feats);
    assert.equal(
      state.ok,
      true,
      `${origin.key}|${origin.source}: ${
        'issues' in state ? JSON.stringify(state.issues) : ''
      }`,
    );
    if (!state.ok || !state.value) continue;
    const selections = state.value.mode === 'choice'
      ? state.value.options.slice(0, state.value.count).map(({ key, source }) => `${key}|${source}`)
      : [];
    assert.equal(createRuleOriginFeatEffects(state.value, selections).ok, true);
  }
});

test('parses fixed, unrestricted, category, and decoupled origin feat grants', () => {
  const fixed = createRuleOriginFeatChoiceState({
    key: 'Guard',
    source: 'XPHB',
    feats: [{ '警觉|xphb': true }],
  }, feats);
  assert.equal(fixed.ok && fixed.value?.mode, 'fixed');
  assert.deepEqual(fixed.ok ? fixed.value?.options.map(({ key }) => key) : [], ['Alert']);

  const unrestricted = createRuleOriginFeatChoiceState({
    key: 'Custom Lineage',
    source: 'TCE',
    feats: [{ any: 1 }],
  }, feats);
  assert.equal(unrestricted.ok && unrestricted.value?.count, 1);
  assert.deepEqual(
    unrestricted.ok ? unrestricted.value?.options.map(({ key }) => key) : [],
    ['Alert', 'Lucky', 'Tough'],
  );

  const category = createRuleOriginFeatChoiceState({
    key: 'Human',
    source: 'XPHB',
    feats: [{ anyFromCategory: { category: ['O'], count: 1 } }],
  }, feats);
  assert.deepEqual(
    category.ok ? category.value?.options.map(({ key }) => key) : [],
    ['Alert', 'Lucky'],
  );

  const decoupled = createRuleOriginFeatChoiceState(undefined, feats, true);
  assert.deepEqual(
    decoupled.ok ? decoupled.value?.options.map(({ key }) => key) : [],
    ['Alert', 'Lucky'],
  );
});

test('fails closed on malformed origin feat grants and selections', () => {
  const malformed = createRuleOriginFeatChoiceState({
    key: 'Broken',
    source: 'TEST',
    feats: [{ anyFromCategory: { category: ['O'], count: 0 } }],
  }, feats);
  assert.equal(malformed.ok, false);

  const state = createRuleOriginFeatChoiceState(undefined, feats, true);
  assert.equal(state.ok, true);
  if (!state.ok) return;
  assert.equal(createRuleOriginFeatEffects(state.value, []).ok, false);
  assert.equal(createRuleOriginFeatEffects(state.value, ['Tough|XPHB']).ok, false);
  assert.equal(createRuleOriginFeatEffects(state.value, ['Alert|XPHB']).ok, true);
});

test('applies selected origin feats without mutating the character', () => {
  const state = createRuleOriginFeatChoiceState(undefined, feats, true);
  assert.equal(state.ok, true);
  if (!state.ok) return;
  const effects = createRuleOriginFeatEffects(state.value, ['Lucky|XPHB']);
  assert.equal(effects.ok, true);
  if (!effects.ok) return;
  const character = emptyCharacter();
  const applied = applyRuleEffects(character, effects.value);
  assert.equal(applied.ok, true);
  assert.deepEqual(applied.ok ? applied.value.feats : [], [{
    id: 'Lucky|XPHB',
    key: 'Lucky',
    source: 'XPHB',
  }]);
  assert.deepEqual(character.feats, []);
});

function feat(
  key: string,
  name: string,
  source: string,
  category: string,
): RuleFeatCatalogEntry {
  return { key, name, source, category, features: [] };
}

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
