import type {
  RuleAbilityName,
  RuleClass,
  RuleFeature,
  RuleSystem,
} from '../catalog/model.js';
import type {
  CanonicalRuleCharacterSnapshot,
  RuleClassState,
  RuleEntityRef,
} from '../model/character.js';
import type { RuleContext } from '../model/context.js';
import type { RuleEffect } from '../model/effect.js';
import type { RuleIssue, RuleResult } from '../model/issue.js';
import { applyRuleEffects } from './apply.js';
import {
  createRuleExpertiseAdvancementEffects,
  createRuleExpertiseAdvancementState,
} from './class-common-choices.js';
import { createRuleFeatAdvancementEffects, createRuleFeatFixedEffects } from './feat-resources.js';
import { createRuleFeatEffects } from './feat.js';
import {
  createRuleFeatSpellEffects,
  createRuleFeatSpellLevelUpEffects,
  type RuleFeatSpellSelections,
} from './feat-spells.js';
import {
  createRuleOriginSpellLevelUpEffects,
  type RuleOriginSpellSelections,
} from './origin-spells.js';
import { createRuleClassResourceEffects } from './class-resources.js';
import {
  createRuleSpellcastingAdvancementEffects,
  createRuleSpellcastingAdvancementState,
  type RuleSpellReplacementSelection,
} from './spellcasting-advancement.js';
import {
  createRuleSubclassAdvancementEffects,
  createRuleSubclassAdvancementState,
  getRuleSubclassFeatureRef,
} from './subclass-advancement.js';
import { isRuleEntityAuthorized } from '../policy/authorization.js';
import { parseRuleClassSkillChoiceGroups, parseRuleToolChoiceGroups } from '../options/common-choices.js';
import { validateRuleChoiceSelections } from '../validation/common.js';
import {
  createRuleInvocationAdvancementEffects,
  createRuleInvocationAdvancementState,
} from './invocation-advancement.js';
import {
  createRuleWeaponMasteryAdvancementEffects,
  createRuleWeaponMasteryAdvancementState,
  createRuleFightingStyleAdvancementEffects,
  createRuleFightingStyleAdvancementState,
  createRuleFightingStyleCantripChoiceState,
  createRuleFightingStyleCantripEffects,
} from './class-common-choices.js';
import {
  createRuleMetamagicAdvancementState,
  createRuleOptionalFeatureAdvancementEffects,
  createRuleManeuverAdvancementState,
} from './optional-feature-advancement.js';

export interface RuleLevelOneChoice {
  class: { key: string; source: string };
  classId?: string;
  subclassId?: string;
  expertiseIds?: readonly string[];
  spellcasting?: RuleBuildSpellcastingChoice;
  fightingStyleIds?: readonly string[];
  fightingStyleCantripIds?: readonly string[];
}

export interface RuleLevelUpTarget {
  classId?: string;
  class?: { key: string; source: string };
  targetClassLevel?: number;
}

export interface RuleLevelUpChoice {
  subclassId?: string;
  abilityIncreases?: Partial<Record<RuleAbilityName, number>>;
  feat?: RuleEntityRef;
  featChoices?: Readonly<Record<string, readonly string[]>>;
  featSpellChoices?: Readonly<Record<string, RuleFeatSpellSelections>>;
  existingFeatSpellChoices?: Readonly<Record<string, RuleFeatSpellSelections>>;
  originSpellChoices?: Readonly<Record<string, RuleOriginSpellSelections & { kind: 'race' | 'background' }>>;
  multiclassSkillChoices?: readonly string[];
  multiclassToolChoices?: Readonly<Record<string, readonly string[]>>;
  expertiseIds?: readonly string[];
  invocationIds?: readonly string[];
  weaponMasteryIds?: readonly string[];
  metamagicIds?: readonly string[];
  maneuverIds?: readonly string[];
  fightingStyleIds?: readonly string[];
  fightingStyleCantripIds?: readonly string[];
  spellcasting?: RuleBuildSpellcastingChoice;
}

export interface RuleBuildSpellcastingChoice {
  selections: Readonly<Record<string, readonly string[]>>;
  replacement?: RuleSpellReplacementSelection | null;
}

export interface RuleProjectionResult {
  character: CanonicalRuleCharacterSnapshot;
  effects: readonly RuleEffect[];
  choices: CanonicalRuleCharacterSnapshot['choices'];
}

export function createRuleClassInstanceId(
  ruleClass: Pick<RuleClass, 'key' | 'source'>,
  commandId?: string,
): string {
  const semantic = `${normalizeIdPart(ruleClass.key)}-${normalizeIdPart(ruleClass.source)}`;
  return commandId?.trim()
    ? `class-${semantic}-${normalizeIdPart(commandId)}`
    : `class-${semantic}`;
}

