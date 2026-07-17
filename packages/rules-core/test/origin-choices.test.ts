import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  createRuleOriginChoiceGroups,
  parseRuleCatalog,
  validateRuleChoiceSelections,
  type RuleCatalog,
  type RuleOrigin,
  type RuleOriginChoiceGroups,
} from '../src/index.ts';

test('builds origin choice groups for race choices', async () => {
  const catalog = await loadCatalog();
  const human = required(catalog.races.find(({ key, source }) => (
    key === 'Human' && source === 'XPHB'
  )));
  const humanChoices = value(createRuleOriginChoiceGroups(
    catalog,
    '5r',
    [human],
  ));
  assert.equal(humanChoices.size[0]?.kind, 'size');
  assert.deepEqual(humanChoices.size[0]?.from, ['S', 'M']);
  assert.equal(humanChoices.skill[0]?.count, 1);
  assert.equal(humanChoices.skill[0]?.from.length, 18);

  const dragonborn = required(catalog.races.find(({ key, source }) => (
    key === 'Dragonborn' && source === 'XPHB'
  )));
  const dragonbornChoices = value(createRuleOriginChoiceGroups(
    catalog,
    '5r',
    [dragonborn],
  ));
  assert.equal(dragonbornChoices.resistance[0]?.count, 1);
  assert.ok(dragonbornChoices.resistance[0]?.from.includes('火焰'));

  const goliath = required(catalog.races.find(({ key, source }) => (
    key === 'Goliath' && source === 'XPHB'
  )));
  const goliathChoices = value(createRuleOriginChoiceGroups(
    catalog,
    '5r',
    [goliath],
  ));
  assert.equal(goliathChoices.feature[0]?.id, 'giant-ancestry');
  assert.equal(goliathChoices.feature[0]?.options.length, 6);
});

test('combines origin groups and validates a complete submission', async () => {
  const catalog = await loadCatalog();
  const human = required(catalog.races.find(({ key, source }) => (
    key === 'Human' && source === 'XPHB'
  )));
  const groups = value(createRuleOriginChoiceGroups(catalog, '5r', [human]));
  const selections = Object.fromEntries(groups.all.map((group) => (
    [group.id, group.from.slice(0, group.count)]
  )));
  assert.equal(validateRuleChoiceSelections(groups.all, selections).ok, true);

  const missingSkill = { ...selections };
  delete missingSkill[groups.skill[0].id];
  assert.equal(validateRuleChoiceSelections(groups.all, missingSkill).ok, false);
});

test('recognizes weighted background abilities handled by the compatibility adapter', async () => {
  const catalog = await loadCatalog();
  const background = required(catalog.backgrounds.find(({ ability }) => (
    ability?.some((entry) => (
      'choose' in entry
      && typeof entry.choose === 'object'
      && entry.choose !== null
      && 'weighted' in entry.choose
    ))
  )));
  const groups = value(createRuleOriginChoiceGroups(catalog, '5e', [background]));
  assert.deepEqual(groups.ability, []);
  assert.ok(groups.all.length >= groups.tool.length + groups.language.length);
});

test('fails closed when an origin choice has an unsupported shape', async () => {
  const catalog = await loadCatalog();
  const human = required(catalog.races.find(({ key, source }) => (
    key === 'Human' && source === 'XPHB'
  )));
  const invalid: RuleOrigin = {
    ...human,
    skillProficiencies: [
      { choose: { from: 'Arcana', count: 1 } },
    ] as unknown as RuleOrigin['skillProficiencies'],
  };
  assert.equal(createRuleOriginChoiceGroups(catalog, '5r', [invalid]).ok, false);

  const invalidWeighted: RuleOrigin = {
    ...human,
    ability: [{
      choose: {
        weighted: { from: ['str', 'dex'], weights: [2] },
      },
    }],
  };
  assert.equal(createRuleOriginChoiceGroups(catalog, '5r', [invalidWeighted]).ok, false);
});

async function loadCatalog(): Promise<RuleCatalog> {
  const content = await readFile(
    new URL('../../../public/data/auto-builder-core.json', import.meta.url),
    'utf8',
  );
  const parsed = parseRuleCatalog(JSON.parse(content));
  assert.equal(
    parsed.ok,
    true,
    'issues' in parsed ? JSON.stringify(parsed.issues.slice(0, 3)) : undefined,
  );
  if (!parsed.ok) throw new Error('catalog fixture is invalid');
  return parsed.value;
}

function value(
  result: ReturnType<typeof createRuleOriginChoiceGroups>,
): RuleOriginChoiceGroups {
  assert.equal(
    result.ok,
    true,
    'issues' in result ? JSON.stringify(result.issues) : undefined,
  );
  return result.ok ? result.value : emptyGroups();
}

function emptyGroups(): RuleOriginChoiceGroups {
  return {
    ability: [],
    skill: [],
    tool: [],
    language: [],
    weapon: [],
    resistance: [],
    size: [],
    feature: [],
    all: [],
  };
}

function required<T>(entry: T | undefined): T {
  assert.notEqual(entry, undefined);
  return entry as T;
}
