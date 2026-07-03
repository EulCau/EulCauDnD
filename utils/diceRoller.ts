export type DiceRollEntry = {
  id: string;
  input: string;
  output: string;
  detail?: string;
  timestamp: number;
};

export type DiceRollerState = {
  history: DiceRollEntry[];
  inputHistory: string[];
  macros: Record<string, string>;
};

type Modifier =
  | { kind: 'keep'; order: 'highest' | 'lowest'; count: number }
  | { kind: 'drop'; order: 'highest' | 'lowest'; count: number }
  | { kind: 'reroll'; op: CompareOp; target: number }
  | { kind: 'explode'; op: CompareOp; target: number }
  | { kind: 'success'; op: CompareOp; target: number }
  | { kind: 'margin'; op: CompareOp; target: number };

type CompareOp = '=' | '<' | '<=' | '>' | '>=';

type Node =
  | { type: 'number'; value: number }
  | { type: 'dice'; count: number; sides: number; modifiers: Modifier[] }
  | { type: 'pool'; items: Node[]; modifiers: Modifier[] }
  | { type: 'unary'; op: '+' | '-'; value: Node }
  | { type: 'binary'; op: '+' | '-' | '*' | '/'; left: Node; right: Node }
  | { type: 'function'; name: string; value: Node };

type EvalResult = {
  value: number;
  detail: string;
};

type AverageResult =
  | { ok: true; value: number }
  | { ok: false; reason: string };

type ExactDistribution =
  | { ok: true; values: Map<number, number> }
  | { ok: false; reason: string };

const HELP_TEXT = [
  'Examples: 4d6kh3, 4d6dl1, 3d4dh1, 3d4kl1',
  'Reroll: 2d4r1, 2d4r<2, 2d4r<=2, 2d4r>2, 2d4r>=3',
  'Explode: 2d4x4, 2d4x<2, 2d4x<=2, 2d4x>2, 2d4x>=3',
  'Successes: 2d4cs=4, 2d4cs<2, 2d4cs<=2, 2d4cs>2, 2d4cs>=3',
  'Margin: 2d4ms=4',
  'Pools: {2d8, 1d6}, {1d20+7, 10}kh1',
  'Functions: floor(1.5), ceil(1.5), round(1.5), avg(8d6), dmax(8d6), dmin(8d6), sign(1d6-3), abs(1d6-3)',
  'Labels: Fireball: 8d6',
  'Macros: /macro list, /macro add myName 1d2+3, /macro remove myName, #myName',
  'Iteration: /iterroll roll count [target]',
  'Other commands: /clear, /help',
].join('\n');

export function createDiceRollerEntry(input: string, output: string, detail?: string): DiceRollEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    input,
    output,
    detail,
    timestamp: Date.now(),
  };
}