export function validateAndProjectLevelOne(
  context: RuleContext,
  draft: CanonicalRuleCharacterSnapshot,
  choice: RuleLevelOneChoice,
): RuleResult<RuleProjectionResult> {
  if (draft.classes.length > 0) {
    return invalid('choice_conflict', ['classes'], 'level_one_class_already_present');
  }
  const ruleClass = findAuthorizedClass(context, choice.class);
  if (!ruleClass.ok) return ruleClass;
  const classId = choice.classId?.trim() || createRuleClassInstanceId(ruleClass.value);
  if (!validStableId(classId)) {
    return invalid('unsupported_rule_shape', ['classId'], 'class_id_invalid');
  }
  return projectClassAdvancement(
    context,
    draft,
    ruleClass.value,
    {
      id: classId,
      key: ruleClass.value.key,
      source: ruleClass.value.source,
      level: 0,
    },
    0,
    1,
    choice,
  );
}

export function validateAndProjectLevelUp(
  context: RuleContext,
  character: CanonicalRuleCharacterSnapshot,
  target: RuleLevelUpTarget,
  choice: RuleLevelUpChoice,
): RuleResult<RuleProjectionResult> {
  if ((target.classId === undefined) === (target.class === undefined)) {
    return invalid('choice_conflict', ['target'], 'class_target_invalid');
  }
  const totalLevel = character.classes.reduce((total, item) => total + item.level, 0);
  if (totalLevel >= 20) return invalid('level_cap_exceeded', ['classes'], 'character_level_cap');
  if (target.class !== undefined) {
    if (target.targetClassLevel !== undefined && target.targetClassLevel !== 1) {
      return invalid('choice_conflict', ['target', 'targetClassLevel'], 'target_level_stale');
    }
    const ruleClass = findAuthorizedClass(context, target.class);
    if (!ruleClass.ok) return ruleClass;
    if (character.classes.some(({ key, source }) => key === target.class!.key && source === target.class!.source)) {
      return invalid('choice_conflict', ['target', 'class'], 'class_already_present');
    }
    const prerequisite = validateMulticlassPrerequisites(context, character, ruleClass.value);
    if (!prerequisite.ok) return prerequisite;
    const proficiencyEffects = createMulticlassProficiencyEffects(ruleClass.value, choice);
    if (!proficiencyEffects.ok) return proficiencyEffects;
    const classId = createRuleClassInstanceId(ruleClass.value);
    if (character.classes.some(({ id }) => id === classId)) {
      return invalid('choice_conflict', ['target', 'class'], 'class_id_conflict');
    }
    return projectClassAdvancement(
      context,
      character,
      ruleClass.value,
      { id: classId, key: ruleClass.value.key, source: ruleClass.value.source, level: 0 },
      0,
      1,
      choice,
      true,
      proficiencyEffects.value,
    );
  }
  const classState = character.classes.find(({ id }) => id === target.classId);
  if (!classState) return invalid('entity_not_found', ['target', 'classId'], 'class_not_found');
  const newClassLevel = classState.level + 1;
  if (
    target.targetClassLevel !== undefined
    && target.targetClassLevel !== newClassLevel
  ) {
    return invalid('choice_conflict', ['target', 'targetClassLevel'], 'target_level_stale');
  }
  const ruleClass = findAuthorizedClass(context, classState);
  if (!ruleClass.ok) return ruleClass;
  return projectClassAdvancement(
    context,
    character,
    ruleClass.value,
    classState,
    classState.level,
    newClassLevel,
    choice,
  );
}

