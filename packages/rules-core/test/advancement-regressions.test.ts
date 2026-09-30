import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import * as R from '../src/index.ts';
import type {
  CanonicalRuleCharacterSnapshot, RuleCatalog, RuleClass, RuleContext,
  RuleEntityRef, RuleFeatCatalogEntry, RuleLevelUpChoice, RuleResult, RuleSpell,
} from '../src/index.ts';

const catalog = value(R.parseRuleCatalog(JSON.parse(await readFile(
  new URL('../../../public/data/auto-builder-core.json', import.meta.url), 'utf8',
))));
const cls = (key: string, source = 'PHB') => {
  const found = catalog.classes.find(entry => entry.key === key && entry.source === source);
  assert.ok(found); return found;
};
const feat = (key: string, source = 'PHB') => {
  const found = catalog.feats.find(entry => entry.key === key && entry.source === source);
  assert.ok(found); return found;
};
const ref = (entry: { id?: string; key?: string; name?: string; source: string }): RuleEntityRef => ({
  id: entry.id ?? `${entry.key}|${entry.source}`, key: entry.key ?? entry.name!, source: entry.source,
});
function context(ruleClass: RuleClass, entries = catalog): RuleContext {
  return { catalog: entries, ruleSystem: ruleClass.ruleSystem,
    authorization: R.createDefaultRuleAuthorizationPolicy(entries, ruleClass.ruleSystem) };
}
function value<T>(result: RuleResult<T>): T {
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.issues));
  if (!result.ok) throw new Error('projection failed');
  return result.value;
}
function rejected<T>(result: RuleResult<T>, reason: string): void {
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some(issue => issue.code === reason
    || issue.detail?.reason === reason), JSON.stringify(result.issues));
}
function pick(groups: readonly { id: string; min: number; options: readonly RuleSpell[] }[]) {
  const chosen = new Set<string>();
  return Object.fromEntries(groups.map(group => {
    const ids: string[] = [];
    for (const spell of group.options) {
      if (ids.length === group.min) break;
      const identity = R.getRuleSpellIdentity(spell);
      if (chosen.has(identity)) continue;
      chosen.add(identity); ids.push(spell.id);
    }
    assert.equal(ids.length, group.min);
    return [group.id, ids];
  }));
}
function character(ruleClass: RuleClass, level: number): CanonicalRuleCharacterSnapshot {
  const id = R.createRuleClassInstanceId(ruleClass);
  const subclass = catalog.subclasses.find(entry => entry.classSource === ruleClass.source
    && (entry.className === ruleClass.key || entry.className === ruleClass.name)
    && (ruleClass.key !== 'Fighter' || entry.key === 'Champion')
    && (ruleClass.key !== 'Rogue' || entry.key === 'Thief'));
  const input: CanonicalRuleCharacterSnapshot = {
    schemaVersion: 1, ruleSystem: ruleClass.ruleSystem,
    classes: [{ id, key: ruleClass.key, source: ruleClass.source, level,
      ...(subclass && level >= (ruleClass.subclassLevels?.[0] ?? 3) ? { subclass: ref(subclass) } : {}) }],
    abilities: { STR: 15, DEX: 14, CON: 14, INT: 14, WIS: 14, CHA: 14 },
    proficiencies: ['Athletics', 'Perception'], expertises: [], feats: [], features: [],
    resources: [], spellcastingProfiles: [], equipment: [], choices: [],
    combat: { hp: { current: 30, max: 30, temporary: 0 }, armorClass: 10, speed: 30,
      size: 'medium', senses: [], damageResistances: [], damageImmunities: [],
      damageVulnerabilities: [], conditionImmunities: [] },
  };
  const mastery = value(R.createRuleWeaponMasteryAdvancementState(context(ruleClass), ruleClass, 0, level, []));
  input.features.push(...(mastery.group?.options.slice(0, mastery.group.min).map(ref) ?? []));
  if (ruleClass.spellcastingAbility) {
    const state = value(R.createRuleSpellcastingAdvancementState(context(ruleClass), ruleClass, 0, level));
    if (state) {
      const effects = value(R.createRuleSpellcastingAdvancementEffects(context(ruleClass), state,
        { classId: id, selections: pick(state.groups) }));
      input.spellcastingProfiles = effects.flatMap(effect => effect.type === 'spell.profile.upsert' ? [effect.profile] : []);
    }
  }
  return input;
}
function spellChoice(input: CanonicalRuleCharacterSnapshot, ruleClass: RuleClass, ctx = context(ruleClass)) {
  const entry = input.classes.find(entry => entry.key === ruleClass.key && entry.source === ruleClass.source);
  const existing = input.spellcastingProfiles.find(profile => profile.classId === entry?.id && entry !== undefined);
  const subclass = ctx.catalog.subclasses.find(subclass => subclass.id === entry?.subclass?.id);
  const state = value(R.createRuleSpellcastingAdvancementState(ctx, ruleClass, entry?.level ?? 0,
    (entry?.level ?? 0) + 1, existing?.spells.map(spell => spell.id), subclass,
    existing?.spells.filter(spell => spell.countsAgainstKnownLimit === false).map(spell => spell.id)));
  return { selections: state ? pick(state.groups) : {} };
}
function up(input: CanonicalRuleCharacterSnapshot, choice: RuleLevelUpChoice, ctx = context(cls(input.classes[0]!.key, input.classes[0]!.source))) {
  return R.validateAndProjectLevelUp(ctx, input, { classId: input.classes[0]!.id }, choice);
}

