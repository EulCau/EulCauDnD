import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  parseRuleCatalog, createDefaultRuleAuthorizationPolicy, getRuleClassSpellOptions,
  createRuleOriginChoiceGroups, resolveRuleOriginInheritance, applyRuleOriginFeatureChoices,
  createRuleOriginBaseEffects, getRuleFeatOptions, createRuleOriginFeatChoiceState,
  createRuleSpellcastingAdvancementState, createRuleSpellcastingAdvancementEffects,
  getRuleMagicalSecretSpellOptions, getRuleSubclassSpellBlocks, getRuleRaceOptions,
  getRuleSubraceOptions, getRuleBackgroundOptions, createRuleAdditionalSpellChoiceState,
  type RuleCharacterSnapshot, type RuleSubclass, type RuleContext,
} from '../src/index.ts';
const parsed = parseRuleCatalog(JSON.parse(readFileSync(new URL('../../../public/data/auto-builder-core.json', import.meta.url), 'utf8')));
assert.ok(parsed.ok);
const catalog = parsed.value;
const context = (ruleSystem: '5e' | '5r'): RuleContext => ({ catalog, ruleSystem, authorization: createDefaultRuleAuthorizationPolicy(catalog, ruleSystem) });
const snapshot: RuleCharacterSnapshot = {
  abilities: { STR: 13, DEX: 13, CON: 13, INT: 13, WIS: 13, CHA: 13 },
  race: '人类', subrace: '变体', background: '', classes: [{ name: 'Wizard', level: 1 }],
  proficiencies: [], knownFeats: [], hasSpellcasting: true, hasSpellcastingFeature: true,
  campaigns: ['艾伯伦', '龙枪', '鸦阁魔域', '异度风景'],
};
function subclass(classKey: string, key: string, source: string, classSource = 'PHB', blockName?: string) {
  const cls = catalog.classes.find(entry => entry.key === classKey && entry.source === classSource)!;
  const sub = catalog.subclasses.find(entry => entry.key === key && entry.source === source && entry.classSource === classSource)!;
  assert.ok(cls && sub);
  const block = getRuleSubclassSpellBlocks(sub).find(entry => entry.name === blockName);
  return { cls, sub: { ...sub, selectedSpellBlock: block?.id } as RuleSubclass };
}
function spell(key: string, source = 'PHB') {
  const found = catalog.spells.find(entry => entry.englishName === key && entry.source === source);
  assert.ok(found, key); return found;
}

test('null clears inherited skill choices and resistance without mutating metadata', () => {
  for (const key of ['Draconblood', 'Ravenite', 'Variant; Mark of Detection', 'Variant; Mark of Storm', 'Variant; Mark of Finding']) {
    const child = catalog.subraces.find(entry => entry.key === key && (key !== 'Variant; Mark of Finding' || entry.raceName === '半兽人'))!;
    const parent = catalog.races.find(entry => entry.name === child.raceName && entry.source === child.raceSource)!;
    const before = JSON.stringify([parent, child]);
    const merged = resolveRuleOriginInheritance([parent, child]);
    const state = createRuleOriginChoiceGroups(catalog, '5e', merged);
    assert.ok(state.ok, key);
    if (key === 'Draconblood' || key === 'Ravenite') {
      assert.equal(state.value.resistance.length, 0);
      assert.equal(merged[0]?.resist, undefined);
    } else assert.equal(state.value.skill.length, 0);
    assert.equal(JSON.stringify([parent, child]), before);
  }
});