function projectClassAdvancement(
  context: RuleContext,
  character: CanonicalRuleCharacterSnapshot,
  ruleClass: RuleClass,
  classState: RuleClassState,
  oldClassLevel: number,
  newClassLevel: number,
  choice: RuleLevelOneChoice | RuleLevelUpChoice,
  isMulticlass = false,
  multiclassProficiencyEffects: readonly RuleEffect[] = [],
): RuleResult<RuleProjectionResult> {
  const subclassState = createRuleSubclassAdvancementState(
    context,
    ruleClass,
    oldClassLevel,
    newClassLevel,
    classState.subclass?.id,
  );
  if (!subclassState.ok) return subclassState;
  const subclassEffects = createRuleSubclassAdvancementEffects(
    subclassState.value,
    choice.subclassId ? [choice.subclassId] : [],
  );
  if (!subclassEffects.ok) return subclassEffects;
  const selectedSubclass = choice.subclassId
    ? subclassState.value.options.find(({ id }) => id === choice.subclassId)
    : subclassState.value.existingSubclass;
  const abilityEffects = validateAbilityScoreIncrease(
    ruleClass,
    character,
    newClassLevel,
    choice,
  );
  if (!abilityEffects.ok) return abilityEffects;
  const featEffects = validateSelectedFeat(context, character, choice);
  if (!featEffects.ok) return featEffects;
  const oldCharacterLevel = character.classes.reduce((total, item) => total + item.level, 0);
  const newCharacterLevel = oldCharacterLevel + 1;
  const spellAdvancement = createExistingSpellAdvancementEffects(
    context,
    character,
    choice,
    oldCharacterLevel,
    newCharacterLevel,
  );
  if (!spellAdvancement.ok) return spellAdvancement;
  const expertiseState = createRuleExpertiseAdvancementState(
    context,
    ruleClass,
    oldClassLevel,
    newClassLevel,
    character.proficiencies,
    character.expertises,
  );
  if (!expertiseState.ok) return expertiseState;
  const expertiseEffects = createRuleExpertiseAdvancementEffects(
    expertiseState.value,
    choice.expertiseIds ?? [],
  );
  if (!expertiseEffects.ok) return expertiseEffects;
  const existingInvocationIds = context.catalog.invocations.filter((invocation) => (
    character.features.some((feature) => (
      feature.id === invocation.id
      || (feature.key === invocation.key && feature.source === invocation.source)
    ))
  )).map((invocation) => invocation.id ?? `${invocation.key}|${invocation.source}`);
  const knownClassFeatureNames = [
    ...ruleClass.levelOneFeatures,
    ...ruleClass.levelFeatures,
    ...(selectedSubclass === undefined ? [] : selectedSubclass.features),
  ].filter((feature) => feature.level === undefined || feature.level <= newClassLevel)
    .flatMap((feature) => [feature.name, ...(feature.englishName ? [feature.englishName] : [])]);
  const invocationState = createRuleInvocationAdvancementState(
    context,
    ruleClass,
    oldClassLevel,
    newClassLevel,
    existingInvocationIds,
    {
      knownFeatureIds: character.features.map(({ id }) => id),
      knownFeatureNames: [
        ...character.features.flatMap(({ key }) => key ? [key] : []),
        ...knownClassFeatureNames,
      ],
      knownSpellIds: character.spellcastingProfiles.flatMap(({ spells }) => spells.map(({ id }) => id)),
    },
  );
  if (!invocationState.ok) return invocationState;
  const invocationEffects = createRuleInvocationAdvancementEffects(
    invocationState.value,
    'invocationIds' in choice ? choice.invocationIds ?? [] : [],
  );
  if (!invocationEffects.ok) return invocationEffects;
  const weaponMasteryIds = context.catalog.weapons.filter((weapon) => (
    character.features.some((feature) => feature.id === weapon.id
      || (feature.key === weapon.key && feature.source === weapon.source))
  )).map(({ id, key, source }) => id ?? `${key}|${source}`);
  const weaponMasteryState = createRuleWeaponMasteryAdvancementState(
    context, ruleClass, oldClassLevel, newClassLevel, weaponMasteryIds,
  );
  if (!weaponMasteryState.ok) return weaponMasteryState;
  const weaponMasteryEffects = createRuleWeaponMasteryAdvancementEffects(
    weaponMasteryState.value,
    'weaponMasteryIds' in choice ? choice.weaponMasteryIds ?? [] : [],
  );
  if (!weaponMasteryEffects.ok) return weaponMasteryEffects;
  const metamagicIds = context.catalog.metamagics.filter((entry) => (
    character.features.some((feature) => feature.id === entry.id
      || (feature.key === entry.key && feature.source === entry.source))
  )).map(({ id, key, source }) => id ?? `${key}|${source}`);
  const metamagicState = createRuleMetamagicAdvancementState(
    context, ruleClass, oldClassLevel, newClassLevel, metamagicIds,
  );
  if (!metamagicState.ok) return metamagicState;
  const metamagicEffects = createRuleOptionalFeatureAdvancementEffects(
    metamagicState.value,
    'metamagicIds' in choice ? choice.metamagicIds ?? [] : [],
  );
  if (!metamagicEffects.ok) return metamagicEffects;
  const maneuverIds = context.catalog.maneuvers.filter((entry) => (
    character.features.some((feature) => feature.id === entry.id
      || (feature.key === entry.key && feature.source === entry.source))
  )).map(({ id, key, source }) => id ?? `${key}|${source}`);
  const maneuverState = createRuleManeuverAdvancementState(
    context,
    selectedSubclass,
    oldClassLevel,
    newClassLevel,
    maneuverIds,
  );
  if (!maneuverState.ok) return maneuverState;
  const maneuverEffects = createRuleOptionalFeatureAdvancementEffects(
    maneuverState.value,
    'maneuverIds' in choice ? choice.maneuverIds ?? [] : [],
  );
  if (!maneuverEffects.ok) return maneuverEffects;
  const fightingStyleIds = context.catalog.fightingStyles.filter((entry) => (
    character.features.some((feature) => feature.id === entry.id
      || (feature.key === entry.key && feature.source === entry.source))
  )).map(({ id }) => id);
  const fightingStyleState = createRuleFightingStyleAdvancementState(
    context,
    ruleClass,
    oldClassLevel,
    newClassLevel,
    fightingStyleIds,
    selectedSubclass,
  );
  if (!fightingStyleState.ok) return fightingStyleState;
  const fightingStyleEffects = createRuleFightingStyleAdvancementEffects(
    fightingStyleState.value,
    'fightingStyleIds' in choice ? choice.fightingStyleIds ?? [] : [],
  );
  if (!fightingStyleEffects.ok) return fightingStyleEffects;
  const selectedStyle = fightingStyleState.value.group?.options.find((option) => (
    option.id === ('fightingStyleIds' in choice ? choice.fightingStyleIds?.[0] : undefined)
  ));
  if (selectedStyle === undefined && 'fightingStyleCantripIds' in choice
    && (choice.fightingStyleCantripIds?.length ?? 0) > 0) {
    return invalid('choice_not_available', ['fightingStyleCantripIds'], 'fighting_style_not_selected');
  }
  const styleCantripState = selectedStyle === undefined
    ? undefined
    : createRuleFightingStyleCantripChoiceState(context, selectedStyle);
  if (styleCantripState !== undefined && !styleCantripState.ok) return styleCantripState;
  const styleCantripEffects = styleCantripState?.ok
    ? createRuleFightingStyleCantripEffects(
        styleCantripState.value,
        character.spellcastingProfiles.find(({ classId }) => classId === classState.id)?.id
          ?? `auto-${ruleClass.key.toLowerCase()}-${ruleClass.source.toLowerCase()}-spellcasting`,
        'fightingStyleCantripIds' in choice ? choice.fightingStyleCantripIds ?? [] : [],
      )
    : undefined;
  if (styleCantripEffects !== undefined && !styleCantripEffects.ok) return styleCantripEffects;

  const nextClass: RuleClassState = {
    ...classState,
    key: ruleClass.key,
    source: ruleClass.source,
    level: newClassLevel,
    ...(selectedSubclass === undefined
      ? (classState.subclass === undefined ? {} : { subclass: classState.subclass })
      : { subclass: toRef(selectedSubclass) }),
  };
  const effects: RuleEffect[] = [
    {
      type: 'class.upsert',
      classState: nextClass,
      sourceId: `auto-class-${ruleClass.key}-${ruleClass.source}`,
    },
    ...classFeatureEffects(ruleClass, oldClassLevel, newClassLevel),
    ...subclassEffects.value,
    ...abilityEffects.value,
    ...featEffects.value,
    ...spellAdvancement.value,
    ...expertiseEffects.value,
    ...invocationEffects.value,
    ...weaponMasteryEffects.value,
    ...metamagicEffects.value,
    ...maneuverEffects.value,
    ...fightingStyleEffects.value,
    ...multiclassProficiencyEffects,
    ...createRuleFeatAdvancementEffects(
      context.catalog.feats.filter((feat) => (
        character.feats.some(({ id }) => id === feat.id)
      )),
      context.ruleSystem,
      oldCharacterLevel,
      newCharacterLevel,
    ),
    ...('feat' in choice && choice.feat !== undefined
      ? (() => {
          const feat = context.catalog.feats.find(({ id, key, source }) => (
            (id ?? `${key}|${source}`) === choice.feat!.id
            && key === choice.feat!.key && source === choice.feat!.source
          ));
          return feat ? createRuleFeatFixedEffects(
            feat,
            context.ruleSystem,
            newCharacterLevel,
          ) : [];
        })()
      : []),
    ...createRuleClassResourceEffects(
      ruleClass,
      character,
      newClassLevel,
      character.classes.reduce((total, item) => total + item.level, 0) + 1,
    ).map((resource) => ({
      type: 'resource.upsert' as const,
      resource,
      sourceId: resource.sourceId,
    })),
  ];
  const spellEffects = projectSpellcasting(
    context,
    character,
    ruleClass,
    oldClassLevel,
    newClassLevel,
    selectedSubclass,
    choice.spellcasting,
  );
  if (!spellEffects.ok) return spellEffects;
  effects.push(...spellEffects.value);
  if (styleCantripEffects?.ok) effects.push(...styleCantripEffects.value);
  const hpEffect = createHpEffect(character, ruleClass, abilityEffects.value, oldClassLevel, isMulticlass);
  if (hpEffect) effects.push(hpEffect);
  const applied = applyRuleEffects(character, effects);
  if (!applied.ok) return applied;
  const choiceRecords = [
    {
      level: character.classes.reduce((total, item) => total + item.level, 0) + 1,
      groupId: `class-${ruleClass.key}-${ruleClass.source}-level`,
      selectedIds: [classState.id],
      value: newClassLevel,
    },
    ...(choice.subclassId === undefined ? [] : [{
      level: character.classes.reduce((total, item) => total + item.level, 0) + 1,
      groupId: subclassState.value.group?.id
        ?? `class-${ruleClass.key}-${ruleClass.source}-subclass`,
      selectedIds: [choice.subclassId],
    }]),
  ];
  applied.value.choices.push(...choiceRecords);
  return {
    ok: true,
    value: {
      character: applied.value,
      effects,
      choices: choiceRecords,
    },
    warnings: [],
  };
}

