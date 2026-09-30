import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  createDefaultRuleAuthorizationPolicy,
  createRuleClassInstanceId,
  createRuleClassResourceEffects,
  createRuleSpecializedFeatChoiceState,
  createRuleFightingStyleAdvancementState,
  createRuleMetamagicAdvancementState,
  createRuleManeuverAdvancementState,
  createRuleWeaponMasteryAdvancementState,
  createRuleSubclassAdvancementState,
  createRuleInvocationAdvancementState,
  createRuleSpellcastingAdvancementState,
  parseRuleClassSkillChoiceGroups,
  parseRuleToolChoiceGroups,
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
  const styleState = createRuleFightingStyleAdvancementState(
    context(catalog, '5e'), fighter, 0, 1, [],
  );
  assert.equal(styleState.ok, true);
  if (!styleState.ok || styleState.value.group === undefined) return;
  const styleId = styleState.value.group.options[0]?.id;
  assert.ok(styleId);
  const projected = validateAndProjectLevelOne(
    context(catalog, '5e'),
    JSON.parse(JSON.stringify(draft)),
    { class: { key: fighter.key, source: fighter.source }, fightingStyleIds: [styleId] },
  );
  assert.equal(projected.ok, true);
  assert.deepEqual(draft, character('5e'));
  if (!projected.ok) return;
  assert.equal(projected.value.character.classes[0]?.id, createRuleClassInstanceId(fighter));
  assert.equal(projected.value.character.classes[0]?.level, 1);
  assert.equal(projected.value.character.combat.hp.max, 12);
  assert.ok(projected.value.effects.some(({ type }) => type === 'class.upsert'));
});

test('adds a multiclass only after both class prerequisites and projects proficiencies and HP', async () => {
  const catalog = await loadCatalog();
  const fighter = findClass(catalog, 'Fighter', 'PHB');
  const bard = findClass(catalog, 'Bard', 'PHB');
  const input = character('5e', fighter, 1);
  input.abilities.CHA = 12;
  const skillGroups = parseRuleClassSkillChoiceGroups(bard.multiclassProficiencies, 'multiclass-Bard-PHB');
  const toolGroups = parseRuleToolChoiceGroups(bard.multiclassProficiencies?.toolProficiencies, 'multiclass-Bard-PHB');
  const spellState = createRuleSpellcastingAdvancementState(context(catalog, '5e'), bard, 0, 1);
  assert.ok(skillGroups.ok && toolGroups.ok && spellState.ok && spellState.value);
  if (!skillGroups.ok || !toolGroups.ok || !spellState.ok || !spellState.value) return;
  const skill = skillGroups.value[0]!;
  const tool = toolGroups.value[0]!;
  const toolId = tool.options[0]!.id;
  const spellSelections = Object.fromEntries(spellState.value.groups.map((group) => [
    group.id,
    group.options.slice(0, group.min).map(({ id }) => id),
  ]));
  const target = { class: { key: bard.key, source: bard.source }, targetClassLevel: 1 };
  const selections = {
    multiclassSkillChoices: ['Performance'],
    multiclassToolChoices: { [tool.id]: [toolId] },
    spellcasting: { selections: spellSelections },
  };
  const rejected = validateAndProjectLevelUp(context(catalog, '5e'), input, target, selections);
  assert.equal(rejected.ok, false);
  assert.ok(!rejected.ok && rejected.issues.some(({ code }) => code === 'prerequisite_not_met'));

  input.abilities.CHA = 13;
  const projected = validateAndProjectLevelUp(context(catalog, '5e'), input, target, selections);
  assert.equal(projected.ok, true, projected.ok ? '' : JSON.stringify(projected.issues));
  if (!projected.ok) return;
  assert.equal(projected.value.character.classes.length, 2);
  assert.equal(projected.value.character.classes[1]?.level, 1);
  assert.equal(projected.value.character.combat.hp.max, input.combat.hp.max + 7);
  assert.ok(projected.value.character.proficiencies.includes('Performance'));
  assert.ok(projected.value.character.proficiencies.includes(`tool:${toolId}`));
  assert.ok(projected.value.character.resources.some(({ id, max }) => id.endsWith('bardic-inspiration') && max === 1));
  assert.ok(projected.value.character.spellcastingProfiles.some(({ classId, spells }) => (
    classId === undefined && spells.length === 6
  )));
});

