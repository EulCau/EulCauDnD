import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  createRuleAdditionalSpellChoiceState,
  createRuleOriginSpellEffects,
  parseRuleCatalog,
  type RuleCatalog,
  type RuleOrigin,
} from '../src/index.ts';

test('parses every catalog origin additionalSpells shape at milestone levels', async () => {
  const catalog = await loadCatalog();
  const origins = [
    ...catalog.races,
    ...catalog.subraces,
    ...catalog.backgrounds,
  ];
  let parsedOwners = 0;
  for (const origin of origins) {
    for (const level of [1, 3, 5, 20]) {
      const result = createRuleAdditionalSpellChoiceState(
        catalog,
        origin.ruleSystem,
        owner(origin),
        level,
      );
      assert.equal(
        result.ok,
        true,
        `${origin.key}|${origin.source} level ${level}: ${
          'issues' in result ? JSON.stringify(result.issues.slice(0, 2)) : ''
        }`,
      );
      if (level === 20 && result.ok && result.value) parsedOwners += 1;
    }
  }
  assert.equal(parsedOwners, 77);
});

test('builds level-gated branch and filtered spell choices', async () => {
  const catalog = await loadCatalog();
  const elf = origin(catalog, 'Elf', 'XPHB');
  const state = value(createRuleAdditionalSpellChoiceState(
    catalog,
    '5r',
    owner(elf),
    1,
  ));
  assert.equal(state?.blocks.length, 3);
  const highElf = state?.blocks.find(({ label }) => label === '高等精灵');
  assert.equal(highElf?.abilityOptions.length, 3);
  assert.equal(highElf?.choices.length, 1);
  assert.ok(highElf?.choices[0]?.options.every(({ level }) => level === 0));
  assert.ok(highElf?.choices[0]?.options.every(({ classKeys }) => (
    classKeys.includes('Wizard')
  )));

  const levelFive = value(createRuleAdditionalSpellChoiceState(
    catalog,
    '5r',
    owner(elf),
    5,
  ));
  const levelFiveHighElf = levelFive?.blocks.find(({ label }) => label === '高等精灵');
  assert.ok(levelFiveHighElf?.fixedSpells.some(({ name }) => name === '侦测魔法'));
  assert.ok(levelFiveHighElf?.fixedSpells.some(({ name }) => name === '迷踪步'));
});

test('validates origin spell branch, ability, and selected spell ids', async () => {
  const catalog = await loadCatalog();
  const elf = origin(catalog, 'Elf', 'XPHB');
  const state = value(createRuleAdditionalSpellChoiceState(
    catalog,
    '5r',
    owner(elf),
    1,
  ));
  const block = required(state?.blocks.find(({ label }) => label === '高等精灵'));
  const group = required(block.choices[0]);
  assert.equal(createRuleOriginSpellEffects(
    catalog,
    '5r',
    elf,
    'race',
    1,
  ).ok, false);
  assert.equal(createRuleOriginSpellEffects(
    catalog,
    '5r',
    elf,
    'race',
    1,
    {
      blockId: block.id,
      ability: 'STR',
      choices: { [group.id]: [group.options[0].id] },
    },
  ).ok, false);
  const effects = createRuleOriginSpellEffects(
    catalog,
    '5r',
    elf,
    'race',
    1,
    {
      blockId: block.id,
      ability: 'INT',
      choices: { [group.id]: [group.options[0].id] },
    },
  );
  assert.equal(effects.ok, true);
  assert.equal(
    effects.ok && effects.value[0]?.type === 'spell.profile.upsert'
      ? effects.value[0].profile.spells[0]?.id
      : undefined,
    group.options[0].id,
  );
});

test('fails closed on unknown block keys and spell filters', async () => {
  const catalog = await loadCatalog();
  const base = origin(catalog, 'Aasimar', 'XPHB');
  assert.equal(createRuleAdditionalSpellChoiceState(catalog, '5r', {
    ...owner(base),
    additionalSpells: [{ mystery: ['光亮术|xphb'] }],
  }).ok, false);
  assert.equal(createRuleAdditionalSpellChoiceState(catalog, '5r', {
    ...owner(base),
    additionalSpells: [{
      known: { _: [{ choose: 'level=0|unknown=value' }] },
    }],
  }).ok, false);
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

function origin(catalog: RuleCatalog, key: string, source: string): RuleOrigin {
  const result = catalog.races.find((entry) => (
    entry.key === key && entry.source === source
  ));
  return required(result);
}

function owner(origin: RuleOrigin) {
  return {
    kind: 'origin' as const,
    key: origin.key,
    source: origin.source,
    name: origin.name,
    additionalSpells: origin.additionalSpells,
  };
}

function value(
  result: ReturnType<typeof createRuleAdditionalSpellChoiceState>,
) {
  if (!result.ok) assert.fail(JSON.stringify(result.issues));
  return result.value;
}

function required<T>(result: T | undefined): T {
  assert.notEqual(result, undefined);
  return result as T;
}