test('rejects nonrepeatable fallback feat IDs and advances existing Tough exactly once', () => {
  const input = character(cls('Rogue'), 7);
  input.feats.push(ref(feat('Tough')));
  input.combat.modifiers = { armorBonus: 0, initiativeBonus: 0, hpMaxBonus: 14 };
  const before = structuredClone(input);
  rejected(up(input, { feat: ref(feat('Tough')) }), 'entity_already_selected');
  rejected(up(input, { feat: ref(feat('Tough', 'XPHB')) }), 'entity_already_selected');
  const next = value(up(input, { abilityIncreases: { STR: 2 } })).character;
  assert.equal(next.combat.modifiers?.hpMaxBonus, 16);
  assert.equal(next.feats.length, 1);
  assert.deepEqual(input, before);
});

test('validates armor, ability, spellcasting, and total-level feat prerequisites', () => {
  const input = character(cls('Rogue'), 3);
  rejected(up(input, { feat: ref(feat('Heavy Armor Master')), abilityIncreases: { STR: 1 } }), 'prerequisite_not_met');
  input.proficiencies.push('armor:heavy');
  assert.equal(value(up(input, { feat: ref(feat('Heavy Armor Master')), abilityIncreases: { STR: 1 } })).character.abilities.STR, 16);
  input.abilities.CHA = 12;
  rejected(up(input, { feat: ref(feat('Inspiring Leader')) }), 'prerequisite_not_met');
  input.abilities.CHA = 13;
  value(up(input, { feat: ref(feat('Inspiring Leader')) }));
  rejected(up(input, { feat: ref(feat('Metamagic Adept', 'TCE')) }), 'prerequisite_not_met');
  const low = character(cls('Rogue', 'XPHB'), 3);
  rejected(up(low, { feat: ref(feat('Boon of Recovery', 'XPHB')), abilityIncreases: { DEX: 1 } }), 'prerequisite_not_met');
});

test('requires the exact fixed or chosen feat ability increase and applies CON retroactively', () => {
  const input = character(cls('Rogue'), 3);
  input.proficiencies.push('armor:heavy');
  rejected(up(input, { feat: ref(feat('Heavy Armor Master')), abilityIncreases: { DEX: 2 } }), 'feat_ability_increase_invalid');
  rejected(up(input, { feat: ref(feat('Actor')) }), 'feat_ability_increase_invalid');
  const actor = value(up(input, { feat: ref(feat('Actor')), abilityIncreases: { CHA: 1 } })).character;
  assert.equal(actor.abilities.CHA, 15);
  const resilient = feat('Resilient');
  input.abilities.CON = 15;
  const ordinary = value(up(input, { abilityIncreases: { DEX: 2 } })).character;
  const saveGroup = value(R.createRuleFeatChoiceGroups(catalog, '5e', resilient)).savingThrow[0]!;
  const increased = value(up(input, { feat: ref(resilient), abilityIncreases: { CON: 1 },
    featChoices: { [saveGroup.id]: ['CON'] } })).character;
  assert.equal(increased.combat.hp.max - ordinary.combat.hp.max, 4);
  assert.equal(increased.abilities.CON, 16);
  rejected(up(input, { feat: ref(resilient), abilityIncreases: { CON: 1 },
    featChoices: { [saveGroup.id]: ['DEX'] } }), 'resilient_ability_and_save_mismatch');
});

