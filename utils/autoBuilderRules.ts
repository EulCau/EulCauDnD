import {
  AbilityName,
  AdjustmentOperation,
  CharacterData,
  CharacterFeatureEntry,
  CharacterResource,
  createEmptySpellSlots,
  RuleSystem,
  Spell,
  SpellcastingProfile,
  SpellSlot,
} from '../types';
import { applyCharacterAdjustments } from './characterAdjustments';
import { calculateModifier, calculateProficiencyBonus, getTotalLevel } from './dndCalculations';
import {
  formatWeaponMasteryNames,
  refreshCharacterAutomation,
} from './equipmentRules';
import {
  areRuleChoiceSelectionsComplete,
  createRuleOriginChoiceGroups,
  createDefaultRuleAuthorizationPolicy,
  createRuleAdditionalSpellChoiceState,
  createRuleClassInstanceId,
  createRuleExpertiseAdvancementEffects,
  createRuleExpertiseAdvancementState,
  createRuleFightingStyleAdvancementEffects,
  createRuleFightingStyleAdvancementState,
  createRuleFightingStyleCantripChoiceState,
  createRuleFightingStyleCantripEffects,
  createRuleInvocationAdvancementEffects,
  createRuleInvocationAdvancementState,
  createRuleManeuverAdvancementState,
  createRuleMetamagicAdvancementState,
  createRuleOptionalFeatureAdvancementEffects,
  createRuleOriginBaseEffects,
  createRuleOriginAdvancementEffects,
  createRuleOriginFeatChoiceState,
  createRuleOriginFeatEffects,
  createRuleFeatChoiceGroups,
  createRuleFeatAdvancementEffects,
  createRuleFeatEffects,
  createRuleFeatFixedEffects,
  createRuleFeatSpellChoiceState,
  createRuleFeatSpellEffects,
  createRuleFeatSpellLevelUpChoiceState,
  createRuleFeatSpellLevelUpEffects,
  createRuleSpecializedFeatChoiceState,
  createRuleSpecializedFeatEffects,
  createRuleSpellcastingAdvancementEffects,
  createRuleSpellcastingAdvancementState,
  createRuleSubclassAdvancementEffects,
  createRuleSubclassAdvancementState,
  createRuleWeaponMasteryAdvancementEffects,
  createRuleWeaponMasteryAdvancementState,
  createRuleOriginResourceEffects,
  createRuleOriginSpellEffects,
  createRuleOriginSpellLevelUpChoiceState,
  createRuleOriginSpellLevelUpEffects,
  findRuleClassOption,
  findRuleOriginOption,
  getRuleBackgroundOptions,
  getRuleClassOptions,
  getRuleFeatOptions,
  getRuleRaceOptions,
  getRuleClassSpellOptions,
  getRuleClassSpellSlots,
  getRuleMagicalSecretSpellOptions,
  getRuleMaxSpellLevel,
  getRuleMulticlassSpellSlots,
  getRuleSubclassOptions,
  getRuleSubclassFeatureRef,
  getRuleSubraceOptions,
  inferRuleOriginSpellLevelUpBlock,
  getEligibleAbilityScoreImprovementFeats,
  parseRuleEntitySourceId,
  parseRuleAbilityChoiceGroups,
  parseRuleClassSkillChoiceGroups,
  parseRuleCatalog,
  parseRuleExpertiseChoiceGroups,
  parseRuleLanguageChoiceGroups,
  parseRuleSavingThrowChoiceGroups,
  parseRuleSkillChoiceGroups,
  parseRuleTextChoiceGroups,
  parseRuleToolChoiceGroups,
  parseRuleWeaponChoiceGroups,
  type RuleArmor,
  type RuleCatalog,
  type RuleClass,
  type RuleClassProficiencyEntry,
  type RuleChoiceGroup,
  type RuleCharacterSnapshot,
  type RuleFeatCatalogEntry,
  type RuleFeatChoiceGroups,
  type RuleFightingStyle,
  type RuleOptionalFeature,
  type RuleOrigin,
  type RuleOriginChoiceGroups,
  type RuleOriginFeatChoiceState,
  type RuleProficiencyRecord,
  type RuleResult,
  type RuleEffect,
  type RuleSpell,
  type RuleStringChoiceGroup,
  type RuleSubclass,
  type RuleSubclassAdvancementState,
  type RuleWeapon,
  type RuleWeaponMastery,
} from '../packages/rules-core/src/index';

type AutoBuilderClass = RuleClass;
type AutoBuilderSpell = RuleSpell;

export type AutoBuilderFixedSpellChoiceGroup = {
  classLevel: number;
  spellLevel: number;
  count: number;
  selected: number;
  options: AutoBuilderSpell[];
};

export type AutoBuilderFeatSpellChoiceGroup = {
  id: string;
  label: string;
  count: number;
  options: AutoBuilderSpell[];
};

export type AutoBuilderFeatSpellBlockChoice = {
  id: string;
  label: string;
  ability?: AbilityName;
  abilityOptions: AbilityName[];
  fixedSpells: AutoBuilderSpell[];
  choices: AutoBuilderFeatSpellChoiceGroup[];
};

export type AutoBuilderSubclass = RuleSubclass;
export type AutoBuilderWeapon = RuleWeapon;
export type AutoBuilderArmor = RuleArmor;
export type AutoBuilderWeaponMastery = RuleWeaponMastery;
export type AutoBuilderInvocation = RuleOptionalFeature;
export type AutoBuilderFightingStyle = RuleFightingStyle;
export type AutoBuilderMetamagic = RuleOptionalFeature;
export type AutoBuilderManeuver = RuleOptionalFeature;
export type AutoBuilderFeat = RuleFeatCatalogEntry;
type ProficiencyRecord = RuleProficiencyRecord;
type ClassProficiencyEntry = RuleClassProficiencyEntry;
type AutoBuilderOrigin = RuleOrigin;
export type AutoBuilderContent = RuleCatalog;

export type AutoBuilderSpellChoice = {
  cantrips: string[];
  leveled: string[];
};

export type AutoBuilderInvocationChoice = {
  invocationIds: string[];
};

export type AutoBuilderToolChoiceSelection = Record<string, string[]>;
export type AutoBuilderLanguageChoiceSelection = Record<string, string[]>;
export type AutoBuilderSkillChoiceSelection = Record<string, string[]>;
export type AutoBuilderWeaponChoiceSelection = Record<string, string[]>;
export type AutoBuilderTextChoiceSelection = Record<string, string[]>;
export type AutoBuilderOriginFeatureChoiceSelection = Record<string, string>;

export type AutoBuilderAbilityChoice = {
  mode: 'plus2plus1' | 'plus1three';
  plus2?: AbilityName;
  plus1?: AbilityName;
  plus1a?: AbilityName;
  plus1b?: AbilityName;
  plus1c?: AbilityName;
};

export type AutoBuilderAbilityScoreImprovementChoice = {
  mode: 'plus2' | 'plus1plus1' | 'feat';
  plus2?: AbilityName;
  plus1a?: AbilityName;
  plus1b?: AbilityName;
  featId?: string;
  featAbility?: AbilityName;
  featSkillChoices?: AutoBuilderSkillChoiceSelection;
  featToolChoices?: AutoBuilderToolChoiceSelection;
  featWeaponChoices?: AutoBuilderWeaponChoiceSelection;
  featResistanceChoices?: AutoBuilderTextChoiceSelection;
  featExpertiseChoices?: AutoBuilderSkillChoiceSelection;
  featLanguageChoices?: AutoBuilderLanguageChoiceSelection;
  featSavingThrowChoices?: AutoBuilderSkillChoiceSelection;
  featSpellBlockId?: string;
  featSpellAbility?: AbilityName;
  featSpellChoices?: AutoBuilderSkillChoiceSelection;
  featFightingStyleFeatureId?: string;
  featInvocations?: string[];
  featManeuvers?: string[];
  featMetamagics?: string[];
};

export type AutoBuilderFeatChoice = {
  featId?: string;
  featAbility?: AbilityName;
  featSkillChoices?: AutoBuilderSkillChoiceSelection;
  featToolChoices?: AutoBuilderToolChoiceSelection;
  featWeaponChoices?: AutoBuilderWeaponChoiceSelection;
  featResistanceChoices?: AutoBuilderTextChoiceSelection;
  featExpertiseChoices?: AutoBuilderSkillChoiceSelection;
  featLanguageChoices?: AutoBuilderLanguageChoiceSelection;
  featSavingThrowChoices?: AutoBuilderSkillChoiceSelection;
  featSpellBlockId?: string;
  featSpellAbility?: AbilityName;
  featSpellChoices?: AutoBuilderSkillChoiceSelection;
  featSpellReplaceRemoveId?: string;
  featSpellReplaceAddId?: string;
  featFightingStyleFeatureId?: string;
  featInvocations?: string[];
  featManeuvers?: string[];
  featMetamagics?: string[];
};

export type AutoBuilderFeatSpellReplacementOption = {
  id: string;
  name: string;
  englishName?: string;
  source?: string;
};

export type AutoBuilderFeatSpellReplacementState = {
  profileId: string;
  label: string;
  removeOptions: AutoBuilderFeatSpellReplacementOption[];
  addOptions: AutoBuilderFeatSpellReplacementOption[];
};

export type AutoBuilderClassFeatureChoice = {
  fightingStyle?: AutoBuilderFeatChoice;
  fightingStyleFeatureId?: string;
  fightingStyleCantrips?: string[];
  metamagics?: string[];
  maneuvers?: string[];
  expertise?: AutoBuilderSkillChoiceSelection;
  weaponMasteries?: string[];
};

export type AutoBuilderExistingFeatChoiceState = {
  feat: AutoBuilderFeat;
  state: { blocks: AutoBuilderFeatSpellBlockChoice[] };
  replacement?: AutoBuilderFeatSpellReplacementState;
};

export type AutoBuilderExistingOriginSpellChoiceState = {
  id: string;
  origin: AutoBuilderOrigin;
  kind: 'race' | 'background';
  state: { blocks: AutoBuilderFeatSpellBlockChoice[] };
  profileId: string;
  defaultBlockId?: string;
};

export type AutoBuilderRaceChoice = {
  resistance?: string;
  abilities?: AbilityName[];
  skills?: string[];
  size?: string;
  featureChoices?: AutoBuilderOriginFeatureChoiceSelection;
  originSpellBlockId?: string;
  originSpellAbility?: AbilityName;
  originSpellChoices?: AutoBuilderSkillChoiceSelection;
  toolChoices?: AutoBuilderToolChoiceSelection;
  languageChoices?: AutoBuilderLanguageChoiceSelection;
  weaponChoices?: AutoBuilderWeaponChoiceSelection;
} & AutoBuilderFeatChoice;

const RULE_SOURCE: Record<RuleSystem, 'PHB' | 'XPHB'> = {
  '5e': 'PHB',
  '5r': 'XPHB',
};

const XPHB_GOLIATH_GIANT_ANCESTRY_OPTIONS = [
  {
    value: 'cloud',
    label: '云之远迹（云巨人）',
    note: '云之远迹: 以附赠动作魔法传送到 30 尺内可见的未占据空间.',
  },
  {
    value: 'fire',
    label: '火之燃烧（火巨人）',
    note: '火之燃烧: 攻击检定命中并造成伤害时, 额外造成 1d10 火焰伤害.',
  },
  {
    value: 'frost',
    label: '霜之刺骨（霜巨人）',
    note: '霜之刺骨: 攻击检定命中并造成伤害时, 额外造成 1d6 寒冷伤害, 且目标速度降低 10 尺直到你的下一回合开始.',
  },
  {
    value: 'hill',
    label: '山之翻撞（山丘巨人）',
    note: '山之翻撞: 攻击检定命中不超过大型的生物并造成伤害时, 可令其倒地.',
  },
  {
    value: 'stone',
    label: '石之坚韧（石巨人）',
    note: '石之坚韧: 受到伤害时用反应掷 1d12, 此次伤害减少骰值 + 体质调整值.',
  },
  {
    value: 'storm',
    label: '岚之暴鸣（风暴巨人）',
    note: '岚之暴鸣: 60 尺内生物对你造成伤害时, 可用反应对该生物造成 1d8 雷鸣伤害.',
  },
];

const ABILITY_MAP: Record<string, AbilityName> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

const ABILITY_OPTIONS: AbilityName[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

const SKILL_MAP: Record<string, string> = {
  acrobatics: 'Acrobatics',
  'animal handling': 'Animal Handling',
  arcana: 'Arcana',
  athletics: 'Athletics',
  deception: 'Deception',
  history: 'History',
  insight: 'Insight',
  intimidation: 'Intimidation',
  investigation: 'Investigation',
  medicine: 'Medicine',
  nature: 'Nature',
  perception: 'Perception',
  performance: 'Performance',
  persuasion: 'Persuasion',
  religion: 'Religion',
  'sleight of hand': 'Sleight of Hand',
  stealth: 'Stealth',
  survival: 'Survival',
};

const ALL_SKILLS = Object.values(SKILL_MAP);

const CHINESE_SKILL_MAP: Record<string, string> = {
  体操: 'Acrobatics',
  驯兽: 'Animal Handling',
  奥秘: 'Arcana',
  运动: 'Athletics',
  欺瞒: 'Deception',
  历史: 'History',
  洞悉: 'Insight',
  威吓: 'Intimidation',
  调查: 'Investigation',
  医疗: 'Medicine',
  自然: 'Nature',
  察觉: 'Perception',
  表演: 'Performance',
  游说: 'Persuasion',
  宗教: 'Religion',
  巧手: 'Sleight of Hand',
  隐匿: 'Stealth',
  求生: 'Survival',
};

const SIZE_LABELS: Record<string, string> = {
  S: '小型',
  M: '中型',
};

const normalizeKey = (key: string): string => key.split('|')[0].trim();
const normalizeEntityRef = (key: string): string => normalizeKey(key).split(/[;；]/)[0].trim();
const parseEntityRef = (key: string): { name: string; source?: string } => {
  const parts = key.split('|');
  return {
    name: normalizeEntityRef(parts[0]),
    source: parts[1]?.toUpperCase(),
  };
};

const getClassProficiencyValue = (entry: ClassProficiencyEntry): string | null => {
  if (typeof entry === 'string') return entry;
  return typeof entry.proficiency === 'string' ? entry.proficiency : null;
};

let autoBuilderContentPromise: Promise<AutoBuilderContent> | null = null;

export const loadAutoBuilderContent = async (): Promise<AutoBuilderContent> => {
  if (autoBuilderContentPromise) return autoBuilderContentPromise;

  autoBuilderContentPromise = (async () => {
	    const response = await fetch('./data/auto-builder-core.json');
    if (!response.ok) {
      throw new Error(`Failed to load auto-builder data: ${response.status}`);
    }
    const parsed = parseRuleCatalog(await response.json());
    if (!parsed.ok) {
      throw new Error(`Invalid auto-builder catalog: ${parsed.issues[0]?.detail?.reason ?? 'unknown'}`);
    }
    return parsed.value;
  })().catch(error => {
    autoBuilderContentPromise = null;
    throw error;
  });

  return autoBuilderContentPromise;
};

export const getAutoBuilderClass = (
  content: AutoBuilderContent,
  classKey: string,
  ruleSystem: RuleSystem,
): AutoBuilderClass | undefined => {
  return findRuleClassOption(getAutoBuilderRuleContext(content, ruleSystem), classKey);
};

export const getAutoBuilderClasses = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
): AutoBuilderClass[] => getRuleClassOptions(getAutoBuilderRuleContext(content, ruleSystem));

export const getAutoBuilderRaces = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
): AutoBuilderOrigin[] => getRuleRaceOptions(getAutoBuilderRuleContext(content, ruleSystem));

export const getAutoBuilderBackgrounds = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
): AutoBuilderOrigin[] => getRuleBackgroundOptions(getAutoBuilderRuleContext(content, ruleSystem));

export const getAutoBuilderSubraces = (
  content: AutoBuilderContent,
  race: AutoBuilderOrigin | undefined,
  ruleSystem: RuleSystem = race?.source === 'XPHB' ? '5r' : '5e',
): AutoBuilderOrigin[] => {
  return getRuleSubraceOptions(getAutoBuilderRuleContext(content, ruleSystem), race);
};

export const getAutoBuilderOrigin = (
  origins: AutoBuilderOrigin[],
  key: string,
): AutoBuilderOrigin | undefined => findRuleOriginOption(origins, key);

export const getAutoBuilderSubclasses = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass | undefined,
): AutoBuilderSubclass[] => {
  if (!cls) return [];
  const ruleSystem: RuleSystem = cls.source === 'XPHB' ? '5r' : '5e';
  return getRuleSubclassOptions(getAutoBuilderRuleContext(content, ruleSystem), cls);
};

export const getAutoBuilderSubclassAdvancementState = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  oldClassLevel: number,
  newClassLevel: number,
  existingSubclassName?: string,
): RuleSubclassAdvancementState => {
  const existingSubclassId = existingSubclassName === undefined
    ? undefined
    : getAutoBuilderSubclasses(content, cls)
        .find(({ name }) => name === existingSubclassName)?.id;
  if (existingSubclassName !== undefined && existingSubclassId === undefined) {
    throw new Error(
      `Existing subclass is not authorized for ${cls.key}: ${existingSubclassName}`,
    );
  }
  const result = createRuleSubclassAdvancementState(
    getAutoBuilderRuleContext(
      content,
      cls.source === 'XPHB' ? '5r' : '5e',
    ),
    cls,
    oldClassLevel,
    newClassLevel,
    existingSubclassId,
  );
  if (result.ok) return result.value;
  const first = result.issues[0];
  throw new Error(
    `Invalid subclass advancement at ${first?.path.join('.') || cls.key}: `
    + `${first?.detail?.reason || first?.code || 'unknown'}`,
  );
};

const getAutoBuilderRuleContext = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
) => ({
  ruleSystem,
  catalog: content,
  authorization: createDefaultRuleAuthorizationPolicy(content, ruleSystem),
});

export const isCharacterClassForDefinition = (item: CharacterData['classes'][number], cls: AutoBuilderClass): boolean => {
  const sameName = item.name === cls.key || item.name === cls.name;
  if (!sameName) return false;
  return !item.source || item.source === cls.source;
};

export const getBackgroundAbilityOptions = (background: AutoBuilderOrigin | undefined): AbilityName[] => {
  if (!background?.ability?.length) return [];
  const weighted = background.ability
    .map(entry => ('choose' in entry ? entry.choose : undefined))
    .map(choose => (choose as { weighted?: { from?: string[] } } | undefined)?.weighted?.from)
    .find(from => Array.isArray(from) && from.length > 0);
  return (weighted || [])
    .map(ability => ABILITY_MAP[ability])
    .filter((ability): ability is AbilityName => Boolean(ability));
};

export const getBackgroundFeats = (
  content: AutoBuilderContent,
  background: AutoBuilderOrigin | undefined,
): AutoBuilderFeat[] => {
  const result = createRuleOriginFeatChoiceState(background, content.feats);
  if (!result.ok) {
    const first = result.issues[0];
    throw new Error(
      `Unsupported background feat rule at ${first?.path.join('.') || background?.key || 'unknown'}: `
      + `${first?.detail?.reason || first?.code || 'unknown'}`,
    );
  }
  if (result.value?.mode !== 'fixed') return [];
  const effects = createRuleOriginFeatEffects(result.value);
  if (!effects.ok) throw new Error(`Invalid fixed background feat rule: ${background?.key || 'unknown'}`);
  const ids = new Set(effects.value.flatMap(effect => (
    effect.type === 'feat.add' ? [effect.feat.id] : []
  )));
  return content.feats.filter(feat => ids.has(`${feat.key}|${feat.source}`));
};

const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values));

function requireRuleChoiceGroups(
  result: RuleResult<RuleStringChoiceGroup[]>,
): RuleStringChoiceGroup[] {
  if (result.ok) return result.value;
  const first = result.issues[0];
  throw new Error(
    `Unsupported rule choice shape at ${first?.path.join('.') || 'unknown'}: `
    + `${first?.detail?.reason || first?.code || 'unknown'}`,
  );
}

export const areAutoBuilderChoiceGroupsComplete = (
  choices: readonly (
    RuleChoiceGroup
    | { id: string; count: number; from?: readonly string[]; options?: readonly { id: string }[] }
  )[],
  values: Readonly<Record<string, readonly string[]>> | undefined,
): boolean => {
  const groups: RuleChoiceGroup[] = choices.map((choice) => {
    if ('min' in choice && 'max' in choice && 'kind' in choice) return choice;
    const optionIds = choice.from ?? choice.options?.map(({ id }) => id) ?? [];
    return {
      id: choice.id,
      kind: 'proficiency',
      required: true,
      min: choice.count,
      max: choice.count,
      options: optionIds.map((id) => ({ id, name: id })),
    };
  });
  return areRuleChoiceSelectionsComplete(groups, values);
};

export const getAutoBuilderOriginChoiceGroups = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  origin: AutoBuilderOrigin | undefined,
  secondaryOrigin?: AutoBuilderOrigin,
): RuleOriginChoiceGroups => {
  const result = createRuleOriginChoiceGroups(
    content,
    ruleSystem,
    [origin, secondaryOrigin],
  );
  if (result.ok) return result.value;
  const first = 'issues' in result ? result.issues[0] : undefined;
  throw new Error(
    `Unsupported origin choice shape at ${first?.path.join('.') || 'unknown'}: `
    + `${first?.detail?.reason || first?.code || 'unknown'}`,
  );
};

