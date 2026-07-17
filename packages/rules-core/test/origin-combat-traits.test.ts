import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getRuleOriginArmorFormula,
  getRuleOriginNaturalAttackDefinitions,
} from '../src/index.ts';

test('returns source-specific origin armor formulas', () => {
  assert.deepEqual(
    getRuleOriginArmorFormula({ key: 'Lizardfolk', source: 'MPMM' }),
    {
      base: 13,
      ability: 'DEX',
      featureNames: ['天生护甲', 'Natural Armor'],
      label: '蜥蜴人天生护甲: 13 + 敏捷调整值',
    },
  );
  assert.deepEqual(
    getRuleOriginArmorFormula({ key: 'Tortle', source: 'MPMM' }),
    {
      base: 17,
      featureNames: ['天生护甲', 'Natural Armor'],
      label: '龟人天生护甲: 17',
    },
  );
  assert.equal(
    getRuleOriginArmorFormula({ key: 'Lizardfolk', source: 'UNKNOWN' }),
    undefined,
  );
});

test('returns source-specific natural attacks including multi-attack origins', () => {
  assert.deepEqual(
    getRuleOriginNaturalAttackDefinitions({ key: 'Aarakocra', source: 'EEPC' })
      .map(({ attackKey, die, damageType }) => ({ attackKey, die, damageType })),
    [{
      attackKey: 'aarakocra-eepc-talons',
      die: '1d4',
      damageType: '挥砍',
    }],
  );
  assert.deepEqual(
    getRuleOriginNaturalAttackDefinitions({ key: 'Naga', source: 'PSA' })
      .map(({ name, die }) => ({ name, die })),
    [
      { name: '咬击', die: '1d4' },
      { name: '紧束', die: '1d6' },
    ],
  );
  assert.deepEqual(
    getRuleOriginNaturalAttackDefinitions({ key: 'Naga', source: 'UNKNOWN' }),
    [],
  );
});

test('returns defensive copies of combat trait definitions', () => {
  const formula = getRuleOriginArmorFormula({ key: 'Goblin', source: 'PSZ' });
  assert.ok(formula);
  (formula.featureNames as string[]).push('mutated');
  assert.equal(
    getRuleOriginArmorFormula({ key: 'Goblin', source: 'PSZ' })?.featureNames.includes('mutated'),
    false,
  );

  const attacks = getRuleOriginNaturalAttackDefinitions({ key: 'Tortle', source: 'MPMM' });
  attacks[0].name = 'mutated';
  assert.equal(
    getRuleOriginNaturalAttackDefinitions({ key: 'Tortle', source: 'MPMM' })[0].name,
    '爪击',
  );
});