test('enforces specialized feat source authorization', () => {
  const input = character(cls('Rogue'), 3);
  input.features.push({ id: 'spellcasting', key: 'Spellcasting', source: 'PHB' });
  const selected = feat('Metamagic Adept', 'TCE');
  const state = value(R.createRuleSpecializedFeatChoiceState(catalog, '5e', selected));
  const group = state.groups[0]!;
  const blocked = group.options.find(option => option.source === 'TCE')!;
  assert.ok(blocked);
  const ids = [blocked.id, group.options.find(option => option.id !== blocked.id)!.id];
  const ctx = context(cls('Rogue'));
  ctx.authorization.allowedSources.metamagic = ['PHB'];
  rejected(up(input, { feat: ref(selected), featChoices: { [group.id]: ids } }, ctx), 'choice_not_available');
  const allowed = group.options.filter(option => option.source === 'PHB').slice(0, 2).map(option => option.id);
  value(up(input, { feat: ref(selected), featChoices: { [group.id]: allowed } }, ctx));
});

function magicInitiateChoices(selected: RuleFeatCatalogEntry, blockIndex: number) {
  const state = value(R.createRuleFeatSpellChoiceState(catalog, '5r', selected, 4));
  assert.ok(state);
  const block = state.blocks[blockIndex]!;
  return { blockId: block.id, ability: block.abilityOptions[0]!,
    choices: pick(block.choices.map(group => ({ ...group, min: group.count }))) };
}

test('strict submission rejects incomplete feat spells while accepting complete selections', () => {
  const input = character(cls('Rogue', 'XPHB'), 3);
  const selected = feat('Magic Initiate', 'XPHB');
  const selections = magicInitiateChoices(selected, 0);
  rejected(up(input, { feat: ref(selected), featSpellChoices: { [ref(selected).id]: {
    ...selections, choices: {}, allowIncompleteChoices: true,
  } } }), 'incomplete_choices_not_allowed');
  rejected(up(input, { feat: ref(selected), featSpellChoices: { [ref(selected).id]: { ...selections, choices: {} } } }), 'choice_required');
  const next = value(up(input, { feat: ref(selected), featSpellChoices: { [ref(selected).id]: selections } })).character;
  assert.equal(next.spellcastingProfiles[0]?.spells.length, 3);
  assert.equal(next.feats.length, 1);
});

test('repeatable Magic Initiate preserves distinct instances and rejects the same spell list', () => {
  const selected = feat('Magic Initiate', 'XPHB');
  const first = value(up(character(cls('Rogue', 'XPHB'), 3), {
    feat: ref(selected), featSpellChoices: { [ref(selected).id]: magicInitiateChoices(selected, 0) },
  })).character;
  first.classes[0]!.level = 7;
  rejected(up(first, { feat: ref(selected), featSpellChoices: { [ref(selected).id]: magicInitiateChoices(selected, 0) } }), 'feat_spell_block_already_selected');
  const second = value(up(first, { feat: ref(selected), featSpellChoices: { [ref(selected).id]: magicInitiateChoices(selected, 1) } })).character;
  assert.equal(second.feats.length, 2);
  assert.notEqual(second.feats[0]?.id, second.feats[1]?.id);
  assert.equal(second.spellcastingProfiles.length, 2);
  assert.deepEqual(second.spellcastingProfiles[0], first.spellcastingProfiles[0]);
});

test('repeatable Elemental Adept requires distinct damage types', () => {
  const input = character(cls('Rogue'), 3);
  input.features.push({ id: 'spellcasting', key: 'Spellcasting', source: 'PHB' });
  const selected = feat('Elemental Adept');
  rejected(up(input, { feat: ref(selected) }), 'feat_damage_type_required');
  const first = value(up(input, { feat: ref(selected), featDamageType: 'fire' })).character;
  first.classes[0]!.level = 7;
  rejected(up(first, { feat: ref(selected), featDamageType: 'fire' }), 'feat_damage_type_already_selected');
  assert.equal(value(up(first, { feat: ref(selected), featDamageType: 'cold' })).character.feats.length, 2);
});