export const areAutoBuilderOriginChoicesComplete = (
  state: RuleOriginChoiceGroups,
  choices: AutoBuilderRaceChoice,
): boolean => {
  const selections: Record<string, string[]> = {};
  const assignFirst = (
    groups: readonly RuleStringChoiceGroup[],
    values: readonly string[] | undefined,
  ) => {
    const group = groups[0];
    if (group && values !== undefined) selections[group.id] = [...values];
  };
  assignFirst(state.ability, choices.abilities);
  assignFirst(state.skill, choices.skills);
  assignFirst(
    state.resistance,
    choices.resistance ? [choices.resistance] : [state.resistance[0]?.from[0]].filter(Boolean) as string[],
  );
  assignFirst(
    state.size,
    choices.size ? [choices.size] : [state.size[0]?.from[0]].filter(Boolean) as string[],
  );
  for (const group of state.feature) {
    const value = choices.featureChoices?.[group.id];
    selections[group.id] = value ? [value] : [];
  }
  for (const [groupId, values] of Object.entries(choices.toolChoices || {})) {
    selections[groupId] = values;
  }
  for (const [groupId, values] of Object.entries(choices.languageChoices || {})) {
    selections[groupId] = values;
  }
  for (const [groupId, values] of Object.entries(choices.weaponChoices || {})) {
    selections[groupId] = values;
  }
  return areRuleChoiceSelectionsComplete(state.all, selections);
};

const normalizeSkillName = (skill: string): string => {
  const normalized = normalizeKey(skill);
  return SKILL_MAP[normalized.toLowerCase()] || CHINESE_SKILL_MAP[normalized] || normalized;
};

const getSkillChoiceGroupsFromProficiencies = (
  proficiencies: ProficiencyRecord[] | undefined,
  sourceId: string,
): RuleStringChoiceGroup[] => requireRuleChoiceGroups(
  parseRuleSkillChoiceGroups(proficiencies, sourceId),
);

const getToolChoiceOptionsFromProficiencies = (
  proficiencies: ProficiencyRecord[] | undefined,
  sourceId: string,
): RuleStringChoiceGroup[] => requireRuleChoiceGroups(
  parseRuleToolChoiceGroups(proficiencies, sourceId),
);

export const getOriginToolChoiceOptions = (
  origin: AutoBuilderOrigin | undefined,
  secondaryOrigin?: AutoBuilderOrigin,
): Array<{ id: string; label: string; from: string[]; count: number }> => (
  [origin, secondaryOrigin].flatMap(entity => (
    entity ? getToolChoiceOptionsFromProficiencies(entity.toolProficiencies, `origin-${entity.key}-${entity.source}`) : []
  ))
);

export const getClassToolChoiceOptions = (
  cls: AutoBuilderClass,
): Array<{ id: string; label: string; from: string[]; count: number }> => (
  getToolChoiceOptionsFromProficiencies(cls.startingProficiencies?.toolProficiencies, `class-${cls.key}-${cls.source}`)
);

export const getMulticlassToolChoiceOptions = (
  cls: AutoBuilderClass,
): Array<{ id: string; label: string; from: string[]; count: number }> => (
  getToolChoiceOptionsFromProficiencies(cls.multiclassProficiencies?.toolProficiencies, `multiclass-${cls.key}-${cls.source}`)
);

export const getFeatSkillChoiceOptions = (
  feat: AutoBuilderFeat | undefined,
): Array<{ id: string; label: string; from: string[]; count: number }> => (
  feat ? getSkillChoiceGroupsFromProficiencies(feat.skillProficiencies, `feat-${feat.key}-${feat.source}`) : []
);

export const getFeatToolChoiceOptions = (
  feat: AutoBuilderFeat | undefined,
): Array<{ id: string; label: string; from: string[]; count: number }> => (
  feat ? getToolChoiceOptionsFromProficiencies(feat.toolProficiencies, `feat-${feat.key}-${feat.source}`) : []
);

const getWeaponChoiceOptionsFromProficiencies = (
  content: AutoBuilderContent,
  proficiencies: ProficiencyRecord[] | undefined,
  sourceId: string,
  ruleSystem: RuleSystem,
): RuleStringChoiceGroup[] => requireRuleChoiceGroups(
  parseRuleWeaponChoiceGroups(content, proficiencies, sourceId, ruleSystem),
);

export const getOriginWeaponChoiceOptions = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  origin: AutoBuilderOrigin | undefined,
  secondaryOrigin?: AutoBuilderOrigin,
): Array<{ id: string; label: string; from: string[]; count: number }> => (
  [origin, secondaryOrigin].flatMap(entity => (
    entity ? getWeaponChoiceOptionsFromProficiencies(content, entity.weaponProficiencies, `origin-${entity.key}-${entity.source}`, ruleSystem) : []
  ))
);

export const getFeatWeaponChoiceOptions = (
  content: AutoBuilderContent,
  feat: AutoBuilderFeat | undefined,
  ruleSystem: RuleSystem,
): Array<{ id: string; label: string; from: string[]; count: number }> => (
  feat ? getWeaponChoiceOptionsFromProficiencies(content, feat.weaponProficiencies, `feat-${feat.key}-${feat.source}`, ruleSystem) : []
);

export const getFeatLanguageChoiceOptions = (
  feat: AutoBuilderFeat | undefined,
): Array<{ id: string; label: string; from: string[]; count: number }> => (
  feat ? getLanguageChoiceOptionsFromProficiencies(feat.languageProficiencies, `feat-${feat.key}-${feat.source}`) : []
);

const normalizeAbilityName = (ability: string): AbilityName | null => (
  ABILITY_MAP[ability] || (ABILITY_OPTIONS.includes(ability as AbilityName) ? ability as AbilityName : null)
);

export const getFeatSavingThrowChoiceOptions = (
  feat: AutoBuilderFeat | undefined,
): RuleStringChoiceGroup[] => feat
  ? requireRuleChoiceGroups(parseRuleSavingThrowChoiceGroups(
      feat.savingThrowProficiencies,
      `feat-${feat.key}-${feat.source}-save`,
    ))
  : [];

const getSelectedSkillChoices = (choices?: AutoBuilderSkillChoiceSelection): string[] => (
  Object.values(choices || {}).flatMap(skills => skills.map(normalizeSkillName))
);

const getFixedFeatSkillProficiencies = (feat: AutoBuilderFeat | undefined): string[] => {
  const skills: string[] = [];
  for (const entry of feat?.skillProficiencies || []) {
    for (const [key, value] of Object.entries(entry)) {
      if (value === true) skills.push(normalizeSkillName(key));
    }
  }
  return uniqueStrings(skills).filter(skill => ALL_SKILLS.includes(skill));
};

export const getFeatExpertiseChoiceOptions = (
  feat: AutoBuilderFeat | undefined,
  character: CharacterData,
  selectedSkillChoices?: AutoBuilderSkillChoiceSelection,
): RuleStringChoiceGroup[] => {
  if (!feat?.expertise?.length) return [];
  const proficientSkills = uniqueStrings([
    ...Array.from(character.proficiencies).filter(skill => ALL_SKILLS.includes(skill)),
    ...getFixedFeatSkillProficiencies(feat),
    ...getSelectedSkillChoices(selectedSkillChoices),
  ]).sort((a, b) => a.localeCompare(b));

  return requireRuleChoiceGroups(parseRuleExpertiseChoiceGroups(
    feat.expertise,
    `feat-${feat.key}-${feat.source}`,
    proficientSkills,
  ));
};

const getLanguageChoiceOptionsFromProficiencies = (
  proficiencies: ProficiencyRecord[] | undefined,
  sourceId: string,
): RuleStringChoiceGroup[] => requireRuleChoiceGroups(
  parseRuleLanguageChoiceGroups(proficiencies, sourceId),
);

export const getOriginLanguageChoiceOptions = (
  origin: AutoBuilderOrigin | undefined,
  secondaryOrigin?: AutoBuilderOrigin,
): Array<{ id: string; label: string; from: string[]; count: number }> => (
  [origin, secondaryOrigin].flatMap(entity => (
    entity ? getLanguageChoiceOptionsFromProficiencies(entity.languageProficiencies, `origin-${entity.key}-${entity.source}`) : []
  ))
);

export const getRaceResistanceOptions = (
  race: AutoBuilderOrigin | undefined,
  subrace?: AutoBuilderOrigin,
): string[] => {
  const options = [race, subrace].flatMap(origin => (
    origin
      ? requireRuleChoiceGroups(parseRuleTextChoiceGroups(
          origin.resist,
          `origin-${origin.key}-${origin.source}-resistance`,
          'resistance',
          '伤害抗性',
        )).flatMap(({ from }) => from)
      : []
  ));
  return Array.from(new Set(options));
};

const getTextChoiceOptionsFromEntries = (
  entries: unknown[] | undefined,
  sourceId: string,
  label: string,
): RuleStringChoiceGroup[] => requireRuleChoiceGroups(
  parseRuleTextChoiceGroups(entries, sourceId, 'resistance', label),
);

export const getFeatResistanceChoiceOptions = (
  feat: AutoBuilderFeat | undefined,
): Array<{ id: string; label: string; from: string[]; count: number }> => (
  feat ? getTextChoiceOptionsFromEntries(feat.resist, `feat-${feat.key}-${feat.source}-resistance`, '伤害抗性') : []
);

export const getRaceSizeChoiceOptions = (
  race: AutoBuilderOrigin | undefined,
  subrace?: AutoBuilderOrigin,
): Array<{ value: string; label: string }> => {
  const entity = [subrace, race].find(origin => origin?.size && origin.size.length > 1);
  return entity?.size?.map(size => ({
    value: size,
    label: SIZE_LABELS[size] || size,
  })) || [];
};

export const getRaceAbilityChoiceOptions = (
  race: AutoBuilderOrigin | undefined,
  subrace?: AutoBuilderOrigin,
): { from: AbilityName[]; count: number } | null => {
  for (const origin of [race, subrace]) {
    for (const entry of origin?.ability || []) {
      const groups = requireRuleChoiceGroups(parseRuleAbilityChoiceGroups(
        [entry],
        `origin-${origin?.key || 'unknown'}-${origin?.source || 'unknown'}`,
      ));
      const group = groups[0];
      if (!group) continue;
      return {
        from: group.from as AbilityName[],
        count: group.count,
      };
    }
  }
  return null;
};

export const getRaceSkillChoiceOptions = (
  race: AutoBuilderOrigin | undefined,
  subrace?: AutoBuilderOrigin,
): { from: string[]; count: number } | null => {
  for (const origin of [race, subrace]) {
    for (const entry of origin?.skillProficiencies || []) {
      const group = requireRuleChoiceGroups(parseRuleSkillChoiceGroups(
        [entry],
        `origin-${origin?.key || 'unknown'}-${origin?.source || 'unknown'}`,
      ))[0];
      if (group) return { from: group.from, count: group.count };
    }
  }
  return null;
};

export const getRaceFeatureChoiceOptions = (
  race: AutoBuilderOrigin | undefined,
  subrace?: AutoBuilderOrigin,
): Array<{ id: string; label: string; options: Array<{ value: string; label: string }> }> => {
  const entities = [race, subrace].filter((origin): origin is AutoBuilderOrigin => Boolean(origin));
  return entities.flatMap(origin => {
    if (
      origin.key === 'Goliath'
      && origin.source === 'XPHB'
      && (origin.features || []).some(feature => feature.englishName === 'Giant Ancestry' || feature.name === '巨人先祖')
    ) {
      return [{
        id: 'giant-ancestry',
        label: '巨人先祖',
        options: XPHB_GOLIATH_GIANT_ANCESTRY_OPTIONS.map(option => ({
          value: option.value,
          label: option.label,
        })),
      }];
    }
    return [];
  });
};

const getOfficialFeatOptions = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  character: CharacterData,
  level: number,
  predicate: (feat: AutoBuilderFeat) => boolean,
): AutoBuilderFeat[] => {
  return getRuleFeatOptions(
    getAutoBuilderRuleContext(content, ruleSystem),
    toRuleCharacterSnapshot(content, character),
    level,
  ).filter(predicate);
};

const toRuleCharacterSnapshot = (
  content: AutoBuilderContent,
  character: CharacterData,
): RuleCharacterSnapshot => ({
  abilities: character.abilities,
  race: character.race,
  subrace: character.subrace,
  size: character.bodyType,
  background: character.background,
  campaigns: [],
  proficiencies: [...character.proficiencies],
  features: character.featureEntries.flatMap(feature => [
    feature.name,
    feature.sourceName,
  ]),
  knownFeats: [...new Map(character.featureEntries
    .filter(feature => feature.sourceId.startsWith('auto-feat-'))
    .map(feature => {
      const identity = parseRuleEntitySourceId('feat', feature.sourceId);
      if (!identity) {
        return [feature.sourceId, { name: feature.name, source: feature.sourceName }] as const;
      }
      const catalogFeat = content.feats.find(feat => (
        feat.key === identity.key && feat.source === identity.source
      ));
      return [feature.sourceId, {
        ...identity,
        name: catalogFeat?.name ?? identity.key,
        englishName: catalogFeat?.englishName,
        category: catalogFeat?.category,
      }] as const;
    })).values()],
  hasSpellcasting: character.spellcastingProfiles.length > 0,
  hasSpellcastingFeature: character.featureEntries.some(feature => (
    ['施法', 'Spellcasting', '契约魔法', 'Pact Magic'].includes(feature.name)
  )),
});

export const getRaceFeatChoiceOptions = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  character: CharacterData,
  race: AutoBuilderOrigin | undefined,
  subrace?: AutoBuilderOrigin,
): { from: AutoBuilderFeat[]; count: number; ruleState: RuleOriginFeatChoiceState } | null => {
  for (const origin of [race, subrace]) {
    if (!origin?.feats?.length) continue;
    const eligible = getOfficialFeatOptions(
      content,
      ruleSystem,
      character,
      1,
      feat => !feat.prerequisite?.length,
    );
    const result = createRuleOriginFeatChoiceState(origin, eligible);
    if (!result.ok) {
      const first = result.issues[0];
      throw new Error(
        `Unsupported race feat rule at ${first?.path.join('.') || origin.key}: `
        + `${first?.detail?.reason || first?.code || 'unknown'}`,
      );
    }
    if (result.value?.mode === 'choice') {
      return {
        count: result.value.count,
        from: result.value.options,
        ruleState: result.value,
      };
    }
  }
  return null;
};

export const getOriginFeatChoiceOptions = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  character: CharacterData,
): { from: AutoBuilderFeat[]; count: number; ruleState: RuleOriginFeatChoiceState } | null => {
  if (ruleSystem !== '5r') return null;
  const eligible = getOfficialFeatOptions(
    content,
    ruleSystem,
    character,
    1,
    feat => !feat.prerequisite?.length,
  );
  const result = createRuleOriginFeatChoiceState(undefined, eligible, true);
  if (!result.ok) throw new Error('Unsupported decoupled origin feat rule');
  return result.value ? {
    count: result.value.count,
    from: result.value.options,
    ruleState: result.value,
  } : null;
};

export const isAbilityScoreImprovementLevel = (
  cls: AutoBuilderClass | undefined,
  level: number,
): boolean => Boolean(cls?.levelFeatures.some(feature => (
  feature.level === level
  && (feature.name === '属性值提升' || feature.englishName === 'Ability Score Improvement')
)));

const getExistingWeaponMasteryIds = (character: CharacterData): Set<string> => (
  new Set(character.featureEntries
    .filter(feature => feature.sourceId.startsWith('auto-weapon-mastery-'))
    .map(feature => feature.sourceId.replace(/^auto-weapon-mastery-/, '')))
);

export const getWeaponMasteryChoiceState = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass | undefined,
  character: CharacterData,
  level: number,
): { needed: number; options: AutoBuilderWeapon[] } | null => {
  if (!cls) return null;
  const result = createRuleWeaponMasteryAdvancementState(
    getAutoBuilderRuleContext(content, cls.source === 'XPHB' ? '5r' : '5e'),
    cls,
    Math.max(0, level - 1),
    level,
    [...getExistingWeaponMasteryIds(character)],
  );
  if (!result.ok) throwRuleResultError(result, cls.key);
  return result.value.group
    ? { needed: result.value.group.min, options: result.value.group.options }
    : null;
};

export const getFightingStyleFeatChoiceOptions = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  character: CharacterData,
  cls: AutoBuilderClass | undefined,
  level: number,
): { from: AutoBuilderFeat[]; count: number } | null => {
  if (!cls || ruleSystem !== '5r') return null;
  const knownStyleIds = character.featureEntries
    .filter(feature => feature.sourceId.startsWith('auto-feat-'))
    .flatMap(feature => {
      const parsed = parseRuleEntitySourceId('feat', feature.sourceId);
      return parsed ? [parsed.id] : [];
    });
  const result = createRuleFightingStyleAdvancementState(
    getAutoBuilderRuleContext(content, ruleSystem),
    cls,
    Math.max(0, level - 1),
    level,
    knownStyleIds,
  );
  if (!result.ok) throwRuleResultError(result, cls.key);
  if (result.value.mode !== 'feat' || !result.value.group) return null;
  return {
    from: result.value.group.options as AutoBuilderFeat[],
    count: result.value.group.min,
  };
};

export const getFightingStyleFeatureChoiceOptions = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  character: CharacterData,
  cls: AutoBuilderClass | undefined,
  level: number,
  subclass?: AutoBuilderSubclass,
): { from: AutoBuilderFightingStyle[]; count: number } | null => {
  if (!cls || ruleSystem !== '5e') return null;
  const knownIds = content.fightingStyles
    .filter(style => character.featureEntries.some(feature => (
      feature.sourceId === `auto-fighting-style-${style.id}`
      || feature.name === style.name
    )))
    .map(({ id }) => id);
  const result = createRuleFightingStyleAdvancementState(
    getAutoBuilderRuleContext(content, ruleSystem),
    cls,
    Math.max(0, level - 1),
    level,
    knownIds,
    subclass,
  );
  if (!result.ok) throwRuleResultError(result, cls.key);
  if (result.value.mode !== 'feature' || !result.value.group) return null;
  return {
    from: result.value.group.options as AutoBuilderFightingStyle[],
    count: result.value.group.min,
  };
};

export const getFightingStyleCantripChoiceState = (
  content: AutoBuilderContent,
  feat: Pick<AutoBuilderFeat, 'key' | 'name' | 'englishName'> | Pick<AutoBuilderFightingStyle, 'key' | 'name' | 'englishName'> | undefined,
  ruleSystem: RuleSystem,
): { from: AutoBuilderSpell[]; count: number } | null => {
  if (!feat) return null;
  const result = createRuleFightingStyleCantripChoiceState(
    getAutoBuilderRuleContext(content, ruleSystem),
    feat as AutoBuilderFeat | AutoBuilderFightingStyle,
  );
  if (!result.ok) throwRuleResultError(result, feat.key);
  return result.value.group ? {
    from: result.value.group.options,
    count: result.value.group.min,
  } : null;
};

const getFixedSkillProficiencies = (proficiencies: ProficiencyRecord[] | undefined): string[] => {
  const skills: string[] = [];
  for (const entry of proficiencies || []) {
    for (const [key, value] of Object.entries(entry)) {
      if (key === 'choose' || value !== true) continue;
      const normalized = normalizeSkillName(normalizeKey(key));
      if (ALL_SKILLS.includes(normalized)) skills.push(normalized);
    }
  }
  return uniqueStrings(skills);
};

export const getOriginFixedSkillProficiencies = (...origins: Array<AutoBuilderOrigin | undefined>): string[] => (
  uniqueStrings(origins.flatMap(origin => getFixedSkillProficiencies(origin?.skillProficiencies)))
);

const getFixedToolProficiencies = (proficiencies: ProficiencyRecord[] | undefined): string[] => {
  const tools: string[] = [];
  for (const entry of proficiencies || []) {
    for (const [key, value] of Object.entries(entry)) {
      if (key === 'choose' || value !== true) continue;
      tools.push(`tool:${normalizeKey(key)}`);
    }
  }
  return uniqueStrings(tools);
};

export const getClassFixedToolProficiencies = (cls: AutoBuilderClass | undefined, multiclass = false): string[] => (
  cls
    ? getFixedToolProficiencies(
        multiclass
          ? cls.multiclassProficiencies?.toolProficiencies
          : cls.startingProficiencies?.toolProficiencies,
      )
    : []
);

export const getClassExpertiseChoiceOptions = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass | undefined,
  character: CharacterData,
  level: number,
  additionalProficiencies: string[] = [],
): Array<{ id: string; label: string; from: string[]; count: number }> => {
  if (!cls) return [];
  const existingExpertises = new Set(Array.from(character.expertises));
  const proficientTools = uniqueStrings([
    ...Array.from(character.proficiencies).filter(proficiency => proficiency.startsWith('tool:')),
    ...additionalProficiencies.filter(proficiency => proficiency.startsWith('tool:')),
  ]);
  const allowThievesTools = cls?.source === 'PHB'
    && (cls.key === 'Rogue' || cls.name === '游荡者')
    && proficientTools.includes("tool:thieves' tools");
  const from = uniqueStrings([
    ...Array.from(character.proficiencies).filter(skill => ALL_SKILLS.includes(skill)),
    ...additionalProficiencies.map(normalizeSkillName).filter(skill => ALL_SKILLS.includes(skill)),
    ...(allowThievesTools ? ["tool:thieves' tools"] : []),
  ])
    .filter(skill => !existingExpertises.has(skill))
    .sort((a, b) => a.localeCompare(b));
  const result = createRuleExpertiseAdvancementState(
    getAutoBuilderRuleContext(content, cls.source === 'XPHB' ? '5r' : '5e'),
    cls,
    Math.max(0, level - 1),
    level,
    from,
    [...existingExpertises],
  );
  if (!result.ok) throwRuleResultError(result, cls.key);
  return result.value.group ? [{
    id: result.value.group.id,
    label: '专精',
    from: result.value.group.options.map(({ id }) => id),
    count: result.value.group.min,
  }] : [];
};

function throwRuleResultError(
  result: Extract<RuleResult<unknown>, { ok: false }>,
  fallback: string,
): never {
  const first = result.issues[0];
  throw new Error(
    `Invalid class choice at ${first?.path.join('.') || fallback}: `
    + `${first?.detail?.reason || first?.code || 'unknown'}`,
  );
}

const getPrerequisiteLevel = (value: unknown): number | null => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && typeof (value as { level?: unknown }).level === 'number') {
    return (value as { level: number }).level;
  }
  return null;
};

