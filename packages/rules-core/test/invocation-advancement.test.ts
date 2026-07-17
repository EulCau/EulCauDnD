import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  createDefaultRuleAuthorizationPolicy,
  createRuleInvocationAdvancementEffects,
  createRuleInvocationAdvancementState,
  parseRuleCatalog,
  type RuleCatalog,
  type RuleClass,
  type RuleContext,
  type RuleSystem,
} from '../src/index.ts';

test('calculates PHB and XPHB invocation progression deficits', async () => {
  const catalog = await loadCatalog();
  const phb = createRuleInvocationAdvancementState(
    context(catalog, '5e'),
    findClass(catalog, 'Warlock', 'PHB'),
    1,
    2,
    [],
  );
  assert.equal(phb.ok, true);
  if (phb.ok) {
    assert.equal(phb.value.targetCount, 2);
    assert.equal(phb.value.group?.min, 2);
  }
  const xphb = createRuleInvocationAdvancementState(
    context(catalog, '5r'),
    findClass(catalog, 'Warlock', 'XPHB'),
    1,
    2,
    ['Pact of the Tome|XPHB'],
    { knownFeatureNames: ['书之魔契'] },
  );
  assert.equal(xphb.ok, true);
  if (xphb.ok) {
    assert.equal(xphb.value.targetCount, 3);
    assert.equal(xphb.value.group?.min, 2);
  }
});

test('uses same-turn features and spells when evaluating prerequisites', async () => {
  const catalog = await loadCatalog();
  const ruleClass = findClass(catalog, 'Warlock', 'XPHB');
  const withoutSpell = createRuleInvocationAdvancementState(
    context(catalog, '5r'),
    ruleClass,
    1,
    2,
    ['Pact of the Tome|XPHB'],
    { knownFeatureNames: ['书之魔契'] },
  );
  const withSpell = createRuleInvocationAdvancementState(
    context(catalog, '5r'),
    ruleClass,
    1,
    2,
    ['Pact of the Tome|XPHB'],
    {
      knownFeatureNames: ['书之魔契'],
      selectedSpellIds: [
        catalog.spells.find((spell) => (
          spell.source === 'XPHB'
          && spell.level === 0
          && spell.classKeys.includes('Warlock')
          && Boolean(spell.damageInflict?.length)
        ))!.id,
      ],
    },
  );
  assert.equal(withoutSpell.ok, true);
  assert.equal(withSpell.ok, true);
  if (!withoutSpell.ok || !withSpell.ok) return;
  assert.ok(withSpell.value.group!.options.length >= withoutSpell.value.group!.options.length);
});

test('strictly validates invocation selections and projects stable features', async () => {
  const catalog = await loadCatalog();
  const state = createRuleInvocationAdvancementState(
    context(catalog, '5r'),
    findClass(catalog, 'Warlock', 'XPHB'),
    0,
    1,
    [],
  );
  assert.equal(state.ok, true);
  if (!state.ok) return;
  const invocation = state.value.group?.options[0];
  assert.ok(invocation);
  const effects = createRuleInvocationAdvancementEffects(
    state.value,
    [invocation.id],
  );
  assert.equal(effects.ok, true);
  if (!effects.ok) return;
  assert.deepEqual(effects.value[0], {
    type: 'feature.add',
    feature: {
      id: invocation.id,
      key: invocation.key,
      source: invocation.source,
    },
    sourceId: `auto-invocation-${invocation.key}-${invocation.source}`,
  });
  assert.equal(
    createRuleInvocationAdvancementEffects(state.value, ['forged']).ok,
    false,
  );
  assert.equal(
    createRuleInvocationAdvancementEffects(state.value, []).ok,
    false,
  );
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