test('multiclassing associates class profiles and preserves unrelated origin/feat profiles and spent slots', () => {
  const wizard = cls('Wizard', 'XPHB');
  const input = character(wizard, 1);
  const unrelated = { id: 'feat-spells', ability: 'CHA' as const, preparationMode: 'knownSelection' as const,
    spells: [ref(catalog.spells.find(spell => spell.englishName === 'Light' && spell.source === 'PHB')!)], slots: {} };
  input.spellcastingProfiles.unshift(unrelated);
  input.spellcastingProfiles[1]!.slots['1']!.expended = 1;
  const cleric = cls('Cleric', 'XPHB');
  const next = value(R.validateAndProjectLevelUp(context(wizard), input, { class: ref(cleric) },
    { spellcasting: spellChoice(input, cleric) })).character;
  assert.deepEqual(next.spellcastingProfiles[0], unrelated);
  assert.equal(next.spellcastingProfiles.length, 3);
  for (const profile of next.spellcastingProfiles.slice(1)) {
    assert.ok(next.classes.some(entry => entry.id === profile.classId));
    assert.equal(profile.slotSource, 'shared');
    assert.deepEqual(profile.slots['1'], { total: 3, expended: 1 });
  }
  for (const profile of next.spellcastingProfiles.slice(1)) profile.slots['1']!.expended = 3;
  const later = value(up(next, { spellcasting: spellChoice(next, wizard) })).character;
  assert.deepEqual(later.spellcastingProfiles[1]?.slots['1'], { total: 4, expended: 3 });
  assert.deepEqual(later.spellcastingProfiles[2]?.slots['1'], { total: 4, expended: 3 });
});

test('keeps Pact Magic separate from shared slots and rounds 2024 half casters upward', () => {
  const wizard = cls('Wizard', 'XPHB');
  const input = character(wizard, 1);
  const warlock = cls('Warlock', 'XPHB');
  const invocations = value(R.createRuleInvocationAdvancementState(context(warlock), warlock, 0, 1, []));
  const next = value(R.validateAndProjectLevelUp(context(wizard), input, { class: ref(warlock) }, {
    spellcasting: spellChoice(input, warlock),
    invocationIds: invocations.group?.options.slice(0, invocations.group.min).map(option => option.id) ?? [],
  })).character;
  assert.equal(next.spellcastingProfiles.find(profile => profile.classId === input.classes[0]!.id)?.slotSource, 'class');
  assert.equal(next.spellcastingProfiles.find(profile => profile.classId !== input.classes[0]!.id)?.slotSource, 'pact');
  for (const key of ['Paladin', 'Ranger']) {
    assert.equal(R.getRuleMulticlassSpellSlots([{ ruleClass: wizard, level: 1 }, { ruleClass: cls(key, 'XPHB'), level: 3 }]).casterLevel, 3);
    assert.equal(R.getRuleMulticlassSpellSlots([{ ruleClass: cls('Wizard'), level: 1 }, { ruleClass: cls(key), level: 3 }]).casterLevel, 2);
    assert.equal(R.getRuleMulticlassSpellSlots([{ ruleClass: cls('Wizard'), level: 1 }, { ruleClass: cls(key), level: 1 }]).applies, false);
  }
});

test('2024 fighting styles already granted as feats cannot be selected again', () => {
  const input = character(cls('Rogue', 'XPHB'), 1);
  const fighter = cls('Fighter', 'XPHB');
  const styles = value(R.createRuleFightingStyleAdvancementState(context(fighter), fighter, 0, 1, []));
  const selected = styles.group!.options[0]!;
  input.feats.push(ref(selected));
  const mastery = value(R.createRuleWeaponMasteryAdvancementState(context(fighter), fighter, 0, 1,
    input.features.map(feature => feature.id)));
  const base = { weaponMasteryIds: mastery.group?.options.slice(0, mastery.group.min).map(option => option.id) ?? [] };
  rejected(R.validateAndProjectLevelUp(context(fighter), input, { class: ref(fighter) }, {
    ...base, fightingStyleIds: [selected.id],
  }), 'choice_not_available');
  const other = styles.group!.options.find(option => option.id !== selected.id)!;
  value(R.validateAndProjectLevelUp(context(fighter), input, { class: ref(fighter) }, {
    ...base, fightingStyleIds: [other.id],
  }));
});

