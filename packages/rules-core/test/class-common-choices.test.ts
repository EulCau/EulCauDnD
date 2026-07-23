import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  createDefaultRuleAuthorizationPolicy,
  createRuleExpertiseAdvancementEffects,
  createRuleExpertiseAdvancementState,
  createRuleFightingStyleAdvancementEffects,
  createRuleFightingStyleAdvancementState,
  createRuleFightingStyleCantripChoiceState,
  createRuleFightingStyleCantripEffects,
  createRuleWeaponMasteryAdvancementEffects,
  createRuleWeaponMasteryAdvancementState,
  parseRuleCatalog,
  parseRuleClassSkillChoiceGroups,
  type RuleCatalog,
  type RuleClass,
  type RuleContext,
  type RuleSystem,
} from '../src/index.ts';


test('parses 2014 Bard any skill choices', async () => {
  const catalog = await loadCatalog();
  const bard = findClass(catalog, 'Bard', 'PHB');
  const groups = parseRuleClassSkillChoiceGroups(
    bard.startingProficiencies,
    `class-${bard.key}-${bard.source}`,
  );
  assert.equal(groups.ok, true);
  if (!groups.ok) return;
  assert.equal(groups.value[0]?.id, 'class-Bard-PHB-skill-0-any');
  assert.equal(groups.value[0]?.count, 3);
  assert.ok(groups.value[0]?.from.includes('Performance'));
  assert.ok(groups.value[0]?.from.includes('Stealth'));
});

test('builds and strictly validates class expertise choices', async () => {
  const catalog = await loadCatalog();
  const ruleClass = findClass(catalog, 'Rogue', 'PHB');
  const state = createRuleExpertiseAdvancementState(
    context(catalog, '5e'),
    ruleClass,
    0,
    1,
    ['Stealth', 'Perception', "tool:thieves' tools"],
    ['Perception'],
  );
  assert.equal(state.ok, true);
  if (!state.ok) return;
  assert.equal(state.value.group?.min, 2);
  assert.deepEqual(
    state.value.group?.options.map(({ id }) => id),
    ['Stealth', "tool:thieves' tools"],
  );
  const effects = createRuleExpertiseAdvancementEffects(
    state.value,
    ['Stealth', "tool:thieves' tools"],
  );
  assert.equal(effects.ok, true);
  if (!effects.ok) return;
  assert.ok(effects.value.every((effect) => (
    effect.type === 'proficiency.add' && effect.expertise
  )));
  assert.equal(
    createRuleExpertiseAdvancementEffects(state.value, ['Stealth', 'forged']).ok,
    false,
  );
});


test('returns 2014 College of Swords fighting style options', async () => {
  const catalog = await loadCatalog();
  const bard = findClass(catalog, 'Bard', 'PHB');
  const swords = catalog.subclasses.find((entry) => (
    entry.key === 'College of Swords'
    && entry.source === 'XGE'
    && entry.classSource === 'PHB'
  ));
  assert.ok(swords);
  const state = createRuleFightingStyleAdvancementState(
    context(catalog, '5e'),
    bard,
    2,
    3,
    [],
    swords,
  );
  assert.equal(state.ok, true);
  if (!state.ok) return;
  assert.equal(state.value.mode, 'feature');
  assert.deepEqual(
    state.value.group?.options.map(({ key }) => key).sort(),
    ['Dueling', 'Two-Weapon Fighting'],
  );
});

test('returns authorized 2014 fighting style features', async () => {
  const catalog = await loadCatalog();
  const ruleClass = findClass(catalog, 'Fighter', 'PHB');
  const state = createRuleFightingStyleAdvancementState(
    context(catalog, '5e'),
    ruleClass,
    0,
    1,
    [],
  );
  assert.equal(state.ok, true);
  if (!state.ok) return;
  assert.equal(state.value.mode, 'feature');
  assert.ok(state.value.group?.options.every((option) => (
    'featureTypes' in option && option.featureTypes.includes('FS:F')
  )));
  const style = state.value.group?.options[0];
  assert.ok(style);
  const effects = createRuleFightingStyleAdvancementEffects(state.value, [style.id!]);
  assert.equal(effects.ok, true);
  if (!effects.ok) return;
  assert.equal(effects.value[0]?.type, 'feature.add');
});