function projectSpellcasting(
  context: RuleContext,
  character: CanonicalRuleCharacterSnapshot,
  ruleClass: RuleClass,
  oldClassLevel: number,
  newClassLevel: number,
  subclass: Parameters<typeof createRuleSpellcastingAdvancementState>[5],
  choice: RuleBuildSpellcastingChoice | undefined,
): RuleResult<readonly RuleEffect[]> {
  if (!choice) return success([]);
  const profileId = `auto-${ruleClass.key.toLowerCase()}-${ruleClass.source.toLowerCase()}-spellcasting`;
  const existingProfile = character.spellcastingProfiles.find(({ id, classId }) => (
    id === profileId
    || classId === character.classes.find(({ key, source }) => (
      key === ruleClass.key && source === ruleClass.source
    ))?.id
  ));
  const state = createRuleSpellcastingAdvancementState(
    context,
    ruleClass,
    oldClassLevel,
    newClassLevel,
    existingProfile?.spells.map(({ id }) => id) ?? [],
    subclass,
  );
  if (!state.ok) return state;
  if (!state.value) {
    return Object.keys(choice.selections).length === 0 && !choice.replacement
      ? success([])
      : invalid('choice_not_available', ['spellcasting'], 'spellcasting_not_available');
  }
  return createRuleSpellcastingAdvancementEffects(context, state.value, {
    ...(existingProfile === undefined ? {} : { existingProfile }),
    selections: choice.selections,
    ...(choice.replacement === undefined ? {} : { replacement: choice.replacement }),
  });
}

