import type {
  RuleClass,
  RuleSpell,
  RuleSubclass,
} from '../catalog/model.js';
import type { RuleChoiceGroup } from '../model/choice.js';
import type { RuleSpellcastingProfile } from '../model/character.js';
import type { RuleContext } from '../model/context.js';
import type { RuleEffect } from '../model/effect.js';
import type { RuleIssue, RuleResult } from '../model/issue.js';
import { isRuleEntityAuthorized } from '../policy/authorization.js';
import { dedupeRuleEntitiesByNameAndSourcePriority } from '../policy/source-priority.js';
import { getRuleSubclassSpells, getRuleSubclassSpellBlocks } from '../options/subclass-spells.js';
import { validateRuleChoiceSelections } from '../validation/common.js';

export type RuleSpellcastingMode = 'preparedAll' | 'knownSelection' | 'spellbook';
export type RuleSpellSlotSource = 'class' | 'shared' | 'pact';
export type RuleSpellSlots = Record<string, { total: number; expended: number }>;

export interface RuleSpellReplacementSelection {
  removeId: string;
  addId: string;
}

export interface RuleSpellcastingEffectOptions {
  existingProfile?: RuleSpellcastingProfile;
  classId?: string;
  selections?: Readonly<Record<string, readonly string[]>>;
  replacement?: RuleSpellReplacementSelection | null;
  slots?: RuleSpellSlots;
  slotSource?: RuleSpellSlotSource;
}

export interface RuleMulticlassSpellcastingClass {
  ruleClass: RuleClass;
  level: number;
}

export interface RuleMulticlassSpellSlotState {
  applies: boolean;
  casterLevel: number;
  slots: RuleSpellSlots;
}

export interface RuleFixedSpellChoiceGroup {
  classLevel: number;
  spellLevel: number;
  count: number;
  selected: number;
  group?: RuleChoiceGroup<RuleSpell>;
  options: RuleSpell[];
}

export interface RuleSpellcastingAdvancementState {
  ruleClass: RuleClass;
  subclass?: RuleSubclass;
  oldClassLevel: number;
  newClassLevel: number;
  mode: RuleSpellcastingMode;
  maxSpellLevel: number;
  limits: { cantrips: number; leveled: number };
  needed: { cantrips: number; leveled: number };
  /** Current catalog IDs corresponding to spells already present on the profile. */
  knownSpellIds: string[];
  cantrips: RuleSpell[];
  leveled: RuleSpell[];
  automaticSpells: RuleSpell[];
  fixedLeveledGroups: RuleFixedSpellChoiceGroup[];
  magicalSecretGroups: RuleChoiceGroup<RuleSpell>[];
  subclassSpellGroups: RuleChoiceGroup<RuleSpell>[];
  groups: RuleChoiceGroup<RuleSpell>[];
}