export const getInvocationPrerequisiteSummary = (invocation: AutoBuilderInvocation): string => {
  if (!invocation.prerequisite?.length) return '';
  const parts = new Set<string>();
  for (const prerequisite of invocation.prerequisite) {
    if (!prerequisite || typeof prerequisite !== 'object') continue;
    for (const [key, value] of Object.entries(prerequisite as Record<string, unknown>)) {
      if (key === 'level') {
        const required = getPrerequisiteLevel(value);
        if (required !== null) parts.add(`${required}级`);
      } else if (key === 'optionalfeature' && Array.isArray(value)) {
        value.forEach(ref => {
          if (typeof ref === 'string') parts.add(normalizeEntityRef(ref));
        });
      } else if (key === 'spell' && Array.isArray(value)) {
        value.forEach(entry => {
          if (entry && typeof entry === 'object') {
            const summary = (entry as { entrySummary?: string; entry?: string }).entrySummary
              || (entry as { entry?: string }).entry;
            if (summary) parts.add(summary);
          }
        });
      } else if (key === 'pact') {
        parts.add(String(value));
      }
    }
  }
  return Array.from(parts).join(', ');
};

export const getAbilityScoreImprovementFeatOptions = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  character: CharacterData,
  level: number,
): AutoBuilderFeat[] => {
  return getOfficialFeatOptions(
    content,
    ruleSystem,
    character,
    level,
    feat => feat.key !== 'Ability Score Improvement',
  );
};

export const getFeatAbilityChoiceOptions = (feat: AutoBuilderFeat | undefined): AbilityName[] => {
  if (!feat) return [];
  return uniqueStrings(requireRuleChoiceGroups(parseRuleAbilityChoiceGroups(
    feat.ability,
    `feat-${feat.key}-${feat.source}`,
  )).flatMap(({ from }) => from)) as AbilityName[];
};

export const getFeatSpellChoiceState = (
  content: AutoBuilderContent,
  feat: AutoBuilderFeat | undefined,
  ruleSystem: RuleSystem,
  characterLevel = Number.POSITIVE_INFINITY,
): { blocks: AutoBuilderFeatSpellBlockChoice[] } | null => {
  if (!feat) return null;
  const result = createRuleFeatSpellChoiceState(
    content,
    ruleSystem,
    feat,
    characterLevel,
  );
  if (result.ok) return result.value;
  const first = result.issues[0];
  throw new Error(
    `Unsupported feat spell shape at ${first?.path.join('.') || feat.key}: `
    + `${first?.detail?.reason || first?.code || 'unknown'}`,
  );
};

export const getOriginSpellChoiceState = (
  content: AutoBuilderContent,
  origin: AutoBuilderOrigin | undefined,
  ruleSystem: RuleSystem,
  characterLevel = Number.POSITIVE_INFINITY,
): { blocks: AutoBuilderFeatSpellBlockChoice[] } | null => {
  if (!origin) return null;
  const result = createRuleAdditionalSpellChoiceState(
    content,
    ruleSystem,
    {
      kind: 'origin',
      key: origin.key,
      source: origin.source,
      name: origin.name,
      ...(origin.additionalSpells === undefined
        ? {}
        : { additionalSpells: origin.additionalSpells }),
    },
    characterLevel,
  );
  if (result.ok) return result.value;
  const first = 'issues' in result ? result.issues[0] : undefined;
  throw new Error(
    `Unsupported origin spell shape at ${first?.path.join('.') || origin.key}: `
    + `${first?.detail?.reason || first?.code || 'unknown'}`,
  );
};

export const getExistingOriginSpellLevelUpChoiceStates = (
  content: AutoBuilderContent,
  character: CharacterData,
  ruleSystem: RuleSystem,
  oldCharacterLevel: number,
  newCharacterLevel: number,
): AutoBuilderExistingOriginSpellChoiceState[] => {
  if (newCharacterLevel <= oldCharacterLevel) return [];
  const candidates: Array<{ origin: AutoBuilderOrigin; kind: 'race' | 'background' }> = [
    ...content.races.map(origin => ({ origin, kind: 'race' as const })),
    ...content.subraces.map(origin => ({ origin, kind: 'race' as const })),
    ...content.backgrounds.map(origin => ({ origin, kind: 'background' as const })),
  ];
  return candidates.flatMap(({ origin, kind }) => {
    if (!origin.additionalSpells?.length) return [];
    const sourceId = `auto-${kind}-${origin.key}-${origin.source}`;
    const applied = character.appliedAdjustments.some(adjustment => adjustment.sourceId === sourceId)
      || character.featureEntries.some(feature => feature.sourceId === sourceId);
    if (!applied) return [];
    const result = createRuleOriginSpellLevelUpChoiceState(
      content,
      ruleSystem,
      origin,
      oldCharacterLevel,
      newCharacterLevel,
    );
    if (!result.ok) {
      const first = result.issues[0];
      throw new Error(
        `Unsupported origin spell level-up at ${first?.path.join('.') || origin.key}: `
        + `${first?.detail?.reason || first?.code || 'unknown'}`,
      );
    }
    if (!result.value) return [];
    const profileId = getOriginSpellProfileId(origin, kind);
    const existingProfile = character.spellcastingProfiles.find(profile => profile.id === profileId);
    const inferred = existingProfile
      ? inferRuleOriginSpellLevelUpBlock(
          result.value,
          existingProfile.spells.map(({ id }) => id),
        )
      : result.value.blocks.length === 1
        ? result.value.blocks[0]
        : undefined;
    return [{
      id: `${kind}:${origin.key}|${origin.source}`,
      origin,
      kind,
      state: {
        blocks: result.value.blocks.map(block => existingProfile
          ? {
              ...block,
              ability: existingProfile.ability,
              abilityOptions: [],
            }
          : block),
      },
      profileId,
      ...(inferred === undefined ? {} : { defaultBlockId: inferred.id }),
    }];
  });
};

const getFeatSpellProfileId = (feat: AutoBuilderFeat): string => (
  `auto-feat-${normalizeKey(feat.key)}-${feat.source}-spells`
);

export const getExistingFeatSpellLevelUpChoiceStates = (
  content: AutoBuilderContent,
  character: CharacterData,
  ruleSystem: RuleSystem,
  oldCharacterLevel: number,
  newCharacterLevel: number,
): AutoBuilderExistingFeatChoiceState[] => {
  if (newCharacterLevel <= oldCharacterLevel) return [];
  return content.feats
    .filter(({ additionalSpells }) => additionalSpells?.length)
    .filter(feat => hasAppliedFeat(character, feat.key, feat.source))
    .flatMap((feat): AutoBuilderExistingFeatChoiceState[] => {
    const profileId = getFeatSpellProfileId(feat);
    const existingProfile = character.spellcastingProfiles.find(profile => (
      profile.id === profileId
    ));
    const result = createRuleFeatSpellLevelUpChoiceState(
      content,
      ruleSystem,
      feat,
      oldCharacterLevel,
      newCharacterLevel,
      existingProfile
        ? {
            id: existingProfile.id,
            ability: existingProfile.ability,
            preparationMode: existingProfile.preparationMode,
            spells: existingProfile.spells.map(spell => ({
              id: spell.id,
              key: spell.englishName || spell.name,
              source: spell.source,
            })),
            slots: {},
          }
        : undefined,
    );
    if (!result.ok) {
      const first = result.issues[0];
      throw new Error(
        `Unsupported feat spell level-up at ${first?.path.join('.') || feat.key}: `
        + `${first?.detail?.reason || first?.code || 'unknown'}`,
      );
    }
    if (result.value) {
      return [{
        feat,
        state: { blocks: result.value.blocks },
        replacement: result.value.replacement,
      }];
    }
    return [];
  });
};

export const getExistingFeatSpellLevelUpChoiceState = (
  content: AutoBuilderContent,
  character: CharacterData,
  ruleSystem: RuleSystem,
  oldCharacterLevel: number,
  newCharacterLevel: number,
): AutoBuilderExistingFeatChoiceState | null => (
  getExistingFeatSpellLevelUpChoiceStates(
    content,
    character,
    ruleSystem,
    oldCharacterLevel,
    newCharacterLevel,
  )[0] || null
);

export const getClassSpellOptions = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  maxSpellLevel: number,
): AutoBuilderSpell[] => getRuleClassSpellOptions(
  getAutoBuilderRuleContext(content, cls.source === 'XPHB' ? '5r' : '5e'),
  cls,
  maxSpellLevel,
);

	const getSpellOptionsForClassLevel = (
	  content: AutoBuilderContent,
	  cls: AutoBuilderClass,
	  level: number,
	  subclass?: AutoBuilderSubclass,
	): AutoBuilderSpell[] => {
	  const result = createRuleSpellcastingAdvancementState(
	    getAutoBuilderRuleContext(content, cls.source === 'XPHB' ? '5r' : '5e'),
	    cls,
	    0,
	    level,
	    [],
	    subclass,
	  );
	  if (!result.ok) {
	    const first = result.issues[0];
	    throw new Error(`Invalid spellcasting advancement: ${first?.detail?.reason || first?.code || 'unknown'}`);
	  }
	  if (!result.value) return [];
	  return uniqueSpells([
	    ...result.value.cantrips,
	    ...result.value.leveled,
	  ]);
	};

/** Returns the levels at which a Bard gains Magical Secrets (2 spells each) */
export const getMagicalSecretLevels = (cls: AutoBuilderClass): number[] => {
  if (cls.englishName !== 'Bard') return [];
  if (cls.source === 'PHB') return [10, 14, 18];
  if (cls.source === 'XPHB') return [10];
  return [];
};

/** Returns spells from Bard/Cleric/Druid/Wizard lists up to the given max spell level */
export const getMagicalSecretSpellOptions = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  maxSpellLevel: number,
): AutoBuilderSpell[] => getRuleMagicalSecretSpellOptions(
  getAutoBuilderRuleContext(content, cls.source === 'XPHB' ? '5r' : '5e'),
  maxSpellLevel,
);

const isPreparedAllClass = (cls: AutoBuilderClass): boolean => (
  cls.preparedSpellsChange === 'restLong'
  && !cls.spellsKnownProgressionFixed?.length
  && !cls.spellsKnownProgressionFixedByLevel
  && !cls.spellsKnownProgression?.length
);

	/**
	 * Known casters (Bard, Sorcerer, Warlock, Ranger) know a limited set of spells
	 * and have them always prepared. In 5e data they use `spellsKnownProgression*`;
	 * in 5r they use `preparedSpellsProgression` with `preparedSpellsChange='level'`.
	 * Wizard has `spellsKnownProgressionFixed` (spellbook) but is NOT a known caster.
	 */
	const isKnownCasterClass = (cls: AutoBuilderClass): boolean => {
	  if (cls.preparedSpellsChange === 'restLong') return false;
	  return !!(
	    cls.spellsKnownProgression?.length
	    || cls.spellsKnownProgressionFixedByLevel
	    || cls.spellsKnownProgressionFixedAllowLowerLevel
	    || cls.preparedSpellsProgression?.length
	  );
	};

export const getSpellChoiceState = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  level: number,
  existingSpells: Spell[] = [],
  subclass?: AutoBuilderSubclass,
): {
  isSpellcaster: boolean;
  isPreparedAll: boolean;
  limits: { cantrips: number; leveled: number };
  needed: { cantrips: number; leveled: number };
  cantrips: AutoBuilderSpell[];
  leveled: AutoBuilderSpell[];
  fixedLeveledGroups: AutoBuilderFixedSpellChoiceGroup[];
} => {
  const result = createRuleSpellcastingAdvancementState(
    getAutoBuilderRuleContext(content, cls.source === 'XPHB' ? '5r' : '5e'),
    cls,
    Math.max(0, level - 1),
    level,
    existingSpells.map(({ id }) => id),
    subclass,
  );
  if (!result.ok) {
    const first = result.issues[0];
    throw new Error(`Invalid spellcasting advancement: ${first?.detail?.reason || first?.code || 'unknown'}`);
  }
  if (!result.value) {
    return {
      isSpellcaster: false,
      isPreparedAll: false,
      limits: { cantrips: 0, leveled: 0 },
      needed: { cantrips: 0, leveled: 0 },
      cantrips: [],
      leveled: [],
      fixedLeveledGroups: [],
    };
  }

  const state = result.value;
  const magicalSecretExpansion = (
    cls.key === 'Bard'
    && cls.source === 'XPHB'
    && level >= 10
  ) ? getMagicalSecretSpellOptions(content, cls, state.maxSpellLevel) : [];

  return {
    isSpellcaster: true,
    isPreparedAll: state.mode === 'preparedAll',
    limits: state.limits,
    needed: state.needed,
    cantrips: state.cantrips,
    leveled: uniqueSpells([...state.leveled, ...magicalSecretExpansion]),
    fixedLeveledGroups: state.fixedLeveledGroups,
  };
};

export const getLevelOneSpellChoiceState = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  subclass?: AutoBuilderSubclass,
) => getSpellChoiceState(content, cls, 1, [], subclass);

const getExistingInvocationIds = (character: CharacterData): string[] => (
  character.featureEntries
    .filter(feature => feature.sourceId.startsWith('auto-invocation-'))
    .flatMap(feature => {
      const parsed = parseRuleEntitySourceId('invocation', feature.sourceId);
      return parsed ? [parsed.id] : [];
    })
);

const getWarlockLevel = (content: AutoBuilderContent, character: CharacterData): number => {
  const warlocks = content.classes.filter(cls => cls.key === 'Warlock');
  return warlocks.reduce((level, cls) => {
    const characterClass = character.classes.find(item => isCharacterClassForDefinition(item, cls));
    return Math.max(level, characterClass?.level || 0);
  }, 0);
};

const getSpecializedFeatContext = (
  content: AutoBuilderContent,
  character: CharacterData,
  selectedFeatureIds: string[] = [],
  selectedSpellIds: string[] = [],
) => ({
  knownFeatureIds: [
    ...character.featureEntries.map(({ sourceId }) => sourceId),
  ],
  knownFeatureNames: character.featureEntries.map(({ name }) => name),
  selectedFeatureIds,
  knownSpellIds: character.spellcastingProfiles.flatMap(profile => (
    profile.spells.map(({ id }) => id)
  )),
  selectedSpellIds,
  warlockLevel: getWarlockLevel(content, character),
});

const requireSpecializedFeatChoiceState = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  feat: AutoBuilderFeat,
  character: CharacterData,
  selectedFeatureIds: string[] = [],
  selectedSpellIds: string[] = [],
) => {
  const result = createRuleSpecializedFeatChoiceState(
    content,
    ruleSystem,
    feat,
    getSpecializedFeatContext(content, character, selectedFeatureIds, selectedSpellIds),
  );
  if (result.ok) return result.value;
  const first = result.issues[0];
  throw new Error(
    `Unsupported specialized feat choice at ${first?.path.join('.') || feat.key}: `
    + `${first?.detail?.reason || first?.code || 'unknown'}`,
  );
};

const getExistingOptionalFeatureIds = (
  content: AutoBuilderContent,
  character: CharacterData,
  kind: 'maneuver' | 'metamagic',
): string[] => {
  const entries = kind === 'maneuver' ? content.maneuvers : content.metamagics;
  return uniqueStrings(character.featureEntries.flatMap(feature => {
    if (!feature.sourceId.startsWith(`auto-${kind}-`)) return [];
    const entry = entries.find(candidate => (
      feature.sourceId === `auto-${kind}-${candidate.id}`
      || feature.name === candidate.name
    ));
    return entry ? [entry.id] : [];
  }));
};

const getExistingManeuverExtraTarget = (
  content: AutoBuilderContent,
  character: CharacterData,
): number => {
  const styleCount = character.featureEntries.some(feature => (
    content.fightingStyles.some(style => (
      style.key === 'Superior Technique'
      && feature.sourceId === `auto-fighting-style-${style.id}`
    ))
  )) ? 1 : 0;
  const featCount = content.feats.reduce((count, feat) => {
    if (!feat.maneuverCount || !hasAppliedFeat(character, feat.key, feat.source)) return count;
    return count + feat.maneuverCount;
  }, 0);
  return styleCount + featCount;
};

const getExistingMetamagicExtraTarget = (
  content: AutoBuilderContent,
  character: CharacterData,
): number => content.feats.reduce((count, feat) => {
  if (!feat.metamagicCount || !hasAppliedFeat(character, feat.key, feat.source)) {
    return count;
  }
  return count + feat.metamagicCount;
}, 0);

export const getInvocationChoiceState = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass | undefined,
  character: CharacterData,
  level: number,
  selectedIds: string[] = [],
  selectedSpellIds: string[] = [],
): {
  isInvocationClass: boolean;
  needed: number;
  options: AutoBuilderInvocation[];
} => {
  if (!cls?.invocationProgression?.length) {
    return { isInvocationClass: false, needed: 0, options: [] };
  }
  const ruleSystem: RuleSystem = cls.source === 'XPHB' ? '5r' : '5e';
  const result = createRuleInvocationAdvancementState(
    getAutoBuilderRuleContext(content, ruleSystem),
    cls,
    Math.max(0, level - 1),
    level,
    getExistingInvocationIds(character),
    getSpecializedFeatContext(content, character, selectedIds, selectedSpellIds),
  );
  if (!result.ok) throwRuleResultError(result, cls.key);
  return {
    isInvocationClass: true,
    needed: result.value.group?.min ?? 0,
    options: result.value.group?.options ?? [],
  };
};

export const getMetamagicChoiceState = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass | undefined,
  character: CharacterData,
  level: number,
): {
  isMetamagicClass: boolean;
  needed: number;
  options: AutoBuilderMetamagic[];
} => {
  if (!cls?.metamagicProgression?.length) {
    return { isMetamagicClass: false, needed: 0, options: [] };
  }
  const ruleSystem: RuleSystem = cls.source === 'XPHB' ? '5r' : '5e';
  const state = createRuleMetamagicAdvancementState(
    getAutoBuilderRuleContext(content, ruleSystem),
    cls,
    Math.max(0, level - 1),
    level,
    getExistingOptionalFeatureIds(content, character, 'metamagic'),
    getExistingMetamagicExtraTarget(content, character),
  );
  if (!state.ok) throwRuleResultError(state, cls.key);
  return {
    isMetamagicClass: true,
    needed: state.value.group?.min ?? 0,
    options: state.value.group?.options ?? [],
  };
};

export const getManeuverChoiceState = (
  content: AutoBuilderContent,
  subclass: AutoBuilderSubclass | undefined,
  character: CharacterData,
  level: number,
  extraNeeded = 0,
  ruleSystemOverride?: RuleSystem,
): {
  isManeuverSubclass: boolean;
  needed: number;
  options: AutoBuilderManeuver[];
} => {
  if (!subclass?.maneuverProgression?.length && extraNeeded <= 0) {
    return { isManeuverSubclass: false, needed: 0, options: [] };
  }
  const ruleSystem: RuleSystem = ruleSystemOverride || (subclass?.classSource === 'XPHB' ? '5r' : '5e');
  const state = createRuleManeuverAdvancementState(
    getAutoBuilderRuleContext(content, ruleSystem),
    subclass,
    Math.max(0, level - 1),
    level,
    getExistingOptionalFeatureIds(content, character, 'maneuver'),
    getExistingManeuverExtraTarget(content, character) + Math.max(0, extraNeeded),
  );
  if (!state.ok) throwRuleResultError(state, subclass?.key ?? 'maneuver');
  return {
    isManeuverSubclass: true,
    needed: state.value.group?.min ?? 0,
    options: state.value.group?.options ?? [],
  };
};

export const getFeatFightingStyleChoiceState = (
  content: AutoBuilderContent,
  feat: AutoBuilderFeat | undefined,
  character: CharacterData,
  ruleSystem: RuleSystem = '5e',
): { from: AutoBuilderFightingStyle[]; count: number } | null => {
  if (!feat) return null;
  const state = requireSpecializedFeatChoiceState(content, ruleSystem, feat, character);
  const group = state.groups.find(({ kind }) => kind === 'fightingStyle');
  return group?.options.length ? {
    from: group.options as AutoBuilderFightingStyle[],
    count: group.max,
  } : null;
};

export const getFeatManeuverChoiceState = (
  content: AutoBuilderContent,
  feat: AutoBuilderFeat | undefined,
  character: CharacterData,
  ruleSystem: RuleSystem,
  extraNeeded = 0,
): { needed: number; options: AutoBuilderManeuver[] } | null => {
  if (!feat) return null;
  const state = requireSpecializedFeatChoiceState(content, ruleSystem, {
    ...feat,
    maneuverCount: (feat.maneuverCount || 0) + Math.max(0, extraNeeded),
  }, character);
  const group = state.groups.find(({ kind }) => kind === 'maneuver');
  return group?.options.length ? { needed: group.max, options: group.options } : null;
};

export const getFeatInvocationChoiceState = (
  content: AutoBuilderContent,
  feat: AutoBuilderFeat | undefined,
  character: CharacterData,
  ruleSystem: RuleSystem,
  characterLevel: number,
  selectedIds: string[] = [],
  selectedSpellIds: string[] = [],
): { needed: number; options: AutoBuilderInvocation[] } | null => {
  if (!feat) return null;
  const state = requireSpecializedFeatChoiceState(
    content,
    ruleSystem,
    feat,
    character,
    selectedIds,
    selectedSpellIds,
  );
  const group = state.groups.find(({ kind }) => kind === 'invocation');
  return group?.options.length ? { needed: group.max, options: group.options } : null;
};

export const getFeatMetamagicChoiceState = (
  content: AutoBuilderContent,
  feat: AutoBuilderFeat | undefined,
  character: CharacterData,
  ruleSystem: RuleSystem,
): { needed: number; options: AutoBuilderMetamagic[] } | null => {
  if (!feat) return null;
  const state = requireSpecializedFeatChoiceState(content, ruleSystem, feat, character);
  const group = state.groups.find(({ kind }) => kind === 'metamagic');
  return group?.options.length ? { needed: group.max, options: group.options } : null;
};

export const getMaxSpellLevel = (cls: AutoBuilderClass, level: number): number => {
  return getRuleMaxSpellLevel(cls, level);
};

const toRuleSlots = (
  slots: { [level: number]: SpellSlot },
): Record<string, { total: number; expended: number }> => Object.fromEntries(
  Object.entries(slots).flatMap(([level, slot]) => {
    const total = Math.max(0, Number(slot.total) || 0);
    if (total === 0) return [];
    return [[level, {
      total,
      expended: Math.min(total, Math.max(0, Number(slot.expended) || 0)),
    }]];
  }),
);

