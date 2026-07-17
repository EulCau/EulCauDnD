import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  createDefaultRuleAuthorizationPolicy,
  createRuleManeuverAdvancementState,
  createRuleMetamagicAdvancementState,
  createRuleOptionalFeatureAdvancementEffects,
  parseRuleCatalog,
  type RuleCatalog,
  type RuleClass,
  type RuleContext,
  type RuleSubclass,
  type RuleSystem,
} from '../src/index.ts';

test('calculates PHB and XPHB metamagic progression deficits', async () => {
  const catalog = await loadCatalog();
  const phb = createRuleMetamagicAdvancementState(
    context(catalog, '5e'),
    findClass(catalog, 'Sorcerer', 'PHB'),
    2,
    3,
    [],
  );
  assert.equal(phb.ok, true);
  if (phb.ok) {
    assert.equal(phb.value.targetCount, 2);
    assert.equal(phb.value.group?.min, 2);
  }
  const xphb = createRuleMetamagicAdvancementState(
    context(catalog, '5r'),
    findClass(catalog, 'Sorcerer', 'XPHB'),
    9,
    10,
    catalog.metamagics
      .filter(({ source }) => source === 'XPHB')
      .slice(0, 2)
      .map(({ id }) => id),
  );
  assert.equal(xphb.ok, true);
  if (xphb.ok) {
    assert.equal(xphb.value.targetCount, 4);
    assert.equal(xphb.value.group?.min, 2);
  }
});

test('carries sparse progression targets across later levels', async () => {
  const catalog = await loadCatalog();
  const state = createRuleMetamagicAdvancementState(
    context(catalog, '5e'),
    findClass(catalog, 'Sorcerer', 'PHB'),
    3,
    4,
    [],
  );
  assert.equal(state.ok, true);
  if (!state.ok) return;
  assert.equal(state.value.targetCount, 2);
  assert.equal(state.value.group?.min, 2);
  const withFeatTarget = createRuleMetamagicAdvancementState(
    context(catalog, '5e'),
    findClass(catalog, 'Sorcerer', 'PHB'),
    3,
    4,
    catalog.metamagics.slice(0, 2).map(({ id }) => id),
    2,
  );
  assert.equal(withFeatTarget.ok, true);
  if (withFeatTarget.ok) {
    assert.equal(withFeatTarget.value.targetCount, 4);
    assert.equal(withFeatTarget.value.group?.min, 2);
  }
});

test('preserves feat-granted metamagic outside the class progression target', async () => {
  const catalog = await loadCatalog();
  const existing = catalog.metamagics.slice(0, 2).map(({ id }) => id);
  const state = createRuleMetamagicAdvancementState(
    context(catalog, '5e'),
    findClass(catalog, 'Sorcerer', 'PHB'),
    2,
    3,
    existing,
    2,
  );
  assert.equal(state.ok, true);
  if (!state.ok) return;
  assert.equal(state.value.targetCount, 4);
  assert.equal(state.value.group?.min, 2);
});

test('combines Battle Master progression with an extra maneuver target', async () => {
  const catalog = await loadCatalog();
  const subclass = findSubclass(catalog, 'Battle Master', 'XPHB', 'XPHB');
  const state = createRuleManeuverAdvancementState(
    context(catalog, '5r'),
    subclass,
    2,
    3,
    [],
    1,
  );
  assert.equal(state.ok, true);
  if (!state.ok) return;
  assert.equal(state.value.targetCount, 4);
  assert.equal(state.value.group?.min, 4);
});

test('strictly validates and projects optional feature choices', async () => {
  const catalog = await loadCatalog();
  const state = createRuleManeuverAdvancementState(
    context(catalog, '5e'),
    findSubclass(catalog, 'Battle Master', 'PHB', 'PHB'),
    2,
    3,
    [],
  );
  assert.equal(state.ok, true);
  if (!state.ok) return;
  const ids = state.value.group?.options.slice(0, 3).map(({ id }) => id) ?? [];
  const effects = createRuleOptionalFeatureAdvancementEffects(state.value, ids);
  assert.equal(effects.ok, true);
  if (!effects.ok) return;
  assert.ok(effects.value.every((effect) => (
    effect.type === 'feature.add'
    && effect.sourceId === `auto-maneuver-${effect.feature.key}-${effect.feature.source}`
  )));
  assert.equal(
    createRuleOptionalFeatureAdvancementEffects(
      state.value,
      [ids[0]!, ids[1]!, 'forged'],
    ).ok,
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

function findSubclass(
  catalog: RuleCatalog,
  key: string,
  classSource: string,
  source: string,
): RuleSubclass {
  const result = catalog.subclasses.find((entry) => (
    entry.key === key
    && entry.classSource === classSource
    && entry.source === source
  ));
  assert.ok(result);
  return result;
}
