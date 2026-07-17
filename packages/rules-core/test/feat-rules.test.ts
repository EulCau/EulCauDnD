import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  evaluateFeatPrerequisite,
  getEligibleAbilityScoreImprovementFeats,
  getFeatAbilityChoiceOptions,
  validateBasicFeatAdvancementChoice,
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
    { key: 'Athlete', name: '运动员 2014', englishName: 'Athlete', source: 'PHB' },
    { key: 'Athlete', name: '运动员 2024', englishName: 'Athlete', source: 'XPHB' },
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
  assert.deepEqual(getEligibleAbilityScoreImprovementFeats(
    [{ key: 'Alert', name: 'Alert', source: 'PHB' }],
    '5e',
    character,
    4,
    { allowedSources: ['PHB'], sourcePriority: ['PHB'] },
  ), []);
});

test('returns structured ability choices from feat data', () => {
  assert.deepEqual(getFeatAbilityChoiceOptions({
    key: 'Athlete',
    name: '运动员',
    source: 'XPHB',
    ability: [{ choose: { from: ['str', 'dex'] } }],
  }), ['STR', 'DEX']);
});

test('validates basic feat advancement and rejects unresolved structured choices', () => {
  const feats: RuleFeat[] = [
    {
      key: 'Crusher',
      name: 'Crusher',
      source: 'TCE',
      ability: [{ choose: { from: ['str', 'con'], amount: 1 } }],
    },
    {
      key: 'Fey Touched',
      name: 'Fey Touched',
      source: 'TCE',
      ability: [{ choose: { from: ['int', 'wis', 'cha'], amount: 1 } }],
      additionalSpells: [{ choose: 'level=1' }],
    } as RuleFeat,
  ];
  const policy = { allowedSources: ['TCE'], sourcePriority: ['TCE'] };
  assert.deepEqual(validateBasicFeatAdvancementChoice(
    feats,
    '5e',
    character,
    4,
    policy,
    { featId: 'Crusher|TCE', ability: 'STR' },
  ), {
    valid: true,
    feat: feats[0],
    abilityIncreases: { STR: 1 },
  });
  assert.deepEqual(validateBasicFeatAdvancementChoice(
    feats,
    '5e',
    character,
    4,
    policy,
    { featId: 'Crusher|TCE' },
  ), { valid: false, error: 'feat_ability_required' });
  assert.deepEqual(validateBasicFeatAdvancementChoice(
    feats,
    '5e',
    character,
    4,
    policy,
    { featId: 'Fey Touched|TCE', ability: 'INT' },
  ), { valid: false, error: 'feat_choices_not_supported' });
});
