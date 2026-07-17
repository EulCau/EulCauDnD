import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  applyRuleEffects,
  createRuleOriginResourceEffects,
  parseRuleCatalog,
  type CanonicalRuleCharacterSnapshot,
  type RuleCatalog,
  type RuleOrigin,
} from '../src/index.ts';

test('projects source-specific origin resources and level thresholds', async () => {
  const catalog = await loadCatalog();
  const orc = origin(catalog, 'Orc', 'XPHB');
  const levelOne = createRuleOriginResourceEffects(orc, '5r', 1);
  const adrenaline = resource(levelOne, 'adrenaline-rush');
  assert.equal(adrenaline?.resource.max, 2);
  assert.equal(adrenaline?.resource.reset, 'shortRest');
  assert.equal(resource(
    createRuleOriginResourceEffects(orc, '5r', 5),
    'adrenaline-rush',
  )?.resource.max, 3);

  const aasimar = origin(catalog, 'Aasimar', 'XPHB');
  assert.equal(resource(
    createRuleOriginResourceEffects(aasimar, '5r', 2),
    'celestial-revelation',
  ), undefined);
  assert.equal(resource(
    createRuleOriginResourceEffects(aasimar, '5r', 3),
    'celestial-revelation',
  )?.resource.max, 1);
});

test('preserves selected and existing origin resource notes', async () => {
  const catalog = await loadCatalog();
  const goliath = origin(catalog, 'Goliath', 'XPHB');
  const selected = resource(createRuleOriginResourceEffects(goliath, '5r', 1, {
    featureChoices: { 'giant-ancestry': 'storm' },
  }), 'giant-ancestry');
  assert.ok(selected?.resource.note?.includes('岚之暴鸣'));

  const refreshed = resource(createRuleOriginResourceEffects(goliath, '5r', 5, {
    resourceNotes: { 'giant-ancestry': selected?.resource.note },
  }), 'giant-ancestry');
  assert.equal(refreshed?.resource.note, selected?.resource.note);
  assert.equal(refreshed?.resource.max, 3);
  assert.equal(resource(
    createRuleOriginResourceEffects(goliath, '5r', 4),
    'large-form',
  ), undefined);
  assert.equal(resource(
    createRuleOriginResourceEffects(goliath, '5r', 5),
    'large-form',
  )?.resource.max, 1);
});

test('projects Resourceful and preserves expended uses during refresh', async () => {
  const catalog = await loadCatalog();
  const human = origin(catalog, 'Human', 'XPHB');
  assert.ok(createRuleOriginResourceEffects(human, '5r', 1).some((effect) => (
    effect.type === 'character.flag.set'
    && effect.field === 'inspiration'
    && effect.value
  )));

  const orc = origin(catalog, 'Orc', 'XPHB');
  const character = emptyCharacter();
  character.resources.push({
    id: 'auto-resource-race-Orc-XPHB-adrenaline-rush',
    sourceId: 'auto-resource-race-Orc-XPHB-adrenaline-rush',
    current: 1,
    max: 2,
    reset: 'shortRest',
  });
  const applied = applyRuleEffects(
    character,
    createRuleOriginResourceEffects(orc, '5r', 5),
  );
  assert.equal(applied.ok, true);
  assert.equal(
    applied.ok
      ? applied.value.resources.find(({ id }) => id.endsWith('adrenaline-rush'))?.current
      : undefined,
    1,
  );
  assert.equal(
    applied.ok
      ? applied.value.resources.find(({ id }) => id.endsWith('adrenaline-rush'))?.max
      : undefined,
    3,
  );
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
  const value = catalog.races.find((entry) => entry.key === key && entry.source === source);
  assert.notEqual(value, undefined);
  return value as RuleOrigin;
}

function resource(
  effects: ReturnType<typeof createRuleOriginResourceEffects>,
  key: string,
) {
  return effects.find((effect) => (
    effect.type === 'resource.upsert' && effect.resource.id.endsWith(`-${key}`)
  )) as Extract<(typeof effects)[number], { type: 'resource.upsert' }> | undefined;
}

function emptyCharacter(): CanonicalRuleCharacterSnapshot {
  return {
    schemaVersion: 1,
    ruleSystem: '5r',
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