test('origin feats retain qualified prerequisites and campaign choices are meaningful', () => {
  const human = catalog.subraces.find(entry => entry.key === 'Variant' && entry.raceName === '人类')!;
  const eligible = getRuleFeatOptions(context('5e'), snapshot, 1);
  const choices = createRuleOriginFeatChoiceState(human, eligible);
  assert.ok(choices.ok && choices.value);
  assert.ok(choices.value.options.some(entry => entry.key === 'War Caster' && entry.source === 'PHB'));
  assert.ok(choices.value.options.some(entry => entry.key === 'Defensive Duelist'));
  assert.ok(eligible.some(entry => entry.key === 'Initiate of High Sorcery'));
  assert.ok(eligible.some(entry => entry.key === 'Mark of Detection'));
  const noCampaign = getRuleFeatOptions(context('5e'), { ...snapshot, campaigns: [] }, 1);
  assert.ok(!noCampaign.some(entry => entry.key === 'Mark of Detection' && entry.source === 'EFA'));
});

test('repeatable feats remain available while nonrepeatable feats stay excluded', () => {
  for (const key of ['Magic Initiate', 'Elemental Adept', 'Skilled', 'Alert']) {
    const feat = catalog.feats.find(entry => entry.key === key && entry.source === 'XPHB')!;
    const options = getRuleFeatOptions(context('5r'), { ...snapshot, knownFeats: [{ key, source: 'XPHB', name: feat.name }] }, 4);
    assert.equal(options.some(entry => entry.key === key && entry.source === 'XPHB'), key !== 'Alert');
  }
});

test('named subclass branches separate automatic spells and expanded options', () => {
  const divine = subclass('Sorcerer', 'Divine Soul', 'XGE', 'PHB', '善良');
  const result = createRuleSpellcastingAdvancementState(context('5e'), divine.cls, 0, 1, [], divine.sub);
  assert.ok(result.ok && result.value);
  assert.ok(result.value.cantrips.some(entry => entry.id === spell('Guidance').id));
  assert.ok(result.value.leveled.some(entry => entry.id === spell('Bless').id));
  assert.ok(result.value.automaticSpells.some(entry => entry.id === spell('Cure Wounds').id));
  for (const [name, allowed, denied] of [['土巨灵', 'Spike Growth', 'Thunderwave'], ['气巨灵', 'Thunderwave', 'Spike Growth']]) {
    const genie = subclass('Warlock', 'The Genie', 'TCE', 'PHB', name);
    const state = createRuleSpellcastingAdvancementState(context('5e'), genie.cls, 2, 3, [], genie.sub);
    assert.ok(state.ok && state.value);
    assert.ok(state.value.leveled.some(entry => entry.englishName === allowed));
    assert.ok(!state.value.leveled.some(entry => entry.englishName === denied));
  }
  for (const [source, branch, granted] of [['PHB', '海岸', 'Misty Step'], ['XPHB', '温带', 'Shocking Grasp']]) {
    const land = subclass('Druid', 'Circle of the Land', source, source, branch);
    const ctx = context(source === 'XPHB' ? '5r' : '5e');
    const state = createRuleSpellcastingAdvancementState(ctx, land.cls, 2, 3, [], land.sub);
    assert.ok(state.ok && state.value);
    assert.ok(state.value.automaticSpells.some(entry => entry.englishName === granted));
    const selected = new Set<string>();
    const selections = Object.fromEntries(state.value.groups.map(group => {
      const ids = group.options.filter(entry => !selected.has(entry.id)).slice(0, group.min).map(entry => entry.id);
      ids.forEach(id => selected.add(id)); return [group.id, ids];
    }));
    const effects = createRuleSpellcastingAdvancementEffects(ctx, state.value, { selections });
    assert.ok(effects.ok);
    const profile = effects.value.find(effect => effect.type === 'spell.profile.upsert');
    assert.ok(profile?.type === 'spell.profile.upsert');
    assert.ok(profile.profile.spells.some(entry => entry.id === spell(granted, source).id && entry.alwaysPrepared));
  }
});

