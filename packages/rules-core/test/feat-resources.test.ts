import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  createRuleFeatAdvancementEffects,
  createRuleFeatFixedEffects,
  parseRuleCatalog,
  type RuleCatalog,
  type RuleEffect,
  type RuleFeatCatalogEntry,
  type RuleSystem,
} from '../src/index.ts';

test('projects source-specific fixed feat numbers and proficiencies', async () => {
  const catalog = await loadCatalog();
  const cases = [
    ['Tough', 'PHB', '5e', 'combat.number.add', 'hpMaxBonus', 8],
    ['Alert', 'XPHB', '5r', 'combat.number.add', 'initiativeBonus', 2],
    ['Mobile', 'PHB', '5e', 'combat.number.add', 'speedBonus', 10],
    ['Squat Nimbleness', 'XGE', '5e', 'combat.number.add', 'speedBonus', 5],
    ['Boon of Fortitude', 'XPHB', '5r', 'combat.number.add', 'hpMaxBonus', 40],
    ['Boon of Speed', 'XPHB', '5r', 'combat.number.add', 'speedBonus', 30],
  ] as const;
  for (const [key, source, system, type, field, value] of cases) {
    const effects = createRuleFeatFixedEffects(
      findFeat(catalog, key, source),
      system,
      4,
    );
    assert.ok(effects.some((effect) => (
      effect.type === type
      && 'field' in effect
      && effect.field === field
      && effect.value === value
    )), `${key}|${source} should add ${field}=${value}`);
  }
  const tavern = createRuleFeatFixedEffects(
    findFeat(catalog, 'Tavern Brawler', 'PHB'),
    '5e',
    4,
  );
  assert.ok(tavern.some((effect) => (
    effect.type === 'proficiency.add'
    && effect.proficiency === 'weapon:improvised'
  )));
});

test('projects every catalog feat resource definition with stable metadata', async () => {
  const catalog = await loadCatalog();
  const effects = catalog.feats.flatMap((feat) => createRuleFeatFixedEffects(
    feat,
    systemFor(feat),
    5,
  )).filter(isResourceEffect);
  assert.equal(effects.length, 42);
  assert.equal(new Set(effects.map(({ resource }) => resource.id)).size, effects.length);
  assert.ok(effects.every(({ resource }) => (
    resource.id === resource.sourceId
    && Boolean(resource.name)
    && Boolean(resource.sourceName)
    && resource.max >= 1
    && resource.current === resource.max
  )));
  const chef = effects.find(({ resource }) => (
    resource.id === 'auto-resource-feat-Chef-XPHB-chef-treats'
  ));
  assert.equal(chef?.resource.max, 3);
  assert.equal(chef?.resource.name, '应急零嘴');
  const recovery = effects.filter(({ resource }) => (
    resource.id.startsWith('auto-resource-feat-Boon of Recovery-XPHB-')
  ));
  assert.equal(recovery.length, 2);
});

test('refreshes only level-scaled feat effects and resources', async () => {
  const catalog = await loadCatalog();
  const feats = [
    findFeat(catalog, 'Tough', 'PHB'),
    findFeat(catalog, 'Alert', 'XPHB'),
    findFeat(catalog, 'Chef', 'TCE'),
    findFeat(catalog, 'Gift of the Chromatic Dragon', 'FTD'),
    findFeat(catalog, 'Boon of Recovery', 'XPHB'),
  ];
  const effects = createRuleFeatAdvancementEffects(feats, '5r', 4, 5);
  assert.ok(effects.some((effect) => (
    effect.type === 'combat.number.add'
    && effect.field === 'hpMaxBonus'
    && effect.value === 2
  )));
  assert.ok(effects.some((effect) => (
    effect.type === 'combat.number.add'
    && effect.field === 'initiativeBonus'
    && effect.value === 1
  )));
  const refreshed = effects.filter(isResourceEffect);
  assert.deepEqual(
    refreshed.map(({ resource }) => resource.id).sort(),
    [
      'auto-resource-feat-Chef-TCE-chef-treats',
      'auto-resource-feat-Gift of the Chromatic Dragon-FTD-reactive-resistance',
    ],
  );
  assert.ok(refreshed.every(({ resource }) => resource.max === 3));
  assert.deepEqual(createRuleFeatAdvancementEffects(feats, '5r', 5, 5), []);
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

function findFeat(
  catalog: RuleCatalog,
  key: string,
  source: string,
): RuleFeatCatalogEntry {
  const feat = catalog.feats.find((entry) => entry.key === key && entry.source === source);
  assert.ok(feat);
  return feat;
}

function systemFor(feat: RuleFeatCatalogEntry): RuleSystem {
  return feat.source === 'XPHB' ? '5r' : '5e';
}

function isResourceEffect(
  effect: RuleEffect,
): effect is Extract<RuleEffect, { type: 'resource.upsert' }> {
  return effect.type === 'resource.upsert';
}