export function runDiceRollerCommand(rawInput: string, state: DiceRollerState): DiceRollerState {
  const input = rawInput.trim();
  if (!input) return state;

  const pushEntry = (output: string, detail?: string): DiceRollerState => ({
    ...state,
    history: [createDiceRollerEntry(input, output, detail), ...state.history],
    inputHistory: [input, ...state.inputHistory.filter(item => item !== input)].slice(0, 100),
  });

  try {
    if (input === '/clear') {
      return {
        ...state,
        history: [],
        inputHistory: [input, ...state.inputHistory.filter(item => item !== input)].slice(0, 100),
      };
    }

    if (input === '/help') {
      return pushEntry('Help', HELP_TEXT);
    }

    if (input === '/macro list') {
      const names = Object.keys(state.macros).sort();
      return pushEntry('Macros', names.length ? names.map(name => `#${name}: ${state.macros[name]}`).join('\n') : 'No saved macros.');
    }

    if (input.startsWith('/macro add ')) {
      const rest = input.slice('/macro add '.length).trim();
      const match = /^([^\s#]+)\s+(.+)$/.exec(rest);
      if (!match) throw new Error('Use /macro add myName 1d2+3.');
      const [, name, expression] = match;
      parseExpression(expression);
      return {
        ...pushEntry(`Saved #${name}`, expression),
        macros: { ...state.macros, [name]: expression },
      };
    }

    if (input.startsWith('/macro remove ')) {
      const name = input.slice('/macro remove '.length).trim();
      if (!name || /\s|#/.test(name)) throw new Error('Macro names should not contain spaces or hashes.');
      const { [name]: removed, ...macros } = state.macros;
      return {
        ...pushEntry(removed ? `Removed #${name}` : `No macro named #${name}.`),
        macros,
      };
    }

    if (input.startsWith('#')) {
      const name = input.slice(1).trim();
      const expression = state.macros[name];
      if (!expression) throw new Error(`No macro named #${name}.`);
      const result = rollExpression(expression);
      return pushEntry(`#${name} = ${result.value}`, `${expression}\n${result.detail}`);
    }

    if (input.startsWith('/iterroll ')) {
      return pushEntry(...runIterRoll(input.slice('/iterroll '.length).trim()));
    }

    const { label, expression } = splitLabel(input);
    const result = rollExpression(expression);
    const avg = averageExpression(expression);
    const avgText = avg.ok ? `, avg ${formatNumber(avg.value)}` : '';
    return pushEntry(`${label ? `${label}: ` : ''}${result.value}${avgText}`, result.detail);
  } catch (error) {
    return pushEntry('Error', error instanceof Error ? error.message : String(error));
  }
}

export function rollExpression(source: string): EvalResult {
  const node = parseExpression(source);
  return evaluate(node);
}

export function averageExpression(source: string): AverageResult {
  try {
    const node = parseExpression(source);
    return average(node);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

function runIterRoll(source: string): [string, string] {
  const match = /^(.+?)\s+(\d+)(?:\s+(-?\d+(?:\.\d+)?))?$/.exec(source);
  if (!match) throw new Error('Use /iterroll roll count [target].');
  const [, expression, countText, targetText] = match;
  const count = Number(countText);
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error('Iteration count must be an integer from 1 to 1000.');
  const target = targetText == null ? null : Number(targetText);
  let successes = 0;
  const lines: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const result = rollExpression(expression);
    if (target != null && result.value >= target) successes += 1;
    lines.push(`${i + 1}. ${result.value}`);
  }
  const output = target == null ? `${count} rolls` : `${successes}/${count} >= ${target}`;
  return [output, lines.join('\n')];
}

function splitLabel(input: string): { label: string; expression: string } {
  const colon = input.indexOf(':');
  if (colon <= 0) return { label: '', expression: input };
  return {
    label: input.slice(0, colon).trim(),
    expression: input.slice(colon + 1).trim(),
  };
}

class Parser {
  private index = 0;
  private readonly source: string;

  constructor(source: string) {
    this.source = source;
  }

  parse(): Node {
    const node = this.parseAddSub();
    this.skipSpace();
    if (!this.isEnd()) throw new Error(`Unexpected token at "${this.source.slice(this.index)}".`);
    return node;
  }

  private parseAddSub(): Node {
    let node = this.parseMulDiv();
    for (;;) {
      this.skipSpace();
      if (this.consume('+')) node = { type: 'binary', op: '+', left: node, right: this.parseMulDiv() };
      else if (this.consume('-')) node = { type: 'binary', op: '-', left: node, right: this.parseMulDiv() };
      else return node;
    }
  }

  private parseMulDiv(): Node {
    let node = this.parseUnary();
    for (;;) {
      this.skipSpace();
      if (this.consume('*')) node = { type: 'binary', op: '*', left: node, right: this.parseUnary() };
      else if (this.consume('/')) node = { type: 'binary', op: '/', left: node, right: this.parseUnary() };
      else return node;
    }
  }

  private parseUnary(): Node {
    this.skipSpace();
    if (this.consume('+')) return { type: 'unary', op: '+', value: this.parseUnary() };
    if (this.consume('-')) return { type: 'unary', op: '-', value: this.parseUnary() };
    return this.parsePrimary();
  }

  private parsePrimary(): Node {
    this.skipSpace();
    if (this.consume('(')) {
      const node = this.parseAddSub();
      this.expect(')');
      return node;
    }
    if (this.consume('{')) {
      const items: Node[] = [];
      do {
        items.push(this.parseAddSub());
        this.skipSpace();
      } while (this.consume(','));
      this.expect('}');
      return this.parseModifiers({ type: 'pool', items, modifiers: [] });
    }

    const ident = this.readIdent();
    if (ident) {
      this.skipSpace();
      if (ident.toLowerCase() === 'd' && /\d/.test(this.peek())) {
        const sides = this.readPositiveInteger();
        return this.parseModifiers({ type: 'dice', count: 1, sides, modifiers: [] });
      }
      this.expect('(');
      const value = this.parseAddSub();
      this.expect(')');
      return { type: 'function', name: ident.toLowerCase(), value };
    }

    const number = this.readNumber();
    if (number != null) {
      this.skipSpace();
      if (this.consume('d')) {
        const sides = this.readPositiveInteger();
        return this.parseModifiers({ type: 'dice', count: number, sides, modifiers: [] });
      }
      return { type: 'number', value: number };
    }

    if (this.consume('d')) {
      const sides = this.readPositiveInteger();
      return this.parseModifiers({ type: 'dice', count: 1, sides, modifiers: [] });
    }

    throw new Error(`Unexpected token at "${this.source.slice(this.index)}".`);
  }

  private parseModifiers<T extends Extract<Node, { modifiers: Modifier[] }>>(node: T): T {
    for (;;) {
      this.skipSpace();
      const start = this.index;
      if (this.consume('kh')) node.modifiers.push({ kind: 'keep', order: 'highest', count: this.readPositiveInteger() });
      else if (this.consume('kl')) node.modifiers.push({ kind: 'keep', order: 'lowest', count: this.readPositiveInteger() });
      else if (this.consume('dh')) node.modifiers.push({ kind: 'drop', order: 'highest', count: this.readPositiveInteger() });
      else if (this.consume('dl')) node.modifiers.push({ kind: 'drop', order: 'lowest', count: this.readPositiveInteger() });
      else if (this.consume('cs')) node.modifiers.push({ kind: 'success', ...this.readCompareWithDefault('=') });
      else if (this.consume('ms')) node.modifiers.push({ kind: 'margin', ...this.readCompareWithDefault('=') });
      else if (this.consume('r')) node.modifiers.push({ kind: 'reroll', ...this.readCompareWithDefault('=') });
      else if (this.consume('x')) node.modifiers.push({ kind: 'explode', ...this.readCompareWithDefault('=') });
      else {
        this.index = start;
        return node;
      }
    }
  }

  private readCompareWithDefault(defaultOp: CompareOp): { op: CompareOp; target: number } {
    this.skipSpace();
    let op: CompareOp = defaultOp;
    if (this.consume('<=')) op = '<=';
    else if (this.consume('>=')) op = '>=';
    else if (this.consume('<')) op = '<';
    else if (this.consume('>')) op = '>';
    else if (this.consume('=')) op = '=';
    return { op, target: this.readNumberRequired() };
  }

  private readIdent(): string {
    this.skipSpace();
    const match = /^[A-Za-z_][A-Za-z_]*/.exec(this.source.slice(this.index));
    if (!match) return '';
    this.index += match[0].length;
    return match[0];
  }

  private readNumber(): number | null {
    this.skipSpace();
    const match = /^\d+(?:\.\d+)?/.exec(this.source.slice(this.index));
    if (!match) return null;
    this.index += match[0].length;
    return Number(match[0]);
  }

  private readNumberRequired(): number {
    const value = this.readNumber();
    if (value == null) throw new Error('Expected a number.');
    return value;
  }

  private readPositiveInteger(): number {
    const value = this.readNumberRequired();
    if (!Number.isInteger(value) || value <= 0) throw new Error('Expected a positive integer.');
    return value;
  }

  private consume(text: string): boolean {
    this.skipSpace();
    if (!this.source.slice(this.index).startsWith(text)) return false;
    this.index += text.length;
    return true;
  }

  private expect(text: string): void {
    if (!this.consume(text)) throw new Error(`Expected "${text}".`);
  }

  private peek(): string {
    this.skipSpace();
    return this.source[this.index] || '';
  }

  private skipSpace(): void {
    while (/\s/.test(this.source[this.index] || '')) this.index += 1;
  }

  private isEnd(): boolean {
    return this.index >= this.source.length;
  }
}

function parseExpression(source: string): Node {
  if (!source.trim()) throw new Error('Expected an expression.');
  return new Parser(source).parse();
}

function evaluate(node: Node): EvalResult {
  switch (node.type) {
    case 'number':
      return { value: node.value, detail: formatNumber(node.value) };
    case 'unary': {
      const value = evaluate(node.value);
      return { value: node.op === '-' ? -value.value : value.value, detail: `${node.op}${value.detail}` };
    }
    case 'binary': {
      const left = evaluate(node.left);
      const right = evaluate(node.right);
      const value = applyBinary(node.op, left.value, right.value);
      return { value, detail: `(${left.detail} ${node.op} ${right.detail}) = ${formatNumber(value)}` };
    }
    case 'function':
      return evaluateFunction(node);
    case 'dice':
      return evaluateDice(node);
    case 'pool':
      return evaluatePool(node);
  }
}

function evaluateFunction(node: Extract<Node, { type: 'function' }>): EvalResult {
  if (node.name === 'avg') {
    const avg = average(node.value);
    if (!avg.ok) throw new Error(`Average is not available: ${avg.reason}`);
    return { value: avg.value, detail: `avg = ${formatNumber(avg.value)}` };
  }
  if (node.name === 'dmax') {
    const value = extremum(node.value, 'max');
    return { value, detail: `max = ${formatNumber(value)}` };
  }
  if (node.name === 'dmin') {
    const value = extremum(node.value, 'min');
    return { value, detail: `min = ${formatNumber(value)}` };
  }

  const value = evaluate(node.value);
  const functions: Record<string, (x: number) => number> = {
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    sign: Math.sign,
    abs: Math.abs,
  };
  const fn = functions[node.name];
  if (!fn) throw new Error(`Unknown function "${node.name}".`);
  const next = fn(value.value);
  return { value: next, detail: `${node.name}(${value.detail}) = ${formatNumber(next)}` };
}

function evaluateDice(node: Extract<Node, { type: 'dice' }>): EvalResult {
  validateDice(node.count, node.sides);
  let rolls = Array.from({ length: node.count }, () => rollDie(node.sides));
  const detail: string[] = [`${node.count}d${node.sides}: [${rolls.join(', ')}]`];

  for (const modifier of node.modifiers) {
    if (modifier.kind === 'reroll') {
      rolls = rolls.map(roll => {
        const original = roll;
        let next = roll;
        let attempts = 0;
        while (matchesCompare(next, modifier.op, modifier.target)) {
          attempts += 1;
          if (attempts > 100) throw new Error('Reroll did not terminate because every die face matches.');
          next = rollDie(node.sides);
        }
        return original === next ? next : next;
      });
      detail.push(`reroll ${modifier.op}${modifier.target}: [${rolls.join(', ')}]`);
    } else if (modifier.kind === 'explode') {
      const exploded: number[] = [];
      for (const roll of rolls) {
        exploded.push(roll);
        let next = roll;
        let attempts = 0;
        while (matchesCompare(next, modifier.op, modifier.target)) {
          attempts += 1;
          if (attempts > 100) throw new Error('Explosion did not terminate because every die face matches.');
          next = rollDie(node.sides);
          exploded.push(next);
        }
      }
      rolls = exploded;
      detail.push(`explode ${modifier.op}${modifier.target}: [${rolls.join(', ')}]`);
    } else if (modifier.kind === 'keep' || modifier.kind === 'drop') {
      rolls = applyKeepDrop(rolls, modifier);
      detail.push(`${modifier.kind} ${modifier.order} ${modifier.count}: [${rolls.join(', ')}]`);
    } else if (modifier.kind === 'success') {
      const value = rolls.filter(roll => matchesCompare(roll, modifier.op, modifier.target)).length;
      return { value, detail: `${detail.join('\n')}\nsuccesses ${modifier.op}${modifier.target}: ${value}` };
    } else if (modifier.kind === 'margin') {
      const total = rolls.reduce((sum, roll) => sum + roll, 0);
      const margin = total - modifier.target;
      return { value: margin, detail: `${detail.join('\n')}\nmargin vs ${modifier.target}: ${total} - ${modifier.target} = ${margin}` };
    }
  }

  const total = rolls.reduce((sum, roll) => sum + roll, 0);
  return { value: total, detail: `${detail.join('\n')}\ntotal = ${total}` };
}

function evaluatePool(node: Extract<Node, { type: 'pool' }>): EvalResult {
  let values = node.items.map(item => evaluate(item));
  const detail = [`pool: [${values.map(item => item.value).join(', ')}]`];
  for (const modifier of node.modifiers) {
    if (modifier.kind !== 'keep' && modifier.kind !== 'drop') {
      throw new Error('Dice pools only support keep/drop modifiers.');
    }
    const kept = applyKeepDrop(values.map(item => item.value), modifier);
    values = kept.map(value => ({ value, detail: formatNumber(value) }));
    detail.push(`${modifier.kind} ${modifier.order} ${modifier.count}: [${kept.join(', ')}]`);
  }
  const total = values.reduce((sum, item) => sum + item.value, 0);
  return { value: total, detail: `${detail.join('\n')}\ntotal = ${formatNumber(total)}` };
}

function average(node: Node): AverageResult {
  switch (node.type) {
    case 'number':
      return { ok: true, value: node.value };
    case 'unary': {
      const value = average(node.value);
      if (!value.ok) return value;
      return { ok: true, value: node.op === '-' ? -value.value : value.value };
    }
    case 'binary': {
      const left = average(node.left);
      const right = average(node.right);
      if (!left.ok) return left;
      if (!right.ok) return right;
      if ((node.op === '*' || node.op === '/') && !isDeterministic(node.left) && !isDeterministic(node.right)) {
        return { ok: false, reason: 'products or quotients of random expressions need a full joint distribution.' };
      }
      return { ok: true, value: applyBinary(node.op, left.value, right.value) };
    }
    case 'function': {
      if (node.name === 'avg') return average(node.value);
      if (node.name === 'dmax') return { ok: true, value: extremum(node.value, 'max') };
      if (node.name === 'dmin') return { ok: true, value: extremum(node.value, 'min') };
      if (isDeterministic(node.value)) {
        return { ok: true, value: evaluateFunction(node).value };
      }
      return { ok: false, reason: `average through ${node.name} is not implemented for random inputs.` };
    }
    case 'dice':
      return averageDice(node);
    case 'pool':
      return averagePool(node);
  }
}

function averageDice(node: Extract<Node, { type: 'dice' }>): AverageResult {
  validateDice(node.count, node.sides);
  if (!node.modifiers.length) return { ok: true, value: node.count * (node.sides + 1) / 2 };

  const terminal = node.modifiers.find(modifier => modifier.kind === 'success' || modifier.kind === 'margin');
  const nonTerminal = terminal ? node.modifiers.slice(0, node.modifiers.indexOf(terminal)) : node.modifiers;

  if (terminal?.kind === 'success' && nonTerminal.length === 0) {
    const p = faceValues(node.sides).filter(face => matchesCompare(face, terminal.op, terminal.target)).length / node.sides;
    return { ok: true, value: node.count * p };
  }

  if (terminal?.kind === 'margin' && nonTerminal.length === 0) {
    return { ok: true, value: node.count * (node.sides + 1) / 2 - terminal.target };
  }

  if (nonTerminal.length > 0 && nonTerminal.every(modifier => modifier.kind === 'reroll')) {
    const dieMean = averageSingleDieAfterReroll(node.sides, nonTerminal as Extract<Modifier, { kind: 'reroll' }>[]);
    if (!dieMean.ok) return dieMean;
    if (terminal?.kind === 'success') {
      return { ok: false, reason: 'success averages after reroll are not implemented.' };
    }
    if (terminal?.kind === 'margin') {
      return { ok: true, value: node.count * dieMean.value - terminal.target };
    }
    return { ok: true, value: node.count * dieMean.value };
  }

  if (nonTerminal.length > 0 && nonTerminal.every(modifier => modifier.kind === 'explode')) {
    const dieMean = averageSingleDieAfterExplode(node.sides, nonTerminal as Extract<Modifier, { kind: 'explode' }>[]);
    if (!dieMean.ok) return dieMean;
    if (terminal?.kind === 'success') {
      return { ok: false, reason: 'success averages after explosion are not implemented.' };
    }
    if (terminal?.kind === 'margin') {
      return { ok: true, value: node.count * dieMean.value - terminal.target };
    }
    return { ok: true, value: node.count * dieMean.value };
  }

  if (nonTerminal.length > 0 && nonTerminal.every(modifier => modifier.kind === 'keep' || modifier.kind === 'drop')) {
    const exact = exactKeepDropAverage(node.count, node.sides, nonTerminal as Extract<Modifier, { kind: 'keep' | 'drop' }>[]);
    if (!exact.ok) return exact;
    if (terminal?.kind === 'margin') return { ok: true, value: exact.value - terminal.target };
    if (terminal?.kind === 'success') return { ok: false, reason: 'success averages after keep/drop are not implemented.' };
    return exact;
  }

  return { ok: false, reason: 'this modifier combination is not implemented for exact averages.' };
}

function averagePool(node: Extract<Node, { type: 'pool' }>): AverageResult {
  if (!node.modifiers.length) {
    const values = node.items.map(average);
    const failed = values.find(value => !value.ok);
    if (failed && !failed.ok) return failed;
    return { ok: true, value: (values as { ok: true; value: number }[]).reduce((sum, item) => sum + item.value, 0) };
  }
  return { ok: false, reason: 'dice pool keep/drop averages are not implemented.' };
}

function exactKeepDropAverage(
  count: number,
  sides: number,
  modifiers: Extract<Modifier, { kind: 'keep' | 'drop' }>[],
): AverageResult {
  if (count > 30 || sides > 100) return { ok: false, reason: 'exact keep/drop averages are capped at 30 dice and 100 sides.' };
  const factorials = [1];
  for (let i = 1; i <= count; i += 1) factorials[i] = factorials[i - 1] * i;
  let weighted = 0;

  const walk = (face: number, remaining: number, counts: number[]) => {
    if (face === sides) {
      counts.push(remaining);
      const rolls: number[] = [];
      for (let i = 0; i < counts.length; i += 1) {
        for (let j = 0; j < counts[i]; j += 1) rolls.push(i + 1);
      }
      let kept = rolls;
      for (const modifier of modifiers) kept = applyKeepDrop(kept, modifier);
      const sum = kept.reduce((acc, roll) => acc + roll, 0);
      const probabilityNumerator = factorials[count] / counts.reduce((acc, value) => acc * factorials[value], 1);
      weighted += sum * probabilityNumerator;
      counts.pop();
      return;
    }
    for (let used = 0; used <= remaining; used += 1) {
      counts.push(used);
      walk(face + 1, remaining - used, counts);
      counts.pop();
    }
  };

  walk(1, count, []);
  return { ok: true, value: weighted / (sides ** count) };
}

function exactDistribution(node: Node): ExactDistribution {
  if (node.type === 'number') return { ok: true, values: new Map([[node.value, 1]]) };
  if (node.type !== 'dice' || node.modifiers.some(modifier => modifier.kind === 'explode')) {
    return { ok: false, reason: 'exact distributions are only available for finite dice expressions.' };
  }
  validateDice(node.count, node.sides);
  if (node.count > 8 || node.sides > 20) return { ok: false, reason: 'exact distribution is capped at 8 dice and 20 sides.' };
  const values = new Map<number, number>();
  const walk = (rolls: number[]) => {
    if (rolls.length === node.count) {
      let kept = rolls;
      for (const modifier of node.modifiers) {
        if (modifier.kind === 'keep' || modifier.kind === 'drop') kept = applyKeepDrop(kept, modifier);
        else if (modifier.kind === 'success') {
          const successes = kept.filter(roll => matchesCompare(roll, modifier.op, modifier.target)).length;
          values.set(successes, (values.get(successes) || 0) + 1);
          return;
        } else if (modifier.kind === 'margin') {
          const margin = kept.reduce((sum, roll) => sum + roll, 0) - modifier.target;
          values.set(margin, (values.get(margin) || 0) + 1);
          return;
        } else if (modifier.kind === 'reroll') {
          return;
        }
      }
      const sum = kept.reduce((acc, roll) => acc + roll, 0);
      values.set(sum, (values.get(sum) || 0) + 1);
      return;
    }
    for (let face = 1; face <= node.sides; face += 1) walk([...rolls, face]);
  };
  walk([]);
  return { ok: true, values };
}

function averageSingleDieAfterReroll(sides: number, modifiers: Extract<Modifier, { kind: 'reroll' }>[]): AverageResult {
  let allowed = faceValues(sides);
  for (const modifier of modifiers) {
    allowed = allowed.filter(face => !matchesCompare(face, modifier.op, modifier.target));
    if (!allowed.length) return { ok: false, reason: 'reroll condition matches every die face, so the expectation is undefined.' };
  }
  return { ok: true, value: allowed.reduce((sum, face) => sum + face, 0) / allowed.length };
}

function averageSingleDieAfterExplode(sides: number, modifiers: Extract<Modifier, { kind: 'explode' }>[]): AverageResult {
  if (modifiers.length !== 1) return { ok: false, reason: 'exact explosion averages support one explode modifier.' };
  const faces = faceValues(sides);
  const exploding = faces.filter(face => matchesCompare(face, modifiers[0].op, modifiers[0].target));
  if (exploding.length === sides) return { ok: false, reason: 'explode condition matches every die face, so the expectation is infinite.' };
  const baseMean = (sides + 1) / 2;
  const p = exploding.length / sides;
  return { ok: true, value: baseMean / (1 - p) };
}

function extremum(node: Node, mode: 'min' | 'max'): number {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'unary': {
      const value = extremum(node.value, mode);
      return node.op === '-' ? -value : value;
    }
    case 'binary': {
      const left = extremum(node.left, mode);
      const right = extremum(node.right, mode);
      return applyBinary(node.op, left, right);
    }
    case 'function':
      if (node.name === 'avg') {
        const avg = average(node.value);
        if (!avg.ok) throw new Error(`Average is not available: ${avg.reason}`);
        return avg.value;
      }
      if (node.name === 'dmax') return extremum(node.value, 'max');
      if (node.name === 'dmin') return extremum(node.value, 'min');
      return evaluateFunction({ ...node, value: { type: 'number', value: extremum(node.value, mode) } }).value;
    case 'dice': {
      if (node.modifiers.some(modifier => modifier.kind === 'reroll' || modifier.kind === 'explode')) {
        throw new Error('dmax/dmin for reroll or explode dice is not implemented.');
      }
      const dist = exactDistribution(node);
      if (!dist.ok) throw new Error(dist.reason);
      const values = [...dist.values.keys()];
      return mode === 'max' ? Math.max(...values) : Math.min(...values);
    }
    case 'pool': {
      const values = node.items.map(item => extremum(item, mode));
      let kept = values;
      for (const modifier of node.modifiers) {
        if (modifier.kind !== 'keep' && modifier.kind !== 'drop') throw new Error('Dice pools only support keep/drop modifiers.');
        kept = applyKeepDrop(kept, modifier);
      }
      return kept.reduce((sum, value) => sum + value, 0);
    }
  }
}

function applyBinary(op: '+' | '-' | '*' | '/', left: number, right: number): number {
  if (op === '+') return left + right;
  if (op === '-') return left - right;
  if (op === '*') return left * right;
  if (right === 0) throw new Error('Division by zero.');
  return left / right;
}

function applyKeepDrop(rolls: number[], modifier: Extract<Modifier, { kind: 'keep' | 'drop' }>): number[] {
  const indexed = rolls.map((value, index) => ({ value, index }));
  const ascending = [...indexed].sort((a, b) => a.value - b.value || a.index - b.index);
  const selected = new Set<number>();
  const count = Math.min(modifier.count, rolls.length);
  const slice = modifier.order === 'highest' ? ascending.slice(-count) : ascending.slice(0, count);
  for (const item of slice) selected.add(item.index);
  return indexed
    .filter(item => modifier.kind === 'keep' ? selected.has(item.index) : !selected.has(item.index))
    .map(item => item.value);
}

function matchesCompare(value: number, op: CompareOp, target: number): boolean {
  if (op === '=') return value === target;
  if (op === '<') return value < target;
  if (op === '<=') return value <= target;
  if (op === '>') return value > target;
  return value >= target;
}

function isDeterministic(node: Node): boolean {
  if (node.type === 'number') return true;
  if (node.type === 'dice' || node.type === 'pool') return false;
  if (node.type === 'unary' || node.type === 'function') return isDeterministic(node.value);
  return isDeterministic(node.left) && isDeterministic(node.right);
}

function validateDice(count: number, sides: number): void {
  if (!Number.isInteger(count) || !Number.isInteger(sides) || count < 1 || sides < 1) {
    throw new Error('Dice counts and sides must be positive integers.');
  }
  if (count > 1000 || sides > 100000) throw new Error('Dice expression is too large.');
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function faceValues(sides: number): number[] {
  return Array.from({ length: sides }, (_, index) => index + 1);
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}
