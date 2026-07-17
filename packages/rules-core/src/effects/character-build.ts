import type {
  RuleAbilityName,
  RuleClass,
  RuleFeature,
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
import { createRuleFeatAdvancementEffects } from './feat-resources.js';
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

export interface RuleLevelOneChoice {
  class: { key: string; source: string };
  classId?: string;
  subclassId?: string;
  expertiseIds?: readonly string[];
  spellcasting?: RuleBuildSpellcastingChoice;
}

export interface RuleLevelUpTarget {
  classId: string;
  targetClassLevel?: number;
}

export interface RuleLevelUpChoice {
  subclassId?: string;
  abilityIncreases?: Partial<Record<RuleAbilityName, number>>;
  feat?: RuleEntityRef;
  expertiseIds?: readonly string[];
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
  const classState = character.classes.find(({ id }) => id === target.classId);
  if (!classState) return invalid('entity_not_found', ['target', 'classId'], 'class_not_found');
  const totalLevel = character.classes.reduce((total, item) => total + item.level, 0);
  if (totalLevel >= 20) return invalid('level_cap_exceeded', ['classes'], 'character_level_cap');
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
    ...expertiseEffects.value,
    ...createRuleFeatAdvancementEffects(
      context.catalog.feats.filter((feat) => (
        character.feats.some(({ id }) => id === feat.id)
      )),
      context.ruleSystem,
      character.classes.reduce((total, item) => total + item.level, 0),
      character.classes.reduce((total, item) => total + item.level, 0) + 1,
    ),
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
  const hpEffect = createHpEffect(character, ruleClass, abilityEffects.value, oldClassLevel);
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
    || (required && hasFeat && total > 2)
    || (!required && (total !== 0 || hasFeat))
  ) {
    return invalid(
      required ? 'choice_required' : 'choice_not_available',
      ['abilityIncreases'],
      'ability_increase_count_invalid',
    );
  }
  if (values.some(({ ability, value }) => character.abilities[ability] + value > 20)) {
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
  if (!('feat' in choice) || choice.feat === undefined) return success([]);
  const feat = context.catalog.feats.find((candidate) => (
    candidate.id === choice.feat!.id
    && candidate.key === choice.feat!.key
    && candidate.source === choice.feat!.source
    && isRuleEntityAuthorized('feat', candidate, context.authorization)
  ));
  if (!feat) return invalid('entity_not_authorized', ['feat'], 'feat_not_authorized');
  if (character.feats.some(({ id }) => id === feat.id)) {
    return invalid('entity_already_selected', ['feat'], 'feat_already_selected');
  }
  return success([{
    type: 'feat.add',
    feat: toRef({ id: feat.id ?? `${feat.key}|${feat.source}`, key: feat.key, source: feat.source }),
    sourceId: `auto-feat-${feat.key}-${feat.source}`,
  }]);
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
): RuleEffect | undefined {
  if (!ruleClass.hitDie) return undefined;
  const conIncrease = abilityEffects.reduce((total, effect) => (
    effect.type === 'ability.add' && effect.ability === 'CON' ? total + effect.value : total
  ), 0);
  const oldCon = Math.floor((character.abilities.CON - 10) / 2);
  const newCon = Math.floor((character.abilities.CON + conIncrease - 10) / 2);
  const totalLevel = character.classes.reduce((total, item) => total + item.level, 0);
  const base = oldClassLevel === 0
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
