import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  createDefaultRuleAuthorizationPolicy,
  findRuleClassOption,
  getRuleBackgroundOptions,
  getRuleClassOptions,
  getRuleRaceOptions,
  getRuleSubclassOptions,
  getRuleSubraceOptions,
  isRuleEntityAuthorized,
  parseRuleCatalog,
  type RuleCatalog,
  type RuleContext,
  type RuleEntityKind,
} from '../src/index.ts';

test('returns authorized class and origin options with stable source priority', async () => {
  const catalog = await loadCatalog();
  const context5e = defaultContext(catalog, '5e');
  const context5r = defaultContext(catalog, '5r');

  assert.ok(getRuleClassOptions(context5e).every(({ source }) => source === 'PHB'));
  assert.ok(getRuleClassOptions(context5r).every(({ source }) => source === 'XPHB'));
  assertNoDuplicateNames(getRuleRaceOptions(context5e));
  assertNoDuplicateNames(getRuleRaceOptions(context5r));

  const backgrounds5e = getRuleBackgroundOptions(context5e);
  const backgrounds5r = getRuleBackgroundOptions(context5r);
  assertNoDuplicateNames(backgrounds5e);
  assertNoDuplicateNames(backgrounds5r);
  assert.ok(backgrounds5e.every(({ source }) => source !== 'XPHB'));
  assert.equal(
    backgrounds5r.find(({ englishName }) => englishName === 'Acolyte')?.source,
    'XPHB',
  );
  assert.ok(backgrounds5r.some(({ source }) => source === 'PHB'));
});

test('scopes subclass and subrace options to an authorized parent', async () => {
  const catalog = await loadCatalog();
  const context5e = defaultContext(catalog, '5e');
  const context5r = defaultContext(catalog, '5r');
  const fighter5e = findRuleClassOption(context5e, 'Fighter');
  const fighter5r = findRuleClassOption(context5r, 'Fighter');
  assert.ok(fighter5e);
  assert.ok(fighter5r);

  const subclasses5e = getRuleSubclassOptions(context5e, fighter5e);
  const subclasses5r = getRuleSubclassOptions(context5r, fighter5r);
  assertNoDuplicateNames(subclasses5e);
  assertNoDuplicateNames(subclasses5r);
  assert.ok(subclasses5e.every(({ source }) => source !== 'XPHB'));
  assert.equal(
    subclasses5r.find(({ englishName }) => englishName === 'Battle Master')?.source,
    'XPHB',
  );
  assert.deepEqual(getRuleSubclassOptions(context5e, fighter5r), []);

  const elf = getRuleRaceOptions(context5e).find(({ key }) => key === 'Elf');
  assert.ok(elf);
  const subraces = getRuleSubraceOptions(context5e, elf);
  assertNoDuplicateNames(subraces);
  assert.ok(subraces.every((entry) => (
    entry.raceName === elf.name && entry.raceSource === elf.source
  )));
});

test('fails closed while allowing an explicitly authorized entity id', async () => {
  const catalog = await loadCatalog();
  const aarakocra = catalog.races.find(({ key, source }) => (
    key === 'Aarakocra' && source === 'EEPC'
  ));
  assert.ok(aarakocra);
  const emptyByKind: Partial<Record<RuleEntityKind, readonly string[]>> = {};
  const context: RuleContext = {
    ruleSystem: '5e',
    catalog,
    authorization: {
      allowedSources: emptyByKind,
      allowedEntityIds: { race: ['Aarakocra|EEPC'] },
      sourcePriority: { race: ['EEPC'] },
    },
  };
  assert.equal(isRuleEntityAuthorized('race', aarakocra, context.authorization), true);
  assert.deepEqual(
    getRuleRaceOptions(context).map(({ key, source }) => `${key}|${source}`),
    ['Aarakocra|EEPC'],
  );
  assert.deepEqual(getRuleClassOptions(context), []);
  assert.deepEqual(getRuleSubraceOptions(context, aarakocra), []);
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

function defaultContext(
  catalog: RuleCatalog,
  ruleSystem: '5e' | '5r',
): RuleContext {
  return {
    ruleSystem,
    catalog,
    authorization: createDefaultRuleAuthorizationPolicy(catalog, ruleSystem),
  };
}

function assertNoDuplicateNames(
  entries: readonly { name: string; englishName?: string; key?: string }[],
): void {
  const identities = entries.map((entry) => (
    entry.englishName || entry.key || entry.name
  ).normalize('NFKC').toLocaleLowerCase('en-US'));
  assert.equal(new Set(identities).size, identities.length);
}
