import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  getRuleEntityId,
  parseCanonicalRuleCharacter,
  parseRuleCatalog,
  ruleEntityIdentityKey,
  type CanonicalRuleCharacterSnapshot,
} from '../src/index.ts';

test('parses the generated catalog without mutation and survives JSON round-trip', async () => {
  const content = await readFile(new URL('../../../public/data/auto-builder-core.json', import.meta.url), 'utf8');
  const input = JSON.parse(content) as unknown;
  const before = JSON.stringify(input);
  const parsed = parseRuleCatalog(input);
  assert.equal(parsed.ok, true, parsed.ok ? undefined : JSON.stringify(parsed.issues.slice(0, 3)));
  assert.equal(JSON.stringify(input), before);
  if (!parsed.ok) return;
  assert.notEqual(parsed.value, input);
  const roundTripped = parseRuleCatalog(JSON.parse(JSON.stringify(parsed.value)));
  assert.equal(roundTripped.ok, true);
  if (roundTripped.ok) {
    assert.equal(roundTripped.value.classes.length, parsed.value.classes.length);
    assert.equal(roundTripped.value.feats.length, parsed.value.feats.length);
    assert.equal(roundTripped.value.spells.length, parsed.value.spells.length);
  }
});

test('creates stable entity identities while preserving catalog ids', () => {
  assert.equal(getRuleEntityId('feat', {
    key: ' Crusher ',
    source: ' TCE ',
  }), 'Crusher|TCE');
  assert.equal(getRuleEntityId('subclass', {
    id: 'Fighter|PHB|Champion|PHB',
    key: 'Champion',
    source: 'PHB',
  }), 'Fighter|PHB|Champion|PHB');
  assert.equal(ruleEntityIdentityKey('feat', {
    key: 'Crusher',
    source: 'TCE',
  }), 'feat:Crusher|TCE');
});

test('rejects cyclic, non-JSON, duplicate, and unsafe catalog input', () => {
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  assert.equal(parseRuleCatalog(cyclic).ok, false);
  assert.equal(parseRuleCatalog(new Set(['catalog'])).ok, false);
  assert.equal(parseRuleCatalog({ ...emptyCatalog(), classes: [
    classEntry(),
    classEntry(),
  ] }).ok, false);
  const unsafe = JSON.parse('{"generatedAt":"now","__proto__":{},"classes":[]}');
  assert.equal(parseRuleCatalog(unsafe).ok, false);
});

test('parses a canonical character as an immutable JSON-safe copy', () => {
  const input: CanonicalRuleCharacterSnapshot = {
    schemaVersion: 1,
    ruleSystem: '5e',
    classes: [{
      id: 'Fighter|PHB',
      key: 'Fighter',
      source: 'PHB',
      level: 3,
    }],
    abilities: { STR: 15, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 8 },
    proficiencies: ['weapon:martial'],
    expertises: [],
    feats: [],
    features: [],
    resources: [],
    spellcastingProfiles: [],
    equipment: [],
    combat: {
      hp: { current: 28, max: 28, temporary: 0 },
      armorClass: 16,
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
  const parsed = parseCanonicalRuleCharacter(input);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  parsed.value.abilities.STR = 20;
  parsed.value.proficiencies.push('armor:heavy');
  assert.equal(input.abilities.STR, 15);
  assert.deepEqual(input.proficiencies, ['weapon:martial']);
  assert.equal(parseCanonicalRuleCharacter(
    JSON.parse(JSON.stringify(parsed.value)),
  ).ok, true);
  assert.equal(parseCanonicalRuleCharacter({
    ...input,
    proficiencies: ['weapon:martial', 'weapon:martial'],
  }).ok, false);
  assert.equal(parseCanonicalRuleCharacter({
    ...input,
    classes: [{ ...input.classes[0], level: 21 }],
  }).ok, false);
});

function emptyCatalog(): Record<string, unknown> {
  return {
    generatedAt: '2026-07-17T00:00:00.000Z',
    classes: [],
    subclasses: [],
    races: [],
    subraces: [],
    backgrounds: [],
    feats: [],
    invocations: [],
    fightingStyles: [],
    metamagics: [],
    maneuvers: [],
    weapons: [],
    weaponMasteries: [],
    armors: [],
    spells: [],
  };
}

function classEntry(): Record<string, unknown> {
  return {
    key: 'Fighter',
    name: 'Fighter',
    englishName: 'Fighter',
    source: 'PHB',
    ruleSystem: '5e',
    levelOneFeatures: [],
    levelFeatures: [],
  };
}