test('a newly selected Superior Technique grants its maneuver without reducing Battle Master choices', () => {
  const fighter = cls('Fighter');
  const input = character(fighter, 0);
  input.classes = [];
  const style = catalog.fightingStyles.find(style => style.key === 'Superior Technique')!;
  const maneuverIds = value(R.createRuleManeuverAdvancementState(context(fighter), undefined, 0, 1, [], 1))
    .group!.options.slice(0, 1).map(option => option.id);
  const first = value(R.validateAndProjectLevelOne(context(fighter), input, {
    class: ref(fighter), fightingStyleIds: [style.id],
    maneuverIds,
  })).character;
  assert.ok(first.features.some(feature => feature.id === maneuverIds[0]));
  first.classes[0]!.level = 2;
  const subclass = catalog.subclasses.find(entry => entry.key === 'Battle Master' && entry.classSource === 'PHB')!;
  const options = value(R.createRuleManeuverAdvancementState(context(fighter), subclass, 2, 3, maneuverIds, 1));
  assert.equal(options.group?.min, 3);
  value(up(first, { subclassId: subclass.id, maneuverIds: options.group!.options.slice(0, 3).map(option => option.id) }));
});

test('Epic Boon feature allows other qualifying feats and high abilities survive level 20', () => {
  const wizard = cls('Wizard', 'XPHB');
  const input = character(wizard, 18);
  const choices = spellChoice(input, wizard);
  value(up(input, { feat: ref(feat('Alert', 'XPHB')), spellcasting: choices }));
  value(up(input, { feat: ref(feat('Ability Score Improvement', 'XPHB')), abilityIncreases: { INT: 1, WIS: 1 }, spellcasting: choices }));
  input.abilities.DEX = 20;
  const boon = value(up(input, { feat: ref(feat('Boon of Recovery', 'XPHB')), abilityIncreases: { DEX: 1 }, spellcasting: choices })).character;
  assert.equal(boon.abilities.DEX, 21);
  const final = value(up(boon, { spellcasting: spellChoice(boon, wizard) })).character;
  assert.equal(final.classes[0]?.level, 20);
  assert.equal(final.abilities.DEX, 21);
});

test('Epic Boon eligibility uses total level at an actual multiclass ASI opportunity', () => {
  const input = character(cls('Rogue', 'XPHB'), 15);
  input.classes.push({ ...ref(cls('Fighter', 'XPHB')), id: 'fighter', level: 3 });
  const next = value(up(input, { feat: ref(feat('Boon of Recovery', 'XPHB')), abilityIncreases: { DEX: 1 } })).character;
  assert.equal(next.classes[0]?.level, 16);
  assert.equal(next.classes.reduce((sum, entry) => sum + entry.level, 0), 19);
});

test('refreshes resources with final abilities for both the advancing class and other classes', () => {
  const bard = cls('Bard');
  const input = character(bard, 3);
  input.abilities.CHA = 13;
  input.resources = R.createRuleClassResourceEffects(bard, input, 3, 3);
  input.resources[0]!.current = 0;
  const next = value(up(input, { abilityIncreases: { CHA: 1, DEX: 1 }, spellcasting: spellChoice(input, bard) })).character;
  assert.equal(next.resources.find(resource => resource.id.endsWith('bardic-inspiration'))?.max, 2);
  assert.equal(next.resources.find(resource => resource.id.endsWith('bardic-inspiration'))?.current, 0);
  const fighter = character(cls('Fighter'), 3);
  fighter.classes.push(input.classes[0]!);
  fighter.abilities.CHA = 13;
  fighter.resources = input.resources;
  const other = value(up(fighter, { abilityIncreases: { CHA: 1, DEX: 1 } })).character;
  assert.equal(other.resources.find(resource => resource.id.endsWith('bardic-inspiration'))?.max, 2);
  assert.equal(other.resources.find(resource => resource.id.endsWith('bardic-inspiration'))?.current, 0);
});

