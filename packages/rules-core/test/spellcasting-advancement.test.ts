import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { cloneJsonValue } from '../src/model/json.ts';
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
  type RuleSpell,
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
    ...distinctSpells(initial.value.cantrips).slice(0, initial.value.limits.cantrips),
    ...distinctSpells(initial.value.leveled).slice(0, initial.value.limits.leveled),
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

test('counts one fixed-level spell across reprints and excludes every known variant', async () => {
  const catalog = await loadCatalog();
  const warlock = findClass(catalog, 'Warlock', 'PHB');
  const ruleContext = context(catalog, '5e');
  const initial = createRuleSpellcastingAdvancementState(ruleContext, warlock, 10, 11);
  assert.ok(initial.ok && initial.value);
  if (!initial.ok || !initial.value) return;
  const fixed = initial.value.fixedLeveledGroups[0]!;
  const spell = fixed.options[0]!;
  const reprint = { ...spell, id: `${spell.id}-reprint`, source: 'REPRINT' };
  catalog.spells.push(reprint);
  const result = createRuleSpellcastingAdvancementState(
    ruleContext, warlock, 10, 11, [spell.id, reprint.id],
  );
  assert.ok(result.ok && result.value);
  if (!result.ok || !result.value) return;
  const projected = result.value.fixedLeveledGroups.find(group => group.spellLevel === fixed.spellLevel)!;
  assert.equal(projected.selected, 1);
  assert.ok(projected.options.every(candidate => candidate.englishName !== spell.englishName));
});

test('excludes known off-class spells and their reprints from Magical Secrets', async () => {
  const catalog = await loadCatalog();
  const bard = findClass(catalog, 'Bard', 'PHB');
  const spell = catalog.spells.find(candidate => candidate.level === 1
    && candidate.classKeys.includes('Wizard') && !candidate.classKeys.includes('Bard'))!;
  assert.ok(spell);
  const reprint = { ...spell, id: `${spell.id}-reprint`, source: 'REPRINT' };
  catalog.spells.push(reprint);
  const result = createRuleSpellcastingAdvancementState(
    context(catalog, '5e'), bard, 9, 10, [spell.id],
  );
  assert.ok(result.ok && result.value);
  if (!result.ok || !result.value) return;
  const group = result.value.magicalSecretGroups[0]!;
  assert.equal(group.min, 2);
  assert.ok(group.options.length > 0);
  assert.ok(group.options.every(candidate => candidate.englishName !== spell.englishName));
});

test('uses authorization and source priority for class spell pools', async () => {
  const catalog = await loadCatalog();
  const ruleClass = findClass(catalog, 'Wizard', 'XPHB');
  const options = getRuleClassSpellOptions(context(catalog, '5r'), ruleClass, 1);
  assert.ok(options.length > 0);
  const byIdentity = new Map<string, string>();
  for (const spell of options) {
    const identity = spell.id;
    assert.equal(byIdentity.has(identity), false, identity);
    byIdentity.set(identity, spell.source);
  }
  assert.ok(options.some(spell => spell.source === 'XPHB'));
  assert.ok(options.some(spell => spell.source === 'PHB'));
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
  if (effects.ok) assert.equal(cloneJsonValue(effects.value).ok, true);
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

test('counts known Wizard spellbook entries by spell identity and excludes them from new choices', async () => {
  const catalog = await loadCatalog();
  const ruleContext = context(catalog, '5r');
  const wizard = findClass(catalog, 'Wizard', 'XPHB');
  const levelOne = createRuleSpellcastingAdvancementState(ruleContext, wizard, 0, 1);
  assert.equal(levelOne.ok, true);
  if (!levelOne.ok || !levelOne.value) return;
  const options = levelOne.value.groups.find(({ id }) => id.endsWith('-leveled'))?.options ?? [];
  const equivalents = distinctSpells(options.filter(spell => spell.source === 'XPHB')).flatMap((spell) => {
    const legacy = catalog.spells.find((candidate) => candidate.source === 'PHB'
      && candidate.englishName === spell.englishName);
    return legacy ? [{ spell, legacy }] : [];
  }).slice(0, 3);
  assert.equal(equivalents.length, 3);
  const otherLearned = distinctSpells(options).filter(candidate => (
    !equivalents.some(({ spell }) => spell.englishName === candidate.englishName)
  )).slice(0, 3);
  const learned = [...equivalents.map(({ spell }) => spell), ...otherLearned];
  assert.equal(learned.length, 6);

  const levelTwo = createRuleSpellcastingAdvancementState(
    ruleContext,
    wizard,
    1,
    2,
    learned.map(({ id }) => id),
  );
  assert.equal(levelTwo.ok, true);
  if (!levelTwo.ok || !levelTwo.value) return;
  assert.equal(levelTwo.value.needed.leveled, 2);
  assert.equal(levelTwo.value.groups.find(({ id }) => id.endsWith('-leveled'))?.options.length,
    levelTwo.value.groups.find(({ id }) => id.endsWith('-leveled'))?.options.filter(({ id }) => !learned.some((spell) => spell.id === id)).length);

  const mixedProfileIds = [
    ...equivalents.map(({ legacy }) => legacy.id!),
    ...otherLearned.map(({ id }) => id),
  ];
  assert.ok(equivalents.every(({ spell, legacy }) => spell.id !== legacy.id));
  const crossSource = createRuleSpellcastingAdvancementState(
    ruleContext,
    wizard,
    1,
    2,
    mixedProfileIds,
  );
  assert.equal(crossSource.ok, true);
  assert.equal(crossSource.ok && crossSource.value?.needed.leveled, 2);
  assert.equal(crossSource.ok && distinctSpells(catalog.spells.filter(spell => (
    crossSource.value?.knownSpellIds.includes(spell.id)
  ))).length, 6);
  const duplicateSource = createRuleSpellcastingAdvancementState(
    ruleContext, wizard, 1, 2, [...mixedProfileIds, equivalents[0]!.spell.id],
  );
  assert.equal(duplicateSource.ok && duplicateSource.value?.needed.leveled, 2);
  assert.equal(crossSource.ok && crossSource.value?.groups.find(({ id }) => id.endsWith('-leveled'))
    ?.options.some(({ id }) => crossSource.value!.knownSpellIds.includes(id)), false);
  assert.ok(crossSource.ok && crossSource.value);
  if (crossSource.ok && crossSource.value) {
    const leveledGroup = crossSource.value.groups.find(({ id }) => id.endsWith('-leveled'))!;
    const alreadyKnown = crossSource.value.knownSpellIds.find((id) => (
      catalog.spells.find((spell) => spell.id === id)?.level
    ))!;
    const forged = createRuleSpellcastingAdvancementEffects(ruleContext, crossSource.value, {
      selections: {
        [leveledGroup.id]: [alreadyKnown, leveledGroup.options[0]!.id],
      },
    });
    assert.equal(forged.ok, false);
  }
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
  groups: readonly { id: string; max: number; options: readonly RuleSpell[] }[],
): Record<string, string[]> {
  return Object.fromEntries(groups.map((group) => [
    group.id,
    distinctSpells(group.options).slice(0, group.max).map(({ id }) => id),
  ]));
}

function distinctSpells(spells: readonly RuleSpell[]): RuleSpell[] {
  return [...new Map(spells.map(spell => [spell.englishName || spell.key || spell.name, spell])).values()];
}
