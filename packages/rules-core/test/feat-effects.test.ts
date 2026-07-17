import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  createRuleFeatChoiceGroups,
  createRuleFeatEffects,
  parseRuleCatalog,
  ruleSkillNames,
} from '../src/index.ts';

test('parses common choice groups for every catalog feat', async () => {
  const catalog = await loadCatalog();
  for (const feat of catalog.feats) {
    const result = createRuleFeatChoiceGroups(catalog, '5r', feat, {
      proficientSkills: ruleSkillNames,
      selectedSkills: ruleSkillNames,
    });
    assert.equal(
      result.ok,
      true,
      `${feat.key}|${feat.source}: ${'issues' in result ? JSON.stringify(result.issues) : ''}`,
    );
  }
});

test('validates and projects common feat selections into structured effects', async () => {
  const catalog = await loadCatalog();
  const feat = catalog.feats.find(({ key, source }) => (
    key === 'Skill Expert' && source === 'TCE'
  ));
  assert.ok(feat);
  const state = createRuleFeatChoiceGroups(catalog, '5e', feat, {
    proficientSkills: ['Perception'],
    selectedSkills: ['Arcana'],
  });
  assert.equal(state.ok, true);
  if (!state.ok) return;
  const selections = Object.fromEntries(state.value.all.map((group) => [
    group.id,
    group.kind === 'skill'
      ? ['Arcana']
      : group.kind === 'expertise'
        ? ['Perception']
        : group.from.slice(0, group.count),
  ]));
  const result = createRuleFeatEffects(
    catalog,
    '5e',
    feat,
    {
      abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      proficiencies: ['Perception'],
    },
    { choices: selections },
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.value.some((effect) => (
    effect.type === 'ability.add' && effect.value === 1
  )));
  assert.ok(result.value.some((effect) => (
    effect.type === 'proficiency.add'
    && effect.proficiency === 'Arcana'
    && !effect.expertise
  )));
  assert.ok(result.value.some((effect) => (
    effect.type === 'proficiency.add'
    && effect.proficiency === 'Perception'
    && effect.expertise
  )));
});

test('projects fixed armor, senses, resistance, and immunity fields', async () => {
  const catalog = await loadCatalog();
  const lightlyArmored = catalog.feats.find(({ key, source }) => (
    key === 'Lightly Armored' && source === 'XPHB'
  ));
  const poisonMastery = catalog.feats.find(({ key, source }) => (
    key === 'Boon of Poison Mastery' && source === 'FRHoF'
  ));
  assert.ok(lightlyArmored);
  assert.ok(poisonMastery);
  const character = {
    abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } as const,
    proficiencies: [] as string[],
  };
  const armor = createRuleFeatEffects(catalog, '5r', lightlyArmored, character, {
    choices: Object.fromEntries(
      createGroups(catalog, lightlyArmored).all.map((group) => [
        group.id,
        group.from.slice(0, group.count),
      ]),
    ),
  });
  assert.equal(armor.ok, true);
  assert.ok(armor.ok && armor.value.some((effect) => (
    effect.type === 'proficiency.add' && effect.proficiency === 'armor:shield'
  )));
  const immunity = createRuleFeatEffects(catalog, '5r', poisonMastery, character, {
    choices: Object.fromEntries(
      createGroups(catalog, poisonMastery).all.map((group) => [
        group.id,
        group.from.slice(0, group.count),
      ]),
    ),
  });
  assert.equal(immunity.ok, true);
  assert.ok(immunity.ok && immunity.value.some((effect) => (
    effect.type === 'combat.text.add'
    && effect.field === 'damageImmunities'
    && effect.value === '毒素'
  )));
});

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

function createGroups(
  catalog: Awaited<ReturnType<typeof loadCatalog>>,
  feat: Awaited<ReturnType<typeof loadCatalog>>['feats'][number],
) {
  const result = createRuleFeatChoiceGroups(catalog, '5r', feat, {
    proficientSkills: ruleSkillNames,
    selectedSkills: ruleSkillNames,
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('choice parse failed');
  return result.value;
}