test('feat metamagics, invocations, and maneuvers are additional to class progression', () => {
  const sorcerer = cls('Sorcerer');
  const input = character(sorcerer, 2);
  input.feats.push(ref(feat('Metamagic Adept', 'TCE')));
  input.features.push(...catalog.metamagics.slice(0, 2).map(ref));
  const spells = spellChoice(input, sorcerer);
  rejected(up(input, { spellcasting: spells }), 'choice_required');
  const state = value(R.createRuleMetamagicAdvancementState(context(sorcerer), sorcerer, 2, 3, input.features.map(entry => entry.id), 2));
  const selected = state.group!.options.slice(0, 2).map(option => option.id);
  const next = value(up(input, { spellcasting: spells, metamagicIds: selected })).character;
  assert.equal(next.features.filter(entry => catalog.metamagics.some(option => option.id === entry.id)).length, 4);
  const warlock = cls('Warlock');
  const lock = character(warlock, 1);
  lock.feats.push(ref(feat('Eldritch Adept', 'TCE')));
  const existing = value(R.createRuleInvocationAdvancementState(context(warlock), warlock, 0, 2, [])).group!.options[0]!;
  lock.features.push(ref(existing));
  const inv = value(R.createRuleInvocationAdvancementState(context(warlock), warlock, 1, 2, [existing.id], {}, 1));
  const invocationIds = inv.group!.options.slice(0, inv.group!.min).map(option => option.id);
  assert.equal(invocationIds.length, 2);
  rejected(up(lock, { spellcasting: spellChoice(lock, warlock) }), 'choice_required');
  assert.equal(value(up(lock, { spellcasting: spellChoice(lock, warlock), invocationIds })).character.features
    .filter(entry => catalog.invocations.some(option => option.id === entry.id)).length, 3);
  const fighter = character(cls('Fighter'), 2);
  fighter.feats.push(ref(feat('Martial Adept')));
  fighter.features.push(...catalog.maneuvers.slice(0, 2).map(ref));
  const battleMaster = catalog.subclasses.find(entry => entry.key === 'Battle Master' && entry.classSource === 'PHB')!;
  const maneuver = value(R.createRuleManeuverAdvancementState(context(cls('Fighter')), battleMaster, 2, 3, fighter.features.map(entry => entry.id), 2));
  const maneuverIds = maneuver.group!.options.slice(0, maneuver.group!.min).map(option => option.id);
  assert.equal(maneuverIds.length, 3);
  rejected(up(fighter, { subclassId: battleMaster.id }), 'choice_required');
  assert.equal(value(up(fighter, { subclassId: battleMaster.id, maneuverIds })).character.features
    .filter(entry => catalog.maneuvers.some(option => option.id === entry.id)).length, 5);
});

test('multiclass expertise may use the skill granted by the same advancement', () => {
  const input = character(cls('Fighter'), 1);
  const next = value(R.validateAndProjectLevelUp(context(cls('Fighter')), input, { class: ref(cls('Rogue')) },
    { multiclassSkillChoices: ['Stealth'], expertiseIds: ['Stealth', 'Athletics'] })).character;
  assert.ok(next.proficiencies.includes('Stealth'));
  assert.deepEqual(next.expertises, ['Stealth', 'Athletics']);
});

test('automatic and bonus spell identities are excluded before counting regardless of source order', () => {
  const bard = cls('Bard', 'XPHB');
  const spell = catalog.spells.find(spell => spell.englishName === 'Dissonant Whispers' && spell.source === 'XPHB')!;
  const legacy = catalog.spells.find(spell => spell.englishName === 'Dissonant Whispers' && spell.source === 'PHB')!;
  assert.ok(spell && legacy);
  const withAutomatic = { ...bard, additionalPreparedSpells: [{ name: spell.name, source: spell.source, level: 1, mode: 'prepared' as const }] };
  const entries: RuleCatalog = { ...catalog, classes: catalog.classes.map(entry => entry === bard ? withAutomatic : entry) };
  const needed = [legacy.id, spell.id];
  const first = value(R.createRuleSpellcastingAdvancementState(context(bard, entries), withAutomatic, 1, 2, needed));
  const reversed = value(R.createRuleSpellcastingAdvancementState(context(bard, entries), withAutomatic, 1, 2, [...needed].reverse()));
  assert.ok(first && reversed);
  assert.equal(first.needed.leveled, 5);
  assert.deepEqual(first.needed, reversed.needed);
  for (const ids of [needed, [...needed].reverse()]) {
    const bonus = value(R.createRuleSpellcastingAdvancementState(context(bard), bard, 1, 2, ids, undefined, [spell.id]));
    assert.equal(bonus?.needed.leveled, 5);
  }
});