test('uses the 5r prerequisite table for a valid and invalid multiclass addition', async () => {
  const catalog = await loadCatalog();
  const fighter = findClass(catalog, 'Fighter', 'XPHB');
  const bard = findClass(catalog, 'Bard', 'XPHB');
  const input = character('5r', fighter, 1);
  input.abilities.STR = 12;
  input.abilities.DEX = 12;
  input.abilities.CHA = 13;
  const skillGroups = parseRuleClassSkillChoiceGroups(bard.multiclassProficiencies, 'multiclass-Bard-XPHB');
  const toolGroups = parseRuleToolChoiceGroups(bard.multiclassProficiencies?.toolProficiencies, 'multiclass-Bard-XPHB');
  const spellState = createRuleSpellcastingAdvancementState(context(catalog, '5r'), bard, 0, 1);
  assert.ok(skillGroups.ok && toolGroups.ok && spellState.ok && spellState.value);
  if (!skillGroups.ok || !toolGroups.ok || !spellState.ok || !spellState.value) return;
  const selections = Object.fromEntries(spellState.value.groups.map((group) => [
    group.id,
    group.options.slice(0, group.min).map(({ id }) => id),
  ]));
  const choice = {
    multiclassSkillChoices: ['Performance'],
    multiclassToolChoices: toolGroups.value[0] === undefined ? {} : {
      [toolGroups.value[0].id]: [toolGroups.value[0].options[0]!.id],
    },
    spellcasting: { selections },
  };
  const target = { class: { key: bard.key, source: bard.source }, targetClassLevel: 1 };
  const rejected = validateAndProjectLevelUp(context(catalog, '5r'), input, target, choice);
  assert.equal(rejected.ok, false);
  assert.ok(!rejected.ok && rejected.issues.some(({ code, path }) => (
    code === 'prerequisite_not_met' && path.at(-1) === fighter.key
  )));

  input.abilities.STR = 13;
  const projected = validateAndProjectLevelUp(context(catalog, '5r'), input, target, choice);
  assert.equal(projected.ok, true, projected.ok ? '' : JSON.stringify(projected.issues));
  if (!projected.ok) return;
  assert.equal(projected.value.character.classes.length, 2);
  assert.equal(projected.value.character.classes[1]?.source, 'XPHB');
  assert.equal(projected.value.character.classes[1]?.level, 1);
  assert.ok(projected.value.character.proficiencies.includes('Performance'));
  assert.ok(projected.value.character.resources.some(({ id }) => id.endsWith('bardic-inspiration')));
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
  const maneuverState = createRuleManeuverAdvancementState(
    context(catalog, '5e'), subclass, 3, 4, [],
  );
  assert.equal(maneuverState.ok, true);
  const maneuverIds = maneuverState.ok && maneuverState.value.group !== undefined
    ? maneuverState.value.group.options.slice(0, maneuverState.value.group.min).map(({ id }) => id)
    : [];
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
    { abilityIncreases: { STR: 2 }, maneuverIds },
  );
  assert.equal(projected.ok, true);
  assert.deepEqual(input, snapshot);
  if (!projected.ok) return;
  assert.equal(projected.value.character.classes[0]?.level, 4);
  assert.equal(projected.value.character.abilities.STR, 17);
  assert.equal(projected.value.character.combat.hp.max, 30);
  assert.equal(projected.value.choices[0]?.value, 4);
});