function validateAbilityScoreIncrease(
  ruleClass: RuleClass,
  character: CanonicalRuleCharacterSnapshot,
  newClassLevel: number,
  choice: RuleLevelOneChoice | RuleLevelUpChoice,
): RuleResult<RuleEffect[]> {
  const input = 'abilityIncreases' in choice ? choice.abilityIncreases ?? {} : {};
  const required = ruleClass.levelFeatures.some((feature) => (
    feature.level === newClassLevel
    && isNamed(feature, 'Ability Score Improvement', '属性值提升')
  ));
  const epicBoon = ruleClass.ruleSystem === '5r' && ruleClass.levelFeatures.some((feature) => (
    feature.level === newClassLevel && isNamed(feature, 'Epic Boon', '史诗恩惠')
  ));
  const values = (['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map((ability) => ({
    ability,
    value: input[ability] ?? 0,
  }));
  if (
    Object.keys(input).some((key) => !values.some(({ ability }) => ability === key))
    || values.some(({ value }) => !Number.isInteger(value) || value < 0 || value > 2)
  ) {
    return invalid('choice_not_available', ['abilityIncreases'], 'ability_increase_invalid');
  }
  const total = values.reduce((sum, { value }) => sum + value, 0);
  const hasFeat = 'feat' in choice && choice.feat !== undefined;
  if (
    (required && !hasFeat && total !== 2)
    || (epicBoon && !hasFeat)
    || (required && hasFeat && total > 2)
    || (epicBoon && hasFeat && total !== 1)
    || (!required && !epicBoon && (total !== 0 || hasFeat))
  ) {
    return invalid(
      required || epicBoon ? 'choice_required' : 'choice_not_available',
      ['abilityIncreases'],
      'ability_increase_count_invalid',
    );
  }
  if (values.some(({ ability, value }) => character.abilities[ability] + value > (epicBoon ? 30 : 20))) {
    return invalid('ability_cap_exceeded', ['abilityIncreases'], 'ability_cap_exceeded');
  }
  return success(values.flatMap(({ ability, value }): RuleEffect[] => (
    value === 0 ? [] : [{
      type: 'ability.add',
      ability,
      value,
      sourceId: `auto-class-${ruleClass.key}-${ruleClass.source}-asi-${newClassLevel}`,
    }]
  )));
}

