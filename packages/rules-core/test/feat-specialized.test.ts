import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  createRuleSpecializedFeatChoiceState,
  createRuleSpecializedFeatEffects,
  parseRuleCatalog,
  type RuleCatalog,
  type RuleFeatCatalogEntry,
} from '../src/index.ts';

test('builds all four specialized feat choice groups from authorized catalog entries', async () => {
  const catalog = await loadCatalog();
  const cases = [
    ['Fighting Initiate', 'TCE', 'fightingStyle', 1],
    ['Eldritch Adept', 'TCE', 'invocation', 1],
    ['Martial Adept', 'PHB', 'maneuver', 2],
    ['Metamagic Adept', 'TCE', 'metamagic', 2],
  ] as const;
  for (const [key, source, kind, count] of cases) {
    const state = createRuleSpecializedFeatChoiceState(
      catalog,
      '5e',
      findFeat(catalog, key, source),
      {},
    );
    assert.equal(state.ok, true);
    assert.equal(state.ok ? state.value.groups.length : 0, 1);
    const group = state.ok ? state.value.groups[0] : undefined;
    assert.equal(group?.kind, kind);
    assert.equal(group?.min, count);
    assert.equal(group?.max, count);
    assert.ok(group && group.options.length >= count);
  }
});

test('filters known options and applies source priority', async () => {
  const catalog = await loadCatalog();
  const feat = findFeat(catalog, 'Metamagic Adept', 'TCE');
  const initial = createRuleSpecializedFeatChoiceState(catalog, '5r', feat);
  assert.equal(initial.ok, true);
  if (!initial.ok) return;
  const group = initial.value.groups[0]!;
  const careful = group.options.find(({ key }) => key === 'Careful Spell');
  assert.equal(careful?.source, 'XPHB');
  const filtered = createRuleSpecializedFeatChoiceState(catalog, '5r', feat, {
    knownFeatureIds: careful ? [careful.id] : [],
  });
  assert.equal(filtered.ok, true);
  assert.equal(
    filtered.ok && filtered.value.groups[0]?.options.some(({ id }) => id === careful?.id),
    false,
  );
});

test('keeps Eldritch Adept prerequisite invocations behind explicit warlock context', async () => {
  const catalog = await loadCatalog();
  const feat = findFeat(catalog, 'Eldritch Adept', 'TCE');
  const withoutWarlock = createRuleSpecializedFeatChoiceState(catalog, '5e', feat);
  assert.equal(withoutWarlock.ok, true);
  assert.equal(
    withoutWarlock.ok && withoutWarlock.value.groups[0]?.options.some(({ prerequisite }) => (
      Boolean(prerequisite?.length)
    )),
    false,
  );
  const withWarlock = createRuleSpecializedFeatChoiceState(catalog, '5e', feat, {
    warlockLevel: 20,
  });
  assert.equal(withWarlock.ok, true);
  assert.equal(
    withWarlock.ok && withWarlock.value.groups[0]?.options.some(({ key }) => (
      key === 'Shroud of Shadow'
    )),
    true,
  );
});

test('strictly validates specialized selections and projects feature effects', async () => {
  const catalog = await loadCatalog();
  const feat = findFeat(catalog, 'Martial Adept', 'PHB');
  const state = createRuleSpecializedFeatChoiceState(catalog, '5e', feat);
  assert.equal(state.ok, true);
  if (!state.ok) return;
  const group = state.value.groups[0]!;
  const selected = group.options.slice(0, group.min).map(({ id }) => id);
  assert.equal(createRuleSpecializedFeatEffects(
    catalog,
    '5e',
    feat,
    {},
    { [group.id]: selected.slice(0, 1) },
  ).ok, false);
  assert.equal(createRuleSpecializedFeatEffects(
    catalog,
    '5e',
    feat,
    {},
    { [group.id]: [...selected, 'forged|PHB'] },
  ).ok, false);
  const effects = createRuleSpecializedFeatEffects(
    catalog,
    '5e',
    feat,
    {},
    { [group.id]: selected },
  );
  assert.equal(effects.ok, true);
  assert.equal(effects.ok ? effects.value.length : 0, 2);
  assert.equal(effects.ok && effects.value.every(({ type }) => type === 'feature.add'), true);
});

async function loadCatalog(): Promise<RuleCatalog> {
  const content = await readFile(
    new URL('../../../public/data/auto-builder-core.json', import.meta.url),
    'utf8',
  );
  const parsed = parseRuleCatalog(JSON.parse(content));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error('catalog parse failed');
  return parsed.value;
}

function findFeat(
  catalog: RuleCatalog,
  key: string,
  source: string,
): RuleFeatCatalogEntry {
  const feat = catalog.feats.find((entry) => entry.key === key && entry.source === source);
  assert.ok(feat);
  return feat;
}