test('projects specialized ASI feat selections into authorized feature refs and resources', async () => {
  const catalog = await loadCatalog();
  const rogue = findClass(catalog, 'Rogue', 'PHB');
  const input = character('5e', rogue, 3);
  const rogueSubclass = catalog.subclasses.find(({ className, classSource }) => (
    (className === rogue.name || className === rogue.key) && classSource === rogue.source
  ));
  assert.ok(rogueSubclass);
  if (!rogueSubclass) return;
  input.classes[0]!.subclass = {
    id: rogueSubclass.id ?? `${rogueSubclass.key}|${rogueSubclass.source}`,
    key: rogueSubclass.key,
    source: rogueSubclass.source,
  };
  const feats = [
    ['Fighting Initiate', 'TCE', 'fightingStyle'],
    ['Eldritch Adept', 'TCE', 'invocation'],
    ['Martial Adept', 'PHB', 'maneuver'],
    ['Metamagic Adept', 'TCE', 'metamagic'],
  ] as const;
  for (const [key, source, kind] of feats) {
    const feat = catalog.feats.find((entry) => entry.key === key && entry.source === source);
    assert.ok(feat);
    if (key === 'Fighting Initiate') {
      input.features.push({ id: 'Fighter|PHB', key: 'Fighting Style', source: 'PHB' });
    }
    const state = createRuleSpecializedFeatChoiceState(
      catalog,
      '5e',
      feat,
      key === 'Eldritch Adept' ? { warlockLevel: 0 } : {},
    );
    assert.ok(state.ok && state.value.groups[0]);
    if (!state.ok || !state.value.groups[0]) return;
    const group = state.value.groups[0];
    const selected = group.options.slice(0, group.min).map(({ id }) => id);
    const selections = { [group.id]: selected };
    const projected = validateAndProjectLevelUp(
      context(catalog, '5e'),
      input,
      { classId: input.classes[0]!.id, targetClassLevel: 4 },
      {
        feat: { id: `${key}|${source}`, key, source },
        featChoices: selections,
        abilityIncreases: {},
      },
    );
    assert.equal(projected.ok, true, projected.ok ? '' : JSON.stringify(projected.issues));
    if (!projected.ok) return;
    assert.equal(projected.value.character.features.filter(({ id }) => selected.includes(id)).length, selected.length, kind);
    if (key === 'Metamagic Adept') {
      assert.ok(projected.value.character.resources.some(({ id, max }) => id.endsWith('sorcery-points') && max === 2));
    }
  }
});

