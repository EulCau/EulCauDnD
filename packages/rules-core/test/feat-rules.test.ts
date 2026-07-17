import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  evaluateFeatPrerequisite,
  getEligibleAbilityScoreImprovementFeats,
  getFeatAbilityChoiceOptions,
  getRuleFeatOptions,
  parseRuleCatalog,
  parseRuleEntitySourceId,
  ruleEntityRefMatches,
  validateBasicFeatAdvancementChoice,
  type RuleCharacterSnapshot,
  type RuleContext,
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
  }, character, 20), { eligible: false, failures: ['campaign'] });
  assert.deepEqual(evaluateFeatPrerequisite({
    key: 'unknown',
    name: 'Unknown',
    source: 'PHB',
    prerequisite: [{ unknownRequirement: true }],
  }, character, 20), { eligible: false, failures: ['unsupported'] });
  assert.deepEqual(evaluateFeatPrerequisite({
    key: 'caster',
    name: 'Caster',
    source: 'PHB',
    prerequisite: [{ spellcasting: true }],
  }, character, 20), { eligible: false, failures: ['spellcasting'] });
});

test('evaluates feature, campaign, category, and localized feat prerequisites', () => {
  const qualified: RuleCharacterSnapshot = {
    ...character,
    campaigns: ['艾伯伦'],
    features: ['战斗风格', '施法'],
    knownFeats: [{
      id: 'Initiate of High Sorcery|DSotDQ',
      key: 'Initiate of High Sorcery',
      name: '高等术法学徒',
      source: 'DSotDQ',
      category: 'D',
    }],
    hasSpellcastingFeature: true,
  };
  assert.equal(evaluateFeatPrerequisite({
    key: 'qualified',
    name: 'Qualified',
    source: 'TEST',
    prerequisite: [{
      campaign: ['艾伯伦'],
      feature: ['战斗风格'],
      feat: ['高等术法学徒|DSotDQ|高等术法学徒（努伊塔利）'],
      featCategory: ['D'],
      spellcastingFeature: true,
    }],
  }, qualified, 4).eligible, true);
  assert.deepEqual(evaluateFeatPrerequisite({
    key: 'exclusive',
    name: 'Exclusive',
    source: 'TEST',
    prerequisite: [{ exclusiveFeatCategory: ['D'] }],
  }, qualified, 4), { eligible: false, failures: ['feat_category'] });
  assert.deepEqual(evaluateFeatPrerequisite({
    key: 'manual',
    name: 'Manual',
    source: 'TEST',
    prerequisite: [{ other: 'requires human review' }],
  }, qualified, 4), { eligible: false, failures: ['manual_review'] });
});

test('requires the matching subrace and supports the structured small-size prerequisite', () => {
  const drowFeat: RuleFeat = {
    key: 'Drow High Magic',
    name: '高等卓尔魔法',
    source: 'XGE',
    prerequisite: [{ race: [{ ENG_name: 'elf', name: '精灵', subrace: '卓尔' }] }],
  };
  assert.equal(evaluateFeatPrerequisite(
    drowFeat,
    { ...character, race: '精灵', subrace: '高等精灵' },
    4,
  ).eligible, false);
  assert.equal(evaluateFeatPrerequisite(
    drowFeat,
    { ...character, race: '精灵', subrace: '卓尔' },
    4,
  ).eligible, true);
  assert.equal(evaluateFeatPrerequisite({
    key: 'Squat Nimbleness',
    name: '低身机敏',
    source: 'XGE',
    prerequisite: [{ race: [{ ENG_name: 'small race', name: '小型种族' }] }],
  }, { ...character, race: '地精', size: '小型' }, 4).eligible, true);
});

test('classifies every catalog feat prerequisite without unknown fields', async () => {
  const content = await readFile(
    new URL('../../../public/data/auto-builder-core.json', import.meta.url),
    'utf8',
  );
  const parsed = parseRuleCatalog(JSON.parse(content));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const feats = parsed.value.feats.filter(({ prerequisite }) => prerequisite?.length);
  assert.equal(feats.length, 205);
  for (const feat of feats) {
    for (const prerequisite of feat.prerequisite ?? []) {
      const result = evaluateFeatPrerequisite(
        { ...feat, prerequisite: [prerequisite] },
        {
          abilities: { STR: 30, DEX: 30, CON: 30, INT: 30, WIS: 30, CHA: 30 },
          race: '',
          subrace: '',
          background: '',
          campaigns: [],
          proficiencies: [],
          features: [],
          knownFeats: [],
          hasSpellcasting: true,
          hasSpellcastingFeature: true,
        },
        20,
      );
      assert.equal(
        result.failures.includes('unsupported'),
        false,
        `${feat.key}|${feat.source}: ${JSON.stringify(prerequisite)}`,
      );
    }
  }
});

test('parses and compares structured feat source identities', () => {
  const parsed = parseRuleEntitySourceId('feat', 'auto-feat-Great Weapon Master-XPHB');
  assert.deepEqual(parsed, {
    id: 'Great Weapon Master|XPHB',
    key: 'Great Weapon Master',
    source: 'XPHB',
  });
  assert.equal(parsed !== undefined && ruleEntityRefMatches(
    parsed,
    'Great Weapon Master',
    'XPHB',
  ), true);
  assert.equal(parsed !== undefined && ruleEntityRefMatches(parsed, 'Great Weapon Master'), true);
  assert.equal(parseRuleEntitySourceId('feat', 'auto-race-Elf-XPHB'), undefined);
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
    [{ key: 'Alert', name: 'Alert', source: 'XPHB' }],
    '5r',
    character,
    4,
    { allowedSources: ['XPHB'], sourcePriority: ['XPHB'] },
  ), []);
});

test('filters catalog feat options through caller authorization', () => {
  const context: RuleContext = {
    ruleSystem: '5r',
    catalog: {
      generatedAt: 'test',
      classes: [],
      subclasses: [],
      races: [],
      subraces: [],
      backgrounds: [],
      feats: [
        { key: 'Athlete', name: '运动员 2014', englishName: 'Athlete', source: 'PHB', features: [] },
        { key: 'Athlete', name: '运动员 2024', englishName: 'Athlete', source: 'XPHB', features: [] },
        { key: 'Allowed', name: '显式允许', source: 'TEST', features: [] },
        { key: 'Denied', name: '同源未允许', source: 'TEST', features: [] },
      ],
      invocations: [],
      fightingStyles: [],
      metamagics: [],
      maneuvers: [],
      weapons: [],
      armors: [],
      weaponMasteries: [],
      spells: [],
    },
    authorization: {
      allowedSources: { feat: ['PHB', 'XPHB'] },
      allowedEntityIds: { feat: ['Allowed|TEST'] },
      sourcePriority: { feat: ['XPHB', 'PHB'] },
    },
  };
  assert.deepEqual(
    getRuleFeatOptions(context, { ...character, knownFeats: [] }, 4)
      .map(({ key, source }) => `${key}|${source}`)
      .sort(),
    ['Allowed|TEST', 'Athlete|XPHB'],
  );
  assert.deepEqual(
    getRuleFeatOptions(context, {
      ...character,
      knownFeats: [{ id: 'Athlete|PHB', key: 'Athlete', name: '本地化显示名', source: 'PHB' }],
    }, 4).map(({ key }) => key),
    ['Allowed'],
  );
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
      id: 'Crusher|TCE',
      ability: [{ choose: { from: ['str', 'con'], amount: 1 } }],
      abilityChoices: ['STR', 'CON'],
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