const fromRuleSlots = (
  ruleSlots: Readonly<Record<string, { total: number; expended: number }>>,
): { [level: number]: SpellSlot } => {
  const output = createEmptySpellSlots();
  Object.entries(ruleSlots).forEach(([level, slot]) => {
    output[Number(level)] = {
      total: String(slot.total),
      expended: String(slot.expended),
    };
  });
  return output;
};

const getSlotsForClassLevel = (
  cls: AutoBuilderClass,
  level: number,
  existing: { [level: number]: SpellSlot } = createEmptySpellSlots(),
): { [level: number]: SpellSlot } => fromRuleSlots(
  getRuleClassSpellSlots(cls, level, toRuleSlots(existing)),
);

const getClassDefinitionForCharacterClass = (
  content: AutoBuilderContent,
  cls: CharacterData['classes'][number],
): AutoBuilderClass | undefined => content.classes.find(item => (
  (item.key === cls.name || item.name === cls.name || item.englishName === cls.name)
  && (!cls.source || item.source === cls.source)
));

const getSharedMulticlassSlots = (
  content: AutoBuilderContent,
  classes: CharacterData['classes'],
  existing: { [level: number]: SpellSlot } = createEmptySpellSlots(),
): { slots: { [level: number]: SpellSlot }; applies: boolean } => {
  const spellcastingClasses = classes
    .map(cls => ({ characterClass: cls, definition: getClassDefinitionForCharacterClass(content, cls) }))
    .filter((entry): entry is { characterClass: CharacterData['classes'][number]; definition: AutoBuilderClass } => (
      Boolean(entry.definition?.spellcastingAbility && entry.definition.casterProgression && entry.definition.casterProgression !== 'pact')
    ));
  const shared = getRuleMulticlassSpellSlots(spellcastingClasses.map((entry) => ({
    ruleClass: entry.definition,
    level: entry.characterClass.level || 0,
  })), toRuleSlots(existing));
  return {
    slots: shared.applies ? fromRuleSlots(shared.slots) : createEmptySpellSlots(),
    applies: shared.applies,
  };
};

const applySharedSpellSlotsToProfiles = (
  content: AutoBuilderContent,
  classes: CharacterData['classes'],
  profiles: SpellcastingProfile[],
): SpellcastingProfile[] => {
  return profiles.map(profile => {
    const shared = getSharedMulticlassSlots(content, classes, profile.slots);
    const characterClass = classes.find(cls => cls.id === profile.classId);
    const definition = characterClass ? getClassDefinitionForCharacterClass(content, characterClass) : undefined;
    if (definition?.casterProgression === 'pact') {
      return { ...profile, slotSource: 'pact' };
    }
    if (shared.applies && definition?.spellcastingAbility && definition.casterProgression && definition.casterProgression !== 'pact') {
      return { ...profile, slotSource: 'shared', slots: shared.slots };
    }
    return { ...profile, slotSource: profile.slotSource || 'class' };
  });
};

const getPrimaryLegacySpellcasting = (
  profiles: SpellcastingProfile[],
  fallback: CharacterData['spellcasting'],
): CharacterData['spellcasting'] => {
  const primary = profiles[0];
  return primary
    ? {
        class: primary.className,
        ability: primary.ability,
        saveDCOverride: primary.saveDCOverride,
        attackBonusOverride: primary.attackBonusOverride,
        slots: primary.slots,
        spells: primary.spells,
      }
    : fallback;
};

const formatUnit = (unit?: string): string => {
  const units: Record<string, string> = {
    action: '动作',
    bonus: '附赠动作',
    reaction: '反应',
    minute: '分钟',
    hour: '小时',
  };
  return unit ? units[unit] || unit : '';
};

const formatTime = (time: AutoBuilderSpell['time']): string => {
  const first = time?.[0];
  if (!first) return '';
  return `${first.number || 1} ${formatUnit(first.unit)}`.trim();
};

const formatRange = (range: unknown): string => {
  if (!range || typeof range !== 'object') return '';
  const distance = (range as { distance?: { type?: string; amount?: number } }).distance;
  if (!distance) return '';
  if (distance.type === 'self') return '自身';
  if (distance.type === 'touch') return '触及';
  if (distance.type === 'sight') return '视线';
  if (distance.type === 'unlimited') return '无限';
  if (distance.type === 'feet') return `${distance.amount || 0}尺`;
  if (distance.type === 'miles') return `${distance.amount || 0}里`;
  return distance.type || '';
};

const formatComponents = (components: AutoBuilderSpell['components']): string => {
  const parts = [];
  if (components.v) parts.push('V');
  if (components.s) parts.push('S');
  if (components.m) parts.push('M');
  return parts.join(', ');
};

	const formatDuration = (duration: AutoBuilderSpell['duration']): string => {
	  const first = duration?.[0];
	  if (!first) return '';
	  if (first.type === 'instant') return '立即';
	  if (first.type === 'permanent') return '永久';
	  const timed = first as { duration?: { type?: string; amount?: number }; concentration?: boolean };
	  const value = timed.duration ? `${timed.duration.amount || 1} ${formatUnit(timed.duration.type)}` : String(first.type || '');
	  return value;
	};

const toCharacterSpell = (spell: AutoBuilderSpell, prepared: boolean): Spell => ({
	  id: spell.id,
	  level: spell.level,
	  name: spell.name,
	  prepared,
	  time: formatTime(spell.time),
	  range: formatRange(spell.range),
	  components: formatComponents(spell.components),
	  material: typeof spell.components?.m === 'string' ? spell.components.m : '',
	  duration: formatDuration(spell.duration),
	  concentration: spell.duration?.some(entry => Boolean(entry.concentration)) || false,
	  ritual: Boolean(spell.meta?.ritual),
	});

const uniqueSpells = (spells: AutoBuilderSpell[]): AutoBuilderSpell[] => {
  const seen = new Set<string>();
  const out: AutoBuilderSpell[] = [];
  for (const spell of spells) {
    if (seen.has(spell.id)) continue;
    seen.add(spell.id);
    out.push(spell);
  }
  return out;
};

const uniqueCharacterSpells = (spells: Spell[]): Spell[] => {
  const seen = new Set<string>();
  const out: Spell[] = [];
  for (const spell of spells) {
    if (seen.has(spell.id)) continue;
    seen.add(spell.id);
    out.push(spell);
  }
  return out;
};

const getAdditionalPreparedSpells = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  level: number,
  subclass?: AutoBuilderSubclass,
): AutoBuilderSpell[] => {
  const refs = [
    ...(cls.additionalPreparedSpells || []),
    ...(subclass?.additionalPreparedSpells || []),
  ].filter(ref => ref.mode !== 'expanded' && ref.level <= level);
  return refs
    .map(ref => content.spells.find(spell => spell.name === ref.name && spell.source === ref.source))
    .filter((spell): spell is AutoBuilderSpell => Boolean(spell));
};

const projectRuleSpellcastingProfile = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  oldLevel: number,
  newLevel: number,
  choices: AutoBuilderSpellChoice,
  subclass?: AutoBuilderSubclass,
  classId = createRuleClassInstanceId(cls),
  existing?: SpellcastingProfile,
  replaceSpell?: { removeId: string; addId: string } | null,
  magicalSecretChoices: string[] = [],
): SpellcastingProfile | null => {
  const context = getAutoBuilderRuleContext(content, cls.source === 'XPHB' ? '5r' : '5e');
  const stateResult = createRuleSpellcastingAdvancementState(
    context,
    cls,
    oldLevel,
    newLevel,
    existing?.spells.map(({ id }) => id) || [],
    subclass,
  );
  if (!stateResult.ok) {
    const first = stateResult.issues[0];
    throw new Error(`Invalid spellcasting advancement: ${first?.detail?.reason || first?.code || 'unknown'}`);
  }
  const state = stateResult.value;
  if (!state) return null;
  const regularIds = new Set([...choices.cantrips, ...choices.leveled]);
  const magicalIds = new Set(magicalSecretChoices);
  const selections = Object.fromEntries(state.groups.map((group) => [
    group.id,
    group.options
      .filter(({ id }) => (
        group.id.endsWith('-magical-secrets') ? magicalIds.has(id) : regularIds.has(id)
      ))
      .map(({ id }) => id),
  ]));
  const canonicalExisting = existing
    ? {
        id: existing.id,
        ...(existing.classId === undefined ? {} : { classId: existing.classId }),
        ability: existing.ability,
        preparationMode: existing.preparationMode,
        ...(existing.slotSource === undefined ? {} : { slotSource: existing.slotSource }),
        spells: existing.spells.map((spell) => {
          const catalogSpell = content.spells.find(({ id }) => id === spell.id);
          return {
            id: spell.id,
            key: catalogSpell?.key || catalogSpell?.name || spell.name,
            source: catalogSpell?.source || cls.source,
            prepared: spell.prepared,
            alwaysPrepared: spell.prepared,
          };
        }),
        slots: toRuleSlots(existing.slots),
      }
    : undefined;
  const effectResult = createRuleSpellcastingAdvancementEffects(context, state, {
    ...(canonicalExisting === undefined ? {} : { existingProfile: canonicalExisting }),
    selections,
    replacement: replaceSpell,
  });
  if (!effectResult.ok) {
    const first = effectResult.issues[0];
    throw new Error(`Invalid spellcasting choices: ${first?.detail?.reason || first?.code || 'unknown'}`);
  }
  const effect = effectResult.value.find(({ type }) => type === 'spell.profile.upsert');
  if (!effect || effect.type !== 'spell.profile.upsert') return null;
  const previousById = new Map(existing?.spells.map((spell) => [spell.id, spell]) || []);
  const spells = effect.profile.spells.flatMap((ref): Spell[] => {
    const catalogSpell = content.spells.find(({ id }) => id === ref.id);
    if (catalogSpell) return [toCharacterSpell(catalogSpell, ref.prepared ?? false)];
    const previous = previousById.get(ref.id);
    return previous ? [{ ...previous, prepared: ref.prepared ?? previous.prepared }] : [];
  });
  return {
    id: effect.profile.id,
    classId,
    className: cls.name,
    ability: effect.profile.ability,
    preparationMode: effect.profile.preparationMode === 'spellbook'
      ? 'knownSelection'
      : effect.profile.preparationMode,
    slotSource: effect.profile.slotSource,
    saveDCOverride: existing?.saveDCOverride || '',
    attackBonusOverride: existing?.attackBonusOverride || '',
    slots: fromRuleSlots(effect.profile.slots),
    spells,
  };
};

const createSpellcastingProfile = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  choices: AutoBuilderSpellChoice,
  level = 1,
  subclass?: AutoBuilderSubclass,
  classId = createRuleClassInstanceId(cls),
): SpellcastingProfile | null => {
  return projectRuleSpellcastingProfile(
    content,
    cls,
    0,
    level,
    choices,
    subclass,
    classId,
  );
};

const createClassFeatureOperations = (
  cls: AutoBuilderClass,
  ruleSystem: RuleSystem,
  level = 1,
): AdjustmentOperation[] => {
  return (cls.levelFeatures || cls.levelOneFeatures)
    .filter(feature => feature.level === level)
    .flatMap((feature, index): AdjustmentOperation[] => {
      const operations: AdjustmentOperation[] = [{
        type: 'addFeature',
        feature: {
          id: `auto-${cls.key}-${cls.source}-level-${level}-feature-${index + 1}`,
          sourceId: `auto-${cls.key}-${cls.source}-level-${level}`,
          sourceName: `${cls.name} ${cls.source}`,
          name: feature.name,
          level: feature.level,
          ruleSystem,
          description: feature.description,
        } satisfies CharacterFeatureEntry,
      }];
      if (feature.englishName === 'Fast Movement' || feature.name === '快速移动') {
        operations.push({ type: 'addNumber', path: 'speedBonus', value: 10 });
      }
      if (feature.englishName === 'Unarmored Movement' || feature.name === '无甲移动') {
        operations.push({ type: 'addNumber', path: 'speedBonus', value: 10 });
      }
      return operations;
    });
};

const classHasFeatureAtOrBeforeLevel = (
  cls: AutoBuilderClass,
  level: number,
  englishName: string,
  name: string,
): boolean => cls.levelFeatures.some(feature => (
  feature.level <= level
  && (feature.englishName === englishName || feature.name === name)
));

const makeClassResource = (
  cls: AutoBuilderClass,
  ruleSystem: RuleSystem,
  key: string,
  name: string,
  max: number,
  reset: CharacterResource['reset'],
  note?: string,
): AdjustmentOperation => ({
  type: 'upsertResource',
  resource: {
    id: `auto-resource-${cls.key}-${cls.source}-${key}`,
    sourceId: `auto-resource-${cls.key}-${cls.source}-${key}`,
    sourceName: `${cls.name} ${cls.source}`,
    name,
    current: Math.max(0, max),
    max: Math.max(0, max),
    reset,
    note,
    ruleSystem,
  },
});

const getRageUses = (level: number): number => {
  if (level >= 17) return 6;
  if (level >= 12) return 5;
  if (level >= 6) return 4;
  if (level >= 3) return 3;
  return 2;
};

const getSecondWindUses = (cls: AutoBuilderClass, level: number): number => {
  if (cls.source === 'XPHB') {
    if (level >= 10) return 4;
    if (level >= 4) return 3;
    return 2;
  }
  return 1;
};

const getProgressionValue = (progression: number[] | undefined, level: number): number => (
  progression?.[Math.max(0, level - 1)] || 0
);

const getBardicInspirationDie = (level: number): string => {
  if (level >= 15) return 'd12';
  if (level >= 10) return 'd10';
  if (level >= 5) return 'd8';
  return 'd6';
};

const getChannelDivinityUses = (cls: AutoBuilderClass, level: number, characterLevel: number): number => {
  const tableValue = getProgressionValue(cls.channelDivinityProgression, level);
  if (tableValue) return tableValue;
  if (cls.source === 'XPHB') return calculateProficiencyBonus(characterLevel);
  if (level >= 18) return 3;
  if (level >= 6) return 2;
  return 1;
};

const getFavoredEnemyUses = (cls: AutoBuilderClass, level: number): number => {
  const tableValue = getProgressionValue(cls.favoredEnemyProgression, level);
  if (tableValue) return tableValue;
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
};

const getSorceryPoints = (cls: AutoBuilderClass, level: number): number => (
  getProgressionValue(cls.sorceryPointProgression, level) || level
);

const createClassResourceOperations = (
  cls: AutoBuilderClass,
  ruleSystem: RuleSystem,
  classLevel: number,
  character: CharacterData,
  characterLevel = Math.max(1, getTotalLevel(character.classes)),
): AdjustmentOperation[] => {
  const operations: AdjustmentOperation[] = [];
  const chaMod = Math.max(1, calculateModifier(character.abilities.CHA));

  if (cls.key === 'Barbarian' && classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Rage', '狂暴')) {
    operations.push(makeClassResource(cls, ruleSystem, 'rage', '狂暴', getRageUses(classLevel), 'longRest'));
  }
  if (cls.key === 'Bard' && classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Bardic Inspiration', '诗人激励')) {
    const hasFontOfInspiration = classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Font of Inspiration', '激励之源');
    operations.push(makeClassResource(
      cls,
      ruleSystem,
      'bardic-inspiration',
      '诗人激励',
      chaMod,
      hasFontOfInspiration ? 'shortRest' : 'longRest',
      `次数等于魅力调整值, 至少 1. 激励骰 ${getBardicInspirationDie(classLevel)}.${cls.source === 'XPHB' && hasFontOfInspiration ? ' 也可消耗法术位恢复一次使用次数.' : ''}`,
    ));
  }
  if ((cls.key === 'Cleric' || cls.key === 'Paladin') && classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Channel Divinity', '引导神力')) {
    operations.push(makeClassResource(
      cls,
      ruleSystem,
      'channel-divinity',
      '引导神力',
      getChannelDivinityUses(cls, classLevel, characterLevel),
      cls.source === 'XPHB' ? 'longRest' : 'shortRest',
    ));
  }
  if (cls.key === 'Druid' && classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Wild Shape', '荒野形态')) {
    operations.push(makeClassResource(cls, ruleSystem, 'wild-shape', '荒野形态', cls.source === 'XPHB' ? calculateProficiencyBonus(characterLevel) : 2, 'shortRest'));
  }
  if (cls.key === 'Fighter') {
    if (classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Second Wind', '回气')) {
      operations.push(makeClassResource(
        cls,
        ruleSystem,
        'second-wind',
        '回气',
        getSecondWindUses(cls, classLevel),
        cls.source === 'XPHB' ? 'manual' : 'shortRest',
        cls.source === 'XPHB' ? '短休恢复 1 次已消耗次数, 长休恢复全部.' : undefined,
      ));
    }
    if (classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Action Surge', '动作如潮')) {
      operations.push(makeClassResource(cls, ruleSystem, 'action-surge', '动作如潮', classLevel >= 17 ? 2 : 1, 'shortRest'));
    }
    if (classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Indomitable', '不屈')) {
      operations.push(makeClassResource(cls, ruleSystem, 'indomitable', '不屈', Math.max(1, Math.ceil((classLevel - 8) / 4)), 'longRest'));
    }
  }
  if (cls.key === 'Monk' && classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Ki', '气')) {
    operations.push(makeClassResource(cls, ruleSystem, 'ki', cls.source === 'XPHB' ? '功力' : '气', classLevel, 'shortRest'));
  }
  if (cls.key === 'Monk' && classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Monk\u0027s Focus', '武僧专注')) {
    operations.push(makeClassResource(cls, ruleSystem, 'focus-points', '功力', classLevel, 'shortRest'));
  }
  if (cls.key === 'Monk' && cls.source === 'XPHB' && classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Uncanny Metabolism', '运转周天')) {
    operations.push(makeClassResource(cls, ruleSystem, 'uncanny-metabolism', '运转周天', 1, 'longRest', '骰先攻时可恢复全部功力, 并恢复武艺骰 + 武僧等级的生命值.'));
  }
  if (cls.key === 'Paladin' && classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Lay on Hands', '圣疗')) {
    operations.push(makeClassResource(cls, ruleSystem, 'lay-on-hands', '圣疗池', classLevel * 5, 'longRest', '以生命值计数.'));
  }
  if (cls.key === 'Paladin' && cls.source === 'PHB' && classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Divine Sense', '神圣感知')) {
    operations.push(makeClassResource(
      cls,
      ruleSystem,
      'divine-sense',
      '神圣感知',
      Math.max(1, 1 + calculateModifier(character.abilities.CHA)),
      'longRest',
      '次数等于 1 + 魅力调整值, 至少 1.',
    ));
  }
  if (cls.key === 'Ranger' && cls.source === 'XPHB' && classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Favored Enemy', '宿敌')) {
    operations.push(makeClassResource(
      cls,
      ruleSystem,
      'favored-enemy',
      '宿敌: 猎人印记',
      getFavoredEnemyUses(cls, classLevel),
      'longRest',
      '无需消耗法术位施展猎人印记的次数.',
    ));
  }
  if (cls.key === 'Sorcerer' && cls.source === 'XPHB' && classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Innate Sorcery', '先天术法')) {
    operations.push(makeClassResource(cls, ruleSystem, 'innate-sorcery', '先天术法', 2, 'longRest'));
  }
  if (cls.key === 'Sorcerer' && classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Font of Magic', '魔力泉涌')) {
    operations.push(makeClassResource(cls, ruleSystem, 'sorcery-points', '术法点', getSorceryPoints(cls, classLevel), 'longRest'));
  }
  if (cls.key === 'Sorcerer' && cls.source === 'XPHB' && classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Sorcerous Restoration', '术法复苏')) {
    operations.push(makeClassResource(
      cls,
      ruleSystem,
      'sorcerous-restoration',
      '术法复苏',
      1,
      'longRest',
      '完成短休时可恢复不大于术士等级一半的已消耗术法点.',
    ));
  }
  if (cls.key === 'Warlock' && cls.source === 'XPHB' && classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Magical Cunning', '秘法回流')) {
    operations.push(makeClassResource(
      cls,
      ruleSystem,
      'magical-cunning',
      '秘法回流',
      1,
      'longRest',
      '1 分钟仪式后重获一半已消耗的魔契师法术位, 向上取整.',
    ));
  }
  if (cls.key === 'Wizard' && classHasFeatureAtOrBeforeLevel(cls, classLevel, 'Arcane Recovery', '奥术回想')) {
    operations.push(makeClassResource(cls, ruleSystem, 'arcane-recovery', '奥术回想', 1, 'longRest', '恢复法术位总环阶不超过法师等级一半.'));
  }

  return operations;
};

const addClassFeatureSpellsToSpellcasting = (
  spellcasting: { profiles: SpellcastingProfile[]; legacy: CharacterData['spellcasting'] },
  content: AutoBuilderContent,
  classId: string,
  choices?: AutoBuilderClassFeatureChoice,
): { profiles: SpellcastingProfile[]; legacy: CharacterData['spellcasting'] } => {
  const selectedIds = choices?.fightingStyleCantrips || [];
  const selectedStyle = content.feats.find((feat) => (
    feat.id === choices?.fightingStyle?.featId
    || feat.key === choices?.fightingStyle?.featId
    || `${feat.key}|${feat.source}` === choices?.fightingStyle?.featId
  )) ?? content.fightingStyles.find(({ id }) => id === choices?.fightingStyleFeatureId);
  if (!selectedStyle) return spellcasting;
  const ruleSystem: RuleSystem = selectedStyle.source === 'XPHB' ? '5r' : '5e';
  const state = createRuleFightingStyleCantripChoiceState(
    getAutoBuilderRuleContext(content, ruleSystem),
    selectedStyle,
  );
  if (!state.ok) throwRuleResultError(state, selectedStyle.key);
  const effects = createRuleFightingStyleCantripEffects(
    state.value,
    classId,
    state.value.group ? selectedIds : [],
  );
  if (!effects.ok) throwRuleResultError(effects, selectedStyle.key);
  const selectedSpells = effects.value
    .filter((effect) => effect.type === 'spell.add')
    .map((effect) => content.spells.find((spell) => spell.id === effect.spell.id))
    .filter((spell): spell is AutoBuilderSpell => Boolean(spell))
    .map(spell => toCharacterSpell(spell, true));
  if (!selectedSpells.length) return spellcasting;

  let nextProfile: SpellcastingProfile | undefined;
  const profiles = spellcasting.profiles.map(profile => {
    if (profile.classId !== classId) return profile;
    nextProfile = {
      ...profile,
      spells: uniqueCharacterSpells([...profile.spells, ...selectedSpells]),
    };
    return nextProfile;
  });

  if (!nextProfile) return spellcasting;
  return {
    profiles,
    legacy: {
      ...spellcasting.legacy,
      class: nextProfile.className,
      ability: nextProfile.ability,
      saveDCOverride: nextProfile.saveDCOverride,
      attackBonusOverride: nextProfile.attackBonusOverride,
      slots: nextProfile.slots,
      spells: nextProfile.spells,
    },
  };
};