function validateSelectedFeat(
  context: RuleContext,
  character: CanonicalRuleCharacterSnapshot,
  choice: RuleLevelOneChoice | RuleLevelUpChoice,
): RuleResult<RuleEffect[]> {
  if (!('feat' in choice) || choice.feat === undefined) {
    return Object.keys('featSpellChoices' in choice ? choice.featSpellChoices ?? {} : {}).length === 0
      ? success([])
      : invalid('choice_not_available', ['featSpellChoices'], 'feat_not_selected');
  }
  const feat = context.catalog.feats.find((candidate) => (
    (candidate.id ?? `${candidate.key}|${candidate.source}`) === choice.feat!.id
    && candidate.key === choice.feat!.key
    && candidate.source === choice.feat!.source
    && isRuleEntityAuthorized('feat', candidate, context.authorization)
  ));
  if (!feat) return invalid('entity_not_authorized', ['feat'], 'feat_not_authorized');
  const epicBoonLevel = context.ruleSystem === '5r' && context.catalog.classes.some((ruleClass) => (
    character.classes.some(({ key, source, level }) => (
      key === ruleClass.key && source === ruleClass.source
      && ruleClass.levelFeatures.some((feature) => (
        feature.level === level + 1 && isNamed(feature, 'Epic Boon', '史诗恩惠')
      ))
    ))
  ));
  if (epicBoonLevel ? feat.category !== 'EB' : feat.category === 'EB') {
    return invalid('choice_not_available', ['feat'], 'epic_boon_required');
  }
  if (character.feats.some(({ id }) => id === feat.id)) {
    return invalid('entity_already_selected', ['feat'], 'feat_already_selected');
  }
  const featId = feat.id ?? `${feat.key}|${feat.source}`;
  const featSpellSelections = 'featSpellChoices' in choice
    ? choice.featSpellChoices?.[featId]
    : undefined;
  const selectedChoices = createRuleFeatEffects(
    context.catalog,
    context.ruleSystem,
    { ...feat, ability: [] },
    {
      abilities: character.abilities,
      proficiencies: character.proficiencies,
      knownFeatureIds: character.features.map(({ id }) => id),
      knownFeatureNames: character.features.map(({ key }) => key),
      selectedFeatureIds: character.features.map(({ id }) => id),
      knownSpellIds: character.spellcastingProfiles.flatMap(({ spells }) => spells.map(({ id }) => id)),
      selectedSpellIds: [
        ...Object.values(choice.spellcasting?.selections ?? {}).flat(),
        ...Object.values(featSpellSelections?.choices ?? {}).flat(),
        ...(featSpellSelections?.replaceAddId === undefined ? [] : [featSpellSelections.replaceAddId]),
      ],
      warlockLevel: character.classes
        .filter(({ key }) => key === 'Warlock')
        .reduce((total, { level }) => total + level, 0),
    },
    'featChoices' in choice && choice.featChoices !== undefined
      ? { choices: choice.featChoices }
      : {},
  );
  if (!selectedChoices.ok) return selectedChoices;
  if (Object.keys(choice.featSpellChoices ?? {}).some((id) => id !== featId)) {
    return invalid('choice_not_available', ['featSpellChoices'], 'feat_not_selected');
  }
  const featSpellEffects = createRuleFeatSpellEffects(
    context.catalog,
    context.ruleSystem,
    feat,
    character.classes.reduce((total, item) => total + item.level, 0) + 1,
    'featSpellChoices' in choice ? choice.featSpellChoices?.[featId] : undefined,
  );
  if (!featSpellEffects.ok) return featSpellEffects;
  return success([{
    type: 'feat.add',
    feat: toRef({ id: featId, key: feat.key, source: feat.source }),
    sourceId: `auto-feat-${feat.key}-${feat.source}`,
  }, ...selectedChoices.value, ...featSpellEffects.value]);
}

function createExistingSpellAdvancementEffects(
  context: RuleContext,
  character: CanonicalRuleCharacterSnapshot,
  choice: RuleLevelUpChoice,
  oldCharacterLevel: number,
  newCharacterLevel: number,
): RuleResult<RuleEffect[]> {
  const effects: RuleEffect[] = [];
  const knownFeatIds = new Set<string>();
  for (const selected of character.feats) {
    const feat = context.catalog.feats.find((item) => (
      (item.id ?? `${item.key}|${item.source}`) === selected.id
    ));
    if (feat === undefined) continue;
    const id = feat.id ?? `${feat.key}|${feat.source}`;
    knownFeatIds.add(id);
    const profileId = `auto-feat-${feat.key}-${feat.source}-spells`;
    const existingProfile = character.spellcastingProfiles.find(({ id: value }) => value === profileId);
    const result = createRuleFeatSpellLevelUpEffects(
      context.catalog,
      context.ruleSystem,
      feat,
      oldCharacterLevel,
      newCharacterLevel,
      existingProfile,
      choice.existingFeatSpellChoices?.[id],
    );
    if (!result.ok) return result;
    effects.push(...result.value);
  }
  if (Object.keys(choice.existingFeatSpellChoices ?? {}).some((id) => !knownFeatIds.has(id))) {
    return invalid('choice_not_available', ['existingFeatSpellChoices'], 'feat_not_known');
  }

  const origins = [
    ...(character.species === undefined ? [] : [{
      kind: 'race' as const,
      origin: context.catalog.races.find(({ key, source }) => (
        key === character.species!.key && source === character.species!.source
      )),
    }]),
    ...(character.subrace === undefined ? [] : [{
      kind: 'race' as const,
      origin: context.catalog.subraces.find(({ key, source }) => (
        key === character.subrace!.key && source === character.subrace!.source
      )),
    }]),
    ...(character.background === undefined ? [] : [{
      kind: 'background' as const,
      origin: context.catalog.backgrounds.find(({ key, source }) => (
        key === character.background!.key && source === character.background!.source
      )),
    }]),
  ];
  const knownOriginIds = new Set<string>();
  for (const { kind, origin } of origins) {
    if (origin === undefined) continue;
    const id = `${kind}:${origin.key}|${origin.source}`;
    knownOriginIds.add(id);
    const profileId = `auto-${kind}-${origin.key}-${origin.source}-spells`;
    const existingProfile = character.spellcastingProfiles.find(({ id: value }) => value === profileId);
    const selection = choice.originSpellChoices?.[id];
    const { kind: _kind, ...spellSelection } = selection ?? { kind };
    const result = createRuleOriginSpellLevelUpEffects(
      context.catalog,
      context.ruleSystem,
      origin,
      kind,
      oldCharacterLevel,
      newCharacterLevel,
      existingProfile,
      spellSelection,
    );
    if (!result.ok) return result;
    effects.push(...result.value);
  }
  if (Object.keys(choice.originSpellChoices ?? {}).some((id) => !knownOriginIds.has(id))) {
    return invalid('choice_not_available', ['originSpellChoices'], 'origin_not_known');
  }
  return success(effects);
}

