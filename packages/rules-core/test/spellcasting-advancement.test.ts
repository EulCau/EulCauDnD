import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  createDefaultRuleAuthorizationPolicy,
  createRuleSpellcastingAdvancementEffects,
  createRuleSpellcastingAdvancementState,
  getRuleClassSpellSlots,
  getRuleClassSpellOptions,
  getRuleMaxSpellLevel,
  getRuleMulticlassSpellSlots,
  parseRuleCatalog,
  type RuleCatalog,
  type RuleClass,
  type RuleContext,
  type RuleSystem,
} from '../src/index.ts';

test('classifies prepared, known, and spellbook progression', async () => {
  const catalog = await loadCatalog();
  const cases = [
    ['5e', 'Cleric', 'PHB', 'preparedAll'],
    ['5e', 'Bard', 'PHB', 'knownSelection'],
    ['5e', 'Wizard', 'PHB', 'spellbook'],
    ['5r', 'Ranger', 'XPHB', 'preparedAll'],
  ] as const;
  for (const [ruleSystem, key, source, mode] of cases) {
    const result = createRuleSpellcastingAdvancementState(
      context(catalog, ruleSystem),
      findClass(catalog, key, source),
      0,
      1,
    );
    assert.equal(result.ok, true, `${source} ${key}`);
    if (!result.ok) continue;
    assert.equal(result.value?.mode, mode);
    assert.equal(result.value?.needed.leveled === 0, mode === 'preparedAll');
  }
});

test('calculates table and fallback maximum spell levels', async () => {
  const catalog = await loadCatalog();
  assert.equal(getRuleMaxSpellLevel(findClass(catalog, 'Wizard', 'PHB'), 1), 1);
  assert.equal(getRuleMaxSpellLevel(findClass(catalog, 'Wizard', 'PHB'), 17), 9);
  assert.equal(getRuleMaxSpellLevel(findClass(catalog, 'Paladin', 'PHB'), 1), -1);
  assert.equal(getRuleMaxSpellLevel(findClass(catalog, 'Paladin', 'PHB'), 2), 1);
  assert.equal(getRuleMaxSpellLevel(findClass(catalog, 'Warlock', 'PHB'), 9), 5);
});

test('calculates only the remaining cumulative spell choices', async () => {
  const catalog = await loadCatalog();
  const ruleClass = findClass(catalog, 'Bard', 'PHB');
  const initial = createRuleSpellcastingAdvancementState(
    context(catalog, '5e'),
    ruleClass,
    0,
    1,
  );
  assert.equal(initial.ok, true);
  if (!initial.ok || !initial.value) return;
  const existing = [
    ...initial.value.cantrips.slice(0, initial.value.limits.cantrips),
    ...initial.value.leveled.slice(0, initial.value.limits.leveled),
  ].map(({ id }) => id);
  const leveled = createRuleSpellcastingAdvancementState(
    context(catalog, '5e'),
    ruleClass,
    1,
    2,
    existing,
  );
  assert.equal(leveled.ok, true);
  if (!leveled.ok || !leveled.value) return;
  assert.equal(leveled.value.needed.cantrips, 0);
  assert.equal(
    leveled.value.needed.leveled,
    leveled.value.limits.leveled - initial.value.limits.leveled,
  );
});

test('builds fixed-level Warlock spell groups', async () => {
  const catalog = await loadCatalog();
  const result = createRuleSpellcastingAdvancementState(
    context(catalog, '5e'),
    findClass(catalog, 'Warlock', 'PHB'),
    10,
    11,
  );
  assert.equal(result.ok, true);
  if (!result.ok || !result.value) return;
  assert.ok(result.value.fixedLeveledGroups.length > 0);
  assert.ok(result.value.fixedLeveledGroups.every(({ group, spellLevel }) => (
    group?.options.every((spell) => spell.level === spellLevel)
  )));
});

test('uses authorization and source priority for class spell pools', async () => {
  const catalog = await loadCatalog();
  const ruleClass = findClass(catalog, 'Wizard', 'XPHB');
  const options = getRuleClassSpellOptions(context(catalog, '5r'), ruleClass, 1);
  assert.ok(options.length > 0);
  const byIdentity = new Map<string, string>();
  for (const spell of options) {
    const identity = spell.englishName || spell.key || spell.name;
    assert.equal(byIdentity.has(identity), false, identity);
    byIdentity.set(identity, spell.source);
  }
  const xphbNames = new Set(
    catalog.spells
      .filter((spell) => spell.source === 'XPHB')
      .map((spell) => spell.englishName || spell.key || spell.name),
  );
  assert.ok(options.some((spell) => spell.source !== 'XPHB'));
  assert.ok(options
    .filter((spell) => xphbNames.has(spell.englishName || spell.key || spell.name))
    .every((spell) => spell.source === 'XPHB'));
});