const createSubclassFeatureOperations = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  subclass: AutoBuilderSubclass | undefined,
  ruleSystem: RuleSystem,
  oldClassLevel: number,
  newClassLevel: number,
  existingSubclassName?: string,
): AdjustmentOperation[] => {
  const state = getAutoBuilderSubclassAdvancementState(
    content,
    cls,
    oldClassLevel,
    newClassLevel,
    existingSubclassName,
  );
  const result = createRuleSubclassAdvancementEffects(
    state,
    state.group && subclass ? [subclass.id] : [],
  );
  if (!result.ok) {
    const first = result.issues[0];
    throw new Error(
      `Invalid subclass selection at ${first?.path.join('.') || cls.key}: `
      + `${first?.detail?.reason || first?.code || 'unknown'}`,
    );
  }
  const selectedSubclass = state.existingSubclass ?? subclass;
  return result.value.flatMap((effect): AdjustmentOperation[] => {
    if (effect.type !== 'feature.add') {
      return originEffectToAdjustmentOperations(effect);
    }
    if (!selectedSubclass) {
      throw new Error(`Missing selected subclass for feature ${effect.feature.id}`);
    }
    const featureIndex = selectedSubclass.features.findIndex((feature, index) => (
      getRuleSubclassFeatureRef(selectedSubclass, feature, index).id === effect.feature.id
    ));
    const feature = selectedSubclass.features[featureIndex];
    if (!feature) {
      throw new Error(`Missing subclass feature ${effect.feature.id}`);
    }
    const levelFeatureIndex = selectedSubclass.features
      .filter(({ level }) => level === feature.level)
      .findIndex((candidate) => candidate === feature);
    return [{
      type: 'addFeature',
      feature: {
        id: `${effect.sourceId}-feature-${levelFeatureIndex + 1}`,
        sourceId: effect.sourceId,
        sourceName: `${selectedSubclass.name} ${selectedSubclass.source}`,
        name: feature.name,
        level: feature.level,
        ruleSystem,
        description: feature.description,
      } satisfies CharacterFeatureEntry,
    }];
  });
};

const createInvocationOperations = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  character: CharacterData,
  choice: AutoBuilderInvocationChoice | undefined,
  ruleSystem: RuleSystem,
  oldClassLevel: number,
  newClassLevel: number,
  selectedSpellIds: string[],
): AdjustmentOperation[] => {
  const ids = choice?.invocationIds || [];
  if (!cls.invocationProgression?.length) return [];
  const state = createRuleInvocationAdvancementState(
    getAutoBuilderRuleContext(content, ruleSystem),
    cls,
    oldClassLevel,
    newClassLevel,
    getExistingInvocationIds(character),
    getSpecializedFeatContext(content, character, ids, selectedSpellIds),
  );
  if (!state.ok) throwRuleResultError(state, cls.key);
  const effects = createRuleInvocationAdvancementEffects(
    state.value,
    state.value.group ? ids : [],
  );
  if (!effects.ok) throwRuleResultError(effects, cls.key);
  return effects.value.flatMap((effect, index): AdjustmentOperation[] => {
    if (effect.type !== 'feature.add') return originEffectToAdjustmentOperations(effect);
    const invocation = content.invocations.find(({ id }) => id === effect.feature.id);
    if (!invocation) throw new Error(`Missing invocation ${effect.feature.id}`);
    return [{
      type: 'addFeature',
      feature: {
        id: `${effect.sourceId}-${newClassLevel}-${index + 1}`,
        sourceId: effect.sourceId,
        sourceName: `${invocation.name} ${invocation.source}`,
        name: invocation.name,
        level: newClassLevel,
        ruleSystem,
        description: invocation.description,
      } satisfies CharacterFeatureEntry,
    }];
  });
};

const createEntityFeatureOperations = (
  entity: AutoBuilderOrigin,
  kind: 'race' | 'background',
  ruleSystem: RuleSystem,
): AdjustmentOperation[] => {
  return entity.features.map((feature, index) => ({
    type: 'addFeature',
    feature: {
      id: `auto-${kind}-${entity.key}-${entity.source}-feature-${index + 1}`,
      sourceId: `auto-${kind}-${entity.key}-${entity.source}`,
      sourceName: `${entity.name} ${entity.source}`,
      name: feature.name,
      level: 1,
      ruleSystem,
      description: feature.description,
    } satisfies CharacterFeatureEntry,
  }));
};

const createAbilityOperations = (
  entity: AutoBuilderOrigin,
  abilityChoice?: AutoBuilderAbilityChoice,
  includeFixed = true,
): AdjustmentOperation[] => {
  const operations: AdjustmentOperation[] = [];
  if (includeFixed) {
    for (const entry of entity.ability || []) {
      if ('choose' in entry) continue;
      for (const [ability, value] of Object.entries(entry)) {
        const abilityName = ABILITY_MAP[ability];
        if (abilityName && typeof value === 'number') {
          operations.push({ type: 'addNumber', path: `abilities.${abilityName}`, value });
        }
      }
    }
  }

  if (abilityChoice?.mode === 'plus2plus1' && abilityChoice.plus2 && abilityChoice.plus1) {
    operations.push({ type: 'addNumber', path: `abilities.${abilityChoice.plus2}`, value: 2 });
    operations.push({ type: 'addNumber', path: `abilities.${abilityChoice.plus1}`, value: 1 });
  } else if (
    abilityChoice?.mode === 'plus1three'
    && abilityChoice.plus1a
    && abilityChoice.plus1b
    && abilityChoice.plus1c
  ) {
    for (const ability of [abilityChoice.plus1a, abilityChoice.plus1b, abilityChoice.plus1c]) {
      operations.push({ type: 'addNumber', path: `abilities.${ability}`, value: 1 });
    }
  } else if (abilityChoice?.mode === 'plus1three') {
    for (const ability of getBackgroundAbilityOptions(entity)) {
      operations.push({ type: 'addNumber', path: `abilities.${ability}`, value: 1 });
    }
  }
  return operations;
};

const createFixedProficiencyOperations = (
  proficiencies: ProficiencyRecord[] | undefined,
  prefix: string,
): AdjustmentOperation[] => {
  const operations: AdjustmentOperation[] = [];
  for (const entry of proficiencies || []) {
    for (const [key, value] of Object.entries(entry)) {
      if (key === 'choose' || value !== true) continue;
      const normalized = normalizeEntityRef(key);
      operations.push({ type: 'addProficiency', key: prefix ? `${prefix}:${normalized}` : normalizeSkillName(normalized) });
    }
  }
  return operations;
};

const createClassTaggedProficiencyOperations = (
  entries: ClassProficiencyEntry[] | undefined,
  prefix: 'armor' | 'weapon',
): AdjustmentOperation[] => {
  const operations: AdjustmentOperation[] = [];
  for (const entry of entries || []) {
    const proficiency = getClassProficiencyValue(entry);
    if (proficiency) {
      operations.push({ type: 'addProficiency', key: `${prefix}:${normalizeKey(proficiency)}` });
    }
  }
  return operations;
};

const createToolChoiceOperations = (
  choices?: AutoBuilderToolChoiceSelection,
): AdjustmentOperation[] => {
  return Object.values(choices || {}).flatMap(tools => (
    tools.map(tool => ({ type: 'addProficiency', key: `tool:${normalizeKey(tool)}` } satisfies AdjustmentOperation))
  ));
};

const createExpertiseChoiceOperations = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  character: CharacterData,
  oldClassLevel: number,
  newClassLevel: number,
  additionalProficiencies: string[],
  choices?: AutoBuilderSkillChoiceSelection,
): AdjustmentOperation[] => {
  const state = createRuleExpertiseAdvancementState(
    getAutoBuilderRuleContext(content, cls.source === 'XPHB' ? '5r' : '5e'),
    cls,
    oldClassLevel,
    newClassLevel,
    uniqueStrings([
      ...character.proficiencies,
      ...additionalProficiencies,
    ]),
    [...character.expertises],
  );
  if (!state.ok) throwRuleResultError(state, cls.key);
  const selectedIds = state.value.group
    ? choices?.[state.value.group.id] ?? []
    : [];
  const effects = createRuleExpertiseAdvancementEffects(state.value, selectedIds);
  if (!effects.ok) throwRuleResultError(effects, cls.key);
  return effects.value.flatMap(originEffectToAdjustmentOperations);
};

const createLanguageChoiceOperations = (
  choices?: AutoBuilderLanguageChoiceSelection,
): AdjustmentOperation[] => {
  return Object.values(choices || {}).flatMap(languages => (
    languages.map(language => ({ type: 'addProficiency', key: `language:${normalizeKey(language)}` } satisfies AdjustmentOperation))
  ));
};

const getAbilityDeltaFromOperations = (
  operations: AdjustmentOperation[],
  ability: AbilityName,
): number => operations.reduce((total, operation) => {
  if (operation.type === 'addNumber' && operation.path === `abilities.${ability}`) {
    return total + operation.value;
  }
  return total;
}, 0);

const characterWithAbilityDeltas = (
  character: CharacterData,
  operations: AdjustmentOperation[],
  classes = character.classes,
): CharacterData => ({
  ...character,
  classes,
  abilities: ABILITY_OPTIONS.reduce<CharacterData['abilities']>((abilities, ability) => ({
    ...abilities,
    [ability]: abilities[ability] + getAbilityDeltaFromOperations(operations, ability),
  }), { ...character.abilities }),
});

const createFeatSpellOperations = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  feat: AutoBuilderFeat,
  choices?: AutoBuilderFeatChoice,
  characterLevel = Number.POSITIVE_INFINITY,
): AdjustmentOperation[] => {
  if (!feat.additionalSpells?.length) return [];
  const result = createRuleFeatSpellEffects(
    content,
    ruleSystem,
    feat,
    Number.isFinite(characterLevel) ? characterLevel : 1,
    {
      blockId: choices?.featSpellBlockId,
      ability: choices?.featSpellAbility || choices?.featAbility,
      choices: choices?.featSpellChoices,
      allowIncompleteChoices: true,
    },
  );
  if (!result.ok) {
    if (result.issues.every(({ code }) => code === 'choice_required')) return [];
    const first = result.issues[0];
    throw new Error(
      `Invalid feat spell choice at ${first?.path.join('.') || feat.key}: `
      + `${first?.detail?.reason || first?.code || 'unknown'}`,
    );
  }
  return result.value.flatMap(effect => featSpellEffectToAdjustmentOperations(
    effect,
    content,
    feat,
  ));
};

const featSpellEffectToAdjustmentOperations = (
  effect: RuleEffect,
  content: AutoBuilderContent,
  feat: AutoBuilderFeat,
): AdjustmentOperation[] => {
  if (effect.type === 'spell.add') {
    const spell = content.spells.find(({ id }) => id === effect.spell.id);
    if (!spell) throw new Error(`Feat spell is missing from catalog: ${effect.spell.id}`);
    return [{
      type: 'addSpell',
      profileId: effect.profileId,
      spell: toCharacterSpell(spell, true),
    }];
  }
  if (effect.type === 'spell.remove') {
    return [{
      type: 'removeSpell',
      profileId: effect.profileId,
      spellId: effect.spellId,
    }];
  }
  if (effect.type === 'spell.profile.upsert') {
    const spells = effect.profile.spells.map((ref) => {
      const spell = content.spells.find(({ id }) => id === ref.id);
      if (!spell) throw new Error(`Feat spell is missing from catalog: ${ref.id}`);
      return toCharacterSpell(spell, true);
    });
    return [{
      type: 'upsertSpellcastingProfile',
      profile: {
        id: effect.profile.id,
        className: `${feat.name} 法术`,
        ability: effect.profile.ability,
        preparationMode: 'knownSelection',
        saveDCOverride: '',
        attackBonusOverride: '',
        slots: createEmptySpellSlots(),
        spells,
      },
    }];
  }
  throw new Error(`Unsupported feat spell effect adapter: ${effect.type}`);
};

const getOriginSpellProfileId = (origin: AutoBuilderOrigin, kind: 'race' | 'background'): string => (
  `auto-${kind}-${normalizeKey(origin.key)}-${origin.source}-spells`
);

const createOriginSpellOperations = (
  content: AutoBuilderContent,
  origin: AutoBuilderOrigin,
  kind: 'race' | 'background',
  ruleSystem: RuleSystem,
  characterLevel: number,
  choices?: AutoBuilderRaceChoice,
): AdjustmentOperation[] => {
  const state = getOriginSpellChoiceState(content, origin, ruleSystem, characterLevel);
  if (!state) return [];
  const block = state.blocks.find(item => item.id === choices?.originSpellBlockId)
    || (state.blocks.length === 1 ? state.blocks[0] : undefined);
  if (!block) return [];
  const groupIds = new Set(block.choices.map(({ id }) => id));
  const selectedChoices = Object.fromEntries(Object.entries(
    choices?.originSpellChoices || {},
  ).filter(([groupId]) => groupIds.has(groupId)));
  const result = createRuleOriginSpellEffects(
    content,
    ruleSystem,
    origin,
    kind,
    characterLevel,
    {
      blockId: block.id,
      ability: choices?.originSpellAbility,
      choices: selectedChoices,
    },
  );
  if (!result.ok) {
    if (result.issues.every(({ code }) => code === 'choice_required')) return [];
    const first = result.issues[0];
    throw new Error(
      `Invalid origin spell choice at ${first?.path.join('.') || origin.key}: `
      + `${first?.detail?.reason || first?.code || 'unknown'}`,
    );
  }
  return result.value.flatMap((effect): AdjustmentOperation[] => {
    if (effect.type !== 'spell.profile.upsert') {
      throw new Error(`Unsupported origin spell effect adapter: ${effect.type}`);
    }
    const spells = effect.profile.spells.map((ref) => {
      const spell = content.spells.find(({ id }) => id === ref.id);
      if (!spell) throw new Error(`Origin spell is missing from catalog: ${ref.id}`);
      return toCharacterSpell(spell, true);
    });
    return [{
      type: 'upsertSpellcastingProfile',
      profile: {
        id: effect.profile.id,
        className: `${origin.name} 法术`,
        ability: effect.profile.ability,
        preparationMode: 'knownSelection',
        saveDCOverride: '',
        attackBonusOverride: '',
        slots: createEmptySpellSlots(),
        spells,
      },
    }];
  });
};

const createExistingOriginSpellLevelUpOperations = (
  content: AutoBuilderContent,
  character: CharacterData,
  ruleSystem: RuleSystem,
  oldCharacterLevel: number,
  newCharacterLevel: number,
  choices?: Record<string, AutoBuilderRaceChoice>,
): AdjustmentOperation[] => {
  return getExistingOriginSpellLevelUpChoiceStates(
    content,
    character,
    ruleSystem,
    oldCharacterLevel,
    newCharacterLevel,
  ).flatMap((entry): AdjustmentOperation[] => {
    const choice = choices?.[entry.id] ?? {};
    const existingProfile = character.spellcastingProfiles.find(
      profile => profile.id === entry.profileId,
    );
    const result = createRuleOriginSpellLevelUpEffects(
      content,
      ruleSystem,
      entry.origin,
      entry.kind,
      oldCharacterLevel,
      newCharacterLevel,
      existingProfile
        ? {
            id: existingProfile.id,
            ability: existingProfile.ability,
            preparationMode: existingProfile.preparationMode,
            spells: existingProfile.spells.map(spell => ({
              id: spell.id,
              key: spell.englishName || spell.name,
              source: spell.source,
            })),
            slots: {},
          }
        : undefined,
      {
        blockId: choice.originSpellBlockId || entry.defaultBlockId,
        ability: choice.originSpellAbility,
        choices: choice.originSpellChoices,
      },
    );
    if (!result.ok) {
      if (result.issues.every(({ code }) => code === 'choice_required')) return [];
      const first = result.issues[0];
      throw new Error(
        `Invalid origin spell level-up choice at ${first?.path.join('.') || entry.origin.key}: `
        + `${first?.detail?.reason || first?.code || 'unknown'}`,
      );
    }
    return result.value.flatMap((effect): AdjustmentOperation[] => {
      if (effect.type === 'spell.add') {
        const spell = content.spells.find(({ id }) => id === effect.spell.id);
        if (!spell) throw new Error(`Origin spell is missing from catalog: ${effect.spell.id}`);
        return [{
          type: 'addSpell',
          profileId: effect.profileId,
          spell: toCharacterSpell(spell, true),
        }];
      }
      if (effect.type === 'spell.profile.upsert') {
        const spells = effect.profile.spells.map((ref) => {
          const spell = content.spells.find(({ id }) => id === ref.id);
          if (!spell) throw new Error(`Origin spell is missing from catalog: ${ref.id}`);
          return toCharacterSpell(spell, true);
        });
        return [{
          type: 'upsertSpellcastingProfile',
          profile: {
            id: effect.profile.id,
            className: `${entry.origin.name} 法术`,
            ability: effect.profile.ability,
            preparationMode: 'knownSelection',
            saveDCOverride: '',
            attackBonusOverride: '',
            slots: createEmptySpellSlots(),
            spells,
          },
        }];
      }
      throw new Error(`Unsupported origin spell level-up effect adapter: ${effect.type}`);
    });
  });
};

const createExistingFeatSpellChoiceOperations = (
  content: AutoBuilderContent,
  character: CharacterData,
  ruleSystem: RuleSystem,
  oldCharacterLevel: number,
  newCharacterLevel: number,
  choices?: AutoBuilderFeatChoice[],
): AdjustmentOperation[] => {
  const choiceByFeatId = new Map((choices ?? []).map(choice => [choice.featId, choice]));
  return getExistingFeatSpellLevelUpChoiceStates(
    content,
    character,
    ruleSystem,
    oldCharacterLevel,
    newCharacterLevel,
  ).flatMap((state) => {
    const featId = `${state.feat.key}|${state.feat.source}`;
    const choice = choiceByFeatId.get(featId) || choiceByFeatId.get(state.feat.key);
    const profileId = getFeatSpellProfileId(state.feat);
    const existingProfile = character.spellcastingProfiles.find(profile => profile.id === profileId);
    const result = createRuleFeatSpellLevelUpEffects(
      content,
      ruleSystem,
      state.feat,
      oldCharacterLevel,
      newCharacterLevel,
      existingProfile
        ? {
            id: existingProfile.id,
            ability: existingProfile.ability,
            preparationMode: existingProfile.preparationMode,
            spells: existingProfile.spells.map(spell => ({
              id: spell.id,
              key: spell.englishName || spell.name,
              source: spell.source,
            })),
            slots: {},
          }
        : undefined,
      {
        blockId: choice?.featSpellBlockId,
        ability: choice?.featSpellAbility || choice?.featAbility,
        choices: choice?.featSpellChoices,
        replaceRemoveId: choice?.featSpellReplaceRemoveId,
        replaceAddId: choice?.featSpellReplaceAddId,
      },
    );
    if (!result.ok) {
      if (result.issues.every(({ code }) => code === 'choice_required')) return [];
      const first = result.issues[0];
      throw new Error(
        `Invalid feat spell level-up at ${first?.path.join('.') || state.feat.key}: `
        + `${first?.detail?.reason || first?.code || 'unknown'}`,
      );
    }
    return result.value.flatMap(effect => featSpellEffectToAdjustmentOperations(
      effect,
      content,
      state.feat,
    ));
  });
};

const getClassHitDie = (
  content: AutoBuilderContent,
  cls: Pick<AutoBuilderClass, 'key' | 'name' | 'source' | 'hitDie'>,
): number => (
  cls.hitDie
  || content.classes.find(item => item.key === cls.key && item.source === cls.source)?.hitDie
  || content.classes.find(item => item.key === cls.key || item.name === cls.name)?.hitDie
  || 8
);

const formatHitDiceTotal = (
  classes: CharacterData['classes'],
  content: AutoBuilderContent,
): string => {
  const byDie = new Map<number, number>();
  for (const cls of classes) {
    const definition = content.classes.find(item => (
      (item.key === cls.name || item.name === cls.name)
      && (!cls.source || item.source === cls.source)
    ));
    const die = definition?.hitDie || 8;
    byDie.set(die, (byDie.get(die) || 0) + (cls.level || 0));
  }
  return Array.from(byDie.entries())
    .sort(([a], [b]) => b - a)
    .map(([die, count]) => `${count}d${die}`)
    .join(' + ');
};

const getAverageHpGain = (hitDie: number, conModifier: number): number => (
  Math.max(1, Math.ceil(hitDie / 2) + 1 + conModifier)
);

const formatSize = (size: string): string => SIZE_LABELS[size] || size;

const MOVEMENT_LABELS: Record<string, string> = {
  walk: '步行',
  fly: '飞行',
  climb: '攀爬',
  swim: '游泳',
  burrow: '掘穴',
};

const getWalkSpeed = (speed: AutoBuilderOrigin['speed']): number | null => {
  if (typeof speed === 'number') return speed;
  if (!speed || typeof speed !== 'object') return null;
  const walk = speed.walk;
  return typeof walk === 'number' ? walk : null;
};