function classFeatureEffects(
  ruleClass: RuleClass,
  oldClassLevel: number,
  newClassLevel: number,
): RuleEffect[] {
  return [...ruleClass.levelOneFeatures, ...ruleClass.levelFeatures]
    .map((feature, index) => ({ feature, index }))
    .filter(({ feature }) => (
      feature.level !== undefined
      && feature.level > oldClassLevel
      && feature.level <= newClassLevel
    ))
    .map(({ feature, index }) => ({
      type: 'feature.add',
      feature: classFeatureRef(ruleClass, feature, index),
      sourceId: `auto-class-${ruleClass.key}-${ruleClass.source}-level-${feature.level}`,
    }));
}

function classFeatureRef(
  ruleClass: RuleClass,
  feature: RuleFeature,
  index: number,
): RuleEntityRef {
  return {
    id: `class-feature-${normalizeIdPart(ruleClass.key)}-${normalizeIdPart(ruleClass.source)}-${feature.level}-${index}`,
    key: feature.englishName || feature.name,
    source: feature.source || ruleClass.source,
  };
}

function createHpEffect(
  character: CanonicalRuleCharacterSnapshot,
  ruleClass: RuleClass,
  abilityEffects: readonly RuleEffect[],
  oldClassLevel: number,
  isMulticlass = false,
): RuleEffect | undefined {
  if (!ruleClass.hitDie) return undefined;
  const conIncrease = abilityEffects.reduce((total, effect) => (
    effect.type === 'ability.add' && effect.ability === 'CON' ? total + effect.value : total
  ), 0);
  const oldCon = Math.floor((character.abilities.CON - 10) / 2);
  const newCon = Math.floor((character.abilities.CON + conIncrease - 10) / 2);
  const totalLevel = character.classes.reduce((total, item) => total + item.level, 0);
  const base = oldClassLevel === 0 && !isMulticlass
    ? ruleClass.hitDie + newCon
    : 1 + Math.floor(ruleClass.hitDie / 2) + newCon;
  const retroactive = Math.max(0, newCon - oldCon) * totalLevel;
  const gain = Math.max(1, base + retroactive);
  return {
    type: 'combat.patch',
    patch: {
      hp: {
        current: character.combat.hp.current + gain,
        max: character.combat.hp.max + gain,
      },
    },
    sourceId: `auto-class-${ruleClass.key}-${ruleClass.source}-hp`,
  };
}

const multiclassPrerequisites: Readonly<Record<RuleSystem, Readonly<Record<string, readonly (readonly RuleAbilityName[])[]>>>> = {
  '5e': {
    Barbarian: [['STR']], Bard: [['CHA']], Cleric: [['WIS']], Druid: [['WIS']],
    Fighter: [['STR', 'DEX']], Monk: [['DEX'], ['WIS']],
    Paladin: [['STR'], ['CHA']], Ranger: [['DEX'], ['WIS']], Rogue: [['DEX']],
    Sorcerer: [['CHA']], Warlock: [['CHA']], Wizard: [['INT']],
  },
  '5r': {
    Barbarian: [['STR']], Bard: [['CHA']], Cleric: [['WIS']], Druid: [['WIS']],
    Fighter: [['STR', 'DEX']], Monk: [['DEX'], ['WIS']],
    Paladin: [['STR'], ['CHA']], Ranger: [['DEX'], ['WIS']], Rogue: [['DEX']],
    Sorcerer: [['CHA']], Warlock: [['CHA']], Wizard: [['INT']],
  },
};

function validateMulticlassPrerequisites(
  context: RuleContext,
  character: CanonicalRuleCharacterSnapshot,
  newClass: RuleClass,
): RuleResult<[]> {
  const classes = [
    ...character.classes.map((item) => {
      const found = context.catalog.classes.find(({ key, source }) => (
        key === item.key && source === item.source
        && isRuleEntityAuthorized('class', { key, source }, context.authorization)
      ));
      if (found === undefined) {
        return undefined;
      }
      return found;
    }),
    newClass,
  ];
  if (classes.some((ruleClass) => ruleClass === undefined)) {
    return invalid('entity_not_authorized', ['classes'], 'multiclass_existing_class_not_authorized');
  }
  for (const ruleClass of classes as RuleClass[]) {
    const requirements = multiclassPrerequisites[context.ruleSystem]?.[ruleClass.key];
    if (requirements === undefined) {
      return invalid('unsupported_rule_shape', ['class', ruleClass.key], 'multiclass_prerequisite_missing');
    }
    if (!requirements.every((alternatives) => alternatives.some((ability) => character.abilities[ability] >= 13))) {
      return {
        ok: false,
        issues: [{ code: 'prerequisite_not_met', path: ['class', ruleClass.key], detail: { reason: 'multiclass_prerequisite_not_met' } }],
      };
    }
  }
  return success([]);
}