test('projects class resources and preserves expended uses across level-ups', async () => {
  const catalog = await loadCatalog();
  const druid = findClass(catalog, 'Druid', 'PHB');
  const druidInput = character('5e', druid, 2);
  const druidSubclass = catalog.subclasses.find((entry) => (
    entry.classSource === druid.source
    && (entry.className === druid.name || entry.className === druid.key)
  ));
  assert.ok(druidSubclass);
  druidInput.classes[0]!.subclass = {
    id: druidSubclass.id, key: druidSubclass.key, source: druidSubclass.source,
  };
  const wildShapeId = 'auto-resource-Druid-PHB-wild-shape';
  druidInput.resources.push({
    id: wildShapeId, sourceId: wildShapeId, current: 0, max: 2, reset: 'shortRest',
  });
  const druidResult = validateAndProjectLevelUp(
    context(catalog, '5e'), druidInput, { classId: druidInput.classes[0]!.id }, {},
  );
  assert.equal(druidResult.ok, true);
  if (druidResult.ok) {
    assert.deepEqual(
      druidResult.value.character.resources.find(({ id }) => id === wildShapeId),
      { id: wildShapeId, sourceId: wildShapeId, sourceName: '德鲁伊 PHB', name: '荒野形态',
        current: 0, max: 2, reset: 'shortRest', ruleSystem: '5e' },
    );
  }

  const fighter = findClass(catalog, 'Fighter', 'PHB');
  const fighterInput = character('5e', fighter, 1);
  const surgeId = 'auto-resource-Fighter-PHB-action-surge';
  fighterInput.resources.push({
    id: surgeId, sourceId: surgeId, current: 0, max: 1, reset: 'shortRest',
  });
  const fighterResult = validateAndProjectLevelUp(
    context(catalog, '5e'), fighterInput, { classId: fighterInput.classes[0]!.id }, {},
  );
  assert.equal(fighterResult.ok, true);
  if (fighterResult.ok) {
    assert.equal(fighterResult.value.character.resources.find(({ id }) => id === surgeId)?.current, 0);
    assert.equal(fighterResult.value.character.resources.find(({ id }) => id === surgeId)?.max, 1);
  }

  const barbarian = findClass(catalog, 'Barbarian', 'PHB');
  const barbarianInput = character('5e', barbarian, 2);
  const rageId = 'auto-resource-Barbarian-PHB-rage';
  barbarianInput.resources.push({
    id: rageId, sourceId: rageId, current: 1, max: 2, reset: 'longRest',
  });
  const barbarianSubclass = catalog.subclasses.find((entry) => (
    entry.classSource === barbarian.source
    && (entry.className === barbarian.name || entry.className === barbarian.key)
  ));
  assert.ok(barbarianSubclass);
  const barbarianResult = validateAndProjectLevelUp(
    context(catalog, '5e'), barbarianInput, { classId: barbarianInput.classes[0]!.id },
    { subclassId: barbarianSubclass.id },
  );
  assert.equal(barbarianResult.ok, true);
  if (barbarianResult.ok) {
    assert.equal(barbarianResult.value.character.resources.find(({ id }) => id === rageId)?.current, 1);
    assert.equal(barbarianResult.value.character.resources.find(({ id }) => id === rageId)?.max, 3);
  }

  const druid2024 = findClass(catalog, 'Druid', 'XPHB');
  const levelEight = character('5r', druid2024, 8);
  const resourceAtEight = createRuleClassResourceEffects(druid2024, levelEight, 8, 8)
    .find(({ id }) => id.endsWith('-wild-shape'));
  const resourceAtNine = createRuleClassResourceEffects(druid2024, levelEight, 9, 9)
    .find(({ id }) => id.endsWith('-wild-shape'));
  assert.equal(resourceAtEight?.max, 3);
  assert.equal(resourceAtNine?.max, 4);
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
  const maneuverState = createRuleManeuverAdvancementState(
    context(catalog, '5e'), subclass, 2, 3, [],
  );
  assert.equal(maneuverState.ok, true);
  const maneuverIds = maneuverState.ok && maneuverState.value.group !== undefined
    ? maneuverState.value.group.options.slice(0, maneuverState.value.group.min).map(({ id }) => id)
    : [];
  const projected = validateAndProjectLevelUp(
    context(catalog, '5e'),
    input,
    { classId: input.classes[0]!.id },
    { subclassId: subclass.id, maneuverIds },
  );
  assert.equal(projected.ok, true);
  assert.equal(projected.ok && projected.value.character.classes[0]?.subclass?.id, subclass.id);
});

test('validates and projects new warlock invocation choices', async () => {
  const catalog = await loadCatalog();
  const warlock = findClass(catalog, 'Warlock', 'PHB');
  const input = character('5e', warlock, 4);
  const subclass = catalog.subclasses.find((entry) => (
    entry.classSource === warlock.source
    && (entry.className === warlock.name || entry.className === warlock.key)
  ));
  assert.ok(subclass);
  input.classes[0]!.subclass = { id: subclass.id, key: subclass.key, source: subclass.source };
  const state = createRuleInvocationAdvancementState(context(catalog, '5e'), warlock, 4, 5, []);
  assert.equal(state.ok, true);
  if (!state.ok || state.value.group === undefined) return;
  const selected = state.value.group.options.slice(0, state.value.group.min).map(({ id }) => id);
  const missing = validateAndProjectLevelUp(
    context(catalog, '5e'), input, { classId: input.classes[0]!.id }, {},
  );
  assert.equal(missing.ok, false);
  const projected = validateAndProjectLevelUp(
    context(catalog, '5e'), input, { classId: input.classes[0]!.id }, { invocationIds: selected },
  );
  assert.equal(projected.ok, true);
  if (projected.ok) {
    assert.equal(projected.value.character.features.length, selected.length);
    assert.ok(selected.every((id) => projected.value.character.features.some(({ id: featureId }) => featureId === id)));
  }
});