const formatMovementModes = (speed: AutoBuilderOrigin['speed']): string[] => {
  if (!speed || typeof speed !== 'object') return [];
  const walk = getWalkSpeed(speed);
  return Object.entries(speed)
    .filter(([mode]) => mode !== 'walk')
    .map(([mode, value]) => {
      const label = MOVEMENT_LABELS[mode] || mode;
      if (typeof value === 'number') return `${label}速度 ${value} 尺`;
      if (value === true && walk) return `${label}速度等同你的步行速度 (${walk} 尺)`;
      if (value === true) return `${label}速度等同你的步行速度`;
      return '';
    })
    .filter(Boolean);
};

const getFixedTextEntries = (entries: unknown[] | undefined): string[] => (
  Array.from(new Set((entries || []).filter((entry): entry is string => typeof entry === 'string')))
);

const addStructuredTextEntries = (
  operations: AdjustmentOperation[],
  path: 'damageResistances' | 'damageImmunities' | 'damageVulnerabilities' | 'conditionImmunities' | 'senses',
  values: string[],
  feature: {
    sourceId: string;
    sourceName: string;
    name: string;
    description: string;
    ruleSystem: RuleSystem;
  },
  includeTextEntries = true,
): void => {
  if (!values.length) return;
  if (includeTextEntries) {
    operations.push(...values.map(value => ({
      type: 'addTextEntry' as const,
      path,
      value,
    })));
  }
  operations.push({
    type: 'addFeature',
    feature: {
      id: feature.sourceId,
      sourceId: feature.sourceId,
      sourceName: feature.sourceName,
      name: feature.name,
      level: 1,
      ruleSystem: feature.ruleSystem,
      description: feature.description,
    } satisfies CharacterFeatureEntry,
  });
};

const createOriginStructuredFeatureOperations = (
  entity: AutoBuilderOrigin,
  kind: 'race' | 'background',
  ruleSystem: RuleSystem,
  characterLevel = 1,
  includeBaseEffects = true,
): AdjustmentOperation[] => {
  const operations: AdjustmentOperation[] = [];
  const sourceId = `auto-${kind}-${entity.key}-${entity.source}`;
  if (entity.darkvision) {
    addStructuredTextEntries(operations, 'senses', [`黑暗视觉 ${entity.darkvision} 尺`], {
      sourceId: `${sourceId}-darkvision`,
      sourceName: `${entity.name} ${entity.source}`,
      name: '黑暗视觉',
      ruleSystem,
      description: `你拥有 ${entity.darkvision} 尺黑暗视觉.`,
    }, includeBaseEffects);
  }
  if (entity.blindsight) {
    addStructuredTextEntries(operations, 'senses', [`盲视 ${entity.blindsight} 尺`], {
      sourceId: `${sourceId}-blindsight`,
      sourceName: `${entity.name} ${entity.source}`,
      name: '盲视',
      ruleSystem,
      description: `你拥有 ${entity.blindsight} 尺盲视.`,
    }, includeBaseEffects);
  }
  if (entity.tremorsense) {
    addStructuredTextEntries(operations, 'senses', [`震颤感知 ${entity.tremorsense} 尺`], {
      sourceId: `${sourceId}-tremorsense`,
      sourceName: `${entity.name} ${entity.source}`,
      name: '震颤感知',
      ruleSystem,
      description: `你拥有 ${entity.tremorsense} 尺震颤感知.`,
    }, includeBaseEffects);
  }
  if (entity.truesight) {
    addStructuredTextEntries(operations, 'senses', [`真实视觉 ${entity.truesight} 尺`], {
      sourceId: `${sourceId}-truesight`,
      sourceName: `${entity.name} ${entity.source}`,
      name: '真实视觉',
      ruleSystem,
      description: `你拥有 ${entity.truesight} 尺真实视觉.`,
    }, includeBaseEffects);
  }

  const sourceName = `${entity.name} ${entity.source}`;
  const fixedResistances = getFixedTextEntries(entity.resist);
  addStructuredTextEntries(operations, 'damageResistances', fixedResistances, {
    sourceId: `${sourceId}-fixed-resistances`,
    sourceName,
    name: '伤害抗性',
    ruleSystem,
    description: `你获得对 ${fixedResistances.join(', ')} 伤害的抗性.`,
  }, includeBaseEffects);
  const fixedImmunities = getFixedTextEntries(entity.immune);
  addStructuredTextEntries(operations, 'damageImmunities', fixedImmunities, {
    sourceId: `${sourceId}-fixed-immunities`,
    sourceName,
    name: '伤害免疫',
    ruleSystem,
    description: `你获得对 ${fixedImmunities.join(', ')} 伤害的免疫.`,
  }, includeBaseEffects);
  const fixedVulnerabilities = getFixedTextEntries(entity.vulnerable);
  addStructuredTextEntries(operations, 'damageVulnerabilities', fixedVulnerabilities, {
    sourceId: `${sourceId}-fixed-vulnerabilities`,
    sourceName,
    name: '伤害易伤',
    ruleSystem,
    description: `你对 ${fixedVulnerabilities.join(', ')} 伤害具有易伤.`,
  }, includeBaseEffects);
  const fixedConditionImmunities = getFixedTextEntries(entity.conditionImmune);
  addStructuredTextEntries(operations, 'conditionImmunities', fixedConditionImmunities, {
    sourceId: `${sourceId}-fixed-condition-immunities`,
    sourceName,
    name: '状态免疫',
    ruleSystem,
    description: `你免疫 ${fixedConditionImmunities.join(', ')} 状态.`,
  }, includeBaseEffects);

  const movementModes = formatMovementModes(entity.speed);
  if (movementModes.length) {
    operations.push({
      type: 'addFeature',
      feature: {
        id: `${sourceId}-movement-modes`,
        sourceId,
        sourceName: `${entity.name} ${entity.source}`,
        name: '移动速度',
        level: 1,
        ruleSystem,
        description: movementModes.join('\n'),
      } satisfies CharacterFeatureEntry,
    });
  }

  return operations;
};

const createSharedOriginResourceOperations = (
  entity: Pick<AutoBuilderOrigin, 'key' | 'name' | 'source'> & Partial<Pick<AutoBuilderOrigin, 'features'>>,
  kind: 'race' | 'background',
  ruleSystem: RuleSystem,
  characterLevel = 1,
  featureChoices?: AutoBuilderOriginFeatureChoiceSelection,
  resourceNotes?: Record<string, string | undefined>,
): AdjustmentOperation[] => {
  if (kind !== 'race') return [];
  const origin: AutoBuilderOrigin = {
    key: entity.key,
    name: entity.name,
    source: entity.source,
    ruleSystem,
    features: entity.features || [],
  };
  return createRuleOriginResourceEffects(origin, ruleSystem, characterLevel, {
    featureChoices,
    resourceNotes,
  }).flatMap(originEffectToAdjustmentOperations);
};

const createFeatEffectPresentationOperations = (
  feat: AutoBuilderFeat,
  ruleSystem: RuleSystem,
): AdjustmentOperation[] => {
  const sourceId = `auto-feat-${feat.key}-${feat.source}`;
  const sourceName = `${feat.name} ${feat.source}`;
  const operations: AdjustmentOperation[] = [];
  const addFeature = (
    suffix: string,
    name: string,
    description: string,
  ) => operations.push({
    type: 'addFeature',
    feature: {
      id: `${sourceId}-${suffix}-feature`,
      sourceId: `${sourceId}-${suffix}`,
      sourceName,
      name,
      level: 1,
      ruleSystem,
      description,
    },
  });
  for (const [suffix, name, distance] of [
    ['darkvision', '黑暗视觉', feat.darkvision],
    ['blindsight', '盲视', feat.blindsight],
    ['tremorsense', '震颤感知', feat.tremorsense],
    ['truesight', '真实视觉', feat.truesight],
  ] as const) {
    if (distance) addFeature(suffix, name, `你拥有 ${distance} 尺${name}.`);
  }
  for (const [suffix, name, values, description] of [
    ['fixed-resistances', '伤害抗性', getFixedTextEntries(feat.resist), '你获得伤害抗性'],
    ['fixed-immunities', '伤害免疫', getFixedTextEntries(feat.immune), '你获得伤害免疫'],
    ['fixed-vulnerabilities', '伤害易伤', getFixedTextEntries(feat.vulnerable), '你具有伤害易伤'],
    ['fixed-condition-immunities', '状态免疫', getFixedTextEntries(feat.conditionImmune), '你获得状态免疫'],
  ] as const) {
    if (values.length > 0) {
      addFeature(suffix, name, `${description}: ${values.join(', ')}.`);
    }
  }
  return operations;
};

const createOriginOperations = (
  content: AutoBuilderContent,
  entity: AutoBuilderOrigin,
  kind: 'race' | 'background',
  ruleSystem: RuleSystem,
  abilityChoice?: AutoBuilderAbilityChoice,
  toolChoices?: AutoBuilderToolChoiceSelection,
  characterLevel = 1,
  featureChoices?: AutoBuilderOriginFeatureChoiceSelection,
  originSpellChoices?: AutoBuilderRaceChoice,
  languageChoices?: AutoBuilderLanguageChoiceSelection,
): AdjustmentOperation[] => {
  const baseEffects = getOriginBaseEffects(
    content,
    entity,
    ruleSystem,
    abilityChoice,
    toolChoices,
    languageChoices,
    featureChoices,
    originSpellChoices,
  );
  const operations: AdjustmentOperation[] = [
    ...createEntityFeatureOperations(entity, kind, ruleSystem),
    ...createOriginStructuredFeatureOperations(entity, kind, ruleSystem, characterLevel, false),
    ...createSharedOriginResourceOperations(entity, kind, ruleSystem, characterLevel, featureChoices),
    ...baseEffects.flatMap(originEffectToAdjustmentOperations),
    ...(kind === 'race'
      ? createRuleOriginAdvancementEffects(entity, 0, characterLevel)
        .flatMap(originEffectToAdjustmentOperations)
      : []),
    ...createOriginSpellOperations(content, entity, kind, ruleSystem, characterLevel, originSpellChoices),
  ];

  return operations;
};

const getOriginBaseEffects = (
  content: AutoBuilderContent,
  entity: AutoBuilderOrigin,
  ruleSystem: RuleSystem,
  abilityChoice?: AutoBuilderAbilityChoice,
  toolChoices?: AutoBuilderToolChoiceSelection,
  languageChoices?: AutoBuilderLanguageChoiceSelection,
  featureChoices?: AutoBuilderOriginFeatureChoiceSelection,
  choices?: AutoBuilderRaceChoice,
): RuleEffect[] => {
  const state = getAutoBuilderOriginChoiceGroups(content, ruleSystem, entity);
  const selections: Record<string, string[]> = {};
  const assignFirst = (
    groups: readonly RuleStringChoiceGroup[],
    values: readonly string[] | undefined,
  ) => {
    const group = groups[0];
    if (group && values !== undefined) selections[group.id] = [...values];
  };
  assignFirst(state.ability, choices?.abilities);
  assignFirst(state.skill, choices?.skills);
  assignFirst(
    state.resistance,
    choices?.resistance ? [choices.resistance] : state.resistance[0]?.from.slice(0, 1),
  );
  assignFirst(
    state.size,
    choices?.size ? [choices.size] : state.size[0]?.from.slice(0, 1),
  );
  for (const group of state.feature) {
    const selected = featureChoices?.[group.id];
    if (selected) selections[group.id] = [selected];
  }
  const availableGroupIds = new Set(state.all.map(({ id }) => id));
  for (const choiceMap of [
    toolChoices,
    languageChoices,
    choices?.toolChoices,
    choices?.languageChoices,
    choices?.weaponChoices,
  ]) {
    for (const [groupId, values] of Object.entries(choiceMap || {})) {
      if (availableGroupIds.has(groupId)) selections[groupId] = values;
    }
  }
  const weightedAbilities = abilityChoiceToBonuses(abilityChoice)
    || getDefaultWeightedAbilityBonuses(entity);
  const result = createRuleOriginBaseEffects(content, ruleSystem, entity, {
    choices: selections,
    ...(weightedAbilities ? { weightedAbilities } : {}),
    allowIncompleteChoices: true,
  });
  if (result.ok) return result.value;
  const first = 'issues' in result ? result.issues[0] : undefined;
  throw new Error(
    `Invalid origin effects at ${first?.path.join('.') || entity.key}: `
    + `${first?.detail?.reason || first?.code || 'unknown'}`,
  );
};

const abilityChoiceToBonuses = (
  choice: AutoBuilderAbilityChoice | undefined,
): Partial<Record<AbilityName, number>> | undefined => {
  if (choice?.mode === 'plus2plus1' && choice.plus2 && choice.plus1) {
    return { [choice.plus2]: 2, [choice.plus1]: 1 };
  }
  if (
    choice?.mode === 'plus1three'
    && choice.plus1a
    && choice.plus1b
    && choice.plus1c
  ) {
    return { [choice.plus1a]: 1, [choice.plus1b]: 1, [choice.plus1c]: 1 };
  }
  return undefined;
};

const getDefaultWeightedAbilityBonuses = (
  entity: AutoBuilderOrigin,
): Partial<Record<AbilityName, number>> | undefined => {
  for (const entry of entity.ability || []) {
    if (!('choose' in entry) || !entry.choose || typeof entry.choose !== 'object') continue;
    const weighted = (entry.choose as { weighted?: unknown }).weighted;
    if (!weighted || typeof weighted !== 'object') continue;
    const from = (weighted as { from?: unknown }).from;
    const weights = (weighted as { weights?: unknown }).weights;
    if (!Array.isArray(from) || !Array.isArray(weights)) continue;
    const bonuses: Partial<Record<AbilityName, number>> = {};
    weights.forEach((value, index) => {
      const ability = normalizeAbilityName(String(from[index] || ''));
      if (ability && typeof value === 'number') bonuses[ability] = value;
    });
    if (Object.keys(bonuses).length === weights.length) return bonuses;
  }
  return undefined;
};

export const originEffectToAdjustmentOperations = (
  effect: RuleEffect,
): AdjustmentOperation[] => {
  switch (effect.type) {
    case 'character.flag.set':
      return [{ type: 'setBooleanField', field: effect.field, value: effect.value }];
    case 'ability.add':
      return [{ type: 'addNumber', path: `abilities.${effect.ability}`, value: effect.value }];
    case 'proficiency.add':
      return [{
        type: 'addProficiency',
        key: effect.proficiency,
        ...(effect.expertise ? { expertise: true } : {}),
      }];
    case 'combat.value.set':
      return effect.field === 'speed'
        ? [{ type: 'set', path: 'speed', value: String(effect.value) }]
        : [{ type: 'setStringField', field: 'bodyType', value: formatSize(String(effect.value)) }];
    case 'combat.number.add':
      return [{ type: 'addNumber', path: effect.field, value: effect.value }];
    case 'combat.text.add':
      return [{ type: 'addTextEntry', path: effect.field, value: effect.value }];
    case 'resource.upsert': {
      const resource = effect.resource;
      if (!resource.name || !resource.sourceName || !resource.ruleSystem) {
        throw new Error(`Origin resource metadata is incomplete: ${resource.id}`);
      }
      return [{
        type: 'upsertResource',
        resource: {
          id: resource.id,
          sourceId: resource.sourceId,
          sourceName: resource.sourceName,
          name: resource.name,
          current: resource.current,
          max: resource.max,
          reset: resource.reset,
          note: resource.note,
          ruleSystem: resource.ruleSystem,
        },
      }];
    }
    default:
      throw new Error(`Unsupported origin base effect adapter: ${effect.type}`);
  }
};

const createOriginProficiencyOperations = (
  entity: AutoBuilderOrigin,
  toolChoices?: AutoBuilderToolChoiceSelection,
): AdjustmentOperation[] => [
  ...createFixedProficiencyOperations(entity.skillProficiencies, ''),
  ...createFixedProficiencyOperations(entity.toolProficiencies, 'tool'),
  ...createToolChoiceOperations(toolChoices),
  ...createFixedProficiencyOperations(entity.languageProficiencies, 'language'),
  ...createFixedProficiencyOperations(entity.weaponProficiencies, 'weapon'),
  ...createFixedProficiencyOperations(entity.armorProficiencies, 'armor'),
];

const createRaceChoiceOperations = (
  content: AutoBuilderContent,
  character: CharacterData,
  race: AutoBuilderOrigin,
  ruleSystem: RuleSystem,
  choices?: AutoBuilderRaceChoice,
  subrace?: AutoBuilderOrigin,
): AdjustmentOperation[] => {
  const operations: AdjustmentOperation[] = [];
  if (choices?.resistance) {
    const sourceId = `auto-race-${race.key}-${race.source}-choice-resistance`;
    operations.push({
      type: 'addFeature',
      feature: {
        id: `${sourceId}-feature`,
        sourceId,
        sourceName: `${race.name} ${race.source}`,
        name: '伤害抗性',
        level: 1,
        ruleSystem,
        description: `你获得对 ${choices.resistance} 伤害的抗性.`,
      } satisfies CharacterFeatureEntry,
    });
  }
  const featState = getRaceFeatChoiceOptions(
    content,
    ruleSystem,
    character,
    race,
    subrace,
  )?.ruleState;
  operations.push(...createChosenFeatOperations(
    content,
    character,
    ruleSystem,
    choices,
    operations,
    1,
    featState,
  ));
  return operations;
};

const createChosenFeatOperations = (
  content: AutoBuilderContent,
  character: CharacterData,
  ruleSystem: RuleSystem,
  choices?: AutoBuilderFeatChoice,
  previousOperations: AdjustmentOperation[] = [],
  characterLevel = Math.max(1, getTotalLevel(character.classes)),
  originFeatState?: RuleOriginFeatChoiceState,
): AdjustmentOperation[] => {
  if (!choices?.featId) return [];
  let selectedFeatId = choices.featId;
  if (originFeatState) {
    const selected = originFeatState.options.find(item => (
      item.key === choices.featId || `${item.key}|${item.source}` === choices.featId
    ));
    if (!selected) return [];
    const result = createRuleOriginFeatEffects(
      originFeatState,
      [`${selected.key}|${selected.source}`],
    );
    if (!result.ok) return [];
    const effect = result.value.find(item => item.type === 'feat.add');
    if (!effect || effect.type !== 'feat.add') return [];
    selectedFeatId = effect.feat.id;
  }
  const feat = content.feats.find(item => (
    item.key === selectedFeatId || `${item.key}|${item.source}` === selectedFeatId
  ));
  if (!feat) return [];

  const abilitiesAfterPreviousOperations = ABILITY_OPTIONS.reduce<CharacterData['abilities']>((abilities, ability) => ({
    ...abilities,
    [ability]: abilities[ability] + getAbilityDeltaFromOperations(previousOperations, ability),
  }), { ...character.abilities });

  return [
    ...createFeatOperations([feat], ruleSystem, characterLevel),
    ...createSharedFeatOperations(
      content,
      ruleSystem,
      feat,
      {
        ...character,
        abilities: abilitiesAfterPreviousOperations,
      },
      choices,
      previousOperations,
    ),
    ...createFeatSpellOperations(content, ruleSystem, feat, choices, characterLevel),
    ...createSpecializedFeatOperations(
      content,
      character,
      ruleSystem,
      feat,
      choices,
      characterLevel,
    ),
  ];
};

export const getAutoBuilderFeatChoiceGroups = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  feat: AutoBuilderFeat,
  character: CharacterData,
  selectedSkillChoices?: AutoBuilderSkillChoiceSelection,
): RuleFeatChoiceGroups => {
  const result = createRuleFeatChoiceGroups(content, ruleSystem, feat, {
    proficientSkills: [...character.proficiencies],
    selectedSkills: Object.values(selectedSkillChoices ?? {}).flat(),
  });
  if (result.ok) return result.value;
  const first = result.issues[0];
  throw new Error(
    `Unsupported feat choice shape at ${first?.path.join('.') || feat.key}: `
    + `${first?.detail?.reason || first?.code || 'unknown'}`,
  );
};

const createSharedFeatOperations = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  feat: AutoBuilderFeat,
  character: CharacterData,
  choices?: AutoBuilderFeatChoice,
  previousOperations: AdjustmentOperation[] = [],
): AdjustmentOperation[] => {
  const state = getAutoBuilderFeatChoiceGroups(
    content,
    ruleSystem,
    feat,
    character,
    choices?.featSkillChoices,
  );
  const selections: Record<string, string[]> = {};
  for (const choiceMap of [
    choices?.featSkillChoices,
    choices?.featToolChoices,
    choices?.featWeaponChoices,
    choices?.featResistanceChoices,
    choices?.featExpertiseChoices,
    choices?.featLanguageChoices,
    choices?.featSavingThrowChoices,
  ]) {
    for (const [groupId, selected] of Object.entries(choiceMap ?? {})) {
      selections[groupId] = [...selected];
    }
  }
  const abilityGroup = state.ability[0];
  if (abilityGroup && choices?.featAbility) {
    selections[abilityGroup.id] = [choices.featAbility];
  }
  const proficiencies = new Set(character.proficiencies);
  for (const operation of previousOperations) {
    if (operation.type === 'addProficiency') proficiencies.add(operation.key);
    if (operation.type === 'removeProficiency') proficiencies.delete(operation.key);
  }
  const result = createRuleFeatEffects(
    content,
    ruleSystem,
    feat,
    {
      abilities: character.abilities,
      proficiencies: [...proficiencies],
    },
    {
      choices: selections,
      allowIncompleteChoices: true,
    },
  );
  if (result.ok) {
    const operations = result.value.flatMap(originEffectToAdjustmentOperations);
    const selectedResistances = Array.from(new Set(
      state.resistance.flatMap(group => selections[group.id] ?? []),
    ));
    if (selectedResistances.length > 0) {
      const sourceId = `auto-feat-${feat.key}-${feat.source}-choice-resistances`;
      operations.push({
        type: 'addFeature',
        feature: {
          id: `${sourceId}-feature`,
          sourceId,
          sourceName: `${feat.name} ${feat.source}`,
          name: '伤害抗性',
          level: 1,
          ruleSystem,
          description: `你获得对 ${selectedResistances.join(', ')} 伤害的抗性.`,
        },
      });
    }
    return operations;
  }
  const first = result.issues[0];
  throw new Error(
    `Invalid feat effects at ${first?.path.join('.') || feat.key}: `
    + `${first?.detail?.reason || first?.code || 'unknown'}`,
  );
};