test('2014 magical secrets include every class and lore grants an additional level-six choice', () => {
  const all = getRuleMagicalSecretSpellOptions(context('5e'), 5);
  const revised = getRuleMagicalSecretSpellOptions(context('5r'), 5);
  for (const key of ['Eldritch Blast', "Hunter's Mark", 'Armor of Agathys', 'Swift Quiver']) {
    assert.ok(all.some(entry => entry.englishName === key), key);
    assert.ok(!revised.some(entry => entry.englishName === key), key);
  }
  const lore = subclass('Bard', 'College of Lore', 'PHB');
  const state = createRuleSpellcastingAdvancementState(context('5e'), lore.cls, 5, 6, [], lore.sub);
  assert.ok(state.ok && state.value);
  assert.equal(state.value.magicalSecretGroups.length, 1);
  assert.equal(state.value.magicalSecretGroups[0]?.min, 2);
});

test('kobold legacy is exclusive and other species branches are selectable', () => {
  const kobold = catalog.races.find(entry => entry.key === 'Kobold' && entry.source === 'MPMM')!;
  for (const branch of ['craftiness', 'defiance', 'draconic-sorcery']) {
    const projected = applyRuleOriginFeatureChoices(kobold, { 'kobold-legacy': branch });
    const groups = createRuleOriginChoiceGroups(catalog, '5e', [projected]);
    assert.ok(groups.ok);
    assert.equal(groups.value.skill.length > 0, branch === 'craftiness');
    assert.equal(Boolean(projected.additionalSpells?.length), branch === 'draconic-sorcery');
    const effects = createRuleOriginBaseEffects(catalog, '5e', projected, { choices: { 'kobold-legacy': [branch] }, allowIncompleteChoices: true });
    assert.ok(effects.ok);
  }
  for (const [key, groupId, count] of [['Shifter', 'shifting-form', 4], ['Aasimar', 'celestial-revelation', 3]] as const) {
    const origin = catalog.races.find(entry => entry.key === key && entry.source === 'MPMM')!;
    const groups = createRuleOriginChoiceGroups(catalog, '5e', [origin]);
    assert.ok(groups.ok);
    assert.equal(groups.value.feature.find(group => group.id === groupId)?.options.length, count);
  }
});

test('default authorization includes all catalog sources and every visible origin parses', () => {
  const wizard = catalog.classes.find(entry => entry.key === 'Wizard' && entry.source === 'PHB')!;
  assert.ok(getRuleClassSpellOptions(context('5e'), wizard, 9).some(entry => entry.source === 'AU'));
  assert.ok(getRuleFeatOptions(context('5r'), snapshot, 20).some(entry => entry.source === 'AU'));
  for (const system of ['5e', '5r'] as const) {
    const ctx = context(system);
    assert.equal(getRuleRaceOptions(ctx).length, catalog.races.length);
    assert.equal(getRuleBackgroundOptions(ctx).length, catalog.backgrounds.length);
    for (const parent of getRuleRaceOptions(ctx)) for (const child of [undefined, ...getRuleSubraceOptions(ctx, parent)]) {
      const groups = createRuleOriginChoiceGroups(catalog, system, [parent, child]);
      assert.ok(groups.ok, `${parent.key}|${parent.source} / ${child?.key}`);
    }
    for (const background of getRuleBackgroundOptions(ctx)) {
      const groups = createRuleOriginChoiceGroups(catalog, system, [background]);
      assert.ok(groups.ok, `${background.key}|${background.source}: ${JSON.stringify(groups)}`);
    }
  }
});

test('every subclass spell branch parses through all supported class levels', () => {
  let states = 0;
  for (const sub of catalog.subclasses) {
    const cls = catalog.classes.find(entry => entry.name === sub.className && entry.source === sub.classSource);
    if (!cls) continue;
    const blocks = getRuleSubclassSpellBlocks(sub);
    for (const block of blocks.length ? blocks : [{ id: undefined }]) {
      for (let level = 1; level <= 20; level += 1) {
        const result = createRuleSpellcastingAdvancementState(context(cls.ruleSystem), cls, level - 1, level, [], { ...sub, selectedSpellBlock: block.id });
        assert.ok(result.ok, `${sub.id}/${block.id}/${level}: ${JSON.stringify(result.ok ? [] : result.issues)}`);
        states += 1;
      }
    }
  }
  assert.ok(states > 6000);
});
