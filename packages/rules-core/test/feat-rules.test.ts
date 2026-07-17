import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  evaluateFeatPrerequisite,
  getEligibleAbilityScoreImprovementFeats,
  getFeatAbilityChoiceOptions,
  type RuleCharacterSnapshot,
  type RuleFeat,
} from '../src/index.ts';

const character: RuleCharacterSnapshot = {
  abilities: { STR: 13, DEX: 12, CON: 10, INT: 10, WIS: 10, CHA: 8 },
  race: 'Human',
  subrace: '',
  background: 'Soldier',
  proficiencies: ['armor:light', 'weapon:martial'],
  knownFeats: [{ name: 'Alert', source: 'PHB' }],
  hasSpellcasting: false,
};

test('evaluates supported feat prerequisites and fails closed on unknown keys', () => {
  assert.equal(evaluateFeatPrerequisite({
    key: 'eligible',
    name: 'Eligible',
    source: 'PHB',
    prerequisite: [{ level: 4, ability: [{ str: 13 }], proficiency: [{ weapon: 'martial' }] }],
  }, character, 4).eligible, true);
  assert.deepEqual(evaluateFeatPrerequisite({
    key: 'campaign',
    name: 'Campaign',
    source: 'PHB',
    prerequisite: [{ campaign: ['Example'] }],
  }, character, 20), { eligible: false, failures: ['unsupported'] });
  assert.deepEqual(evaluateFeatPrerequisite({
    key: 'caster',
    name: 'Caster',
    source: 'PHB',
    prerequisite: [{ spellcasting: true }],
  }, character, 20), { eligible: false, failures: ['spellcasting'] });
});

test('filters authorized feats and applies source priority without leaking denied entries', () => {
  const feats: RuleFeat[] = [
    { key: 'Alert', name: '警觉 2014', englishName: 'Alert', source: 'PHB' },
    { key: 'Alert', name: '警觉 2024', englishName: 'Alert', source: 'XPHB' },
    { key: 'Setting', name: '设定专长', source: 'ERLW' },
  ];
  assert.deepEqual(getEligibleAbilityScoreImprovementFeats(
    feats,
    '5r',
    character,
    4,
    { allowedSources: ['PHB', 'XPHB'], sourcePriority: ['XPHB', 'PHB'] },
  ).map(({ source }) => source), ['XPHB']);
  assert.deepEqual(getEligibleAbilityScoreImprovementFeats(
    feats,
    '5e',
    character,
    4,
    { allowedSources: ['PHB', 'XPHB'], sourcePriority: ['PHB', 'XPHB'] },
  ).map(({ source }) => source), ['PHB']);
});

test('returns structured ability choices from feat data', () => {
  assert.deepEqual(getFeatAbilityChoiceOptions({
    key: 'Athlete',
    name: '运动员',
    source: 'XPHB',
    ability: [{ choose: { from: ['str', 'dex'] } }],
  }), ['STR', 'DEX']);
});