test('validates and projects metamagic and weapon mastery growth', async () => {
  const catalog = await loadCatalog();
  const sorcerer = findClass(catalog, 'Sorcerer', 'PHB');
  const sorcererInput = character('5e', sorcerer, 2);
  const sorcererSubclass = catalog.subclasses.find((entry) => (
    entry.classSource === sorcerer.source
    && (entry.className === sorcerer.name || entry.className === sorcerer.key)
  ));
  assert.ok(sorcererSubclass);
  sorcererInput.classes[0]!.subclass = {
    id: sorcererSubclass.id, key: sorcererSubclass.key, source: sorcererSubclass.source,
  };
  const metamagicState = createRuleMetamagicAdvancementState(
    context(catalog, '5e'), sorcerer, 2, 3, [],
  );
  assert.equal(metamagicState.ok, true);
  if (!metamagicState.ok || metamagicState.value.group === undefined) return;
  const metamagicIds = metamagicState.value.group.options
    .slice(0, metamagicState.value.group.min).map(({ id }) => id);
  const sorcererProjection = validateAndProjectLevelUp(
    context(catalog, '5e'), sorcererInput, { classId: sorcererInput.classes[0]!.id },
    { metamagicIds },
  );
  assert.equal(sorcererProjection.ok, true);
  if (sorcererProjection.ok) {
    assert.ok(metamagicIds.every((id) => sorcererProjection.value.character.features.some(({ id: featureId }) => featureId === id)));
  }

  const fighter = findClass(catalog, 'Fighter', 'XPHB');
  const fighterInput = character('5r', fighter, 3);
  const fighterSubclassState = createRuleSubclassAdvancementState(
    context(catalog, '5r'), fighter, 2, 3,
  );
  assert.equal(fighterSubclassState.ok, true);
  if (!fighterSubclassState.ok) return;
  const fighterSubclass = fighterSubclassState.value.options[0];
  assert.ok(fighterSubclass);
  fighterInput.classes[0]!.subclass = {
    id: fighterSubclass.id, key: fighterSubclass.key, source: fighterSubclass.source,
  };
  const masteryState = createRuleWeaponMasteryAdvancementState(
    context(catalog, '5r'), fighter, 3, 4, [],
  );
  assert.equal(masteryState.ok, true);
  if (!masteryState.ok || masteryState.value.group === undefined) return;
  const weaponMasteryIds = masteryState.value.group.options
    .slice(0, masteryState.value.group.min).map(({ id }) => id);
  const fighterProjection = validateAndProjectLevelUp(
    context(catalog, '5r'), fighterInput, { classId: fighterInput.classes[0]!.id },
    { abilityIncreases: { STR: 2 }, weaponMasteryIds },
  );
  assert.equal(fighterProjection.ok, true);
  if (fighterProjection.ok) {
    assert.ok(weaponMasteryIds.every((id) => fighterProjection.value.character.features.some(({ id: featureId }) => featureId === id)));
  }
});

