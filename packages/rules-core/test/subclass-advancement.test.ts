import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  createDefaultRuleAuthorizationPolicy,
  createRuleSubclassAdvancementEffects,
  createRuleSubclassAdvancementState,
  parseRuleCatalog,
  type RuleCatalog,
  type RuleClass,
  type RuleContext,
  type RuleSubclass,
  type RuleSystem,
} from '../src/index.ts';

test('requires one authorized subclass at the class subclass level', async () => {
  const catalog = await loadCatalog();
  const ruleClass = findClass(catalog, 'Cleric', 'PHB');
  const state = createRuleSubclassAdvancementState(
    context(catalog, '5e'),
    ruleClass,
    0,
    1,
  );
  assert.equal(state.ok, true);
  if (!state.ok) return;
  assert.equal(state.value.group?.kind, 'subclass');
  assert.equal(state.value.group?.min, 1);
  assert.equal(state.value.group?.max, 1);
  const life = findSubclass(state.value.options, 'Life Domain', 'PHB');
  const effects = createRuleSubclassAdvancementEffects(state.value, [life.id]);
  assert.equal(effects.ok, true);
  if (!effects.ok) return;
  assert.ok(effects.value.some((effect) => (
    effect.type === 'feature.add'
    && effect.feature.id.startsWith(`${life.id}:feature:1:`)
  )));
});

test('rejects missing, duplicate, and forged subclass selections', async () => {
  const catalog = await loadCatalog();
  const ruleClass = findClass(catalog, 'Cleric', 'XPHB');
  const state = createRuleSubclassAdvancementState(
    context(catalog, '5r'),
    ruleClass,
    2,
    3,
  );
  assert.equal(state.ok, true);
  if (!state.ok) return;
  const authorizedSubclass = state.value.options[0];
  assert.ok(authorizedSubclass);
  for (const selection of [
    [],
    [authorizedSubclass.id, authorizedSubclass.id],
    ['forged-subclass'],
  ]) {
    const result = createRuleSubclassAdvancementEffects(state.value, selection);
    assert.equal(result.ok, false);
  }
});

test('projects only newly reached features for an existing subclass', async () => {
  const catalog = await loadCatalog();
  const ruleClass = findClass(catalog, 'Cleric', 'PHB');
  const life = findSubclass(catalog.subclasses, 'Life Domain', 'PHB', ruleClass);
  const state = createRuleSubclassAdvancementState(
    context(catalog, '5e'),
    ruleClass,
    1,
    6,
    life.id,
  );
  assert.equal(state.ok, true);
  if (!state.ok) return;
  assert.equal(state.value.group, undefined);
  const effects = createRuleSubclassAdvancementEffects(state.value);
  assert.equal(effects.ok, true);
  if (!effects.ok) return;
  const featureLevels = effects.value
    .filter((effect) => effect.type === 'feature.add')
    .map((effect) => Number(effect.feature.id.split(':feature:')[1]?.split(':')[0]));
  assert.deepEqual([...new Set(featureLevels)].sort((a, b) => a - b), [2, 6]);
  assert.equal(
    createRuleSubclassAdvancementEffects(state.value, [life.id]).ok,
    false,
  );
});

test('projects Hex Warrior proficiencies from feature identity', async () => {
  const catalog = await loadCatalog();
  const ruleClass = findClass(catalog, 'Warlock', 'XPHB');
  const hexblade = findSubclass(
    catalog.subclasses,
    'The Hexblade',
    'XGE',
    ruleClass,
  );
  const state = createRuleSubclassAdvancementState(
    context(catalog, '5r'),
    ruleClass,
    2,
    3,
  );
  assert.equal(state.ok, true);
  if (!state.ok) return;
  const effects = createRuleSubclassAdvancementEffects(state.value, [hexblade.id]);
  assert.equal(effects.ok, true);
  if (!effects.ok) return;
  assert.deepEqual(
    effects.value
      .filter((effect) => effect.type === 'proficiency.add')
      .map((effect) => effect.proficiency)
      .sort(),
    ['armor:medium', 'armor:shield', 'weapon:martial'],
  );
});

test('rejects unauthorized subclasses and invalid level ranges', async () => {
  const catalog = await loadCatalog();
  const ruleClass = findClass(catalog, 'Cleric', 'PHB');
  assert.equal(
    createRuleSubclassAdvancementState(
      context(catalog, '5e'),
      ruleClass,
      1,
      2,
      'forged-subclass',
    ).ok,
    false,
  );
  assert.equal(
    createRuleSubclassAdvancementState(
      context(catalog, '5e'),
      ruleClass,
      3,
      2,
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

function findClass(
  catalog: RuleCatalog,
  key: string,
  source: string,
): RuleClass {
  const result = catalog.classes.find((entry) => (
    entry.key === key && entry.source === source
  ));
  assert.ok(result);
  return result;
}

function findSubclass(
  subclasses: readonly RuleSubclass[],
  key: string,
  source: string,
  ruleClass?: RuleClass,
): RuleSubclass {
  const result = subclasses.find((entry) => (
    entry.key === key
    && entry.source === source
    && (ruleClass === undefined || (
      entry.className === ruleClass.name
      && entry.classSource === ruleClass.source
    ))
  ));
  assert.ok(result);
  return result;
}