const createWeaponMasteryOperations = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  character: CharacterData,
  ruleSystem: RuleSystem,
  oldClassLevel: number,
  newClassLevel: number,
  weaponIds: string[] | undefined,
): AdjustmentOperation[] => {
  const state = createRuleWeaponMasteryAdvancementState(
    getAutoBuilderRuleContext(content, ruleSystem),
    cls,
    oldClassLevel,
    newClassLevel,
    [...getExistingWeaponMasteryIds(character)],
  );
  if (!state.ok) throwRuleResultError(state, cls.key);
  const effects = createRuleWeaponMasteryAdvancementEffects(
    state.value,
    state.value.group ? weaponIds ?? [] : [],
  );
  if (!effects.ok) throwRuleResultError(effects, cls.key);
  return effects.value.flatMap((effect): AdjustmentOperation[] => {
    if (effect.type !== 'feature.add') return originEffectToAdjustmentOperations(effect);
    const weapon = content.weapons.find(item => item.id === effect.feature.id);
    if (!weapon) throw new Error(`Missing weapon mastery option ${effect.feature.id}`);
    const mastery = formatWeaponMasteryNames(weapon);
    const masteryDescriptions = (weapon.mastery || [])
      .map(ref => {
        const [name, source = 'XPHB'] = ref.split('|');
        const definition = content.weaponMasteries.find(item => item.name === name && item.source === source);
        return definition?.description ? `${definition.name}: ${definition.description}` : '';
      })
      .filter(Boolean);
    return [{
      type: 'addFeature',
      feature: {
        id: `${effect.sourceId}-feature`,
        sourceId: effect.sourceId,
        sourceName: `${cls.name} 武器精通`,
        name: `武器精通: ${weapon.name}`,
        level: 1,
        ruleSystem,
        description: mastery
          ? [
              `你可以运用 ${weapon.name} 的 ${mastery} 武器精通词条.`,
              ...masteryDescriptions,
            ].join('\n')
          : `你选择 ${weapon.name} 作为武器精通武器.`,
      } satisfies CharacterFeatureEntry,
    }];
  });
};

const createFightingStyleFeatureOperations = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  character: CharacterData,
  ruleSystem: RuleSystem,
  oldClassLevel: number,
  newClassLevel: number,
  styleId?: string,
  subclass?: AutoBuilderSubclass,
): AdjustmentOperation[] => {
  const knownIds = content.fightingStyles
    .filter(style => character.featureEntries.some(feature => (
      feature.sourceId === `auto-fighting-style-${style.id}`
      || feature.name === style.name
    )))
    .map(({ id }) => id);
  const state = createRuleFightingStyleAdvancementState(
    getAutoBuilderRuleContext(content, ruleSystem),
    cls,
    oldClassLevel,
    newClassLevel,
    knownIds,
    subclass,
  );
  if (!state.ok) throwRuleResultError(state, cls.key);
  if (state.value.mode === 'feat') return [];
  const effects = createRuleFightingStyleAdvancementEffects(
    state.value,
    state.value.group && styleId ? [styleId] : [],
  );
  if (!effects.ok) throwRuleResultError(effects, cls.key);
  return effects.value.flatMap((effect): AdjustmentOperation[] => {
    if (effect.type !== 'feature.add') return originEffectToAdjustmentOperations(effect);
    const style = content.fightingStyles.find(item => item.id === effect.feature.id);
    if (!style) throw new Error(`Missing fighting style ${effect.feature.id}`);
    return [{
    type: 'addFeature',
    feature: {
      id: `${effect.sourceId}-feature`,
      sourceId: effect.sourceId,
      sourceName: `${cls.name} 战斗风格`,
      name: style.name,
      level: 1,
      ruleSystem,
      description: style.description,
    } satisfies CharacterFeatureEntry,
    }];
  });
};

const validateFightingStyleFeatChoice = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  character: CharacterData,
  ruleSystem: RuleSystem,
  oldClassLevel: number,
  newClassLevel: number,
  choice?: AutoBuilderFeatChoice,
): void => {
  if (ruleSystem !== '5r') return;
  const knownIds = character.featureEntries
    .filter(feature => feature.sourceId.startsWith('auto-feat-'))
    .flatMap(feature => {
      const parsed = parseRuleEntitySourceId('feat', feature.sourceId);
      return parsed ? [parsed.id] : [];
    });
  const state = createRuleFightingStyleAdvancementState(
    getAutoBuilderRuleContext(content, ruleSystem),
    cls,
    oldClassLevel,
    newClassLevel,
    knownIds,
  );
  if (!state.ok) throwRuleResultError(state, cls.key);
  if (state.value.mode !== 'feat') return;
  const selected = state.value.group?.options.find((feat) => (
    feat.id === choice?.featId
    || feat.key === choice?.featId
    || `${feat.key}|${feat.source}` === choice?.featId
  ));
  const effects = createRuleFightingStyleAdvancementEffects(
    state.value,
    state.value.group && selected ? [selected.id] : [],
  );
  if (!effects.ok) throwRuleResultError(effects, cls.key);
};

const createMetamagicOperations = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  character: CharacterData,
  ruleSystem: RuleSystem,
  oldClassLevel: number,
  newClassLevel: number,
  metamagicIds: string[] | undefined,
): AdjustmentOperation[] => {
  if (!cls.metamagicProgression?.length) return [];
  const state = createRuleMetamagicAdvancementState(
    getAutoBuilderRuleContext(content, ruleSystem),
    cls,
    oldClassLevel,
    newClassLevel,
    getExistingOptionalFeatureIds(content, character, 'metamagic'),
    getExistingMetamagicExtraTarget(content, character),
  );
  if (!state.ok) throwRuleResultError(state, cls.key);
  const effects = createRuleOptionalFeatureAdvancementEffects(
    state.value,
    state.value.group ? metamagicIds ?? [] : [],
  );
  if (!effects.ok) throwRuleResultError(effects, cls.key);
  return effects.value.flatMap((effect, index): AdjustmentOperation[] => {
    if (effect.type !== 'feature.add') return originEffectToAdjustmentOperations(effect);
    const metamagic = content.metamagics.find(item => item.id === effect.feature.id);
    if (!metamagic) throw new Error(`Missing metamagic ${effect.feature.id}`);
    return [{
      type: 'addFeature',
      feature: {
        id: `${effect.sourceId}-feature-${index + 1}`,
        sourceId: effect.sourceId,
        sourceName: `${metamagic.name} ${metamagic.source}`,
        name: metamagic.name,
        level: newClassLevel,
        ruleSystem,
        description: metamagic.description,
      } satisfies CharacterFeatureEntry,
    }];
  });
};

const createManeuverOperations = (
  content: AutoBuilderContent,
  subclass: AutoBuilderSubclass | undefined,
  character: CharacterData,
  ruleSystem: RuleSystem,
  oldClassLevel: number,
  newClassLevel: number,
  extraTargetCount: number,
  maneuverIds: string[] | undefined,
): AdjustmentOperation[] => {
  if (!subclass?.maneuverProgression?.length && extraTargetCount <= 0) return [];
  const state = createRuleManeuverAdvancementState(
    getAutoBuilderRuleContext(content, ruleSystem),
    subclass,
    oldClassLevel,
    newClassLevel,
    getExistingOptionalFeatureIds(content, character, 'maneuver'),
    getExistingManeuverExtraTarget(content, character) + extraTargetCount,
  );
  if (!state.ok) throwRuleResultError(state, subclass?.key ?? 'maneuver');
  const effects = createRuleOptionalFeatureAdvancementEffects(
    state.value,
    state.value.group ? maneuverIds ?? [] : [],
  );
  if (!effects.ok) throwRuleResultError(effects, subclass?.key ?? 'maneuver');
  return effects.value.flatMap((effect, index): AdjustmentOperation[] => {
    if (effect.type !== 'feature.add') return originEffectToAdjustmentOperations(effect);
    const maneuver = content.maneuvers.find(item => item.id === effect.feature.id);
    if (!maneuver) throw new Error(`Missing maneuver ${effect.feature.id}`);
    return [{
      type: 'addFeature',
      feature: {
        id: `${effect.sourceId}-feature-${index + 1}`,
        sourceId: effect.sourceId,
        sourceName: `${maneuver.name} ${maneuver.source}`,
        name: maneuver.name,
        level: newClassLevel,
        ruleSystem,
        description: maneuver.description,
      } satisfies CharacterFeatureEntry,
    }];
  });
};

const getSelectedFightingStyleManeuverCount = (
  content: AutoBuilderContent,
  choices: AutoBuilderClassFeatureChoice | undefined,
): number => {
  const style = content.fightingStyles.find(({ id }) => (
    id === choices?.fightingStyleFeatureId
  ));
  return style?.key === 'Superior Technique' ? 1 : 0;
};

const createSpecializedFeatOperations = (
  content: AutoBuilderContent,
  character: CharacterData,
  ruleSystem: RuleSystem,
  feat: AutoBuilderFeat,
  choice: AutoBuilderFeatChoice,
  characterLevel: number,
): AdjustmentOperation[] => {
  const selections: Record<string, string[]> = {};
  const setSelection = (
    kind: 'fightingStyle' | 'invocation' | 'maneuver' | 'metamagic',
    ids: string[] | undefined,
  ) => {
    if (ids?.length) selections[`feat-${feat.key}-${feat.source}-${kind}`] = ids;
  };
  setSelection(
    'fightingStyle',
    choice.featFightingStyleFeatureId ? [choice.featFightingStyleFeatureId] : undefined,
  );
  setSelection('invocation', choice.featInvocations);
  setSelection('maneuver', choice.featManeuvers);
  setSelection('metamagic', choice.featMetamagics);
  const result = createRuleSpecializedFeatEffects(
    content,
    ruleSystem,
    feat,
    getSpecializedFeatContext(
      content,
      character,
      choice.featInvocations,
    ),
    selections,
  );
  if (!result.ok) {
    if (result.issues.every(({ code }) => code === 'choice_required')) return [];
    const first = result.issues[0];
    throw new Error(
      `Invalid specialized feat choice at ${first?.path.join('.') || feat.key}: `
      + `${first?.detail?.reason || first?.code || 'unknown'}`,
    );
  }
  return result.value.flatMap((effect, index): AdjustmentOperation[] => {
    if (effect.type !== 'feature.add') {
      throw new Error(`Unsupported specialized feat effect adapter: ${effect.type}`);
    }
    const feature = [
      ...content.fightingStyles,
      ...content.invocations,
      ...content.maneuvers,
      ...content.metamagics,
    ].find(({ id }) => id === effect.feature.id);
    if (!feature) throw new Error(`Specialized feat feature is missing from catalog: ${effect.feature.id}`);
    const kind = content.fightingStyles.some(({ id }) => id === feature.id)
      ? 'fighting-style'
      : content.invocations.some(({ id }) => id === feature.id)
        ? 'invocation'
        : content.maneuvers.some(({ id }) => id === feature.id)
          ? 'maneuver'
          : 'metamagic';
    const sourceId = kind === 'invocation'
      ? `auto-invocation-${feature.key}-${feature.source}`
      : `auto-${kind}-${feature.id}`;
    return [{
      type: 'addFeature',
      feature: {
        id: `${sourceId}-feature-${characterLevel}-${index + 1}`,
        sourceId,
        sourceName: `${feature.name} ${feature.source}`,
        name: feature.name,
        level: characterLevel,
        ruleSystem,
        description: feature.description,
      },
    }];
  });
};

const createFeatOperations = (
  feats: AutoBuilderFeat[],
  ruleSystem: RuleSystem,
  characterLevel = 1,
): AdjustmentOperation[] => {
  return feats.flatMap(feat => {
    const featOperations = [
      ...createRuleFeatFixedEffects(
        feat,
        ruleSystem,
        characterLevel,
      ).flatMap(originEffectToAdjustmentOperations),
      ...createFeatEffectPresentationOperations(feat, ruleSystem),
    ];
    return [
      ...feat.features.map((feature, index) => ({
        type: 'addFeature',
        feature: {
          id: `auto-feat-${feat.key}-${feat.source}-feature-${index + 1}`,
          sourceId: `auto-feat-${feat.key}-${feat.source}`,
          sourceName: `${feat.name} ${feat.source}`,
          name: feature.name,
          level: 1,
          ruleSystem,
          description: feature.description,
        } satisfies CharacterFeatureEntry,
      } satisfies AdjustmentOperation)),
      ...featOperations,
    ];
  });
};

const hasAppliedFeat = (
  character: CharacterData,
  key: string,
  source?: string,
): boolean => character.featureEntries.some(feature => (
  source
    ? feature.sourceId === `auto-feat-${key}-${source}`
    : feature.sourceId.startsWith(`auto-feat-${key}-`)
));

const hasAppliedRace = (
  character: CharacterData,
  key: string,
  source?: string,
): boolean => character.featureEntries.some(feature => (
  source
    ? feature.sourceId === `auto-race-${key}-${source}`
    : feature.sourceId.startsWith(`auto-race-${key}-`)
));

const createExistingOriginLevelUpOperations = (
  character: CharacterData,
  oldCharacterLevel: number,
  newCharacterLevel: number,
): AdjustmentOperation[] => {
  const levelDelta = Math.max(0, newCharacterLevel - oldCharacterLevel);
  if (levelDelta <= 0) return [];
  const operations: AdjustmentOperation[] = [];
  const ruleSystem = character.automation.ruleSystem || '5e';
  const refreshOriginResources = (
    key: string,
    name: string,
    source: string,
    features: NonNullable<AutoBuilderOrigin['features']>,
  ) => {
    if (!hasAppliedRace(character, key, source)) return;
    const resourcePrefix = `auto-resource-race-${key}-${source}-`;
    const resourceNotes = Object.fromEntries(character.resources
      .filter(resource => resource.sourceId.startsWith(resourcePrefix))
      .map(resource => [resource.sourceId.slice(resourcePrefix.length), resource.note]));
    operations.push(...createSharedOriginResourceOperations(
      { key, name, source, features },
      'race',
      ruleSystem,
      newCharacterLevel,
      undefined,
      resourceNotes,
    ));
  };
  for (const [key, source] of [
    ['Dwarf', 'XPHB'],
    ['Verdan', 'AI'],
    ['Harengon', 'MPMM'],
    ['Harengon', 'WBtW'],
  ] as const) {
    if (!hasAppliedRace(character, key, source)) continue;
    operations.push(...createRuleOriginAdvancementEffects(
      { key, source },
      oldCharacterLevel,
      newCharacterLevel,
    ).flatMap(originEffectToAdjustmentOperations));
  }
  refreshOriginResources('Dwarf', '矮人', 'XPHB', [{ name: '石中精妙', englishName: 'Stonecunning', description: '' }]);
  refreshOriginResources('Orc', '兽人', 'XPHB', []);
  refreshOriginResources('Orc', '兽人', 'MPMM', []);
  refreshOriginResources('Aasimar', '阿斯莫', 'MPMM', [{ name: '天界启示', englishName: 'Celestial Revelation', description: '' }]);
  refreshOriginResources('Aasimar', '阿斯莫', 'XPHB', [{ name: '天界启示', englishName: 'Celestial Revelation', description: '' }]);
  refreshOriginResources('Astral Elf', '星界精灵', 'AAG', [{ name: '星光步', englishName: 'Starlight Step', description: '' }]);
  refreshOriginResources('Harengon', '兔人', 'MPMM', [{ name: '兔子跳跃', englishName: 'Rabbit Hop', description: '' }]);
  refreshOriginResources('Harengon', '兔人', 'WBtW', [{ name: '兔子跳跃', englishName: 'Rabbit Hop', description: '' }]);
  refreshOriginResources('Kender', '坎德人', 'DSotDQ', [{ name: '嘲讽', englishName: 'Taunt', description: '' }]);
  refreshOriginResources('Kenku', '天狗', 'MPMM', [{ name: '天狗回想', englishName: 'Kenku Recall', description: '' }]);
  refreshOriginResources('Lupin', '人狼裔', 'RHW', [{ name: '尖啸', englishName: 'Howl', description: '' }]);
  refreshOriginResources('Kobold', '狗头人', 'MPMM', [{ name: '龙吼', englishName: 'Draconic Cry', description: '' }]);
  refreshOriginResources('Reborn', '重生者', 'RHW', [{ name: '往昔学识', englishName: 'Knowledge from a Past Life', description: '' }]);
  refreshOriginResources('Reborn', '重生者', 'VRGR', [{ name: '往昔学识', englishName: 'Knowledge from a Past Life', description: '' }]);
  refreshOriginResources('Shadar-Kai', '影灵', 'MPMM', [{ name: '鸦后祝福', englishName: 'Blessing of the Raven Queen', description: '' }]);
  refreshOriginResources('Eladrin', '雅灵', 'MPMM', [{ name: '妖精步伐', englishName: 'Fey Step', description: '' }]);
  refreshOriginResources('Firbolg', '费尔伯格人', 'MPMM', [{ name: '神隐步', englishName: 'Hidden Step', description: '' }]);
  refreshOriginResources('Lizardfolk', '蜥蜴人', 'MPMM', [{ name: '饥渴之喉', englishName: 'Hungry Jaws', description: '' }]);
  refreshOriginResources('Dhampir', '半血裔', 'RHW', [{ name: '吸血啃咬', englishName: 'Vampiric Bite', description: '' }]);
  refreshOriginResources('Dhampir', '半血裔', 'VRGR', [{ name: '吸血啃咬', englishName: 'Vampiric Bite', description: '' }]);
  refreshOriginResources('Deep Gnome', '地底侏儒', 'MPMM', [{ name: '斯涅布力伪装', englishName: 'Svirfneblin Camouflage', description: '' }]);
  refreshOriginResources('Autognome', '自动侏儒', 'AAG', [{ name: '铸订成功', englishName: 'Built for Success', description: '' }]);
  refreshOriginResources('Hadozee', '哈多兹', 'AAG', [{ name: '哈多兹闪避', englishName: 'Hadozee Dodge', description: '' }]);
  refreshOriginResources('Giff', '诘弗人', 'AAG', [{ name: '星界火花', englishName: 'Astral Spark', description: '' }]);
  refreshOriginResources('Shifter', '化兽者', 'EFA', [{ name: '化形', englishName: 'Shifting', description: '' }]);
  refreshOriginResources('Shifter', '化兽者', 'MPMM', [{ name: '化形', englishName: 'Shifting', description: '' }]);
  refreshOriginResources('Goblin', '地精', 'MPMM', [{ name: '小个子的怒火', englishName: 'Fury of the Small', description: '' }]);
  refreshOriginResources('Hobgoblin', '大地精', 'MPMM', [{ name: '精类赠礼', englishName: 'Fey Gift', description: '' }]);
  refreshOriginResources('Hobgoblin', '大地精', 'MPMM', [{ name: '集众之运', englishName: 'Fortune from the Many', description: '' }]);
  refreshOriginResources('Goliath', '歌利亚', 'MPMM', [{ name: '石之坚韧', englishName: "Stone's Endurance", description: '' }]);
  refreshOriginResources('Goliath', '歌利亚', 'XPHB', [
    { name: '巨人先祖', englishName: 'Giant Ancestry', description: '' },
    { name: '大型形态', englishName: 'Large Form', description: '' },
  ]);
  refreshOriginResources('Dragonborn', '龙裔', 'XPHB', [
    { name: '吐息武器', englishName: 'Breath Weapon', description: '' },
    { name: '龙族飞翼', englishName: 'Draconic Flight', description: '' },
  ]);
  refreshOriginResources('Dragonborn (Chromatic)', '龙裔 (色彩)', 'FTD', [
    { name: '吐息武器', englishName: 'Breath Weapon', description: '' },
    { name: '色彩守护', englishName: 'Chromatic Warding', description: '' },
  ]);
  refreshOriginResources('Dragonborn (Gem)', '龙裔 (宝石)', 'FTD', [
    { name: '吐息武器', englishName: 'Breath Weapon', description: '' },
    { name: '宝石之翼', englishName: 'Gem Flight', description: '' },
  ]);
  refreshOriginResources('Dragonborn (Metallic)', '龙裔 (金属)', 'FTD', [
    { name: '吐息武器', englishName: 'Breath Weapon', description: '' },
    { name: '金属吐息武器', englishName: 'Metallic Breath Weapon', description: '' },
  ]);
  return operations;
};

const createExistingFeatLevelUpOperations = (
  content: AutoBuilderContent,
  character: CharacterData,
  oldCharacterLevel: number,
  newCharacterLevel: number,
): AdjustmentOperation[] => {
  const ruleSystem = character.automation.ruleSystem || '5e';
  const appliedFeats = content.feats.filter(feat => (
    hasAppliedFeat(character, feat.key, feat.source)
  ));
  return createRuleFeatAdvancementEffects(
    appliedFeats,
    ruleSystem,
    oldCharacterLevel,
    newCharacterLevel,
  ).flatMap(originEffectToAdjustmentOperations);
};

const createAbilityScoreImprovementOperations = (
  content: AutoBuilderContent,
  character: CharacterData,
  ruleSystem: RuleSystem,
  choice?: AutoBuilderAbilityScoreImprovementChoice,
  characterLevel = Math.max(1, getTotalLevel(character.classes)),
): AdjustmentOperation[] => {
  if (!choice) return [];

  if (choice.mode === 'plus2' && choice.plus2) {
    const delta = Math.min(2, Math.max(0, 20 - character.abilities[choice.plus2]));
    return delta > 0 ? [{ type: 'addNumber', path: `abilities.${choice.plus2}`, value: delta }] : [];
  }

  if (choice.mode === 'plus1plus1' && choice.plus1a && choice.plus1b && choice.plus1a !== choice.plus1b) {
    return [choice.plus1a, choice.plus1b].flatMap(ability => {
      const delta = Math.min(1, Math.max(0, 20 - character.abilities[ability]));
      return delta > 0 ? [{ type: 'addNumber', path: `abilities.${ability}`, value: delta } satisfies AdjustmentOperation] : [];
    });
  }

  if (choice.mode === 'feat' && choice.featId) {
    const feat = content.feats.find(item => item.key === choice.featId || `${item.key}|${item.source}` === choice.featId);
    return feat ? [
      ...createFeatOperations([feat], ruleSystem, characterLevel),
      ...createSharedFeatOperations(content, ruleSystem, feat, character, choice),
      ...createFeatSpellOperations(content, ruleSystem, feat, choice, characterLevel),
      ...createSpecializedFeatOperations(
        content,
        character,
        ruleSystem,
        feat,
        choice,
        characterLevel,
      ),
    ] : [];
  }

  return [];
};