function createMulticlassProficiencyEffects(
  ruleClass: RuleClass,
  choice: RuleLevelUpChoice,
): RuleResult<RuleEffect[]> {
  const proficiency = ruleClass.multiclassProficiencies;
  const sourceId = `auto-multiclass-${ruleClass.key}-${ruleClass.source}`;
  const skillState = parseRuleClassSkillChoiceGroups(proficiency, `multiclass-${ruleClass.key}-${ruleClass.source}`);
  if (!skillState.ok) return skillState;
  const toolState = parseRuleToolChoiceGroups(
    proficiency?.toolProficiencies,
    `multiclass-${ruleClass.key}-${ruleClass.source}`,
  );
  if (!toolState.ok) return toolState;
  const skillGroups = skillState.value;
  const toolGroups = toolState.value;
  const selections: Record<string, readonly string[]> = { ...(choice.multiclassToolChoices ?? {}) };
  if (skillGroups.length === 1) selections[skillGroups[0]!.id] = choice.multiclassSkillChoices ?? [];
  else if ((choice.multiclassSkillChoices?.length ?? 0) > 0) {
    return invalid('choice_not_available', ['multiclassSkillChoices'], 'multiclass_skill_choice_not_available');
  }
  const validated = validateRuleChoiceSelections([...skillGroups, ...toolGroups], selections);
  if (!validated.ok) return validated;
  const effects: RuleEffect[] = [];
  const selected = new Map(validated.value.map(({ groupId, selectedIds }) => [groupId, selectedIds]));
  for (const group of [...skillGroups, ...toolGroups]) {
    for (const id of selected.get(group.id) ?? []) {
      effects.push({
        type: 'proficiency.add',
        proficiency: group.kind === 'skill' ? id : `tool:${id}`,
        sourceId,
      });
    }
  }
  for (const entry of proficiency?.armor ?? []) {
    const value = typeof entry === 'string' ? entry : entry.proficiency;
    if (value) effects.push({ type: 'proficiency.add', proficiency: `armor:${normalizeClassProficiency(value)}`, sourceId });
  }
  for (const entry of proficiency?.weapons ?? []) {
    const value = typeof entry === 'string' ? entry : entry.proficiency;
    if (value) effects.push({ type: 'proficiency.add', proficiency: `weapon:${normalizeClassProficiency(value)}`, sourceId });
  }
  for (const entry of proficiency?.toolProficiencies ?? []) {
    for (const [key, value] of Object.entries(entry)) {
      if (value === true) effects.push({ type: 'proficiency.add', proficiency: `tool:${normalizeClassProficiency(key)}`, sourceId });
    }
  }
  if ((proficiency?.tools?.length ?? 0) > 0 && (proficiency?.toolProficiencies?.length ?? 0) === 0) {
    return invalid('unsupported_rule_shape', ['multiclassProficiencies', 'tools'], 'multiclass_tool_shape_unsupported');
  }
  return success(effects);
}

function normalizeClassProficiency(value: string): string {
  return (value.split('|')[0] ?? '').split(/[;；]/)[0]?.trim() ?? '';
}

function findAuthorizedClass(
  context: RuleContext,
  ref: Pick<RuleEntityRef, 'key' | 'source'>,
): RuleResult<RuleClass> {
  const ruleClass = context.catalog.classes.find((candidate) => (
    candidate.key === ref.key
    && candidate.source === ref.source
    && candidate.ruleSystem === context.ruleSystem
    && isRuleEntityAuthorized('class', candidate, context.authorization)
  ));
  return ruleClass
    ? success(ruleClass)
    : invalid('entity_not_authorized', ['class'], 'class_not_authorized');
}

function toRef(value: { id: string; key: string; source: string }): RuleEntityRef {
  return { id: value.id, key: value.key, source: value.source };
}

function isNamed(feature: RuleFeature, english: string, localized: string): boolean {
  return feature.englishName === english || feature.name === english || feature.name === localized;
}

function validStableId(value: string): boolean {
  return value.length > 0 && value.length <= 200 && !/[\u0000-\u001f\u007f]/.test(value);
}

function normalizeIdPart(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function success<T>(value: T): RuleResult<T> {
  return { ok: true, value, warnings: [] };
}

function invalid<T>(
  code: RuleIssue['code'],
  path: readonly (string | number)[],
  reason: string,
): RuleResult<T> {
  return { ok: false, issues: [{ code, path, detail: { reason } }] };
}
