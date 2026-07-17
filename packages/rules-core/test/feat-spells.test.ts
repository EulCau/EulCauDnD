import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  createRuleFeatSpellChoiceState,
  createRuleFeatSpellEffects,
  createRuleFeatSpellLevelUpChoiceState,
  createRuleFeatSpellLevelUpEffects,
  parseRuleCatalog,
  type RuleAdditionalSpellChoiceBlock,
  type RuleFeatCatalogEntry,
  type RuleSystem,
} from '../src/index.ts';

test('parses every catalog feat additionalSpells shape at milestone levels', async () => {
  const catalog = await loadCatalog();
  const feats = catalog.feats.filter(({ additionalSpells }) => additionalSpells?.length);
  assert.equal(feats.length, 66);
  for (const feat of feats) {
    const ruleSystem = systemFor(feat);
    for (const level of [1, 2, 3, 4, 5, 8, 9, 12, 13, 16, 17, 20]) {
      const state = createRuleFeatSpellChoiceState(catalog, ruleSystem, feat, level);
      assert.equal(
        state.ok,
        true,
        `${feat.key}|${feat.source}@${level}: ${
          'issues' in state ? JSON.stringify(state.issues) : ''
        }`,
      );
    }
  }
});

test('projects an initial feat spell profile with strict block and spell choices', async () => {
  const catalog = await loadCatalog();
  const feat = findFeat(catalog.feats, 'Fey Touched', 'TCE');
  const state = createRuleFeatSpellChoiceState(catalog, '5e', feat, 4);
  assert.equal(state.ok, true);
  if (!state.ok || !state.value) return;
  const block = state.value.blocks[0]!;
  const result = createRuleFeatSpellEffects(catalog, '5e', feat, 4, selections(block));
  assert.equal(result.ok, true);
  assert.ok(result.ok && result.value.some((effect) => (
    effect.type === 'spell.profile.upsert'
    && effect.profile.spells.length === block.fixedSpells.length
      + block.choices.reduce((total, group) => total + group.count, 0)
  )));
  assert.equal(createRuleFeatSpellEffects(catalog, '5e', feat, 4, {
    blockId: block.id,
    ability: block.abilityOptions[0],
    choices: {},
  }).ok, false);
});

test('adds XPHB Ritual Caster milestone choices to an existing profile', async () => {
  const catalog = await loadCatalog();
  const feat = findFeat(catalog.feats, 'Ritual Caster', 'XPHB');
  const initial = createRuleFeatSpellChoiceState(catalog, '5r', feat, 4);
  assert.equal(initial.ok, true);
  if (!initial.ok || !initial.value) return;
  const block = initial.value.blocks[0]!;
  const initialSelections = selections(block);
  const initialEffects = createRuleFeatSpellEffects(
    catalog,
    '5r',
    feat,
    4,
    initialSelections,
  );
  assert.equal(initialEffects.ok, true);
  if (!initialEffects.ok || initialEffects.value[0]?.type !== 'spell.profile.upsert') return;
  const profile = initialEffects.value[0].profile;
  const state = createRuleFeatSpellLevelUpChoiceState(
    catalog,
    '5r',
    feat,
    4,
    5,
    profile,
  );
  assert.equal(state.ok, true);
  assert.equal(state.ok ? state.value?.blocks[0]?.choices[0]?.count : undefined, 1);
  if (!state.ok || !state.value?.blocks[0]) return;
  const nextBlock = state.value.blocks[0];
  const effects = createRuleFeatSpellLevelUpEffects(
    catalog,
    '5r',
    feat,
    4,
    5,
    profile,
    selections(nextBlock),
  );
  assert.equal(effects.ok, true);
  assert.equal(
    effects.ok ? effects.value.filter(({ type }) => type === 'spell.add').length : 0,
    1,
  );
});

test('supports Rune Shaper proficiency growth and validated replacement', async () => {
  const catalog = await loadCatalog();
  const feat = findFeat(catalog.feats, 'Rune Shaper', 'BGG');
  const initial = createRuleFeatSpellChoiceState(catalog, '5e', feat, 8);
  assert.equal(initial.ok, true);
  if (!initial.ok || !initial.value) return;
  const block = initial.value.blocks[0]!;
  assert.equal(block.fixedSpells.some(({ englishName }) => (
    englishName === 'Comprehend Languages'
  )), true);
  assert.equal(block.choices[0]?.count, 1);
  const initialEffects = createRuleFeatSpellEffects(
    catalog,
    '5e',
    feat,
    8,
    selections(block),
  );
  assert.equal(initialEffects.ok, true);
  if (!initialEffects.ok || initialEffects.value[0]?.type !== 'spell.profile.upsert') return;
  const profile = initialEffects.value[0].profile;
  const state = createRuleFeatSpellLevelUpChoiceState(
    catalog,
    '5e',
    feat,
    8,
    9,
    profile,
  );
  assert.equal(state.ok, true);
  assert.equal(state.ok ? state.value?.blocks[0]?.choices[0]?.count : undefined, 1);
  assert.ok(state.ok && state.value?.replacement);
  if (!state.ok || !state.value?.replacement || !state.value.blocks[0]) return;
  const replacement = state.value.replacement;
  const levelSelections = selections(state.value.blocks[0]);
  const selectedLevelIds = new Set(Object.values(levelSelections.choices).flat());
  const replacementAdd = replacement.addOptions.find(({ id }) => !selectedLevelIds.has(id));
  assert.ok(replacementAdd);
  const effects = createRuleFeatSpellLevelUpEffects(
    catalog,
    '5e',
    feat,
    8,
    9,
    profile,
    {
      ...levelSelections,
      replaceRemoveId: replacement.removeOptions[0]?.id,
      replaceAddId: replacementAdd?.id,
    },
  );
  assert.equal(effects.ok, true);
  assert.ok(effects.ok && effects.value.some(({ type }) => type === 'spell.remove'));
  assert.ok(effects.ok && effects.value.filter(({ type }) => type === 'spell.add').length >= 2);
});

function selections(block: RuleAdditionalSpellChoiceBlock) {
  return {
    blockId: block.id,
    ability: block.abilityOptions[0] ?? block.ability,
    choices: Object.fromEntries(block.choices.map((group) => [
      group.id,
      group.options.slice(0, group.count).map(({ id }) => id),
    ])),
  };
}

async function loadCatalog() {
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
  feats: readonly RuleFeatCatalogEntry[],
  key: string,
  source: string,
): RuleFeatCatalogEntry {
  const feat = feats.find((entry) => entry.key === key && entry.source === source);
  assert.ok(feat);
  return feat;
}

function systemFor(feat: RuleFeatCatalogEntry): RuleSystem {
  return feat.source === 'XPHB' ? '5r' : '5e';
}