test('returns authorized 2024 fighting style feats by class category', async () => {
  const catalog = await loadCatalog();
  const ruleClass = findClass(catalog, 'Paladin', 'XPHB');
  const state = createRuleFightingStyleAdvancementState(
    context(catalog, '5r'),
    ruleClass,
    1,
    2,
    [],
  );
  assert.equal(state.ok, true);
  if (!state.ok) return;
  assert.equal(state.value.mode, 'feat');
  assert.ok(state.value.group?.options.every((option) => (
    'category' in option && (option.category === 'FS' || option.category === 'FS:P')
  )));
  const feat = state.value.group?.options[0];
  assert.ok(feat);
  const id = feat.id ?? `${feat.key}|${feat.source}`;
  const effects = createRuleFightingStyleAdvancementEffects(state.value, [id]);
  assert.equal(effects.ok, true);
  if (!effects.ok) return;
  assert.equal(effects.value[0]?.type, 'feat.add');
});

test('calculates weapon mastery deficits and class weapon filters', async () => {
  const catalog = await loadCatalog();
  const barbarian = findClass(catalog, 'Barbarian', 'XPHB');
  const state = createRuleWeaponMasteryAdvancementState(
    context(catalog, '5r'),
    barbarian,
    0,
    1,
    [],
  );
  assert.equal(state.ok, true);
  if (!state.ok) return;
  assert.equal(state.value.targetCount, 2);
  assert.equal(state.value.group?.min, 2);
  assert.ok(state.value.group?.options.every(({ type }) => type?.split('|')[0] === 'M'));
  const ids = state.value.group?.options.slice(0, 2).map(({ id }) => id) ?? [];
  const effects = createRuleWeaponMasteryAdvancementEffects(state.value, ids);
  assert.equal(effects.ok, true);
  if (!effects.ok) return;
  assert.ok(effects.value.every(({ sourceId }) => sourceId.startsWith('auto-weapon-mastery-')));
});

test('validates dependent fighting style cantrip choices', async () => {
  const catalog = await loadCatalog();
  const style = catalog.feats.find((feat) => (
    feat.key === 'Blessed Warrior' && feat.source === 'XPHB'
  ));
  assert.ok(style);
  const state = createRuleFightingStyleCantripChoiceState(
    context(catalog, '5r'),
    style,
  );
  assert.equal(state.ok, true);
  if (!state.ok) return;
  assert.equal(state.value.group?.min, 2);
  assert.ok(state.value.group?.options.every((spell) => (
    spell.level === 0 && spell.classKeys.includes('Cleric')
  )));
  const ids = state.value.group?.options.slice(0, 2).map(({ id }) => id) ?? [];
  const effects = createRuleFightingStyleCantripEffects(
    state.value,
    'class-profile',
    ids,
  );
  assert.equal(effects.ok, true);
  if (!effects.ok) return;
  assert.ok(effects.value.every((effect) => (
    effect.type === 'spell.add' && effect.profileId === 'class-profile'
  )));
  assert.equal(
    createRuleFightingStyleCantripEffects(
      state.value,
      'class-profile',
      [ids[0]!, 'forged-spell'],
    ).ok,
    false,
  );
});

test('does not expose choices outside a progression threshold', async () => {
  const catalog = await loadCatalog();
  const bard = findClass(catalog, 'Bard', 'PHB');
  const expertise = createRuleExpertiseAdvancementState(
    context(catalog, '5e'),
    bard,
    3,
    4,
    ['Performance', 'Persuasion'],
    [],
  );
  assert.equal(expertise.ok, true);
  if (expertise.ok) assert.equal(expertise.value.group, undefined);
  const fighter = findClass(catalog, 'Fighter', 'PHB');
  const style = createRuleFightingStyleAdvancementState(
    context(catalog, '5e'),
    fighter,
    1,
    2,
    [],
  );
  assert.equal(style.ok, true);
  if (style.ok) assert.equal(style.value.group, undefined);
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
