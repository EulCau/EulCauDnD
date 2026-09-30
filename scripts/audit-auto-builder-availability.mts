import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as U from '../utils/autoBuilderRules.ts';
import * as R from '../packages/rules-core/src/index.ts';
import { INITIAL_CHARACTER } from '../types.ts';
import { serializeCharacter, parseCharacterJson } from '../utils/characterStorage.ts';
const parsed = R.parseRuleCatalog(JSON.parse(readFileSync('public/data/auto-builder-core.json', 'utf8')));
assert.ok(parsed.ok);
const c = parsed.value;
const cls = c.classes.find(x => x.key === 'Barbarian' && x.source === 'PHB')!;
const background = c.backgrounds.find(x => x.key === 'Soldier' && x.source === 'PHB')!;
const initial = () => structuredClone(INITIAL_CHARACTER);
const build = (raceKey: string, raceSource: string, subraceKey?: string, raceChoices: any = {}) => {
  const race = c.races.find(x => x.key === raceKey && x.source === raceSource)!;
  const subrace = c.subraces.find(x => x.key === subraceKey && x.raceName === race.name && x.raceSource === race.source);
  return U.buildLevelOneCharacter(initial(), c, cls, { ruleSystem: '5e', race, subrace, background,
    raceChoices, skillChoices: [], spellChoices: { cantrips: [], leveled: [] } });
};
for (const subrace of ['Draconblood', 'Ravenite']) {
  const character = build('Dragonborn', 'PHB', subrace);
  assert.deepEqual(character.damageResistances, [], subrace);
}
for (const [race, subrace] of [['Half-Elf', 'Variant; Mark of Detection'], ['Half-Elf', 'Variant; Mark of Storm'], ['Half-Orc', 'Variant; Mark of Finding']]) {
  assert.doesNotThrow(() => build(race, 'PHB', subrace));
}
const human = c.races.find(x => x.key === 'Human' && x.source === 'PHB')!;
const variant = c.subraces.find(x => x.key === 'Variant' && x.raceName === human.name)!;
const wizard = c.classes.find(x => x.key === 'Wizard' && x.source === 'PHB')!;
const before = initial(); before.abilities.DEX = 12;
const preview = U.getLevelOnePrerequisiteCharacter(c, before, wizard, human, variant, { abilities: ['DEX', 'INT'] }, background);
assert.equal(preview.abilities.DEX, 13);
const choices = U.getRaceFeatChoiceOptions(c, '5e', preview, human, variant)!;
assert.ok(choices.from.some(x => x.key === 'War Caster' && x.source === 'PHB'));
assert.ok(choices.from.some(x => x.key === 'Defensive Duelist' && x.source === 'PHB'));
assert.equal(before.abilities.DEX, 12);
const defiant = build('Kobold', 'MPMM', undefined, { featureChoices: { 'kobold-legacy': 'defiance' } });
assert.ok(defiant.featureEntries.some(entry => entry.name.includes('逆反')));
assert.ok(!defiant.spellcastingProfiles.some(profile => profile.id.includes('kobold')));
assert.equal(defiant.automation.originFeatureChoices?.['kobold-legacy'], 'defiance');
const shifter = build('Shifter', 'MPMM', undefined, { featureChoices: { 'shifting-form': 'longtooth' } });
assert.ok(shifter.featureEntries.some(entry => entry.name.includes('长牙')));
const leveledShifter = U.buildLevelUpCharacter(shifter, c, cls, { ruleSystem: '5e', spellChoices: { cantrips: [], leveled: [] } });
assert.equal(leveledShifter.automation.originFeatureChoices?.['shifting-form'], 'longtooth');

// Two independently chosen Magic Initiate lists must keep both profiles and both feat instances.
const feat = c.feats.find(x => x.key === 'Magic Initiate' && x.source === 'XPHB')!;
const spellState = U.getFeatSpellChoiceState(c, feat, '5r', 1)!;
const featChoice = (index: number) => {
  const block = spellState.blocks[index]!;
  return { featId: `${feat.key}|${feat.source}`, featSpellBlockId: block.id, featSpellAbility: 'INT' as const,
    featSpellChoices: Object.fromEntries(block.choices.map(group => [group.id, group.options.slice(0, group.count).map(spell => spell.id)])) };
};
const first = build('Human', 'PHB', 'Variant', featChoice(0));
assert.equal(first.spellcastingProfiles.filter(profile => profile.className.includes('魔法学徒')).length, 1);
first.classes[0]!.level = 3;
first.classes[0]!.subclass = c.subclasses.find(entry => entry.key === 'Path of the Berserker' && entry.classSource === 'PHB')!.name;
const second = U.buildLevelUpCharacter(first, c, cls, { ruleSystem: '5e', spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: { mode: 'feat', ...featChoice(1) } });
assert.equal(second.spellcastingProfiles.filter(profile => profile.className.includes('魔法学徒')).length, 2);
assert.equal(second.featureEntries.filter(entry => entry.name === feat.name && entry.sourceId === `auto-feat-${feat.key}-${feat.source}`).length, 2);
assert.equal(U.getFeatSpellChoiceState(c, feat, '5r', 4, second)?.blocks.length, 1);
assert.throws(() => U.buildLevelUpCharacter(first, c, cls, { ruleSystem: '5e', spellChoices: { cantrips: [], leveled: [] },
  abilityScoreImprovementChoice: { mode: 'feat', ...featChoice(0) } }), /不同/);
console.log('availability: null inheritance, level-one qualification, persisted species branches, and repeatable feat instances passed');

const saved = structuredClone(second);
saved.classes[0]!.subclassSource = 'PHB';
saved.classes[0]!.subclassSpellBlock = '2';
saved.automation.campaigns = ['龙枪', '艾伯伦'];
const restored = parseCharacterJson(JSON.stringify(serializeCharacter(saved)));
assert.equal(restored.classes[0]!.subclassSpellBlock, '2');
assert.equal(restored.classes[0]!.subclassSource, 'PHB');
assert.deepEqual(restored.automation.campaigns, ['龙枪', '艾伯伦']);
assert.equal(restored.spellcastingProfiles.filter(profile => profile.className.includes('魔法学徒')).length, 2);
assert.equal(U.getFeatSpellChoiceState(c, feat, '5r', 4, restored)?.blocks.length, 1);
const skilled = c.feats.find(entry => entry.key === 'Skilled' && entry.source === 'XPHB')!;
const mixed = U.getFeatSkillChoiceOptions(skilled, initial())[0]!;
assert.equal(mixed.count, 3);
assert.ok(mixed.from.includes('Arcana') && mixed.from.includes("tool:thieves' tools"));
const trained = build('Human', 'PHB', 'Variant', { featId: 'Skilled|XPHB',
  featSkillChoices: { [mixed.id]: ['Arcana', 'History', "tool:thieves' tools"] } });
assert.ok(trained.proficiencies.has('Arcana') && trained.proficiencies.has("tool:thieves' tools"));
assert.ok(!U.getFeatSkillChoiceOptions(skilled, trained)[0]!.from.includes('Arcana'));
console.log('availability: export/reload and mixed skill/tool choices passed');
