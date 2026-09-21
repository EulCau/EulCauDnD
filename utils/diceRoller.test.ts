import assert from 'node:assert/strict';
import { test } from 'node:test';
import { averageExpression, rollExpression, runDiceRollerCommand, type DiceRollerState } from './diceRoller';

const emptyState = (): DiceRollerState => ({ history: [], inputHistory: [], macros: {} });

test('die bins include both endpoints and give every face the same interval', context => {
  let random = 0;
  context.mock.method(Math, 'random', () => random);
  for (const sides of [1, 6, 20, 100000]) {
    for (let face = 1; face <= sides; face += 1) {
      for (const offset of [0.000001, 0.5, 0.999999]) {
        random = (face - 1 + offset) / sides;
        assert.equal(rollExpression(`d${sides}`).value, face);
      }
    }
    random = 0;
    assert.equal(rollExpression(`d${sides}`).value, 1);
    random = 1 - Number.EPSILON;
    assert.equal(rollExpression(`d${sides}`).value, sides);
  }
});

test('all 1296 outcomes of 4d6dl1 match the exact score distribution', context => {
  let faces: number[] = [];
  let index = 0;
  context.mock.method(Math, 'random', () => (faces[index++] - 0.5) / 6);
  const frequencies = new Array<number>(19).fill(0);
  for (let a = 1; a <= 6; a += 1) {
    for (let b = 1; b <= 6; b += 1) {
      for (let c = 1; c <= 6; c += 1) {
        for (let d = 1; d <= 6; d += 1) {
          faces = [a, b, c, d];
          index = 0;
          const result = rollExpression('4d6dl1');
          assert.equal(result.value, a + b + c + d - Math.min(a, b, c, d));
          frequencies[result.value] += 1;
        }
      }
    }
  }
  assert.deepEqual(frequencies.slice(3), [1, 4, 10, 21, 38, 62, 91, 122, 148, 167, 172, 160, 131, 94, 54, 21]);
});

test('dnd returns k sorted pools with inline totals and the maximum across all pools', context => {
  const faces = [6, 1, 4, 5, 2, 3].flatMap(face => new Array(4).fill(face));
  faces.push(...new Array(24).fill(6), ...new Array(24).fill(1));
  let index = 0;
  context.mock.method(Math, 'random', () => ((faces[index++] ?? 1) - 0.5) / 6);
  const state = runDiceRollerCommand('Abilities: dnd3', emptyState());
  const entry = state.history[0];
  assert.equal(entry.pools?.length, 3);
  assert.deepEqual(entry.pools?.[0], { values: [18, 15, 12, 9, 6, 3], total: 63 });
  assert.deepEqual(entry.pools?.map(pool => pool.total), [63, 108, 18]);
  assert.match(entry.output, /^Abilities: 108, avg /);
  assert.equal(entry.detail?.split('\n').length, 3);
  assert.equal(entry.detail?.split('\n')[0], 'pool: [18, 15, 12, 9, 6, 3] total = 63');
  assert.deepEqual(state.inputHistory, ['Abilities: dnd3']);
  assert.equal(index, 73, '72 dice draws plus one history ID draw; expectation uses no random draws');
});

test('dnd avg matches independent integer counting of maximum totals', context => {
  context.mock.method(Math, 'random', () => 0);
  const frequencies = [1n, 4n, 10n, 21n, 38n, 62n, 91n, 122n, 148n, 167n, 172n, 160n, 131n, 94n, 54n, 21n];
  let totals = [1n];
  for (let score = 0; score < 6; score += 1) {
    const next = new Array<bigint>(totals.length + 15).fill(0n);
    totals.forEach((frequency, total) => {
      frequencies.forEach((count, offset) => { next[total + offset] += frequency * count; });
    });
    totals = next;
  }
  const outcomes = 1296n ** 6n;
  for (const k of [1, 2, 3, 10]) {
    let cumulative = 0n;
    let previous = 0n;
    let weighted = 0n;
    totals.forEach((frequency, offset) => {
      cumulative += frequency;
      const maximumCount = cumulative ** BigInt(k);
      weighted += BigInt(offset + 18) * (maximumCount - previous);
      previous = maximumCount;
    });
    const expected = Number(weighted) / Number(outcomes ** BigInt(k));
    const entry = runDiceRollerCommand(`dnd${k}`, emptyState()).history[0];
    const actual = Number(entry.output.split(', avg ')[1]);
    assert.ok(Math.abs(actual - expected) <= 0.00005, `dnd${k}: ${actual} vs ${expected}`);
  }
  assert.equal(runDiceRollerCommand('dnd1', emptyState()).history[0].output, '18, avg 73.4676');
  const upper = runDiceRollerCommand('dnd1000', emptyState()).history[0];
  assert.equal(upper.pools?.length, 1000);
  assert.ok(Number(upper.output.split(', avg ')[1]) < 108);
});

test('dnd rejects invalid counts and leaves previous state intact', () => {
  for (const command of ['dnd', 'dnd0', 'dnd-1', 'dnd1.5', 'dnd1001', 'dndInfinity', 'dnd2 trailing', 'dnd999999999999999999999']) {
    const state = emptyState();
    assert.equal(runDiceRollerCommand(command, state).history[0].output, 'Error', command);
    assert.deepEqual(state, emptyState());
  }
  assert.match(runDiceRollerCommand('/help', emptyState()).history[0].detail!, /dnd3/);
});

test('existing pools retain 18s and ordinary dice commands keep their output', context => {
  context.mock.method(Math, 'random', () => 1 - Number.EPSILON);
  const pool = rollExpression(`{${new Array(6).fill('4d6dl1').join(',')}}`);
  assert.equal(pool.value, 108);
  assert.match(pool.detail, /pool: \[18, 18, 18, 18, 18, 18\]/);
  assert.equal(runDiceRollerCommand('d6', emptyState()).history[0].output, '6, avg 3.5');
  const average = averageExpression('4d6dl1');
  assert.ok(average.ok);
  assert.ok(Math.abs(average.value - 15869 / 1296) < 1e-12);
});