test('validates and projects subclass maneuver growth', async () => {
  const catalog = await loadCatalog();
  const fighter = findClass(catalog, 'Fighter', 'PHB');
  const fighterInput = character('5e', fighter, 6);
  const subclass = catalog.subclasses.find((entry) => (
    entry.classSource === fighter.source
    && (entry.className === fighter.name || entry.className === fighter.key)
    && (entry.maneuverProgression?.[6] ?? 0) > 0
  ));
  assert.ok(subclass);
  fighterInput.classes[0]!.subclass = { id: subclass.id, key: subclass.key, source: subclass.source };
  const state = createRuleManeuverAdvancementState(context(catalog, '5e'), subclass, 6, 7, []);
  assert.equal(state.ok, true);
  if (!state.ok || state.value.group === undefined) return;
  const maneuverIds = state.value.group.options.slice(0, state.value.group.min).map(({ id }) => id);
  const missing = validateAndProjectLevelUp(
    context(catalog, '5e'), fighterInput, { classId: fighterInput.classes[0]!.id }, {},
  );
  assert.equal(missing.ok, false);
  const projected = validateAndProjectLevelUp(
    context(catalog, '5e'), fighterInput, { classId: fighterInput.classes[0]!.id }, { maneuverIds },
  );
  assert.equal(projected.ok, true);
  if (projected.ok) {
    assert.ok(maneuverIds.every((id) => projected.value.character.features.some(({ id: featureId }) => featureId === id)));
  }
});

test('validates and projects a class fighting style', async () => {
  const catalog = await loadCatalog();
  const paladin = findClass(catalog, 'Paladin', 'PHB');
  const input = character('5e', paladin, 1);
  const state = createRuleFightingStyleAdvancementState(
    context(catalog, '5e'), paladin, 1, 2, [],
  );
  assert.equal(state.ok, true);
  if (!state.ok || state.value.group === undefined) return;
  const style = state.value.group.options[0];
  assert.ok(style);
  const missing = validateAndProjectLevelUp(
    context(catalog, '5e'), input, { classId: input.classes[0]!.id }, {},
  );
  assert.equal(missing.ok, false);
  const projected = validateAndProjectLevelUp(
    context(catalog, '5e'), input, { classId: input.classes[0]!.id },
    { fightingStyleIds: [style.id] },
  );
  assert.equal(projected.ok, true);
  if (projected.ok) {
    assert.ok(projected.value.character.features.some(({ id }) => id === style.id));
  }
});

test('requires a 5r Epic Boon at level 19 and projects its ability and resources', async () => {
  const catalog = await loadCatalog();
  const wizard = findClass(catalog, 'Wizard', 'XPHB');
  const input = character('5r', wizard, 18);
  input.abilities.DEX = 20;
  const subclass = catalog.subclasses.find((entry) => (
    entry.classSource === wizard.source
    && (entry.className === wizard.name || entry.className === wizard.key)
  ));
  assert.ok(subclass);
  input.classes[0]!.subclass = { id: subclass.id, key: subclass.key, source: subclass.source };
  const missing = validateAndProjectLevelUp(
    context(catalog, '5r'), input, { classId: input.classes[0]!.id }, { abilityIncreases: { STR: 1 } },
  );
  assert.equal(missing.ok, false);
  const boon = catalog.feats.find((feat) => feat.key === 'Boon of Recovery' && feat.category === 'EB');
  assert.ok(boon);
  const projected = validateAndProjectLevelUp(
    context(catalog, '5r'), input, { classId: input.classes[0]!.id }, {
      abilityIncreases: { DEX: 1 },
      feat: { id: boon.id ?? `${boon.key}|${boon.source}`, key: boon.key, source: boon.source },
    },
  );
  assert.equal(projected.ok, true);
  if (projected.ok) {
    assert.equal(projected.value.character.abilities.DEX, 21);
    assert.ok(projected.value.character.feats.some(({ key }) => key === boon.key));
    assert.equal(projected.value.character.resources.find(({ id }) => id.endsWith('last-stand'))?.max, 1);
    assert.equal(projected.value.character.resources.find(({ id }) => id.endsWith('recovery-dice'))?.max, 10);
  }
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