test('rejects selecting two reprints and replacing a spell with a simultaneous new choice', () => {
  const wizard = cls('Wizard', 'XPHB');
  const state = value(R.createRuleSpellcastingAdvancementState(context(wizard), wizard, 0, 1));
  assert.ok(state);
  const group = state.groups.find(group => group.id.endsWith('-leveled'))!;
  const newer = group.options.find(spell => spell.source === 'XPHB'
    && group.options.some(other => other.source === 'PHB' && R.getRuleSpellIdentity(other) === R.getRuleSpellIdentity(spell)))!;
  const older = group.options.find(spell => spell.source === 'PHB' && R.getRuleSpellIdentity(spell) === R.getRuleSpellIdentity(newer))!;
  const selections = pick(state.groups);
  selections[group.id] = [newer.id, older.id, ...Object.values(pick([{ ...group,
    min: group.min - 2, options: group.options.filter(spell => R.getRuleSpellIdentity(spell) !== R.getRuleSpellIdentity(newer)),
  }])).flat()];
  rejected(R.createRuleSpellcastingAdvancementEffects(context(wizard), state, { selections }), 'choice_conflict');
  const bard = cls('Bard');
  const input = character(bard, 1);
  const choice = spellChoice(input, bard);
  const addId = Object.entries(choice.selections).find(([id]) => id.endsWith('-leveled'))![1][0]!;
  const remove = input.spellcastingProfiles[0]!.spells.find(spell => catalog.spells.find(entry => entry.id === spell.id)!.level > 0)!;
  rejected(up(input, { spellcasting: { ...choice, replacement: { removeId: remove.id, addId } } }), 'spell_replacement_duplicates_new_choice');
});

test('strict spellcasting rejects omitted required selections and preserves bonus known-limit flags', () => {
  const wizard = cls('Wizard', 'XPHB');
  rejected(R.validateAndProjectLevelOne(context(wizard), { ...character(wizard, 1), classes: [], spellcastingProfiles: [] },
    { class: ref(wizard) }), 'choice_required');
  const bard = cls('Bard');
  const input = character(bard, 1);
  const known = input.spellcastingProfiles[0]!.spells.find(spell => catalog.spells.find(entry => entry.id === spell.id)!.level > 0)!;
  known.countsAgainstKnownLimit = false;
  const state = spellChoice(input, bard);
  assert.equal(Object.entries(state.selections).find(([id]) => id.endsWith('-leveled'))![1].length, 2);
  rejected(up(input, {}), 'choice_required');
  const next = value(up(input, { spellcasting: state })).character;
  assert.equal(next.spellcastingProfiles[0]?.spells.find(spell => spell.id === known.id)?.countsAgainstKnownLimit, false);
});

test('2024 Wild Shape uses druid class-level thresholds and partial short-rest recovery', () => {
  const druid = cls('Druid', 'XPHB');
  const input = character(cls('Fighter', 'XPHB'), 10);
  for (const [level, expected] of [[2, 2], [5, 2], [6, 3], [9, 3], [16, 3], [17, 4], [20, 4]]) {
    const resource = R.createRuleClassResourceEffects(druid, input, level!, 20).find(resource => resource.id.endsWith('wild-shape'))!;
    assert.equal(resource.max, expected);
    assert.equal(resource.reset, 'manual');
    assert.match(resource.note!, /短休恢复 1 次/);
  }
  const old = R.createRuleClassResourceEffects(cls('Druid'), input, 17, 20).find(resource => resource.id.endsWith('wild-shape'))!;
  assert.equal(old.max, 2);
  assert.equal(old.reset, 'shortRest');
});
