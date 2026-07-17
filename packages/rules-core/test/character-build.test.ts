import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  createDefaultRuleAuthorizationPolicy,
  createRuleClassInstanceId,
  parseRuleCatalog,
  validateAndProjectLevelOne,
  validateAndProjectLevelUp,
  type CanonicalRuleCharacterSnapshot,
  type RuleCatalog,
  type RuleClass,
  type RuleContext,
  type RuleSystem,
} from '../src/index.ts';

test('projects a level-one class with a deterministic id and hp', async () => {
  const catalog = await loadCatalog();
  const fighter = findClass(catalog, 'Fighter', 'PHB');
  const draft = character('5e');
  const projected = validateAndProjectLevelOne(
    context(catalog, '5e'),
    JSON.parse(JSON.stringify(draft)),
    { class: { key: fighter.key, source: fighter.source } },
  );
  assert.equal(projected.ok, true);
  assert.deepEqual(draft, character('5e'));
  if (!projected.ok) return;
  assert.equal(projected.value.character.classes[0]?.id, createRuleClassInstanceId(fighter));
  assert.equal(projected.value.character.classes[0]?.level, 1);
  assert.equal(projected.value.character.combat.hp.max, 12);
  assert.ok(projected.value.effects.some(({ type }) => type === 'class.upsert'));
});

test('strictly validates and projects an ability score level-up', async () => {
  const catalog = await loadCatalog();
  const fighter = findClass(catalog, 'Fighter', 'PHB');
  const input = character('5e', fighter, 3);
  const subclass = catalog.subclasses.find((entry) => (
    entry.classSource === fighter.source
    && (entry.className === fighter.name || entry.className === fighter.key)
  ));
  assert.ok(subclass);
  input.classes[0]!.subclass = {
    id: subclass.id,
    key: subclass.key,
    source: subclass.source,
  };
  const snapshot = structuredClone(input);
  const missing = validateAndProjectLevelUp(
    context(catalog, '5e'),
    input,
    { classId: input.classes[0]!.id, targetClassLevel: 4 },
    {},
  );
  assert.equal(missing.ok, false);
  const projected = validateAndProjectLevelUp(
    context(catalog, '5e'),
    JSON.parse(JSON.stringify(input)),
    { classId: input.classes[0]!.id, targetClassLevel: 4 },
    { abilityIncreases: { STR: 2 } },
  );
  assert.equal(projected.ok, true);
  assert.deepEqual(input, snapshot);
  if (!projected.ok) return;
  assert.equal(projected.value.character.classes[0]?.level, 4);
  assert.equal(projected.value.character.abilities.STR, 17);
  assert.equal(projected.value.character.combat.hp.max, 30);
  assert.equal(projected.value.choices[0]?.value, 4);
});

test('requires and projects an authorized subclass at its threshold', async () => {
  const catalog = await loadCatalog();
  const fighter = findClass(catalog, 'Fighter', 'PHB');
  const input = character('5e', fighter, 2);
  const missing = validateAndProjectLevelUp(
    context(catalog, '5e'),
    input,
    { classId: input.classes[0]!.id },
    {},
  );
  assert.equal(missing.ok, false);
  const subclass = catalog.subclasses.find((entry) => (
    entry.classSource === fighter.source
    && (entry.className === fighter.name || entry.className === fighter.key)
  ));
  assert.ok(subclass);
  const projected = validateAndProjectLevelUp(
    context(catalog, '5e'),
    input,
    { classId: input.classes[0]!.id },
    { subclassId: subclass.id },
  );
  assert.equal(projected.ok, true);
  assert.equal(projected.ok && projected.value.character.classes[0]?.subclass?.id, subclass.id);
});

test('rejects stale targets, unauthorized classes, and the total level cap', async () => {
  const catalog = await loadCatalog();
  const fighter = findClass(catalog, 'Fighter', 'PHB');
  const input = character('5e', fighter, 3);
  assert.equal(validateAndProjectLevelUp(
    context(catalog, '5e'),
    input,
    { classId: input.classes[0]!.id, targetClassLevel: 5 },
    { abilityIncreases: { STR: 2 } },
  ).ok, false);
  assert.equal(validateAndProjectLevelOne(
    context(catalog, '5e'),
    character('5e'),
    { class: { key: fighter.key, source: 'FORGED' } },
  ).ok, false);
  const capped = character('5e', fighter, 20);
  assert.equal(validateAndProjectLevelUp(
    context(catalog, '5e'),
    capped,
    { classId: capped.classes[0]!.id },
    {},
  ).ok, false);
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
  const result = catalog.classes.find((entry) => entry.key === key && entry.source === source);
  assert.ok(result);
  return result;
}

function character(
  ruleSystem: RuleSystem,
  ruleClass?: RuleClass,
  level = 0,
): CanonicalRuleCharacterSnapshot {
  return {
    schemaVersion: 1,
    ruleSystem,
    classes: ruleClass && level > 0 ? [{
      id: createRuleClassInstanceId(ruleClass),
      key: ruleClass.key,
      source: ruleClass.source,
      level,
    }] : [],
    abilities: { STR: 15, DEX: 14, CON: 14, INT: 10, WIS: 10, CHA: 8 },
    proficiencies: ['Athletics', 'Perception'],
    expertises: [],
    feats: [],
    features: [],
    resources: [],
    spellcastingProfiles: [],
    equipment: [],
    combat: {
      hp: {
        current: level > 0 ? 10 + Math.max(0, level - 1) * 6 : 0,
        max: level > 0 ? 10 + Math.max(0, level - 1) * 6 : 0,
        temporary: 0,
      },
      armorClass: 10,
      speed: 30,
      size: 'medium',
      senses: [],
      damageResistances: [],
      damageImmunities: [],
      damageVulnerabilities: [],
      conditionImmunities: [],
    },
    choices: [],
  };
}