test('rejects forged classes and invalid advancement ranges', async () => {
  const catalog = await loadCatalog();
  const ruleClass = findClass(catalog, 'Wizard', 'PHB');
  assert.equal(createRuleSpellcastingAdvancementState(
    context(catalog, '5e'),
    { ...ruleClass, source: 'FORGED' },
    0,
    1,
  ).ok, false);
  assert.equal(createRuleSpellcastingAdvancementState(
    context(catalog, '5e'),
    ruleClass,
    2,
    1,
  ).ok, false);
});

test('strictly projects initial known spells without mutating state', async () => {
  const catalog = await loadCatalog();
  const state = createRuleSpellcastingAdvancementState(
    context(catalog, '5e'),
    findClass(catalog, 'Bard', 'PHB'),
    0,
    1,
  );
  assert.equal(state.ok, true);
  if (!state.ok || !state.value) return;
  const snapshot = structuredClone(state.value);
  const selections = selectFirstOptions(state.value.groups);
  const effects = createRuleSpellcastingAdvancementEffects(
    context(catalog, '5e'),
    JSON.parse(JSON.stringify(state.value)),
    { selections },
  );
  assert.equal(effects.ok, true);
  assert.deepEqual(state.value, snapshot);
  if (!effects.ok || effects.value[0]?.type !== 'spell.profile.upsert') return;
  assert.equal(effects.value[0].profile.slotSource, 'class');
  assert.ok(effects.value[0].profile.spells.every((spell) => spell.prepared));
  assert.equal(
    effects.value[0].profile.spells.length,
    state.value.limits.cantrips + state.value.limits.leveled,
  );
});

test('rejects forged and duplicate spell selections', async () => {
  const catalog = await loadCatalog();
  const state = createRuleSpellcastingAdvancementState(
    context(catalog, '5e'),
    findClass(catalog, 'Bard', 'PHB'),
    0,
    1,
  );
  assert.equal(state.ok, true);
  if (!state.ok || !state.value) return;
  const forged = createRuleSpellcastingAdvancementEffects(
    context(catalog, '5e'),
    state.value,
    { selections: { [state.value.groups[0]!.id]: ['forged-spell'] } },
  );
  assert.equal(forged.ok, false);
  const duplicate = selectFirstOptions(state.value.groups);
  const firstGroup = state.value.groups[0]!;
  if (firstGroup.max > 0) {
    duplicate[firstGroup.id] = Array(firstGroup.max).fill(firstGroup.options[0]!.id);
    assert.equal(createRuleSpellcastingAdvancementEffects(
      context(catalog, '5e'),
      state.value,
      { selections: duplicate },
    ).ok, false);
  }
});

test('projects class, pact, and multiclass slots while preserving expended uses', async () => {
  const catalog = await loadCatalog();
  const warlock = getRuleClassSpellSlots(
    findClass(catalog, 'Warlock', 'PHB'),
    11,
    { '5': { total: 2, expended: 2 } },
  );
  assert.deepEqual(warlock, { '5': { total: 3, expended: 2 } });
  const shared = getRuleMulticlassSpellSlots([
    { ruleClass: findClass(catalog, 'Wizard', 'PHB'), level: 3 },
    { ruleClass: findClass(catalog, 'Paladin', 'PHB'), level: 2 },
  ], {
    '1': { total: 2, expended: 1 },
    '2': { total: 1, expended: 1 },
  });
  assert.equal(shared.applies, true);
  assert.equal(shared.casterLevel, 4);
  assert.deepEqual(shared.slots, {
    '1': { total: 4, expended: 1 },
    '2': { total: 3, expended: 1 },
  });
});

test('shares PHB and XPHB Magical Secrets behavior', async () => {
  const catalog = await loadCatalog();
  const phb = createRuleSpellcastingAdvancementState(
    context(catalog, '5e'),
    findClass(catalog, 'Bard', 'PHB'),
    9,
    10,
  );
  assert.equal(phb.ok, true);
  assert.equal(phb.ok && phb.value?.magicalSecretGroups.length, 1);
  assert.equal(phb.ok && phb.value?.magicalSecretGroups[0]?.max, 2);
  const xphb = createRuleSpellcastingAdvancementState(
    context(catalog, '5r'),
    findClass(catalog, 'Bard', 'XPHB'),
    9,
    10,
  );
  assert.equal(xphb.ok, true);
  assert.equal(xphb.ok && xphb.value?.magicalSecretGroups.length, 0);
  assert.ok(xphb.ok && xphb.value?.leveled.some((spell) => (
    !spell.classKeys.includes('Bard')
  )));
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

function context(catalog: RuleCatalog, ruleSystem: RuleSystem): RuleContext {
  return {
    catalog,
    ruleSystem,
    authorization: createDefaultRuleAuthorizationPolicy(catalog, ruleSystem),
  };
}

function findClass(catalog: RuleCatalog, key: string, source: string): RuleClass {
  const result = catalog.classes.find((entry) => (
    entry.key === key && entry.source === source
  ));
  assert.ok(result);
  return result;
}

function selectFirstOptions(
  groups: readonly { id: string; max: number; options: readonly { id: string }[] }[],
): Record<string, string[]> {
  return Object.fromEntries(groups.map((group) => [
    group.id,
    group.options.slice(0, group.max).map(({ id }) => id),
  ]));
}
