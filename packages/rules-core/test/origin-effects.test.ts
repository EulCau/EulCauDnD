import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  applyRuleEffects,
  createRuleOriginBaseEffects,
  createRuleOriginChoiceGroups,
  parseRuleCatalog,
  type CanonicalRuleCharacterSnapshot,
  type RuleAbilityName,
  type RuleCatalog,
  type RuleEffect,
} from '../src/index.ts';

test('projects fixed and selected origin rules into structured effects', async () => {
  const catalog = await loadCatalog();
  const customLineage = required(catalog.races.find(({ key, source }) => (
    key === 'Custom Lineage' && source === 'TCE'
  )));
  const groups = choiceValue(createRuleOriginChoiceGroups(
    catalog,
    '5e',
    [customLineage],
  ));
  const choices = Object.fromEntries(groups.all.map((group) => (
    [group.id, group.from.slice(0, group.count)]
  )));
  const projected = createRuleOriginBaseEffects(
    catalog,
    '5e',
    customLineage,
    { choices },
  );
  assert.equal(projected.ok, true);
  const effects = projected.ok ? projected.value : [];
  const chosenAbility = groups.ability[0].from[0] as RuleAbilityName;
  assert.ok(effects.some((effect) => (
    effect.type === 'ability.add'
    && effect.ability === chosenAbility
    && effect.value === 2
  )));
  assert.ok(effects.some((effect) => (
    effect.type === 'combat.value.set'
    && effect.field === 'size'
    && effect.value === choices[groups.size[0].id][0]
  )));
  assert.equal(createRuleOriginBaseEffects(
    catalog,
    '5e',
    customLineage,
  ).ok, false);
  assert.equal(createRuleOriginBaseEffects(
    catalog,
    '5e',
    customLineage,
    { allowIncompleteChoices: true },
  ).ok, true);
});

test('validates and projects weighted background abilities', async () => {
  const catalog = await loadCatalog();
  const background = required(catalog.backgrounds.find(({ ability }) => (
    ability?.some((entry) => (
      'choose' in entry
      && typeof entry.choose === 'object'
      && entry.choose !== null
      && 'weighted' in entry.choose
    ))
  )));
  const weighted = required(background.ability?.flatMap((entry) => {
    if (
      !('choose' in entry)
      || typeof entry.choose !== 'object'
      || entry.choose === null
      || !('weighted' in entry.choose)
    ) return [];
    return [entry.choose.weighted as { from: string[]; weights: number[] }];
  })[0]);
  const choices = choiceValue(createRuleOriginChoiceGroups(
    catalog,
    background.ruleSystem,
    [background],
  ));
  const groupSelections = Object.fromEntries(choices.all.map((group) => (
    [group.id, group.from.slice(0, group.count)]
  )));
  const weightedAbilities = Object.fromEntries(weighted.weights.map((value, index) => (
    [weighted.from[index].toUpperCase(), value]
  ))) as Partial<Record<RuleAbilityName, number>>;
  const result = createRuleOriginBaseEffects(
    catalog,
    background.ruleSystem,
    background,
    { choices: groupSelections, weightedAbilities },
  );
  assert.equal(result.ok, true);
  assert.equal(
    result.ok
      ? result.value.filter(({ type }) => type === 'ability.add')
        .reduce((total, effect) => total + (effect.type === 'ability.add' ? effect.value : 0), 0)
      : 0,
    3,
  );
  assert.equal(createRuleOriginBaseEffects(
    catalog,
    background.ruleSystem,
    background,
    { choices: groupSelections },
  ).ok, false);
});

test('applies origin effects to a cloned canonical snapshot', () => {
  const character = emptyCharacter();
  const effects: RuleEffect[] = [
    { type: 'ability.add', ability: 'CON', value: 2, sourceId: 'origin' },
    { type: 'proficiency.add', proficiency: 'Perception', sourceId: 'origin' },
    { type: 'combat.value.set', field: 'speed', value: 35, sourceId: 'origin' },
    { type: 'combat.value.set', field: 'size', value: 'M', sourceId: 'origin' },
    {
      type: 'combat.text.add',
      field: 'damageResistances',
      value: '火焰',
      sourceId: 'origin',
    },
  ];
  const applied = applyRuleEffects(character, effects);
  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  assert.equal(applied.value.abilities.CON, 12);
  assert.deepEqual(applied.value.proficiencies, ['Perception']);
  assert.equal(applied.value.combat.speed, 35);
  assert.equal(applied.value.combat.size, 'M');
  assert.deepEqual(applied.value.combat.damageResistances, ['火焰']);
  assert.equal(character.abilities.CON, 10);
  assert.deepEqual(character.proficiencies, []);
});

async function loadCatalog(): Promise<RuleCatalog> {
  const content = await readFile(
    new URL('../../../public/data/auto-builder-core.json', import.meta.url),
    'utf8',
  );
  const parsed = parseRuleCatalog(JSON.parse(content));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error('catalog fixture is invalid');
  return parsed.value;
}

function choiceValue(
  result: ReturnType<typeof createRuleOriginChoiceGroups>,
) {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('origin choices are invalid');
  return result.value;
}

function emptyCharacter(): CanonicalRuleCharacterSnapshot {
  return {
    schemaVersion: 1,
    ruleSystem: '5e',
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

function required<T>(value: T | undefined): T {
  assert.notEqual(value, undefined);
  return value as T;
}
