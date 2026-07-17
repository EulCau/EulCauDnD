import type {
  RuleClass,
  RuleSpell,
  RuleSubclass,
} from '../catalog/model.js';
import type { RuleChoiceGroup } from '../model/choice.js';
import type { RuleContext } from '../model/context.js';
import type { RuleIssue, RuleResult } from '../model/issue.js';
import { isRuleEntityAuthorized } from '../policy/authorization.js';
import { dedupeRuleEntitiesByNameAndSourcePriority } from '../policy/source-priority.js';

export type RuleSpellcastingMode = 'preparedAll' | 'knownSelection' | 'spellbook';

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
  cantrips: RuleSpell[];
  leveled: RuleSpell[];
  fixedLeveledGroups: RuleFixedSpellChoiceGroup[];
  groups: RuleChoiceGroup<RuleSpell>[];
}

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
  const automaticIds = new Set(getAutomaticPreparedSpells(
    context,
    authorizedClass,
    newClassLevel,
    authorizedSubclass,
  ).map(({ id }) => id));
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
  const existingCantrips = options.filter((spell) => (
    spell.level === 0 && existing.has(spell.id)
  )).length;
  const existingLeveled = options.filter((spell) => (
    spell.level > 0 && existing.has(spell.id) && !automaticIds.has(spell.id)
  )).length;
  const needed = {
    cantrips: Math.max(0, limits.cantrips - existingCantrips),
    leveled: mode === 'preparedAll'
      ? 0
      : Math.max(0, limits.leveled - existingLeveled - fixedNeeded),
  };
  const cantrips = options.filter((spell) => spell.level === 0);
  const leveled = options.filter((spell) => spell.level > 0);
  const groups = [
    ...(needed.cantrips > 0
      ? [choiceGroup(authorizedClass, newClassLevel, 'cantrips', needed.cantrips, cantrips)]
      : []),
    ...(needed.leveled > 0
      ? [choiceGroup(authorizedClass, newClassLevel, 'leveled', needed.leveled, leveled)]
      : []),
    ...fixedLeveledGroups.flatMap(({ group }) => group ? [group] : []),
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
    cantrips,
    leveled,
    fixedLeveledGroups,
    groups,
  });
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
  return dedupeRuleEntitiesByNameAndSourcePriority(
    'spell',
    [
      ...getRuleClassSpellOptions(context, ruleClass, maxSpellLevel),
      ...subclassSpells,
      ...expanded,
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
    ...(subclass?.additionalPreparedSpells ?? []),
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
    const selected = options.filter((spell) => existing.has(spell.id)).length;
    const needed = Math.max(0, count - selected);
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
              options,
            ),
          }
        : {}),
      options,
    }];
  });
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
    ? success({ ruleClass: authorizedClass, subclass: authorizedSubclass })
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