const createProficiencyOperations = (cls: AutoBuilderClass): AdjustmentOperation[] => {
  const operations: AdjustmentOperation[] = [];
  for (const save of cls.savingThrows || []) {
    const ability = ABILITY_MAP[save];
    if (ability) operations.push({ type: 'addProficiency', key: ability });
  }

  operations.push(...createClassTaggedProficiencyOperations(cls.startingProficiencies?.armor, 'armor'));
  operations.push(...createClassTaggedProficiencyOperations(cls.startingProficiencies?.weapons, 'weapon'));
  if (!cls.startingProficiencies?.toolProficiencies?.length) {
    for (const tool of cls.startingProficiencies?.tools || []) {
      operations.push({ type: 'addProficiency', key: `tool:${tool}` });
    }
  }
  operations.push(...createFixedProficiencyOperations(cls.startingProficiencies?.toolProficiencies, 'tool'));

  return operations;
};

const getSkillChoiceOptionsFromProficiencies = (
  proficiencies?: { skills?: Array<{ choose?: { from?: string[]; count?: number } }> },
  sourceId = 'class-unknown',
): { from: string[]; count: number } | null => {
  const group = requireRuleChoiceGroups(
    parseRuleClassSkillChoiceGroups(proficiencies, sourceId),
  )[0];
  return group ? { count: group.count, from: group.from } : null;
};

export const getSkillChoiceOptions = (cls: AutoBuilderClass): { from: string[]; count: number } | null => (
  getSkillChoiceOptionsFromProficiencies(
    cls.startingProficiencies,
    `class-${cls.key}-${cls.source}`,
  )
);

export const getMulticlassSkillChoiceOptions = (cls: AutoBuilderClass): { from: string[]; count: number } | null => (
  getSkillChoiceOptionsFromProficiencies(
    cls.multiclassProficiencies,
    `multiclass-${cls.key}-${cls.source}`,
  )
);

const createMulticlassProficiencyOperations = (
  cls: AutoBuilderClass,
  skillChoices: string[],
  toolChoices?: AutoBuilderToolChoiceSelection,
): AdjustmentOperation[] => {
  const operations: AdjustmentOperation[] = [];
  operations.push(...createClassTaggedProficiencyOperations(cls.multiclassProficiencies?.armor, 'armor'));
  operations.push(...createClassTaggedProficiencyOperations(cls.multiclassProficiencies?.weapons, 'weapon'));
  if (!cls.multiclassProficiencies?.toolProficiencies?.length) {
    for (const tool of cls.multiclassProficiencies?.tools || []) {
      operations.push({ type: 'addProficiency', key: `tool:${tool}` });
    }
  }
  operations.push(...createFixedProficiencyOperations(cls.multiclassProficiencies?.toolProficiencies, 'tool'));
  operations.push(...createToolChoiceOperations(toolChoices));
  for (const skill of skillChoices) {
    operations.push({ type: 'addProficiency', key: skill });
  }
  return operations;
};

export const buildLevelOneCharacter = (
  character: CharacterData,
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  options: {
    ruleSystem: RuleSystem;
    race: AutoBuilderOrigin;
    subrace?: AutoBuilderOrigin;
    raceChoices?: AutoBuilderRaceChoice;
    background: AutoBuilderOrigin;
    subclass?: AutoBuilderSubclass;
    decoupleOriginFromBackground?: boolean;
    originFeatChoice?: AutoBuilderFeatChoice;
    classFeatureChoices?: AutoBuilderClassFeatureChoice;
    backgroundAbilityChoice?: AutoBuilderAbilityChoice;
    backgroundToolChoices?: AutoBuilderToolChoiceSelection;
    backgroundLanguageChoices?: AutoBuilderLanguageChoiceSelection;
    classToolChoices?: AutoBuilderToolChoiceSelection;
    skillChoices: string[];
    spellChoices: AutoBuilderSpellChoice;
    invocationChoices?: AutoBuilderInvocationChoice;
  },
): CharacterData => {
  validateFightingStyleFeatChoice(
    content,
    cls,
    character,
    options.ruleSystem,
    0,
    1,
    options.classFeatureChoices?.fightingStyle,
  );
  const mainClassId = createRuleClassInstanceId(cls);
  const classes = [{ id: mainClassId, name: cls.key, level: 1, subclass: options.subclass?.name || '', source: cls.source }];
  const spellcastingProfile = createSpellcastingProfile(content, cls, options.spellChoices, 1, options.subclass, mainClassId);
  const classFeatureSpellcasting = addClassFeatureSpellsToSpellcasting(
    {
      profiles: spellcastingProfile ? [spellcastingProfile] : [],
      legacy: spellcastingProfile
        ? {
            class: spellcastingProfile.className,
            ability: spellcastingProfile.ability,
            saveDCOverride: '',
            attackBonusOverride: '',
            slots: spellcastingProfile.slots,
            spells: spellcastingProfile.spells,
          }
        : {
            class: '',
            ability: 'INT' as const,
            saveDCOverride: '',
            attackBonusOverride: '',
            slots: createEmptySpellSlots(),
            spells: [],
          },
    },
    content,
    mainClassId,
    options.classFeatureChoices,
  );
  const spellcastingProfiles = applySharedSpellSlotsToProfiles(content, classes, classFeatureSpellcasting.profiles);
  const backgroundFeats = options.decoupleOriginFromBackground ? [] : getBackgroundFeats(content, options.background);
  const skillOperations: AdjustmentOperation[] = options.skillChoices.map(skill => ({
    type: 'addProficiency',
    key: skill,
  }));
  const nextSpellcasting = getPrimaryLegacySpellcasting(spellcastingProfiles, classFeatureSpellcasting.legacy);
  const baseOperations: AdjustmentOperation[] = [
    {
      type: 'setStringField',
      field: 'race',
      value: options.subrace ? `${options.race.name} (${options.subrace.name})` : options.race.name,
    },
    {
      type: 'setStringField',
      field: 'subrace',
      value: options.subrace?.name || '',
    },
    {
      type: 'setStringField',
      field: 'background',
      value: options.background.name,
    },
    {
      type: 'setClasses',
      value: classes,
    },
    {
      type: 'setAutomation',
      value: {
        ruleSystem: options.ruleSystem,
        officialExtensionsEnabled: true,
        active: true,
        originDecoupled: Boolean(options.decoupleOriginFromBackground),
      },
    },
    {
      type: 'setSpellcastingProfiles',
      value: spellcastingProfiles,
    },
    {
      type: 'setSpellcasting',
      value: nextSpellcasting,
    },
    ...createOriginOperations(content, options.race, 'race', options.ruleSystem, undefined, undefined, 1, options.raceChoices?.featureChoices, options.raceChoices),
    ...(options.subrace ? createOriginOperations(content, options.subrace, 'race', options.ruleSystem, undefined, undefined, 1, options.raceChoices?.featureChoices, options.raceChoices) : []),
    ...createRaceChoiceOperations(
      content,
      character,
      options.race,
      options.ruleSystem,
      options.raceChoices,
      options.subrace,
    ),
    ...(options.decoupleOriginFromBackground
      ? [
          ...createOriginProficiencyOperations(options.background, options.backgroundToolChoices),
          ...createAbilityOperations(options.background, options.backgroundAbilityChoice, false),
        ]
      : createOriginOperations(
          content,
          options.background,
          'background',
          options.ruleSystem,
          options.backgroundAbilityChoice,
          options.backgroundToolChoices,
          1,
          undefined,
          undefined,
          options.backgroundLanguageChoices,
        )
    ),
    ...(options.decoupleOriginFromBackground
      ? createLanguageChoiceOperations(options.backgroundLanguageChoices)
      : []),
    ...createFeatOperations(backgroundFeats, options.ruleSystem, 1),
    ...backgroundFeats.flatMap(feat => createSharedFeatOperations(
      content,
      options.ruleSystem,
      feat,
      character,
    )),
    ...createChosenFeatOperations(
      content,
      character,
      options.ruleSystem,
      options.originFeatChoice,
      [],
      1,
      options.decoupleOriginFromBackground
        ? getOriginFeatChoiceOptions(content, options.ruleSystem, character)?.ruleState
        : undefined,
    ),
    ...createChosenFeatOperations(content, character, options.ruleSystem, options.classFeatureChoices?.fightingStyle, [], 1),
    ...createFightingStyleFeatureOperations(
      content,
      cls,
      character,
      options.ruleSystem,
      0,
      1,
      options.classFeatureChoices?.fightingStyleFeatureId,
    ),
    ...createMetamagicOperations(
      content,
      cls,
      character,
      options.ruleSystem,
      0,
      1,
      options.classFeatureChoices?.metamagics,
    ),
    ...createManeuverOperations(
      content,
      options.subclass,
      character,
      options.ruleSystem,
      0,
      1,
      getSelectedFightingStyleManeuverCount(content, options.classFeatureChoices),
      options.classFeatureChoices?.maneuvers,
    ),
    ...createExpertiseChoiceOperations(
      content,
      cls,
      character,
      0,
      1,
      [
        ...options.skillChoices,
        ...getClassFixedToolProficiencies(cls),
        ...Object.values(options.classToolChoices ?? {}).flat(),
      ],
      options.classFeatureChoices?.expertise,
    ),
    ...createWeaponMasteryOperations(
      content,
      cls,
      character,
      options.ruleSystem,
      0,
      1,
      options.classFeatureChoices?.weaponMasteries,
    ),
    ...createClassFeatureOperations(cls, options.ruleSystem),
    ...createSubclassFeatureOperations(
      content,
      cls,
      options.subclass,
      options.ruleSystem,
      0,
      1,
    ),
    ...createInvocationOperations(
      content,
      cls,
      character,
      options.invocationChoices,
      options.ruleSystem,
      0,
      1,
      [...options.spellChoices.cantrips, ...options.spellChoices.leveled],
    ),
    ...createProficiencyOperations(cls),
    ...createToolChoiceOperations(options.classToolChoices),
    ...skillOperations,
  ];
  const classResourceOperations = createClassResourceOperations(
    cls,
    options.ruleSystem,
    1,
    characterWithAbilityDeltas(
      character,
      baseOperations,
      classes,
    ),
    1,
  );
  const conScore = character.abilities.CON + getAbilityDeltaFromOperations(baseOperations, 'CON');
  const levelOneHp = Math.max(1, getClassHitDie(content, cls) + calculateModifier(conScore));
  const operations: AdjustmentOperation[] = [
    ...baseOperations,
    ...classResourceOperations,
    { type: 'set', path: 'hpMaxOverride', value: null },
    { type: 'set', path: 'hpCurrent', value: levelOneHp },
    { type: 'set', path: 'hitDiceTotal', value: `1d${getClassHitDie(content, cls)}` },
    { type: 'set', path: 'hitDiceUsed', value: '0' },
  ];
  const adjusted = applyCharacterAdjustments(
    character,
    {
      id: `auto-character-${options.ruleSystem}`,
      sourceId: `auto-character-${options.ruleSystem}`,
      sourceName: `自动车卡 ${RULE_SOURCE[options.ruleSystem]}`,
      operations,
    },
  );

  return refreshCharacterAutomation(adjusted, content);
};

export const getClassLevel = (character: CharacterData, cls: AutoBuilderClass): number => {
  return character.classes.find(item => isCharacterClassForDefinition(item, cls))?.level || 0;
};

const getSpellcastingProfileForClass = (
  character: CharacterData,
  cls: AutoBuilderClass,
  classId?: string,
): SpellcastingProfile | undefined => {
  const profileId = `auto-${cls.key.toLowerCase()}-${cls.source.toLowerCase()}-spellcasting`;
  return character.spellcastingProfiles.find(profile => profile.id === profileId)
    || (classId ? character.spellcastingProfiles.find(profile => profile.classId === classId) : undefined)
    || character.spellcastingProfiles.find(profile => (
      !profile.classId && (profile.className === cls.name || profile.className === cls.key)
    ));
};

const updateSpellcastingForLevel = (
	  character: CharacterData,
	  content: AutoBuilderContent,
	  cls: AutoBuilderClass,
	  newLevel: number,
	  choices: AutoBuilderSpellChoice,
	  subclass?: AutoBuilderSubclass,
	  classId?: string,
	  replaceSpell?: { removeId: string; addId: string } | null,
	  magicalSecretChoices: string[] = [],
	): { profiles: SpellcastingProfile[]; legacy: CharacterData['spellcasting'] } => {
	  const existingProfile = getSpellcastingProfileForClass(character, cls, classId);
	  const nextProfile = projectRuleSpellcastingProfile(
	    content,
	    cls,
	    Math.max(0, newLevel - 1),
	    newLevel,
	    choices,
	    subclass,
	    classId,
	    existingProfile,
	    replaceSpell,
	    magicalSecretChoices,
	  );
	  if (!nextProfile) {
	    return { profiles: character.spellcastingProfiles, legacy: character.spellcasting };
	  }
	  const profiles = existingProfile
	    ? character.spellcastingProfiles.map(profile => profile.id === existingProfile.id ? nextProfile : profile)
	    : [...character.spellcastingProfiles, nextProfile];
	
	  return {
	    profiles,
	    legacy: {
	      class: nextProfile.className,
	      ability: nextProfile.ability,
	      saveDCOverride: nextProfile.saveDCOverride,
	      attackBonusOverride: nextProfile.attackBonusOverride,
	      slots: nextProfile.slots,
	      spells: nextProfile.spells,
    },
  };
};

export const buildLevelUpCharacter = (
	  character: CharacterData,
	  content: AutoBuilderContent,
	  cls: AutoBuilderClass,
	  options: {
	    ruleSystem: RuleSystem;
	    spellChoices: AutoBuilderSpellChoice;
	    skillChoices?: string[];
	    toolChoices?: AutoBuilderToolChoiceSelection;
	    abilityScoreImprovementChoice?: AutoBuilderAbilityScoreImprovementChoice;
	    existingFeatChoices?: AutoBuilderFeatChoice[];
	    existingOriginSpellChoices?: Record<string, AutoBuilderRaceChoice>;
	    classFeatureChoices?: AutoBuilderClassFeatureChoice;
	    subclass?: AutoBuilderSubclass;
	    invocationChoices?: AutoBuilderInvocationChoice;
	    replaceSpell?: { removeId: string; addId: string } | null;
	    magicalSecretChoices?: string[];
	  },
): CharacterData => {
  const currentLevel = getClassLevel(character, cls);
  const newLevel = currentLevel + 1;
  validateFightingStyleFeatChoice(
    content,
    cls,
    character,
    options.ruleSystem,
    currentLevel,
    newLevel,
    options.classFeatureChoices?.fightingStyle,
  );
  const existingClass = character.classes.find(item => isCharacterClassForDefinition(item, cls));
  const isNewClass = !existingClass;
  const newClassId = existingClass?.id || createRuleClassInstanceId(cls);
  const selectedSubclass = options.subclass || content.subclasses.find(subclass => (
    subclass.className === cls.name
    && subclass.classSource === cls.source
    && existingClass?.subclass
    && subclass.name === existingClass.subclass
  ));
  const classes = existingClass
    ? character.classes.map(item => (
        item.id === existingClass.id ? { ...item, name: cls.key, level: newLevel, subclass: item.subclass || options.subclass?.name || '', source: cls.source } : item
      ))
    : [...character.classes, { id: newClassId, name: cls.key, level: 1, subclass: options.subclass?.name || '', source: cls.source }];
  const oldTotalLevel = character.classes.reduce((total, item) => total + (item.level || 0), 0);
  const newTotalLevel = Math.max(1, classes.reduce((total, item) => total + (item.level || 0), 0));
	  const spellcasting = addClassFeatureSpellsToSpellcasting(
	    updateSpellcastingForLevel(
	      character,
	      content,
	      cls,
	      newLevel,
	      options.spellChoices,
	      selectedSubclass,
	      newClassId,
	      options.replaceSpell,
	      options.magicalSecretChoices,
	    ),
    content,
    newClassId,
    options.classFeatureChoices,
  );
	  const spellcastingProfiles = applySharedSpellSlotsToProfiles(content, classes, spellcasting.profiles);
	  const legacySpellcasting = getPrimaryLegacySpellcasting(spellcastingProfiles, spellcasting.legacy);

	  const operations = createClassFeatureOperations(cls, options.ruleSystem, newLevel);
  const classFeatureChoiceOperations = createChosenFeatOperations(
    content,
    character,
    options.ruleSystem,
    options.classFeatureChoices?.fightingStyle,
    operations,
    newTotalLevel,
  );
  const fightingStyleFeatureOperations = createFightingStyleFeatureOperations(
    content,
    cls,
    character,
    options.ruleSystem,
    currentLevel,
    newLevel,
    options.classFeatureChoices?.fightingStyleFeatureId,
    selectedSubclass,
  );
  const metamagicOperations = createMetamagicOperations(
    content,
    cls,
    character,
    options.ruleSystem,
    currentLevel,
    newLevel,
    options.classFeatureChoices?.metamagics,
  );
  const maneuverOperations = createManeuverOperations(
    content,
    selectedSubclass,
    character,
    options.ruleSystem,
    currentLevel,
    newLevel,
    getSelectedFightingStyleManeuverCount(content, options.classFeatureChoices),
    options.classFeatureChoices?.maneuvers,
  );
  const classExpertiseChoiceOperations = createExpertiseChoiceOperations(
    content,
    cls,
    character,
    currentLevel,
    newLevel,
    [
      ...(options.skillChoices ?? []),
      ...getClassFixedToolProficiencies(cls, isNewClass),
      ...Object.values(options.toolChoices ?? {}).flat(),
    ],
    options.classFeatureChoices?.expertise,
  );
  const classWeaponMasteryOperations = createWeaponMasteryOperations(
    content,
    cls,
    character,
    options.ruleSystem,
    currentLevel,
    newLevel,
    options.classFeatureChoices?.weaponMasteries,
  );
  const abilityScoreImprovementOperations = createAbilityScoreImprovementOperations(
    content,
    character,
    options.ruleSystem,
    options.abilityScoreImprovementChoice,
    newTotalLevel,
  );
  const existingFeatLevelUpOperations = createExistingFeatLevelUpOperations(
    content,
    character,
    oldTotalLevel,
    newTotalLevel,
  );
  const existingFeatSpellChoiceOperations = createExistingFeatSpellChoiceOperations(
    content,
    character,
    options.ruleSystem,
    oldTotalLevel,
    newTotalLevel,
    options.existingFeatChoices,
  );
  const existingOriginLevelUpOperations = createExistingOriginLevelUpOperations(
    character,
    oldTotalLevel,
    newTotalLevel,
  );
  const existingOriginSpellLevelUpOperations = createExistingOriginSpellLevelUpOperations(
    content,
    character,
    options.ruleSystem,
    oldTotalLevel,
    newTotalLevel,
    options.existingOriginSpellChoices,
  );
  const classResourceOperations = createClassResourceOperations(
    cls,
    options.ruleSystem,
    newLevel,
    characterWithAbilityDeltas(character, [...operations, ...abilityScoreImprovementOperations], classes),
    newTotalLevel,
  );
  const oldConModifier = calculateModifier(character.abilities.CON);
  const newConModifier = calculateModifier(
    character.abilities.CON + getAbilityDeltaFromOperations(abilityScoreImprovementOperations, 'CON'),
  );
  const hitDie = getClassHitDie(content, cls);
  const hpGain = getAverageHpGain(hitDie, newConModifier) + Math.max(0, newConModifier - oldConModifier) * oldTotalLevel;
  const snapshotOperations: AdjustmentOperation[] = [
    {
      type: 'setClasses',
      value: classes,
    },
    {
      type: 'set',
      path: 'hitDiceTotal',
      value: formatHitDiceTotal(classes, content),
    },
    {
      type: 'addNumber',
      path: 'hpCurrent',
      value: hpGain,
    },
    {
      type: 'setSpellcastingProfiles',
      value: spellcastingProfiles,
    },
    {
      type: 'setSpellcasting',
      value: legacySpellcasting,
    },
    {
      type: 'setAutomation',
      value: {
        ...character.automation,
        ruleSystem: options.ruleSystem,
        officialExtensionsEnabled: true,
        active: true,
      },
    },
  ];

  const leveledCharacter = applyCharacterAdjustments(
    character,
    {
      id: `auto-${cls.key}-${cls.source}-level-${newLevel}`,
      sourceId: `auto-${cls.key}-${cls.source}-level-${newLevel}`,
      sourceName: `${cls.name} ${newLevel}`,
	      operations: [
	        ...snapshotOperations,
	        ...operations,
	        ...classFeatureChoiceOperations,
	        ...fightingStyleFeatureOperations,
	        ...metamagicOperations,
	        ...maneuverOperations,
	        ...classExpertiseChoiceOperations,
	        ...classWeaponMasteryOperations,
	        ...abilityScoreImprovementOperations,
    ...existingFeatLevelUpOperations,
    ...existingFeatSpellChoiceOperations,
    ...existingOriginLevelUpOperations,
    ...existingOriginSpellLevelUpOperations,
	        ...classResourceOperations,
	        ...(isNewClass ? createMulticlassProficiencyOperations(cls, options.skillChoices || [], options.toolChoices) : []),
	        ...createSubclassFeatureOperations(
            content,
            cls,
            selectedSubclass,
            options.ruleSystem,
            currentLevel,
            newLevel,
            existingClass?.subclass || undefined,
          ),
	        ...createInvocationOperations(
            content,
            cls,
            character,
            options.invocationChoices,
            options.ruleSystem,
            currentLevel,
            newLevel,
            [...options.spellChoices.cantrips, ...options.spellChoices.leveled],
          ),
	      ],
	    },
	  );
	return refreshCharacterAutomation(leveledCharacter, content);
};
