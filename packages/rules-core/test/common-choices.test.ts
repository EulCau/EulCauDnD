import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  areRuleChoiceSelectionsComplete,
  parseRuleAbilityChoiceGroups,
  parseRuleCatalog,
  parseRuleExpertiseChoiceGroups,
  parseRuleLanguageChoiceGroups,
  parseRuleSavingThrowChoiceGroups,
  parseRuleSkillChoiceGroups,
  parseRuleTextChoiceGroups,
  parseRuleToolChoiceGroups,
  parseRuleWeaponChoiceGroups,
  validateRuleChoiceSelections,
  type RuleCatalog,
  type RuleStringChoiceGroup,
} from '../src/index.ts';

test('parses common catalog choices into stable choice groups', async () => {
  const catalog = await loadCatalog();
  const aetherborn = required(catalog.races.find(({ key }) => key === 'Aetherborn'));
  const human = required(catalog.races.find(({ key, source }) => (
    key === 'Human' && source === 'XPHB'
  )));
  const dwarf = required(catalog.races.find(({ key, source }) => (
    key === 'Dwarf' && source === 'PHB'
  )));
  const halfElf = required(catalog.races.find(({ key, source }) => (
    key === 'Half-Elf' && source === 'PHB'
  )));

  const ability = value(parseRuleAbilityChoiceGroups(aetherborn.ability, 'aetherborn'));
  assert.deepEqual(ability[0]?.from, ['STR', 'DEX', 'CON', 'INT', 'WIS']);
  assert.equal(ability[0]?.count, 2);

  const skills = value(parseRuleSkillChoiceGroups(human.skillProficiencies, 'human'));
  assert.equal(skills[0]?.count, 1);
  assert.equal(skills[0]?.from.length, 18);

  const tools = value(parseRuleToolChoiceGroups(dwarf.toolProficiencies, 'dwarf'));
  assert.deepEqual(tools[0]?.from, [
    "smith's tools",
    "brewer's supplies",
    "mason's tools",
  ]);
  const anyTools = value(parseRuleToolChoiceGroups([{ any: 2 }], 'any-tools'));
  assert.equal(anyTools[0]?.count, 2);
  assert.ok(anyTools[0]?.from.includes("thieves' tools"));

  const languages = value(parseRuleLanguageChoiceGroups(
    halfElf.languageProficiencies,
    'half-elf',
  ));
  assert.equal(languages[0]?.count, 1);
  assert.ok(languages[0]?.from.includes('common'));
  assert.ok(languages[0]?.from.includes('elvish'));
});

test('parses weapon, saving throw, expertise, and resistance choices', async () => {
  const catalog = await loadCatalog();
  const weaponMaster = required(catalog.feats.find(({ key, source }) => (
    key === 'Weapon Master' && source === 'PHB'
  )));
  const resilient = required(catalog.feats.find(({ key, source }) => (
    key === 'Resilient' && source === 'PHB'
  )));
  const skillExpert = required(catalog.feats.find(({ key, source }) => (
    key === 'Skill Expert' && source === 'TCE'
  )));
  const energyResistance = required(catalog.feats.find(({ key, source }) => (
    key === 'Boon of Energy Resistance' && source === 'XPHB'
  )));

  const weapons = value(parseRuleWeaponChoiceGroups(
    catalog,
    weaponMaster.weaponProficiencies,
    'weapon-master',
    '5r',
  ));
  assert.equal(weapons[0]?.count, 4);
  assert.ok(weapons[0]?.options.length);
  assert.ok(weapons[0]?.options.some(({ source }) => source === 'XPHB'));
  assert.equal(
    new Set(weapons[0]?.options.map(({ name }) => name)).size,
    weapons[0]?.options.length,
  );

  const saves = value(parseRuleSavingThrowChoiceGroups(
    resilient.savingThrowProficiencies,
    'resilient',
  ));
  assert.deepEqual(saves[0]?.from, ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);

  const expertise = value(parseRuleExpertiseChoiceGroups(
    skillExpert.expertise,
    'skill-expert',
    ['Arcana', 'Perception'],
  ));
  assert.deepEqual(expertise[0]?.from, ['Arcana', 'Perception']);

  const resistance = value(parseRuleTextChoiceGroups(
    energyResistance.resist,
    'energy-resistance',
    'resistance',
    'damage resistance',
  ));
  assert.equal(resistance[0]?.count, 2);
});

test('validates counts, uniqueness, option membership, and stale groups', () => {
  const group: RuleStringChoiceGroup = {
    id: 'skill-choice',
    kind: 'skill',
    required: true,
    min: 2,
    max: 2,
    options: [
      { id: 'Arcana', name: 'Arcana' },
      { id: 'History', name: 'History' },
      { id: 'Nature', name: 'Nature' },
    ],
    label: 'choose',
    from: ['Arcana', 'History', 'Nature'],
    count: 2,
  };
  assert.equal(areRuleChoiceSelectionsComplete(
    [group],
    { 'skill-choice': ['Arcana', 'History'] },
  ), true);
  assert.equal(validateRuleChoiceSelections(
    [group],
    { 'skill-choice': ['Arcana'] },
  ).ok, false);
  assert.equal(validateRuleChoiceSelections(
    [group],
    { 'skill-choice': ['Arcana', 'Arcana'] },
  ).ok, false);
  assert.equal(validateRuleChoiceSelections(
    [group],
    { 'skill-choice': ['Arcana', 'Stealth'] },
  ).ok, false);
  assert.equal(validateRuleChoiceSelections(
    [group],
    {
      'skill-choice': ['Arcana', 'History'],
      stale: ['Nature'],
    },
  ).ok, false);
});

test('fails closed on unsupported choice shapes', () => {
  assert.equal(parseRuleSkillChoiceGroups([
    { choose: { from: 'Arcana', count: 1 } },
  ], 'invalid-skill').ok, false);
  assert.equal(parseRuleToolChoiceGroups([
    { anyArtisansTool: { count: 1 } },
  ], 'invalid-tool').ok, false);
  assert.equal(parseRuleTextChoiceGroups([
    { random: ['fire'] },
  ], 'invalid-text', 'resistance', 'resistance').ok, false);
});

async function loadCatalog(): Promise<RuleCatalog> {
  const content = await readFile(
    new URL('../../../public/data/auto-builder-core.json', import.meta.url),
    'utf8',
  );
  const parsed = parseRuleCatalog(JSON.parse(content));
  assert.equal(parsed.ok, true, parsed.ok ? undefined : JSON.stringify(parsed.issues.slice(0, 3)));
  if (!parsed.ok) throw new Error('catalog fixture is invalid');
  return parsed.value;
}

function value(result: ReturnType<typeof parseRuleSkillChoiceGroups>): RuleStringChoiceGroup[] {
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues));
  return result.ok ? result.value : [];
}

function required<T>(entry: T | undefined): T {
  assert.notEqual(entry, undefined);
  return entry as T;
}