const MULTICLASS_SPELL_SLOT_TABLE: readonly (readonly number[])[] = [
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

export function getRuleMaxSpellLevel(
  ruleClass: RuleClass,
  classLevel: number,
): number {
  if (!ruleClass.spellcastingAbility || !ruleClass.casterProgression || classLevel < 1) return -1;
  let fixedMaxLevel = -1;
  for (const [unlockLevel, spellLevels] of Object.entries(
    ruleClass.spellsKnownProgressionFixedByLevel ?? {},
  )) {
    if (Number(unlockLevel) > classLevel) continue;
    for (const [spellLevel, count] of Object.entries(spellLevels)) {
      if (Number(count) > 0) fixedMaxLevel = Math.max(fixedMaxLevel, Number(spellLevel) || -1);
    }
  }
  const spellSlots = ruleClass.spellSlotProgression?.[classLevel - 1];
  if (spellSlots?.length) {
    for (let index = spellSlots.length - 1; index >= 0; index -= 1) {
      if (Number(spellSlots[index]) > 0) return Math.max(index + 1, fixedMaxLevel);
    }
  }
  const pactSlots = ruleClass.pactSlotProgression?.[classLevel - 1];
  if (pactSlots?.level) return Math.max(pactSlots.level, fixedMaxLevel);
  if (ruleClass.casterProgression === 'pact') return Math.max(1, fixedMaxLevel);
  if (ruleClass.casterProgression === 'full') {
    return Math.max(Math.min(9, Math.ceil(classLevel / 2)), fixedMaxLevel);
  }
  if (ruleClass.casterProgression === 'artificer') {
    return Math.max(Math.min(5, Math.ceil(classLevel / 4)), fixedMaxLevel);
  }
  if (ruleClass.casterProgression === '1/2') {
    return classLevel >= 2
      ? Math.max(Math.min(5, Math.floor((classLevel + 3) / 4)), fixedMaxLevel)
      : fixedMaxLevel;
  }
  return fixedMaxLevel;
}

export function getRuleClassSpellOptions(
  context: RuleContext,
  ruleClass: RuleClass,
  maxSpellLevel: number,
): RuleSpell[] {
  return dedupeRuleEntitiesByNameAndSourcePriority(
    'spell',
    context.catalog.spells.filter((spell) => (
      spell.level <= maxSpellLevel
      && spell.classKeys.includes(ruleClass.key)
      && isRuleEntityAuthorized('spell', spell, context.authorization)
    )),
    context.authorization,
  ).sort(compareSpells);
}

export function createRuleSpellcastingAdvancementState(
  context: RuleContext,
  ruleClass: RuleClass,
  oldClassLevel: number,
  newClassLevel: number,
  existingSpellIds: readonly string[] = [],
  subclass?: RuleSubclass,
  bonusSpellIds: readonly string[] = [],
): RuleResult<RuleSpellcastingAdvancementState | null> {
  const checked = validateInput(
    context,
    ruleClass,
    oldClassLevel,
    newClassLevel,
    subclass,
  );
  if (!checked.ok) return checked;
  const { ruleClass: authorizedClass, subclass: authorizedSubclass } = checked.value;
  const maxSpellLevel = getRuleMaxSpellLevel(authorizedClass, newClassLevel);
  if (maxSpellLevel < 0) return success(null);
  const mode = getSpellcastingMode(authorizedClass);
  const options = spellOptionsForLevel(
    context,
    authorizedClass,
    newClassLevel,
    maxSpellLevel,
    authorizedSubclass,
  );
  const existing = new Set(existingSpellIds);
  const subclassSpells = getRuleSubclassSpells(context, authorizedSubclass, newClassLevel, maxSpellLevel, bonusSpellIds);
  if (subclassSpells.issues.length) return { ok: false, issues: subclassSpells.issues };
  const existingSpells = existingSpellIds.flatMap((id) => {
    const spell = context.catalog.spells.find((candidate) => candidate.id === id);
    return spell ? [spell] : [];
  });
  const knownSpellIds = options.filter((spell) => existing.has(spell.id)
    || existingSpells.some((known) => sameSpellIdentity(known, spell))).map(({ id }) => id);
  const known = new Set(knownSpellIds);
  const automaticIds = new Set(getAutomaticPreparedSpells(
    context,
    authorizedClass,
    newClassLevel,
    authorizedSubclass,
  ).map(({ id }) => id));
  const automaticSpells = getAutomaticPreparedSpells(
    context,
    authorizedClass,
    newClassLevel,
    authorizedSubclass,
  );
  automaticSpells.push(...subclassSpells.automatic.filter(spell => !automaticIds.has(spell.id)));
  for (const spell of automaticSpells) automaticIds.add(spell.id);
  const limits = knownSpellLimits(authorizedClass, newClassLevel);
  const fixedLeveledGroups = fixedSpellGroups(
    context,
    authorizedClass,
    newClassLevel,
    existing,
  );
  const fixedNeeded = fixedLeveledGroups.reduce(
    (total, group) => total + Math.max(0, group.count - group.selected),
    0,
  );
  // Reprints remain available as choices, but one known spell consumes one slot.
  const excludedIdentities = new Set([
    ...automaticSpells,
    ...context.catalog.spells.filter(({ id }) => bonusSpellIds.includes(id)),
  ].map(getRuleSpellIdentity));
  const countedExisting = [...new Map(existingSpells
    .filter(spell => !excludedIdentities.has(getRuleSpellIdentity(spell)))
    .map(spell => [getRuleSpellIdentity(spell), spell])).values()];
  const existingCantrips = countedExisting.filter(spell => spell.level === 0).length;
  const existingLeveled = countedExisting.filter(spell => spell.level > 0).length;
  const needed = {
    cantrips: Math.max(0, limits.cantrips - existingCantrips),
    leveled: mode === 'preparedAll'
      ? 0
      : Math.max(0, limits.leveled - existingLeveled - fixedNeeded),
  };
  const automaticIdentities = new Set(automaticSpells.map(getRuleSpellIdentity));
  const cantrips = options.filter((spell) => spell.level === 0 && !automaticIdentities.has(getRuleSpellIdentity(spell)));
  const leveled = options.filter((spell) => spell.level > 0 && !automaticIdentities.has(getRuleSpellIdentity(spell)));
  const magicalSecretGroups = magicalSecretsGroups(
    context,
    authorizedClass,
    oldClassLevel,
    newClassLevel,
    maxSpellLevel,
    existing,
    authorizedSubclass,
  );
  // Regular PHB secrets consume known-spell slots; Lore's level-six secrets do not.
  const regularSecrets = magicalSecretGroups.filter(group => !group.id.includes('-6-magical-secrets'));
  needed.leveled = Math.max(0, needed.leveled - regularSecrets.reduce((count, group) => count + group.min, 0));
  const subclassSpellGroups = subclassSpells.choices;
  const groups = [
    ...(needed.cantrips > 0
      ? [choiceGroup(authorizedClass, newClassLevel, 'cantrips', needed.cantrips, cantrips.filter(({ id }) => !known.has(id)))]
      : []),
    ...(needed.leveled > 0
      ? [choiceGroup(authorizedClass, newClassLevel, 'leveled', needed.leveled, leveled.filter(({ id }) => !known.has(id)))]
      : []),
    ...fixedLeveledGroups.flatMap(({ group }) => group ? [group] : []),
    ...magicalSecretGroups,
    ...subclassSpellGroups,
  ];
  if (groups.some((group) => group.min > group.options.length)) {
    return invalid('choice_count_invalid', ['spellcasting'], 'spell_options_insufficient');
  }
  return success({
    ruleClass: authorizedClass,
    ...(authorizedSubclass === undefined ? {} : { subclass: authorizedSubclass }),
    oldClassLevel,
    newClassLevel,
    mode,
    maxSpellLevel,
    limits,
    needed,
    knownSpellIds,
    cantrips,
    leveled,
    automaticSpells,
    fixedLeveledGroups,
    magicalSecretGroups,
    subclassSpellGroups,
    groups,
  });
}

export function getRuleClassSpellSlots(
  ruleClass: RuleClass,
  classLevel: number,
  existingSlots: RuleSpellSlots = {},
): RuleSpellSlots {
  if (!ruleClass.spellcastingAbility || !ruleClass.casterProgression || classLevel < 1) return {};
  const totals: number[] = [];
  const classSlots = ruleClass.spellSlotProgression?.[classLevel - 1];
  if (classSlots?.length) totals.push(...classSlots);
  else {
    const pact = ruleClass.pactSlotProgression?.[classLevel - 1];
    if (pact?.level && pact.slots > 0) totals[pact.level - 1] = pact.slots;
    else {
      const maxLevel = getRuleMaxSpellLevel(ruleClass, classLevel);
      if (maxLevel >= 1) {
        if (ruleClass.casterProgression === 'pact') totals[Math.min(maxLevel, 5) - 1] = classLevel >= 2 ? 2 : 1;
        else {
          totals[0] = classLevel >= 2 ? 3 : 2;
          if (maxLevel >= 2) totals[1] = classLevel >= 4 ? 3 : 2;
          if (maxLevel >= 3) totals[2] = 2;
          if (maxLevel >= 4) totals[3] = 1;
          if (maxLevel >= 5) totals[4] = 1;
        }
      }
    }
  }
  return slotsFromTotals(totals, existingSlots);
}

export function getRuleMulticlassSpellSlots(
  classes: readonly RuleMulticlassSpellcastingClass[],
  existingSlots: RuleSpellSlots = {},
): RuleMulticlassSpellSlotState {
  const casters = classes.filter(({ ruleClass, level }) => (
    level > 0
    && Boolean(ruleClass.spellcastingAbility)
    && Boolean(ruleClass.casterProgression)
    && ruleClass.casterProgression !== 'pact'
    && getRuleMaxSpellLevel(ruleClass, level) >= 0
  ));
  if (casters.length < 2) return { applies: false, casterLevel: 0, slots: {} };
  const casterLevel = Math.min(20, casters.reduce((total, entry) => (
    total + multiclassCasterLevelContribution(entry.ruleClass, entry.level)
  ), 0));
  const row = MULTICLASS_SPELL_SLOT_TABLE[casterLevel - 1];
  return row
    ? { applies: true, casterLevel, slots: slotsFromTotals(row, existingSlots) }
    : { applies: false, casterLevel, slots: {} };
}

export function createRuleSpellcastingAdvancementEffects(
  context: RuleContext,
  state: RuleSpellcastingAdvancementState,
  options: RuleSpellcastingEffectOptions = {},
): RuleResult<readonly RuleEffect[]> {
  const authorizedClass = context.catalog.classes.find((candidate) => (
    candidate.key === state.ruleClass.key
    && candidate.source === state.ruleClass.source
    && candidate.ruleSystem === context.ruleSystem
    && isRuleEntityAuthorized('class', candidate, context.authorization)
  ));
  if (!authorizedClass) {
    return invalid('entity_not_authorized', ['spellcasting', 'class'], 'class_not_authorized');
  }
  const validated = validateRuleChoiceSelections(state.groups, options.selections ?? {});
  if (!validated.ok) return validated;
  const selectedIds = validated.value.flatMap(({ selectedIds: ids }) => ids);
  const selectedSpells = selectedIds.map(id => context.catalog.spells.find(spell => spell.id === id)!);
  if (new Set(selectedSpells.map(getRuleSpellIdentity)).size !== selectedIds.length) {
    return invalid('choice_conflict', ['spellcasting', 'choices'], 'spell_selected_in_multiple_groups');
  }
  const selected = state.groups.flatMap(({ options: groupOptions }) => (
    groupOptions.filter(({ id }) => selectedIds.includes(id))
  ));
  const existing = options.existingProfile;
  const existingById = new Map(existing?.spells.map((spell) => [spell.id, spell]) ?? []);
  const automaticIds = new Set(state.automaticSpells.map(({ id }) => id));
  const profileId = existing?.id
    ?? `auto-${authorizedClass.key.toLowerCase()}-${authorizedClass.source.toLowerCase()}-spellcasting`;
  const classId = options.classId ?? existing?.classId;
  const sourceId = profileId;
  const spells = new Map(existingById);
  const subclassPrefix = state.subclass ? `subclass:${state.subclass.id}:` : undefined;
  const subclassGrant = subclassPrefix ? `${subclassPrefix}${state.subclass?.selectedSpellBlock ?? '0'}` : undefined;
  if (subclassPrefix) for (const [id, spell] of spells) {
    if (spell.grantSource?.startsWith(subclassPrefix) && spell.grantSource !== subclassGrant) spells.delete(id);
  }
  const subclassAutomatic = new Set(getRuleSubclassSpells(context, state.subclass, state.newClassLevel, state.maxSpellLevel).automatic.map(spell => spell.id));

  const projected = state.mode === 'preparedAll'
    ? [...selected, ...state.leveled]
    : selected;
  for (const spell of [...projected, ...state.automaticSpells]) {
    const alwaysPrepared = automaticIds.has(spell.id)
      || state.mode === 'knownSelection'
      || spell.level === 0;
    spells.set(spell.id, {
      id: spell.id,
      key: spell.key || spell.name,
      source: spell.source,
      prepared: alwaysPrepared,
      alwaysPrepared,
      ...(subclassGrant !== undefined && (subclassAutomatic.has(spell.id)
        || state.subclassSpellGroups.some(group =>
          (options.selections?.[group.id] ?? []).includes(spell.id)))
        ? { grantSource: subclassGrant } : {}),
      countsAgainstKnownLimit: !automaticIds.has(spell.id) && !state.subclassSpellGroups.some(group =>
        (options.selections?.[group.id] ?? []).includes(spell.id))
        && !state.magicalSecretGroups.some(group => group.id.includes('-6-magical-secrets') &&
          (options.selections?.[group.id] ?? []).includes(spell.id)),
    });
  }

  const replacement = validateSpellReplacement(context, state, existing, options.replacement);
  if (!replacement.ok) return replacement;
  if (replacement.value) {
    const removed = context.catalog.spells.find(spell => spell.id === replacement.value!.remove.id)!;
    const add = replacement.value.add;
    if (selectedSpells.some(spell => sameSpellIdentity(spell, add))) {
      return invalid('choice_conflict', ['spellcasting', 'replacement'], 'spell_replacement_duplicates_new_choice');
    }
    for (const [id] of spells) {
      const spell = context.catalog.spells.find(candidate => candidate.id === id);
      if (spell && sameSpellIdentity(spell, removed)) spells.delete(id);
    }
    spells.set(add.id, {
      id: add.id,
      key: add.key || add.name,
      source: add.source,
      prepared: true,
      alwaysPrepared: true,
      countsAgainstKnownLimit: true,
    });
  }

  const slots = options.slots
    ?? getRuleClassSpellSlots(authorizedClass, state.newClassLevel, existing?.slots);
  const profile: RuleSpellcastingProfile = {
    id: profileId,
    ...(classId === undefined ? {} : { classId }),
    ability: spellcastingAbility(authorizedClass),
    preparationMode: state.mode,
    slotSource: options.slotSource
      ?? (authorizedClass.casterProgression === 'pact' ? 'pact' : 'class'),
    spells: [...spells.values()],
    slots,
  };
  return success([{
    type: 'spell.profile.upsert',
    profile,
    sourceId,
  }]);
}

function spellOptionsForLevel(
  context: RuleContext,
  ruleClass: RuleClass,
  classLevel: number,
  maxSpellLevel: number,
  subclass?: RuleSubclass,
): RuleSpell[] {
  const expanded = additionalSpellRefs(ruleClass, subclass)
    .filter((entry) => entry.mode === 'expanded' && entry.level <= classLevel)
    .flatMap((entry) => context.catalog.spells.filter((spell) => (
      spell.name === entry.name
      && spell.source === entry.source
      && isRuleEntityAuthorized('spell', spell, context.authorization)
    )));
  const subclassSpells = subclass
    ? context.catalog.spells.filter((spell) => (
        spell.level <= maxSpellLevel
        && spell.subclassIds?.includes(subclass.id)
        && isRuleEntityAuthorized('spell', spell, context.authorization)
      ))
    : [];
  const magicalSecretExpansion = (
    ruleClass.key === 'Bard'
    && ruleClass.source === 'XPHB'
    && classLevel >= 10
  ) ? getRuleMagicalSecretSpellOptions(context, maxSpellLevel) : [];
  return dedupeRuleEntitiesByNameAndSourcePriority(
    'spell',
    [
      ...getRuleClassSpellOptions(context, ruleClass, maxSpellLevel),
      ...subclassSpells,
      ...expanded,
      ...getRuleSubclassSpells(context, subclass, classLevel, maxSpellLevel).expanded,
      ...magicalSecretExpansion,
    ],
    context.authorization,
  ).sort(compareSpells);
}

function getAutomaticPreparedSpells(
  context: RuleContext,
  ruleClass: RuleClass,
  classLevel: number,
  subclass?: RuleSubclass,
): RuleSpell[] {
  return additionalSpellRefs(ruleClass, subclass)
    .filter((entry) => entry.mode !== 'expanded' && entry.level <= classLevel)
    .flatMap((entry) => context.catalog.spells.filter((spell) => (
      spell.name === entry.name
      && spell.source === entry.source
      && isRuleEntityAuthorized('spell', spell, context.authorization)
    )));
}

function additionalSpellRefs(ruleClass: RuleClass, subclass?: RuleSubclass) {
  return [
    ...(ruleClass.additionalPreparedSpells ?? []),
    ...(subclass?.additionalSpells?.length ? [] : subclass?.additionalPreparedSpells ?? []),
  ];
}

function getSpellcastingMode(ruleClass: RuleClass): RuleSpellcastingMode {
  if (
    ruleClass.preparedSpellsChange === 'restLong'
    && !ruleClass.spellsKnownProgressionFixed?.length
    && !ruleClass.spellsKnownProgressionFixedByLevel
    && !ruleClass.spellsKnownProgression?.length
  ) return 'preparedAll';
  if (
    ruleClass.spellsKnownProgressionFixed?.length
    && !ruleClass.spellsKnownProgression?.length
    && !ruleClass.spellsKnownProgressionFixedByLevel
  ) return 'spellbook';
  return 'knownSelection';
}

function knownSpellLimits(
  ruleClass: RuleClass,
  classLevel: number,
): { cantrips: number; leveled: number } {
  const index = classLevel - 1;
  const cantrips = Number(ruleClass.cantripProgression?.[index]) || 0;
  const fixedKnown = ruleClass.spellsKnownProgressionFixed
    ?.slice(0, classLevel)
    .reduce((total, count) => total + (Number(count) || 0), 0);
  const cumulativeFixedKnown = Object.entries(
    ruleClass.spellsKnownProgressionFixedByLevel ?? {},
  ).filter(([unlockLevel]) => Number(unlockLevel) <= classLevel)
    .reduce((total, [, spellLevels]) => (
      total + Object.values(spellLevels)
        .reduce((sum, count) => sum + (Number(count) || 0), 0)
    ), 0);
  const levelChangePrepared = ruleClass.preparedSpellsChange === 'level'
    ? ruleClass.preparedSpellsProgression?.[index]
    : 0;
  let leveled = (
    fixedKnown
    || ruleClass.spellsKnownProgression?.[index]
    || levelChangePrepared
    || 0
  ) + cumulativeFixedKnown;
  if (ruleClass.key === 'Ranger' && ruleClass.source === 'PHB' && classLevel === 1) {
    leveled = 0;
  }
  return { cantrips, leveled };
}

function fixedSpellGroups(
  context: RuleContext,
  ruleClass: RuleClass,
  classLevel: number,
  existing: ReadonlySet<string>,
): RuleFixedSpellChoiceGroup[] {
  const spellLevels = ruleClass.spellsKnownProgressionFixedByLevel?.[String(classLevel)];
  if (!spellLevels) return [];
  const classOptions = getRuleClassSpellOptions(context, ruleClass, 9);
  return Object.entries(spellLevels).flatMap(([spellLevel, rawCount]) => {
    const numericSpellLevel = Number(spellLevel);
    const count = Number(rawCount) || 0;
    const options = classOptions.filter((spell) => spell.level === numericSpellLevel);
    if (count <= 0 || options.length === 0) return [];
    const knownSpells = context.catalog.spells.filter(spell => existing.has(spell.id));
    const selected = knownSpells.filter((spell, index) => (
      options.some(candidate => sameSpellIdentity(candidate, spell))
      && knownSpells.findIndex(candidate => sameSpellIdentity(candidate, spell)) === index
    )).length;
    const needed = Math.max(0, count - selected);
    const newOptions = options.filter((spell) => !existing.has(spell.id)
      && ![...existing].some((id) => {
        const known = context.catalog.spells.find((candidate) => candidate.id === id);
        return known !== undefined && sameSpellIdentity(known, spell);
      }));
    return [{
      classLevel,
      spellLevel: numericSpellLevel,
      count,
      selected,
      ...(needed > 0
        ? {
            group: choiceGroup(
              ruleClass,
              classLevel,
              `fixed-${numericSpellLevel}`,
              needed,
              newOptions,
            ),
          }
        : {}),
      options: newOptions,
    }];
  });
}

export function getRuleSpellIdentity(spell: RuleSpell): string {
  return (String(spell.englishName || spell.key || spell.name)
    .split('|')[0] ?? '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-US');
}

function sameSpellIdentity(left: RuleSpell, right: RuleSpell): boolean {
  return getRuleSpellIdentity(left) === getRuleSpellIdentity(right);
}

function magicalSecretsGroups(
  context: RuleContext,
  ruleClass: RuleClass,
  oldClassLevel: number,
  newClassLevel: number,
  maxSpellLevel: number,
  existing: ReadonlySet<string>,
  subclass?: RuleSubclass,
): RuleChoiceGroup<RuleSpell>[] {
  if (ruleClass.key !== 'Bard' || ruleClass.source !== 'PHB') return [];
  const knownSpells = context.catalog.spells.filter(spell => existing.has(spell.id));
  const pool = getRuleMagicalSecretSpellOptions(context, maxSpellLevel)
    .filter(spell => !knownSpells.some(known => sameSpellIdentity(known, spell)));
  return [...(subclass?.key === 'College of Lore' ? [6] : []), 10, 14, 18]
    .filter((level) => oldClassLevel < level && level <= newClassLevel)
    .map((level) => choiceGroup(ruleClass, level, 'magical-secrets', 2, pool));
}

export function getRuleMagicalSecretSpellOptions(
  context: RuleContext,
  maxSpellLevel: number,
): RuleSpell[] {
  const classKeys = new Set(['Bard', 'Cleric', 'Druid', 'Wizard']);
  return dedupeRuleEntitiesByNameAndSourcePriority(
    'spell',
    context.catalog.spells.filter((spell) => (
      spell.level <= maxSpellLevel
      && (context.ruleSystem === '5e' || spell.classKeys.some((key) => classKeys.has(key)))
      && isRuleEntityAuthorized('spell', spell, context.authorization)
    )),
    context.authorization,
  ).sort(compareSpells);
}

function validateSpellReplacement(
  context: RuleContext,
  state: RuleSpellcastingAdvancementState,
  existing: RuleSpellcastingProfile | undefined,
  selection: RuleSpellReplacementSelection | null | undefined,
): RuleResult<{ remove: RuleSpellcastingProfile['spells'][number]; add: RuleSpell } | null> {
  if (!selection) return success(null);
  if (state.mode !== 'knownSelection' || !existing) {
    return invalid('choice_not_available', ['spellcasting', 'replacement'], 'spell_replacement_not_available');
  }
  const automatic = new Set(state.automaticSpells.map(getRuleSpellIdentity));
  const removeSpell = context.catalog.spells.find(({ id }) => id === selection.removeId);
  const bonus = existing.spells.some(spell => spell.countsAgainstKnownLimit === false
    && context.catalog.spells.some(candidate => candidate.id === spell.id
      && removeSpell !== undefined && sameSpellIdentity(candidate, removeSpell)));
  const remove = existing.spells.find(spell => (
    spell.id === selection.removeId && !bonus
    && removeSpell !== undefined && removeSpell.level > 0
    && !automatic.has(getRuleSpellIdentity(removeSpell))
  ));
  const add = state.leveled.find(({ id }) => (
    id === selection.addId
    && id !== selection.removeId
    && !state.knownSpellIds.includes(id)
    && !existing.spells.some((spell) => spell.id === id)
  ));
  return remove && add
    ? success({ remove, add })
    : invalid('choice_not_available', ['spellcasting', 'replacement'], 'spell_replacement_invalid');
}

function multiclassCasterLevelContribution(ruleClass: RuleClass, level: number): number {
  if (!ruleClass.spellcastingAbility || !ruleClass.casterProgression || ruleClass.casterProgression === 'pact') return 0;
  if (ruleClass.casterProgression === 'full') return level;
  if (ruleClass.casterProgression === 'artificer') return Math.ceil(level / 2);
  if (ruleClass.casterProgression === '1/2') return ruleClass.ruleSystem === '5r' ? Math.ceil(level / 2) : Math.floor(level / 2);
  if (ruleClass.casterProgression === '1/3') return Math.floor(level / 3);
  return 0;
}

function slotsFromTotals(
  totals: readonly number[],
  existingSlots: RuleSpellSlots,
): RuleSpellSlots {
  const slots: RuleSpellSlots = {};
  totals.forEach((rawTotal, index) => {
    const total = Math.max(0, Number(rawTotal) || 0);
    if (total === 0) return;
    const level = String(index + 1);
    slots[level] = {
      total,
      expended: Math.min(total, Math.max(0, existingSlots[level]?.expended ?? 0)),
    };
  });
  return slots;
}

function spellcastingAbility(ruleClass: RuleClass): RuleSpellcastingProfile['ability'] {
  const ability = ruleClass.spellcastingAbility?.slice(0, 3).toUpperCase();
  return ability === 'STR'
    || ability === 'DEX'
    || ability === 'CON'
    || ability === 'INT'
    || ability === 'WIS'
    || ability === 'CHA'
    ? ability
    : 'INT';
}

function choiceGroup(
  ruleClass: RuleClass,
  classLevel: number,
  suffix: string,
  count: number,
  options: RuleSpell[],
): RuleChoiceGroup<RuleSpell> {
  return {
    id: `class-${ruleClass.key}-${ruleClass.source}-spells-${classLevel}-${suffix}`,
    kind: 'spell',
    required: true,
    min: count,
    max: count,
    options,
  };
}

function validateInput(
  context: RuleContext,
  ruleClass: RuleClass,
  oldClassLevel: number,
  newClassLevel: number,
  subclass?: RuleSubclass,
): RuleResult<{ ruleClass: RuleClass; subclass?: RuleSubclass }> {
  if (
    !Number.isInteger(oldClassLevel)
    || !Number.isInteger(newClassLevel)
    || oldClassLevel < 0
    || newClassLevel < oldClassLevel
    || newClassLevel > 20
  ) {
    return invalid('level_cap_exceeded', ['classLevel'], 'class_level_range_invalid');
  }
  const authorizedClass = context.catalog.classes.find((candidate) => (
    candidate.key === ruleClass.key
    && candidate.source === ruleClass.source
    && candidate.ruleSystem === context.ruleSystem
    && isRuleEntityAuthorized('class', candidate, context.authorization)
  ));
  if (!authorizedClass) {
    return invalid('entity_not_authorized', ['class'], 'class_not_authorized');
  }
  if (!subclass) return success({ ruleClass: authorizedClass });
  const authorizedSubclass = context.catalog.subclasses.find((candidate) => (
    candidate.id === subclass.id
    && candidate.className === authorizedClass.name
    && candidate.classSource === authorizedClass.source
    && isRuleEntityAuthorized('subclass', candidate, context.authorization)
  ));
  return authorizedSubclass
    ? (subclass.selectedSpellBlock !== undefined && !getRuleSubclassSpellBlocks(authorizedSubclass).some(block => block.id === subclass.selectedSpellBlock)
      ? invalid('choice_not_available', ['subclass', 'selectedSpellBlock'], 'subclass_spell_block_not_available')
      : success({ ruleClass: authorizedClass, subclass: { ...authorizedSubclass,
          ...(subclass.selectedSpellBlock === undefined ? {} : { selectedSpellBlock: subclass.selectedSpellBlock }),
        } }))
    : invalid('entity_not_authorized', ['subclass'], 'subclass_not_authorized');
}

function compareSpells(left: RuleSpell, right: RuleSpell): number {
  return left.level - right.level
    || left.name.localeCompare(right.name, 'zh-Hans-CN')
    || left.source.localeCompare(right.source)
    || left.id.localeCompare(right.id);
}

function success<T>(value: T): RuleResult<T> {
  return { ok: true, value, warnings: [] };
}

function invalid(
  code: RuleIssue['code'],
  path: readonly (string | number)[],
  reason: string,
): RuleResult<never> {
  return { ok: false, issues: [{ code, path, detail: { reason } }] };
}
