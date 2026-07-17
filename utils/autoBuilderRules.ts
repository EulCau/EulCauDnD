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
  createRuleOriginBaseEffects,
  createRuleOriginAdvancementEffects,
  createRuleOriginFeatChoiceState,
  createRuleOriginFeatEffects,
  createRuleFeatChoiceGroups,
  createRuleFeatEffects,
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
  getRuleSubclassOptions,
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

type AutoBuilderFeatureOperationOptions = {
  ruleSystem: RuleSystem;
  level: number;
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

const OFFICIAL_SPELL_SOURCE_PRIORITY: Record<RuleSystem, string[]> = {
  '5e': ['PHB', 'XGE', 'TCE', 'FTD', 'SCC', 'AAG', 'AI', 'AitFR-AVT', 'BMT', 'EFA', 'EGW', 'FRHoF', 'GGR', 'IDRotF', 'LLK', 'SatO'],
  '5r': ['XPHB', 'PHB', 'XGE', 'TCE', 'FTD', 'SCC', 'AAG', 'AI', 'AitFR-AVT', 'BMT', 'EFA', 'EGW', 'FRHoF', 'GGR', 'IDRotF', 'LLK', 'SatO'],
};

const OFFICIAL_INVOCATION_SOURCE_PRIORITY: Record<RuleSystem, string[]> = {
  '5e': ['PHB', 'XGE', 'TCE'],
  '5r': ['XPHB', 'PHB', 'XGE', 'TCE'],
};

const OFFICIAL_METAMAGIC_SOURCE_PRIORITY: Record<RuleSystem, string[]> = {
  '5e': ['PHB', 'TCE'],
  '5r': ['XPHB', 'PHB', 'TCE'],
};

const OFFICIAL_MANEUVER_SOURCE_PRIORITY: Record<RuleSystem, string[]> = {
  '5e': ['PHB', 'TCE'],
  '5r': ['XPHB', 'PHB', 'TCE'],
};

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

const hasClassFeatureAtLevel = (
  cls: AutoBuilderClass | undefined,
  level: number,
  englishName: string,
  name: string,
): boolean => Boolean(cls?.levelFeatures.some(feature => (
  feature.level === level
  && (feature.englishName === englishName || feature.name === name)
)));

const getItemTypeCode = (item: { type?: string }): string => item.type?.split('|')[0] || '';
const getWeaponPropertyCode = (property: NonNullable<AutoBuilderWeapon['property']>[number]): string => (
  (typeof property === 'string' ? property : property.uid || '').split('|')[0]
);

const hasWeaponPropertyCode = (weapon: AutoBuilderWeapon, code: string): boolean => (
  weapon.property || []
).some(property => getWeaponPropertyCode(property) === code);

const getWeaponMasteryLimit = (cls: AutoBuilderClass | undefined, level: number): number => {
  if (!cls || cls.source !== 'XPHB') return 0;
  const tableValue = cls.weaponMasteryProgression?.[level - 1];
  if (typeof tableValue === 'number' && tableValue > 0) return tableValue;
  if (!hasClassFeatureAtLevel(cls, level, 'Weapon Mastery', '武器精通')) return 0;
  if (cls.key === 'Fighter' || cls.name === '战士') return 3;
  if (['Barbarian', 'Paladin', 'Ranger', 'Rogue'].includes(cls.key || '')) return 2;
  if (['野蛮人', '圣武士', '游侠', '游荡者'].includes(cls.name)) return 2;
  return 0;
};

const getExistingWeaponMasteryIds = (character: CharacterData): Set<string> => (
  new Set(character.featureEntries
    .filter(feature => feature.sourceId.startsWith('auto-weapon-mastery-'))
    .map(feature => feature.sourceId.replace(/^auto-weapon-mastery-/, '')))
);

const canClassMasterWeapon = (cls: AutoBuilderClass, weapon: AutoBuilderWeapon): boolean => {
  if (!weapon.mastery?.length) return false;
  if (!['simple', 'martial'].includes(weapon.weaponCategory || '')) return false;
  const isMelee = getItemTypeCode(weapon) === 'M';
  if (cls.key === 'Barbarian' || cls.name === '野蛮人') return isMelee;
  if (cls.key === 'Rogue' || cls.name === '游荡者') {
    return weapon.weaponCategory === 'simple'
      || (weapon.weaponCategory === 'martial' && (hasWeaponPropertyCode(weapon, 'F') || hasWeaponPropertyCode(weapon, 'L')));
  }
  return true;
};

export const getWeaponMasteryChoiceState = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass | undefined,
  character: CharacterData,
  level: number,
): { needed: number; options: AutoBuilderWeapon[] } | null => {
  if (!cls || cls.source !== 'XPHB') return null;
  const limit = getWeaponMasteryLimit(cls, level);
  if (!limit) return null;
  const knownIds = getExistingWeaponMasteryIds(character);
  const options = content.weapons
    .filter(weapon => weapon.source === 'XPHB')
    .filter(weapon => !knownIds.has(weapon.id))
    .filter(weapon => canClassMasterWeapon(cls, weapon))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
  const needed = Math.max(0, limit - knownIds.size);
  return needed > 0 ? { needed, options } : null;
};

export const getFightingStyleFeatChoiceOptions = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  character: CharacterData,
  cls: AutoBuilderClass | undefined,
  level: number,
): { from: AutoBuilderFeat[]; count: number } | null => {
  if (!cls || ruleSystem !== '5r' || !hasClassFeatureAtLevel(cls, level, 'Fighting Style', '战斗风格')) return null;
  const categories = new Set(['FS']);
  if (cls.key === 'Paladin' || cls.name === '圣武士') categories.add('FS:P');
  if (cls.key === 'Ranger' || cls.name === '游侠') categories.add('FS:R');
  const knownStyleIds = new Set(character.featureEntries
    .filter(feature => feature.sourceId.startsWith('auto-feat-'))
    .map(feature => feature.sourceId.replace(/^auto-feat-/, '')));
  const byName = new Map<string, AutoBuilderFeat>();
  content.feats
    .filter(feat => feat.source === 'XPHB')
    .filter(feat => categories.has(feat.category || ''))
    .filter(feat => !knownStyleIds.has(`${feat.key}-${feat.source}`))
    .forEach(feat => {
      const key = feat.englishName || feat.name;
      if (!byName.has(key)) byName.set(key, feat);
    });
  const from = Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
  return from.length ? { from, count: 1 } : null;
};

export const getFightingStyleFeatureChoiceOptions = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  character: CharacterData,
  cls: AutoBuilderClass | undefined,
  level: number,
): { from: AutoBuilderFightingStyle[]; count: number } | null => {
  if (!cls || ruleSystem !== '5e' || !hasClassFeatureAtLevel(cls, level, 'Fighting Style', '战斗风格')) return null;
  const featureTypes = new Set<string>();
  if (cls.key === 'Fighter' || cls.name === '战士') featureTypes.add('FS:F');
  if (cls.key === 'Paladin' || cls.name === '圣武士') featureTypes.add('FS:P');
  if (cls.key === 'Ranger' || cls.name === '游侠') featureTypes.add('FS:R');
  if (!featureTypes.size) return null;

  const knownNames = new Set(character.featureEntries.map(feature => feature.name));
  const byName = new Map<string, AutoBuilderFightingStyle>();
  content.fightingStyles
    .filter(style => style.featureTypes.some(type => featureTypes.has(type)))
    .filter(style => !knownNames.has(style.name))
    .forEach(style => {
      const key = style.englishName || style.name;
      const existing = byName.get(key);
      const priority = style.source === 'PHB' ? 0 : 1;
      const existingPriority = existing?.source === 'PHB' ? 0 : 1;
      if (!existing || priority < existingPriority) byName.set(key, style);
    });

  const from = Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
  return from.length ? { from, count: 1 } : null;
};

export const getFightingStyleCantripChoiceState = (
  content: AutoBuilderContent,
  feat: Pick<AutoBuilderFeat, 'key' | 'name' | 'englishName'> | Pick<AutoBuilderFightingStyle, 'key' | 'name' | 'englishName'> | undefined,
): { from: AutoBuilderSpell[]; count: number } | null => {
  const key = feat?.key || feat?.englishName || feat?.name;
  const classKey = key === 'Blessed Warrior' || feat?.name === '受祝福的勇士'
    ? 'Cleric'
    : key === 'Druidic Warrior' || feat?.name === '德鲁伊教战士'
      ? 'Druid'
      : '';
  if (!classKey) return null;
  const from = content.spells
    .filter(spell => spell.source === 'XPHB' && spell.level === 0 && spell.classKeys?.includes(classKey))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
  return from.length ? { from, count: 2 } : null;
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
  cls: AutoBuilderClass | undefined,
  character: CharacterData,
  level: number,
  additionalProficiencies: string[] = [],
): Array<{ id: string; label: string; from: string[]; count: number }> => {
  if (!hasClassFeatureAtLevel(cls, level, 'Expertise', '专精')) return [];
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
  return requireRuleChoiceGroups(parseRuleExpertiseChoiceGroups(
    [{ anyProficientSkill: 2 }],
    `class-${cls?.key || 'unknown'}-${cls?.source || 'unknown'}-${level}`,
    from,
  ));
};

const getPrerequisiteLevel = (value: unknown): number | null => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && typeof (value as { level?: unknown }).level === 'number') {
    return (value as { level: number }).level;
  }
  return null;
};

const parseOptionalFeatureRef = (ref: string): string => normalizeEntityRef(ref).toLowerCase();

const getKnownInvocationRefs = (
  character: CharacterData,
  selectedIds: string[] = [],
): Set<string> => {
  const refs = new Set<string>();
  for (const feature of character.featureEntries) {
    if (!feature.sourceId.startsWith('auto-invocation-')) continue;
    refs.add(feature.name.toLowerCase());
  }
  for (const id of selectedIds) {
    refs.add(parseOptionalFeatureRef(id));
  }
  return refs;
};

const getKnownSpellMetadata = (
  content: AutoBuilderContent,
  character: CharacterData,
  selectedSpellIds: string[] = [],
): AutoBuilderSpell[] => {
  const knownIds = new Set(character.spellcastingProfiles.flatMap(profile => profile.spells.map(spell => spell.id)));
  selectedSpellIds.forEach(id => knownIds.add(id));
  const knownNames = new Set(character.spellcastingProfiles.flatMap(profile => profile.spells.map(spell => spell.name)));
  return content.spells.filter(spell => knownIds.has(spell.id) || knownNames.has(spell.name));
};

const getSpellPrerequisiteFilters = (choose: string): { level?: number; classKey?: string; spellAttack?: Set<string> } => {
  const filters: { level?: number; classKey?: string; spellAttack?: Set<string> } = {};
  for (const part of choose.split('|')) {
    const [key, value] = part.split('=');
    if (key === 'level') filters.level = Number(value);
    if (key === 'class') filters.classKey = value;
    if (key === 'spell attack') {
      filters.spellAttack = new Set(value.split(';').map(item => item.trim().toUpperCase()).filter(Boolean));
    }
  }
  return filters;
};

const isSpellPrerequisiteMet = (
  content: AutoBuilderContent,
  character: CharacterData,
  value: unknown,
  selectedSpellIds: string[] = [],
): boolean => {
  if (!Array.isArray(value)) return true;
  const knownSpells = getKnownSpellMetadata(content, character, selectedSpellIds);
  return value.every(entry => {
    if (!entry || typeof entry !== 'object') return false;
    const prerequisite = entry as { choose?: string; entry?: string; entrySummary?: string };
    const filters = getSpellPrerequisiteFilters(prerequisite.choose || '');
    const requiresDamage = `${prerequisite.entry || ''} ${prerequisite.entrySummary || ''}`.includes('伤害');
    return knownSpells.some(spell => (
      (filters.level === undefined || spell.level === filters.level)
      && (!filters.classKey || spell.classKeys.includes(filters.classKey))
      && (!requiresDamage || Boolean(spell.damageInflict?.length))
      && (!filters.spellAttack || spell.spellAttack?.some(attack => filters.spellAttack?.has(attack.toUpperCase())))
    ));
  });
};

const isInvocationPrerequisiteMet = (
  content: AutoBuilderContent,
  invocation: AutoBuilderInvocation,
  character: CharacterData,
  level: number,
  selectedIds: string[] = [],
  selectedSpellIds: string[] = [],
): boolean => {
  if (!invocation.prerequisite?.length) return true;
  const knownInvocations = getKnownInvocationRefs(character, selectedIds);
  return invocation.prerequisite.some(prerequisite => {
    if (!prerequisite || typeof prerequisite !== 'object') return false;
    return Object.entries(prerequisite as Record<string, unknown>).every(([key, value]) => {
      if (key === 'level') {
        const required = getPrerequisiteLevel(value);
        return required === null || level >= required;
      }
      if (key === 'optionalfeature' && Array.isArray(value)) {
        return value.every(ref => typeof ref === 'string' && knownInvocations.has(parseOptionalFeatureRef(ref)));
      }
      if (key === 'spell') return isSpellPrerequisiteMet(content, character, value, selectedSpellIds);
      if (key === 'pact') return knownInvocations.has(String(value).toLowerCase());
      return false;
    });
  });
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

const parseSpellRef = (ref: string): { name: string; source?: string } | null => {
  const [rawName, rawSource] = ref.split('|');
  const name = rawName.split('#')[0].trim();
  const source = rawSource?.split('#')[0].toUpperCase();
  return name ? { name, source } : null;
};

const getSpellSourcePriority = (ruleSystem: RuleSystem): string[] => (
  OFFICIAL_SPELL_SOURCE_PRIORITY[ruleSystem]
);

const resolveSpellRef = (
  content: AutoBuilderContent,
  ref: string,
  ruleSystem: RuleSystem,
): AutoBuilderSpell | null => {
  const parsed = parseSpellRef(ref);
  if (!parsed) return null;
  if (parsed.source) {
    return content.spells.find(spell => spell.name === parsed.name && spell.source.toUpperCase() === parsed.source) || null;
  }
  const priority = getSpellSourcePriority(ruleSystem);
  return priority
    .map(source => content.spells.find(spell => spell.name === parsed.name && spell.source === source))
    .find((spell): spell is AutoBuilderSpell => Boolean(spell)) || null;
};

const parseSpellChoiceFilters = (choose: string): {
  level?: number;
  className?: string;
  schools?: Set<string>;
} => {
  const filters: { level?: number; className?: string; schools?: Set<string> } = {};
  for (const part of choose.split('|')) {
    const [rawKey, rawValue] = part.split('=');
    const key = rawKey?.trim();
    const value = rawValue?.trim();
    if (!key || !value) continue;
    if (key === 'level') filters.level = Number(value);
    if (key === 'class') filters.className = value;
    if (key === 'school') filters.schools = new Set(value.split(';').map(item => item.trim()).filter(Boolean));
  }
  return filters;
};

const getClassKeysForSpellFilter = (
  content: AutoBuilderContent,
  className?: string,
): Set<string> | null => {
  if (!className) return null;
  const normalized = normalizeKey(className);
  const keys = content.classes
    .filter(cls => (
      normalizeKey(cls.name) === normalized
      || normalizeKey(cls.key) === normalized
      || normalizeKey(cls.englishName) === normalized
    ))
    .map(cls => cls.key);
  return keys.length ? new Set(keys) : null;
};

const getSpellOptionsForFeatFilter = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  choose: string,
): AutoBuilderSpell[] => {
  const filters = parseSpellChoiceFilters(choose);
  const classKeys = getClassKeysForSpellFilter(content, filters.className);
  const priority = getSpellSourcePriority(ruleSystem);
  const byName = new Map<string, AutoBuilderSpell>();
  content.spells
    .filter(spell => priority.includes(spell.source))
    .filter(spell => filters.level === undefined || spell.level === filters.level)
    .filter(spell => !filters.schools || Boolean(spell.school && filters.schools.has(spell.school)))
    .filter(spell => !classKeys || spell.classKeys.some(classKey => classKeys.has(classKey)))
    .forEach(spell => {
      const key = spell.englishName || spell.name;
      const existing = byName.get(key);
      if (!existing || priority.indexOf(spell.source) < priority.indexOf(existing.source)) {
        byName.set(key, spell);
      }
    });
  return Array.from(byName.values())
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'zh-Hans-CN'));
};

const normalizeFeatSpellAbility = (ability: unknown): AbilityName | undefined => {
  if (typeof ability !== 'string') return undefined;
  if (ability === '继承') return undefined;
  return normalizeAbilityName(ability) || undefined;
};

const getFeatSpellAbilityOptionsFromBlock = (block: Record<string, unknown>): AbilityName[] => {
  const ability = block.ability;
  if (!ability || typeof ability !== 'object' || !('choose' in ability)) return [];
  const options = (ability as { choose?: unknown }).choose;
  return Array.isArray(options)
    ? options.map(option => normalizeAbilityName(String(option))).filter((option): option is AbilityName => Boolean(option))
    : [];
};

const collectFeatSpellChoices = (
  value: unknown,
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  sourceId: string,
  characterLevel = Number.POSITIVE_INFINITY,
): { fixedSpells: AutoBuilderSpell[]; choices: AutoBuilderFeatSpellChoiceGroup[] } => {
  const fixedSpells: AutoBuilderSpell[] = [];
  const choices: AutoBuilderFeatSpellChoiceGroup[] = [];
  let choiceIndex = 0;
  const visit = (entry: unknown, fallbackCount = 1) => {
    if (typeof entry === 'string') {
      const spell = resolveSpellRef(content, entry, ruleSystem);
      if (spell) fixedSpells.push(spell);
      return;
    }
    if (Array.isArray(entry)) {
      entry.forEach(item => visit(item, fallbackCount));
      return;
    }
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length > 0 && keys.every(key => /^\d+$/.test(key))) {
      keys
        .filter(key => Number(key) <= characterLevel)
        .forEach(key => visit(record[key], fallbackCount));
      return;
    }
    if (typeof record.choose === 'string') {
      const options = getSpellOptionsForFeatFilter(content, ruleSystem, record.choose);
      if (options.length) {
        choiceIndex += 1;
        choices.push({
          id: `${sourceId}-spell-choice-${choiceIndex}`,
          label: record.choose,
          count: typeof record.count === 'number' ? record.count : fallbackCount,
          options,
        });
      }
      return;
    }
    Object.values(record).forEach(item => visit(item, fallbackCount));
  };
  visit(value);
  return { fixedSpells: uniqueSpells(fixedSpells), choices };
};

const createRuneShaperFeatSpellBlock = (
  content: AutoBuilderContent,
  feat: AutoBuilderFeat,
  ruleSystem: RuleSystem,
  characterLevel: number,
): AutoBuilderFeatSpellBlockChoice | null => {
  const block = feat.additionalSpells?.find(entry => entry && typeof entry === 'object') as Record<string, unknown> | undefined;
  if (!block) return null;
  const id = `feat-${feat.key}-${feat.source}-spell-block-0`;
  const parsed = collectFeatSpellChoices(block, content, ruleSystem, id, characterLevel);
  const fixedSpells = parsed.fixedSpells.filter(spell => (
    spell.englishName === 'Comprehend Languages' || spell.name === '通晓语言'
  ));
  const fixedSpellIds = new Set(fixedSpells.map(spell => spell.id));
  const runeSpellOptions = parsed.fixedSpells.filter(spell => !fixedSpellIds.has(spell.id));
  const effectiveCharacterLevel = Number.isFinite(characterLevel) ? characterLevel : 1;
  const runeCount = Math.max(1, Math.floor(calculateProficiencyBonus(Math.max(1, effectiveCharacterLevel)) / 2));
  if (!fixedSpells.length && !runeSpellOptions.length) return null;
  return {
    id,
    label: feat.name,
    ability: normalizeFeatSpellAbility(block.ability),
    abilityOptions: getFeatSpellAbilityOptionsFromBlock(block),
    fixedSpells,
    choices: runeSpellOptions.length
      ? [{
          id: `${id}-rune-spells`,
          label: '符文法术',
          count: runeCount,
          options: uniqueSpells(runeSpellOptions),
        }]
      : [],
  };
};

export const getFeatSpellChoiceState = (
  content: AutoBuilderContent,
  feat: AutoBuilderFeat | undefined,
  ruleSystem: RuleSystem,
  characterLevel = Number.POSITIVE_INFINITY,
): { blocks: AutoBuilderFeatSpellBlockChoice[] } | null => {
  if (feat?.key === 'Rune Shaper' && feat.source === 'BGG') {
    const block = createRuneShaperFeatSpellBlock(content, feat, ruleSystem, characterLevel);
    return block ? { blocks: [block] } : null;
  }
  const blocks = (feat?.additionalSpells || [])
    .map((entry, index): AutoBuilderFeatSpellBlockChoice | null => {
      if (!entry || typeof entry !== 'object') return null;
      const block = entry as Record<string, unknown>;
      const id = `feat-${feat?.key || 'unknown'}-${feat?.source || 'unknown'}-spell-block-${index}`;
      const label = String(block.name || block.ENG_name || `${feat?.name || 'Feat'} ${index + 1}`);
      const parsed = collectFeatSpellChoices(block, content, ruleSystem, id, characterLevel);
      if (!parsed.fixedSpells.length && !parsed.choices.length) return null;
      return {
        id,
        label,
        ability: normalizeFeatSpellAbility(block.ability),
        abilityOptions: getFeatSpellAbilityOptionsFromBlock(block),
        fixedSpells: parsed.fixedSpells,
        choices: parsed.choices,
      };
    })
    .filter((block): block is AutoBuilderFeatSpellBlockChoice => Boolean(block));
  return blocks.length ? { blocks } : null;
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

const getRuneShaperSpellReplacementState = (
  content: AutoBuilderContent,
  feat: AutoBuilderFeat,
  character: CharacterData,
  ruleSystem: RuleSystem,
  characterLevel: number,
): AutoBuilderFeatSpellReplacementState | undefined => {
  if (feat.key !== 'Rune Shaper' || feat.source !== 'BGG') return undefined;
  const profileId = getFeatSpellProfileId(feat);
  const existingProfile = character.spellcastingProfiles.find(profile => profile.id === profileId);
  if (!existingProfile) return undefined;
  const fullState = getFeatSpellChoiceState(content, feat, ruleSystem, characterLevel);
  const block = fullState?.blocks[0];
  const runeChoice = block?.choices[0];
  if (!runeChoice?.options.length) return undefined;
  const fixedSpellKeys = new Set((block.fixedSpells || []).map(spell => spell.englishName || spell.name));
  const existingRuneSpells = existingProfile.spells
    .filter(spell => !fixedSpellKeys.has(spell.englishName || spell.name))
    .map(spell => ({
      id: spell.id,
      name: spell.name,
      englishName: spell.englishName,
      source: spell.source,
    }));
  if (!existingRuneSpells.length) return undefined;
  const existingRuneKeys = new Set(existingRuneSpells.map(spell => spell.englishName || spell.name));
  const addOptions = runeChoice.options
    .filter(spell => !existingRuneKeys.has(spell.englishName || spell.name))
    .map(spell => ({
      id: spell.id,
      name: spell.name,
      englishName: spell.englishName,
      source: spell.source,
    }));
  if (!addOptions.length) return undefined;
  return {
    profileId,
    label: '替换已知符文',
    removeOptions: existingRuneSpells,
    addOptions,
  };
};

const filterNewFeatSpellChoiceState = (
  current: { blocks: AutoBuilderFeatSpellBlockChoice[] } | null,
  previous: { blocks: AutoBuilderFeatSpellBlockChoice[] } | null,
): { blocks: AutoBuilderFeatSpellBlockChoice[] } | null => {
  if (!current) return null;
  const previousBlockById = new Map((previous?.blocks || []).map(block => [block.id, block]));
  const blocks = current.blocks.flatMap(block => {
    const previousBlock = previousBlockById.get(block.id);
    const previousFixedIds = new Set(previousBlock?.fixedSpells.map(spell => spell.id) || []);
    const previousChoiceById = new Map((previousBlock?.choices || []).map(choice => [choice.id, choice]));
    const nextBlock = {
      ...block,
      fixedSpells: block.fixedSpells.filter(spell => !previousFixedIds.has(spell.id)),
      choices: block.choices.flatMap(choice => {
        const previousChoice = previousChoiceById.get(choice.id);
        if (!previousChoice) return [choice];
        const additionalCount = choice.count - previousChoice.count;
        return additionalCount > 0 ? [{ ...choice, count: additionalCount }] : [];
      }),
    };
    return nextBlock.fixedSpells.length || nextBlock.choices.length ? [nextBlock] : [];
  });
  return blocks.length ? { blocks } : null;
};

export const getExistingFeatSpellLevelUpChoiceState = (
  content: AutoBuilderContent,
  character: CharacterData,
  ruleSystem: RuleSystem,
  oldCharacterLevel: number,
  newCharacterLevel: number,
): AutoBuilderExistingFeatChoiceState | null => {
  if (newCharacterLevel <= oldCharacterLevel) return null;
  const upgradeFeats = [
    content.feats.find(feat => feat.key === 'Ritual Caster' && feat.source === 'XPHB'),
    content.feats.find(feat => feat.key === 'Rune Shaper' && feat.source === 'BGG'),
  ].filter((feat): feat is AutoBuilderFeat => Boolean(feat));
  for (const feat of upgradeFeats) {
    if (!hasAppliedFeat(character, feat.key, feat.source)) continue;
    const state = filterNewFeatSpellChoiceState(
      getFeatSpellChoiceState(content, feat, ruleSystem, newCharacterLevel),
      getFeatSpellChoiceState(content, feat, ruleSystem, oldCharacterLevel),
    );
    const replacement = getRuneShaperSpellReplacementState(content, feat, character, ruleSystem, newCharacterLevel);
    if (state || replacement) return { feat, state: state || { blocks: [] }, replacement };
  }
  return null;
};

export const getClassSpellOptions = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  maxSpellLevel: number,
): AutoBuilderSpell[] => {
  const ruleSystem: RuleSystem = cls.source === 'XPHB' ? '5r' : '5e';
  const priority = OFFICIAL_SPELL_SOURCE_PRIORITY[ruleSystem];
  const allowedSources = new Set(priority);
  const byName = new Map<string, AutoBuilderSpell>();
  content.spells
    .filter(spell => allowedSources.has(spell.source) && spell.classKeys.includes(cls.key) && spell.level <= maxSpellLevel)
    .forEach(spell => {
      const key = spell.englishName || spell.name;
      const existing = byName.get(key);
      if (!existing || priority.indexOf(spell.source) < priority.indexOf(existing.source)) {
        byName.set(key, spell);
      }
    });
  return Array.from(byName.values())
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'zh-Hans-CN'));
};

const getExpandedSpellOptions = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  level: number,
  subclass?: AutoBuilderSubclass,
): AutoBuilderSpell[] => {
  const refs = [
    ...(cls.additionalPreparedSpells || []),
    ...(subclass?.additionalPreparedSpells || []),
  ].filter(ref => ref.mode === 'expanded' && ref.level <= level);
  return refs
    .map(ref => content.spells.find(spell => spell.name === ref.name && spell.source === ref.source))
    .filter((spell): spell is AutoBuilderSpell => Boolean(spell));
};

const getSubclassSpellOptions = (
  content: AutoBuilderContent,
  subclass: AutoBuilderSubclass | undefined,
  maxSpellLevel: number,
): AutoBuilderSpell[] => {
  if (!subclass) return [];
  return content.spells
    .filter(spell => spell.level <= maxSpellLevel && spell.subclassIds?.includes(subclass.id))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'zh-Hans-CN'));
};

const getSpellOptionsForClassLevel = (
	  content: AutoBuilderContent,
	  cls: AutoBuilderClass,
	  level: number,
	  subclass?: AutoBuilderSubclass,
	): AutoBuilderSpell[] => {
	  const maxSpellLevel = getMaxSpellLevel(cls, level);
	  if (maxSpellLevel < 0) return [];
	  // XPHB Bard: at level 10+, Magical Secrets expands the spell pool to include Cleric/Druid/Wizard spells
	  const magicalSecretExpansion = (cls.englishName === 'Bard' && cls.source === 'XPHB' && level >= 10)
	    ? getMagicalSecretSpellOptions(content, cls, maxSpellLevel)
	    : [];
	  return uniqueSpells([
	    ...getClassSpellOptions(content, cls, maxSpellLevel),
	    ...getSubclassSpellOptions(content, subclass, maxSpellLevel),
	    ...getExpandedSpellOptions(content, cls, level, subclass),
	    ...magicalSecretExpansion,
	  ]);
	};

/** Classes whose spells are eligible for Bard Magical Secrets */
const MAGICAL_SECRETS_CLASS_KEYS = ['Bard', 'Cleric', 'Druid', 'Wizard'];

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
): AutoBuilderSpell[] => {
  const ruleSystem: RuleSystem = cls.source === 'XPHB' ? '5r' : '5e';
  const priority = OFFICIAL_SPELL_SOURCE_PRIORITY[ruleSystem];
  const allowedSources = new Set(priority);
  const byName = new Map<string, AutoBuilderSpell>();
  content.spells
    .filter(spell => allowedSources.has(spell.source)
      && spell.classKeys?.some(key => MAGICAL_SECRETS_CLASS_KEYS.includes(key))
      && spell.level <= maxSpellLevel)
    .forEach(spell => {
      const key = spell.englishName || spell.name;
      const existing = byName.get(key);
      if (!existing || priority.indexOf(spell.source) < priority.indexOf(existing.source)) {
        byName.set(key, spell);
      }
    });
  return Array.from(byName.values())
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'zh-Hans-CN'));
};

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

const getCumulativeFixedKnownSpellCount = (cls: AutoBuilderClass, level: number): number => {
  if (!cls.spellsKnownProgressionFixedByLevel) return 0;
  return Object.entries(cls.spellsKnownProgressionFixedByLevel)
    .filter(([classLevel]) => Number(classLevel) <= level)
    .reduce((total, [, spellLevels]) => (
      total + Object.values(spellLevels).reduce((sum, count) => sum + (Number(count) || 0), 0)
    ), 0);
};

const getFixedLeveledSpellChoiceGroups = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  level: number,
  existingSpells: Spell[],
): AutoBuilderFixedSpellChoiceGroup[] => {
  const spellLevels = cls.spellsKnownProgressionFixedByLevel?.[String(level)];
  if (!spellLevels) return [];
  const classOptions = getClassSpellOptions(content, cls, 9);
  return Object.entries(spellLevels)
    .map(([spellLevel, count]) => {
      const numericSpellLevel = Number(spellLevel);
      const numericCount = Number(count) || 0;
      const options = classOptions.filter(spell => spell.level === numericSpellLevel);
      const optionIds = new Set(options.map(spell => spell.id));
      const selected = existingSpells.filter(spell => optionIds.has(spell.id)).length;
      return {
        classLevel: level,
        spellLevel: numericSpellLevel,
        count: numericCount,
        selected,
        options,
      };
    })
    .filter(group => group.count > 0 && group.options.length);
};

export const getKnownSpellChoiceLimits = (cls: AutoBuilderClass, level: number): { cantrips: number; leveled: number } => {
  const index = Math.max(0, level - 1);
  const cantrips = cls.cantripProgression?.[index] || 0;
  const fixedKnown = cls.spellsKnownProgressionFixed
    ?.slice(0, level)
    .reduce((total, count) => total + (Number(count) || 0), 0);
  const cumulativeFixedKnown = getCumulativeFixedKnownSpellCount(cls, level);
  const levelChangePrepared = cls.preparedSpellsChange === 'level'
    ? cls.preparedSpellsProgression?.[index]
    : 0;
  let leveled = (fixedKnown || cls.spellsKnownProgression?.[index] || levelChangePrepared || 0) + cumulativeFixedKnown;
  if (cls.key === 'Ranger' && cls.source === 'PHB' && level === 1) leveled = 0;

  return { cantrips, leveled };
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
  const maxSpellLevel = getMaxSpellLevel(cls, level);
  if (maxSpellLevel < 0) {
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

  const options = getSpellOptionsForClassLevel(content, cls, level, subclass);
  const isPreparedAll = isPreparedAllClass(cls);
  const limits = getKnownSpellChoiceLimits(cls, level);
  const fixedLeveledGroups = getFixedLeveledSpellChoiceGroups(content, cls, level, existingSpells);
  const fixedNeeded = fixedLeveledGroups.reduce((total, group) => total + Math.max(0, group.count - group.selected), 0);
  const additionalPreparedIds = new Set(getAdditionalPreparedSpells(content, cls, level, subclass).map(spell => spell.id));
  const existingCantrips = existingSpells.filter(spell => spell.level === 0).length;
  const existingLeveled = existingSpells.filter(spell => spell.level > 0 && !additionalPreparedIds.has(spell.id)).length;

  return {
    isSpellcaster: true,
    isPreparedAll,
    limits,
    needed: {
      cantrips: Math.max(0, limits.cantrips - existingCantrips),
      leveled: isPreparedAll ? 0 : Math.max(0, limits.leveled - existingLeveled - fixedNeeded),
    },
    cantrips: options.filter(spell => spell.level === 0),
    leveled: options.filter(spell => spell.level > 0),
    fixedLeveledGroups,
  };
};

export const getLevelOneSpellChoiceState = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  subclass?: AutoBuilderSubclass,
) => getSpellChoiceState(content, cls, 1, [], subclass);

const getInvocationLimit = (cls: AutoBuilderClass, level: number): number => (
  cls.invocationProgression?.[Math.max(0, level - 1)] || 0
);

const getMetamagicLimit = (cls: AutoBuilderClass, level: number): number => (
  cls.metamagicProgression?.[Math.max(0, level - 1)] || 0
);

const getManeuverLimit = (subclass: AutoBuilderSubclass | undefined, level: number): number => (
  subclass?.maneuverProgression?.[Math.max(0, level - 1)] || 0
);

const getExistingInvocationCount = (character: CharacterData): number => (
  character.featureEntries.filter(feature => feature.sourceId.startsWith('auto-invocation-')).length
);

const getWarlockLevel = (content: AutoBuilderContent, character: CharacterData): number => {
  const warlocks = content.classes.filter(cls => cls.key === 'Warlock' || cls.englishName === 'Warlock');
  return warlocks.reduce((level, cls) => {
    const characterClass = character.classes.find(item => isCharacterClassForDefinition(item, cls));
    return Math.max(level, characterClass?.level || 0);
  }, 0);
};

const getExistingMetamagicCount = (character: CharacterData): number => (
  character.featureEntries.filter(feature => feature.sourceId.startsWith('auto-metamagic-')).length
);

const getExistingManeuverCount = (character: CharacterData): number => (
  character.featureEntries.filter(feature => feature.sourceId.startsWith('auto-maneuver-')).length
);

const getAvailableInvocationOptions = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  character: CharacterData,
  prerequisiteLevel: number,
  selectedIds: string[] = [],
  selectedSpellIds: string[] = [],
  requireWarlockForPrerequisites = false,
): AutoBuilderInvocation[] => {
  const sourcePriority = OFFICIAL_INVOCATION_SOURCE_PRIORITY[ruleSystem];
  const allowedSources = new Set(sourcePriority);
  const knownInvocations = getKnownInvocationRefs(character);
  const warlockLevel = requireWarlockForPrerequisites ? getWarlockLevel(content, character) : 0;
  const byKey = new Map<string, AutoBuilderInvocation>();
  content.invocations
    .filter(invocation => allowedSources.has(invocation.source))
    .filter(invocation => !knownInvocations.has(invocation.name.toLowerCase()))
    .filter(invocation => !requireWarlockForPrerequisites || !invocation.prerequisite?.length || warlockLevel > 0)
    .filter(invocation => isInvocationPrerequisiteMet(
      content,
      invocation,
      character,
      requireWarlockForPrerequisites && invocation.prerequisite?.length ? warlockLevel : prerequisiteLevel,
      selectedIds,
      selectedSpellIds,
    ))
    .forEach(invocation => {
      const key = invocation.englishName || invocation.name;
      const existing = byKey.get(key);
      if (!existing || sourcePriority.indexOf(invocation.source) < sourcePriority.indexOf(existing.source)) {
        byKey.set(key, invocation);
      }
    });
  return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
};

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
  return {
    isInvocationClass: true,
    needed: Math.max(0, getInvocationLimit(cls, level) - getExistingInvocationCount(character)),
    options: getAvailableInvocationOptions(content, ruleSystem, character, level, selectedIds, selectedSpellIds),
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
  const limit = getMetamagicLimit(cls, level);
  if (!limit) return { isMetamagicClass: true, needed: 0, options: [] };
  const ruleSystem: RuleSystem = cls.source === 'XPHB' ? '5r' : '5e';
  const sourcePriority = OFFICIAL_METAMAGIC_SOURCE_PRIORITY[ruleSystem];
  const allowedSources = new Set(sourcePriority);
  const knownNames = new Set(character.featureEntries
    .filter(feature => feature.sourceId.startsWith('auto-metamagic-'))
    .map(feature => feature.name));
  const byKey = new Map<string, AutoBuilderMetamagic>();
  content.metamagics
    .filter(metamagic => allowedSources.has(metamagic.source))
    .filter(metamagic => !knownNames.has(metamagic.name))
    .forEach(metamagic => {
      const key = metamagic.englishName || metamagic.name;
      const existing = byKey.get(key);
      if (!existing || sourcePriority.indexOf(metamagic.source) < sourcePriority.indexOf(existing.source)) {
        byKey.set(key, metamagic);
      }
    });

  return {
    isMetamagicClass: true,
    needed: Math.max(0, limit - getExistingMetamagicCount(character)),
    options: Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
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
  const limit = getManeuverLimit(subclass, level) + Math.max(0, extraNeeded);
  if (!limit) return { isManeuverSubclass: true, needed: 0, options: [] };
  const ruleSystem: RuleSystem = ruleSystemOverride || (subclass?.classSource === 'XPHB' ? '5r' : '5e');
  const sourcePriority = OFFICIAL_MANEUVER_SOURCE_PRIORITY[ruleSystem];
  const allowedSources = new Set(sourcePriority);
  const knownNames = new Set(character.featureEntries
    .filter(feature => feature.sourceId.startsWith('auto-maneuver-'))
    .map(feature => feature.name));
  const byKey = new Map<string, AutoBuilderManeuver>();
  content.maneuvers
    .filter(maneuver => allowedSources.has(maneuver.source))
    .filter(maneuver => !knownNames.has(maneuver.name))
    .forEach(maneuver => {
      const key = maneuver.englishName || maneuver.name;
      const existing = byKey.get(key);
      if (!existing || sourcePriority.indexOf(maneuver.source) < sourcePriority.indexOf(existing.source)) {
        byKey.set(key, maneuver);
      }
    });

  return {
    isManeuverSubclass: true,
    needed: Math.max(0, limit - getExistingManeuverCount(character)),
    options: Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
  };
};

export const getFeatFightingStyleChoiceState = (
  content: AutoBuilderContent,
  feat: AutoBuilderFeat | undefined,
  character: CharacterData,
): { from: AutoBuilderFightingStyle[]; count: number } | null => {
  if (!feat?.fightingStyleCount) return null;
  const knownNames = new Set(character.featureEntries.map(feature => feature.name));
  const byName = new Map<string, AutoBuilderFightingStyle>();
  content.fightingStyles
    .filter(style => style.featureTypes.includes('FS:F'))
    .filter(style => !knownNames.has(style.name))
    .forEach(style => {
      const key = style.englishName || style.name;
      const existing = byName.get(key);
      const priority = style.source === 'PHB' ? 0 : 1;
      const existingPriority = existing?.source === 'PHB' ? 0 : 1;
      if (!existing || priority < existingPriority) byName.set(key, style);
    });
  const from = Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
  return from.length ? { from, count: feat.fightingStyleCount } : null;
};

export const getFeatManeuverChoiceState = (
  content: AutoBuilderContent,
  feat: AutoBuilderFeat | undefined,
  character: CharacterData,
  ruleSystem: RuleSystem,
  extraNeeded = 0,
): { needed: number; options: AutoBuilderManeuver[] } | null => {
  const needed = (feat?.maneuverCount || 0) + Math.max(0, extraNeeded);
  if (!needed) return null;
  const state = getManeuverChoiceState(content, undefined, character, 1, needed, ruleSystem);
  return state.options.length ? { needed: state.needed, options: state.options } : null;
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
  if (!feat?.invocationCount) return null;
  const options = getAvailableInvocationOptions(
    content,
    ruleSystem,
    character,
    characterLevel,
    selectedIds,
    selectedSpellIds,
    true,
  );
  return options.length ? { needed: feat.invocationCount, options } : null;
};

export const getFeatMetamagicChoiceState = (
  content: AutoBuilderContent,
  feat: AutoBuilderFeat | undefined,
  character: CharacterData,
  ruleSystem: RuleSystem,
): { needed: number; options: AutoBuilderMetamagic[] } | null => {
  if (!feat?.metamagicCount) return null;
  const sourcePriority = OFFICIAL_METAMAGIC_SOURCE_PRIORITY[ruleSystem];
  const allowedSources = new Set(sourcePriority);
  const knownNames = new Set(character.featureEntries
    .filter(feature => feature.sourceId.startsWith('auto-metamagic-'))
    .map(feature => feature.name));
  const byKey = new Map<string, AutoBuilderMetamagic>();
  content.metamagics
    .filter(metamagic => allowedSources.has(metamagic.source))
    .filter(metamagic => !knownNames.has(metamagic.name))
    .forEach(metamagic => {
      const key = metamagic.englishName || metamagic.name;
      const existing = byKey.get(key);
      if (!existing || sourcePriority.indexOf(metamagic.source) < sourcePriority.indexOf(existing.source)) {
        byKey.set(key, metamagic);
      }
    });
  const options = Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
  return options.length ? { needed: feat.metamagicCount, options } : null;
};

export const getMaxSpellLevel = (cls: AutoBuilderClass, level: number): number => {
  if (!cls.spellcastingAbility || !cls.casterProgression) return -1;
  let fixedMaxLevel = -1;
  for (const [classLevel, spellLevels] of Object.entries(cls.spellsKnownProgressionFixedByLevel || {})) {
    if (Number(classLevel) > level) continue;
    for (const [spellLevel, count] of Object.entries(spellLevels)) {
      if (Number(count) > 0) fixedMaxLevel = Math.max(fixedMaxLevel, Number(spellLevel) || -1);
    }
  }
  const spellSlots = cls.spellSlotProgression?.[level - 1];
  if (spellSlots?.length) {
    let highest = -1;
    for (let index = spellSlots.length - 1; index >= 0; index -= 1) {
      if (Number(spellSlots[index]) > 0) {
        highest = index;
        break;
      }
    }
    if (highest >= 0) return Math.max(highest + 1, fixedMaxLevel);
  }
  const pactSlots = cls.pactSlotProgression?.[level - 1];
  if (pactSlots?.level) return Math.max(pactSlots.level, fixedMaxLevel);
  if (cls.casterProgression === 'pact') return level >= 1 ? 1 : -1;
  if (cls.casterProgression === 'full') return level >= 1 ? Math.min(9, Math.max(1, Math.ceil(level / 2))) : -1;
  if (cls.casterProgression === 'artificer') return level >= 1 ? Math.min(5, Math.max(1, Math.ceil(level / 4))) : -1;
  if (cls.casterProgression === '1/2') return level >= 2 ? Math.min(5, Math.max(1, Math.floor((level + 3) / 4))) : -1;
  return -1;
};

const getSlotsForClassLevel = (cls: AutoBuilderClass, level: number): { [level: number]: SpellSlot } => {
  const slots = createEmptySpellSlots();
  if (!cls.spellcastingAbility || !cls.casterProgression) return slots;
  const spellSlots = cls.spellSlotProgression?.[level - 1];
  if (spellSlots?.length) {
    spellSlots.forEach((total, index) => {
      slots[index + 1] = { total: String(total || 0), expended: '0' };
    });
    return slots;
  }
  const pactSlots = cls.pactSlotProgression?.[level - 1];
  if (pactSlots?.level && pactSlots.slots > 0) {
    slots[pactSlots.level] = { total: String(pactSlots.slots), expended: '0' };
    return slots;
  }
  const maxSpellLevel = getMaxSpellLevel(cls, level);
  if (maxSpellLevel < 1) return slots;
  if (cls.casterProgression === 'pact') {
    slots[Math.min(maxSpellLevel, 5)] = { total: level >= 2 ? '2' : '1', expended: '0' };
    return slots;
  }
  slots[1] = { total: level >= 2 ? '3' : '2', expended: '0' };
  if (maxSpellLevel >= 2) slots[2] = { total: level >= 4 ? '3' : '2', expended: '0' };
  if (maxSpellLevel >= 3) slots[3] = { total: '2', expended: '0' };
  if (maxSpellLevel >= 4) slots[4] = { total: '1', expended: '0' };
  if (maxSpellLevel >= 5) slots[5] = { total: '1', expended: '0' };
  return slots;
};

const MULTICLASS_SPELL_SLOT_TABLE: number[][] = [
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

const getClassDefinitionForCharacterClass = (
  content: AutoBuilderContent,
  cls: CharacterData['classes'][number],
): AutoBuilderClass | undefined => content.classes.find(item => (
  (item.key === cls.name || item.name === cls.name || item.englishName === cls.name)
  && (!cls.source || item.source === cls.source)
));

const getMulticlassCasterLevelContribution = (
  cls: AutoBuilderClass,
  level: number,
): number => {
  if (!cls.spellcastingAbility || !cls.casterProgression || cls.casterProgression === 'pact') return 0;
  if (cls.casterProgression === 'full') return level;
  if (cls.casterProgression === 'artificer') return Math.ceil(level / 2);
  if (cls.casterProgression === '1/2') return Math.floor(level / 2);
  if (cls.casterProgression === '1/3') return Math.floor(level / 3);
  return 0;
};

const getSharedMulticlassSlots = (
  content: AutoBuilderContent,
  classes: CharacterData['classes'],
): { slots: { [level: number]: SpellSlot }; applies: boolean } => {
  const spellcastingClasses = classes
    .map(cls => ({ characterClass: cls, definition: getClassDefinitionForCharacterClass(content, cls) }))
    .filter((entry): entry is { characterClass: CharacterData['classes'][number]; definition: AutoBuilderClass } => (
      Boolean(entry.definition?.spellcastingAbility && entry.definition.casterProgression && entry.definition.casterProgression !== 'pact')
    ));
  if (spellcastingClasses.length < 2) return { slots: createEmptySpellSlots(), applies: false };

  const casterLevel = spellcastingClasses.reduce((total, entry) => (
    total + getMulticlassCasterLevelContribution(entry.definition, entry.characterClass.level || 0)
  ), 0);
  const row = MULTICLASS_SPELL_SLOT_TABLE[Math.max(0, Math.min(20, casterLevel) - 1)];
  if (!row) return { slots: createEmptySpellSlots(), applies: false };
  const slots = createEmptySpellSlots();
  row.forEach((total, index) => {
    slots[index + 1] = { total: String(total || 0), expended: '0' };
  });
  return { slots, applies: true };
};

const applySharedSpellSlotsToProfiles = (
  content: AutoBuilderContent,
  classes: CharacterData['classes'],
  profiles: SpellcastingProfile[],
): SpellcastingProfile[] => {
  const shared = getSharedMulticlassSlots(content, classes);
  return profiles.map(profile => {
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

const createSpellcastingProfile = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass,
  choices: AutoBuilderSpellChoice,
  level = 1,
  subclass?: AutoBuilderSubclass,
  classId = 'auto-class-main',
): SpellcastingProfile | null => {
  const maxSpellLevel = getMaxSpellLevel(cls, level);
  if (maxSpellLevel < 0 || !cls.spellcastingAbility) return null;

  const ability = ABILITY_MAP[cls.spellcastingAbility] || 'INT';
  const profileId = `auto-${cls.key.toLowerCase()}-${cls.source.toLowerCase()}-spellcasting`;
  const allOptions = getSpellOptionsForClassLevel(content, cls, level, subclass);
  const cantripIds = new Set(choices.cantrips);
  const leveledIds = new Set(choices.leveled);
  const isPreparedAll = isPreparedAllClass(cls);
  const additionalPrepared = getAdditionalPreparedSpells(content, cls, level, subclass);
  const selectedSpells = isPreparedAll
    ? uniqueSpells([
        ...allOptions.filter(spell => spell.level === 0 && cantripIds.has(spell.id)),
        ...allOptions.filter(spell => spell.level > 0),
        ...additionalPrepared,
      ])
    : uniqueSpells([
        ...allOptions.filter(spell => cantripIds.has(spell.id) || leveledIds.has(spell.id)),
        ...additionalPrepared,
      ]);
  const additionalIds = new Set(additionalPrepared.map(spell => spell.id));

  return {
    id: profileId,
    classId,
    className: cls.name,
    ability,
    preparationMode: isPreparedAll ? 'preparedAll' : 'knownSelection',
    slotSource: cls.casterProgression === 'pact' ? 'pact' : 'class',
    saveDCOverride: '',
    attackBonusOverride: '',
    slots: getSlotsForClassLevel(cls, level),
	    spells: selectedSpells.map(spell => toCharacterSpell(spell, isKnownCasterClass(cls) || additionalIds.has(spell.id) || spell.level === 0)),
  };
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

const makeFeatResource = (
  feat: Pick<AutoBuilderFeat, 'key' | 'name' | 'source'>,
  ruleSystem: RuleSystem,
  key: string,
  name: string,
  max: number,
  reset: CharacterResource['reset'],
  note?: string,
): AdjustmentOperation => ({
  type: 'upsertResource',
  resource: {
    id: `auto-resource-feat-${feat.key}-${feat.source}-${key}`,
    sourceId: `auto-resource-feat-${feat.key}-${feat.source}-${key}`,
    sourceName: `${feat.name} ${feat.source}`,
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
  if (!selectedIds.length) return spellcasting;
  const selectedSpells = selectedIds
    .map(id => content.spells.find(spell => spell.id === id))
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
  subclass: AutoBuilderSubclass | undefined,
  ruleSystem: RuleSystem,
  level: number,
): AdjustmentOperation[] => {
  if (!subclass) return [];
  const operations: AdjustmentOperation[] = subclass.features
    .filter(feature => feature.level === level)
    .map((feature, index) => ({
      type: 'addFeature',
      feature: {
        id: `auto-subclass-${subclass.key}-${subclass.source}-level-${level}-feature-${index + 1}`,
        sourceId: `auto-subclass-${subclass.key}-${subclass.source}-level-${level}`,
        sourceName: `${subclass.name} ${subclass.source}`,
        name: feature.name,
        level: feature.level,
        ruleSystem,
        description: feature.description,
      } satisfies CharacterFeatureEntry,
    }));
  const isHexbladeEntryLevel = subclass.shortName === '咒剑'
    && ((subclass.classSource === 'XPHB' && level === 3) || (subclass.classSource === 'PHB' && level === 1));
  if (isHexbladeEntryLevel) {
    operations.push(
      { type: 'addProficiency', key: 'armor:medium' },
      { type: 'addProficiency', key: 'armor:shield' },
      { type: 'addProficiency', key: 'weapon:martial' },
    );
  }
  return operations;
};

const createInvocationOperations = (
  content: AutoBuilderContent,
  choice: AutoBuilderInvocationChoice | undefined,
  options: AutoBuilderFeatureOperationOptions,
): AdjustmentOperation[] => {
  const ids = choice?.invocationIds || [];
  return ids
    .map(id => content.invocations.find(invocation => invocation.id === id))
    .filter((invocation): invocation is AutoBuilderInvocation => Boolean(invocation))
    .map((invocation, index) => ({
      type: 'addFeature',
      feature: {
        id: `auto-invocation-${invocation.key}-${invocation.source}-${options.level}-${index + 1}`,
        sourceId: `auto-invocation-${invocation.key}-${invocation.source}`,
        sourceName: `${invocation.name} ${invocation.source}`,
        name: invocation.name,
        level: options.level,
        ruleSystem: options.ruleSystem,
        description: invocation.description,
      } satisfies CharacterFeatureEntry,
    }));
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
  choices?: AutoBuilderSkillChoiceSelection,
): AdjustmentOperation[] => {
  return Object.values(choices || {}).flatMap(skills => (
    skills.map(skill => ({
      type: 'addProficiency',
      key: skill.startsWith('tool:') ? `tool:${normalizeKey(skill.slice(5))}` : normalizeSkillName(skill),
      expertise: true,
    } satisfies AdjustmentOperation))
  ));
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
  const state = getFeatSpellChoiceState(content, feat, ruleSystem, characterLevel);
  if (!state) return [];
  const block = state.blocks.find(item => item.id === choices?.featSpellBlockId) || (state.blocks.length === 1 ? state.blocks[0] : undefined);
  if (!block) return [];
  const selectedSpellIds = new Set(Object.values(choices?.featSpellChoices || {}).flat());
  const selectedSpells = uniqueSpells([
    ...block.fixedSpells,
    ...block.choices.flatMap(group => group.options.filter(spell => selectedSpellIds.has(spell.id))),
  ]);
  if (!selectedSpells.length) return [];
  const ability = choices?.featSpellAbility || choices?.featAbility || block.ability;
  if (!ability && block.abilityOptions.length) return [];
  const profile: SpellcastingProfile = {
    id: getFeatSpellProfileId(feat),
    className: `${feat.name} 法术`,
    ability: ability || 'CHA',
    preparationMode: 'knownSelection',
    saveDCOverride: '',
    attackBonusOverride: '',
    slots: createEmptySpellSlots(),
    spells: selectedSpells.map(spell => toCharacterSpell(spell, true)),
  };
  return [{ type: 'upsertSpellcastingProfile', profile }];
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
  if (!choices?.length) return [];
  const choiceByFeatId = new Map(choices.map(choice => [choice.featId, choice]));
  const state = getExistingFeatSpellLevelUpChoiceState(content, character, ruleSystem, oldCharacterLevel, newCharacterLevel);
  if (!state) return [];
  const featId = `${state.feat.key}|${state.feat.source}`;
  const choice = choiceByFeatId.get(featId) || choiceByFeatId.get(state.feat.key);
  if (!choice) return [];
  const block = state.state.blocks.find(item => item.id === choice.featSpellBlockId) || (state.state.blocks.length === 1 ? state.state.blocks[0] : undefined);
  const profileId = getFeatSpellProfileId(state.feat);
  const existingProfile = character.spellcastingProfiles.find(profile => profile.id === profileId);
  const replacementOperations: AdjustmentOperation[] = [];
  if (state.replacement && choice.featSpellReplaceRemoveId && choice.featSpellReplaceAddId) {
    const replacementSpell = content.spells.find(spell => spell.id === choice.featSpellReplaceAddId);
    if (replacementSpell) {
      replacementOperations.push({
        type: 'removeSpell',
        profileId: state.replacement.profileId,
        spellId: choice.featSpellReplaceRemoveId,
      });
      replacementOperations.push({
        type: 'addSpell',
        profileId: state.replacement.profileId,
        spell: toCharacterSpell(replacementSpell, true),
      });
    }
  }
  if (!block) return replacementOperations;
  const selectedSpellIds = new Set(Object.values(choice.featSpellChoices || {}).flat());
  const selectedSpells = uniqueSpells([
    ...block.fixedSpells,
    ...block.choices.flatMap(group => group.options.filter(spell => selectedSpellIds.has(spell.id))),
  ]);
  if (!selectedSpells.length) return replacementOperations;
  const ability = choice.featSpellAbility || existingProfile?.ability || choice.featAbility || block.ability;
  if (!ability && block.abilityOptions.length) return replacementOperations;
  if (existingProfile) {
    return [
      ...replacementOperations,
      ...selectedSpells.map(spell => ({
      type: 'addSpell',
      profileId,
      spell: toCharacterSpell(spell, true),
      } satisfies AdjustmentOperation)),
    ];
  }
  const profile: SpellcastingProfile = {
    id: profileId,
    className: `${state.feat.name} 法术`,
    ability: ability || 'CHA',
    preparationMode: 'knownSelection',
    saveDCOverride: '',
    attackBonusOverride: '',
    slots: createEmptySpellSlots(),
    spells: selectedSpells.map(spell => toCharacterSpell(spell, true)),
  };
  return [...replacementOperations, { type: 'upsertSpellcastingProfile', profile }];
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
    ...createFightingStyleFeatureOperations(content, { key: feat.key, name: feat.name, source: feat.source } as AutoBuilderClass, ruleSystem, choices.featFightingStyleFeatureId),
    ...createInvocationOperations(content, { invocationIds: choices.featInvocations || [] }, { ruleSystem, level: characterLevel }),
    ...createManeuverOperations(content, ruleSystem, choices.featManeuvers),
    ...createMetamagicOperations(content, ruleSystem, choices.featMetamagics),
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
  ruleSystem: RuleSystem,
  weaponIds: string[] | undefined,
): AdjustmentOperation[] => {
  if (!weaponIds?.length) return [];
  return weaponIds.flatMap((weaponId): AdjustmentOperation[] => {
    const weapon = content.weapons.find(item => item.id === weaponId);
    if (!weapon) return [];
    const mastery = formatWeaponMasteryNames(weapon);
    const masteryDescriptions = (weapon.mastery || [])
      .map(ref => {
        const [name, source = 'XPHB'] = ref.split('|');
        const definition = content.weaponMasteries.find(item => item.name === name && item.source === source);
        return definition?.description ? `${definition.name}: ${definition.description}` : '';
      })
      .filter(Boolean);
    const sourceId = `auto-weapon-mastery-${weapon.id}`;
    return [{
      type: 'addFeature',
      feature: {
        id: `${sourceId}-feature`,
        sourceId,
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
  ruleSystem: RuleSystem,
  styleId?: string,
): AdjustmentOperation[] => {
  if (!styleId) return [];
  const style = content.fightingStyles.find(item => item.id === styleId);
  if (!style) return [];
  const sourceId = `auto-fighting-style-${style.id}`;
  return [{
    type: 'addFeature',
    feature: {
      id: `${sourceId}-feature`,
      sourceId,
      sourceName: `${cls.name} 战斗风格`,
      name: style.name,
      level: 1,
      ruleSystem,
      description: style.description,
    } satisfies CharacterFeatureEntry,
  }];
};

const createMetamagicOperations = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  metamagicIds: string[] | undefined,
): AdjustmentOperation[] => {
  if (!metamagicIds?.length) return [];
  return metamagicIds.flatMap((metamagicId, index): AdjustmentOperation[] => {
    const metamagic = content.metamagics.find(item => item.id === metamagicId);
    if (!metamagic) return [];
    const sourceId = `auto-metamagic-${metamagic.id}`;
    return [{
      type: 'addFeature',
      feature: {
        id: `${sourceId}-feature-${index + 1}`,
        sourceId,
        sourceName: `${metamagic.name} ${metamagic.source}`,
        name: metamagic.name,
        level: 1,
        ruleSystem,
        description: metamagic.description,
      } satisfies CharacterFeatureEntry,
    }];
  });
};

const createManeuverOperations = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  maneuverIds: string[] | undefined,
): AdjustmentOperation[] => {
  if (!maneuverIds?.length) return [];
  return maneuverIds.flatMap((maneuverId, index): AdjustmentOperation[] => {
    const maneuver = content.maneuvers.find(item => item.id === maneuverId);
    if (!maneuver) return [];
    const sourceId = `auto-maneuver-${maneuver.id}`;
    return [{
      type: 'addFeature',
      feature: {
        id: `${sourceId}-feature-${index + 1}`,
        sourceId,
        sourceName: `${maneuver.name} ${maneuver.source}`,
        name: maneuver.name,
        level: 1,
        ruleSystem,
        description: maneuver.description,
      } satisfies CharacterFeatureEntry,
    }];
  });
};

const getFeatResourceOperations = (
  feat: Pick<AutoBuilderFeat, 'key' | 'name' | 'source'>,
  ruleSystem: RuleSystem,
  characterLevel: number,
): AdjustmentOperation[] => {
  const profBonus = calculateProficiencyBonus(Math.max(1, characterLevel));
  if (feat.key === 'Lucky' || feat.name === '幸运') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'luck-points',
      '幸运点',
      feat.source === 'XPHB' ? profBonus : 3,
      'longRest',
    )];
  }
  if (feat.key === 'Martial Adept' || feat.name === '战技专家') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'superiority-die',
      '卓越骰',
      1,
      'shortRest',
      'd6. 可用于本专长习得的战技, 短休或长休后恢复.',
    )];
  }
  if (feat.key === 'Metamagic Adept' || feat.name === '超魔导师') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'sorcery-points',
      '专长术法点',
      2,
      'longRest',
      '只能用于超魔法.',
    )];
  }
  if (feat.key === 'Chef') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'chef-treats',
      feat.source === 'XPHB' ? '应急零嘴' : '餐点',
      profBonus,
      'longRest',
      '数量等于熟练加值, 做好后持续 8 小时.',
    )];
  }
  if (feat.key === 'Squire of Solamnia') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'precise-strike',
      '精准打击',
      profBonus,
      'longRest',
      '次数等于熟练加值, 仅在攻击命中时消耗.',
    )];
  }
  if (feat.key === 'Cartomancer') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'hidden-ace',
      '隐藏王牌',
      1,
      'longRest',
      '完成长休后可注入一张卡牌, 魔力持续 8 小时.',
    )];
  }
  if (feat.key === 'Planar Wanderer') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'portal-sense',
      '传送门感知',
      1,
      'longRest',
      '以动作侦测 30 尺内传送门, 长休后恢复.',
    )];
  }
  if (feat.key === 'Rune Shaper') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'rune-magic',
      '符文魔法',
      1,
      'longRest',
      '不消耗法术位且无需材料成分施展一个刻印符文关联法术.',
    )];
  }
  if (feat.key === 'Gift of the Chromatic Dragon') {
    return [
      makeFeatResource(
        feat,
        ruleSystem,
        'chromatic-infusion',
        '繁彩注魔',
        1,
        'longRest',
      ),
      makeFeatResource(
        feat,
        ruleSystem,
        'reactive-resistance',
        '反应抗性',
        profBonus,
        'longRest',
        '次数等于熟练加值.',
      ),
    ];
  }
  if (feat.key === 'Gift of the Gem Dragon') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'telekinetic-reprisal',
      '念力报复',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    )];
  }
  if (feat.key === 'Gift of the Metallic Dragon') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'protective-wings',
      '庇护之翼',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    )];
  }
  if (feat.key === 'Ember of the Fire Giant') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'searing-ignition',
      '炽热灼烧',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    )];
  }
  if (feat.key === 'Fury of the Frost Giant') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'frigid-retaliation',
      '霜寒回击',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    )];
  }
  if (feat.key === 'Guile of the Cloud Giant') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'cloudy-escape',
      '迷云逃逸',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    )];
  }
  if (feat.key === 'Keenness of the Stone Giant') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'stone-throw',
      '投掷石块',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    )];
  }
  if (feat.key === 'Soul of the Storm Giant') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'maelstrom-aura',
      '旋涡灵光',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    )];
  }
  if (feat.key === 'Agent of Order') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'stasis-strike',
      '凝滞打击',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    )];
  }
  if (feat.key === 'Baleful Scion') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'grasp-of-avarice',
      '贪婪之攫',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    )];
  }
  if (feat.key === 'Righteous Heritor') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'soothe-pain',
      '舒缓伤痛',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    )];
  }
  if (feat.key === 'Outlands Envoy') {
    return [
      makeFeatResource(
        feat,
        ruleSystem,
        'crossroads-emissary-misty-step',
        '交路使者: 迷踪步',
        1,
        'longRest',
        '不消耗法术位施展迷踪步.',
      ),
      makeFeatResource(
        feat,
        ruleSystem,
        'crossroads-emissary-tongues',
        '交路使者: 巧言术',
        1,
        'longRest',
        '不消耗法术位施展巧言术, 且无需材料成分.',
      ),
    ];
  }
  if (feat.key === 'Knight of the Crown') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'commanding-rally',
      '号令集结',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    )];
  }
  if (feat.key === 'Knight of the Rose') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'bolstering-rally',
      '振奋集结',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    )];
  }
  if (feat.key === 'Knight of the Sword') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'demoralizing-strike',
      '丧志打击',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    )];
  }
  if (feat.key === 'Telepathic' && feat.source === 'XPHB') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'detect-thoughts',
      '侦测思想',
      1,
      'longRest',
      '不消耗法术位且无需法术成分施展侦测思想.',
    )];
  }
  if (feat.key === 'Boon of Recovery' && feat.source === 'XPHB') {
    return [
      makeFeatResource(
        feat,
        ruleSystem,
        'last-stand',
        '背水一战',
        1,
        'longRest',
      ),
      makeFeatResource(
        feat,
        ruleSystem,
        'recovery-dice',
        '重获生机',
        10,
        'longRest',
        '治疗池为 10 枚 d10, 可用附赠动作消耗任意枚.',
      ),
    ];
  }
  if (feat.key === 'Boon of Fate' && feat.source === 'XPHB') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'fate-points',
      '时来运转',
      1,
      'shortRest',
      '投掷先攻, 完成短休或完成长休后恢复.',
    )];
  }
  if (feat.key === 'Ritual Caster' && feat.source === 'XPHB') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'quick-ritual',
      '快速仪式',
      1,
      'longRest',
      '以通常施法时间施展一道仪式法术, 不消耗法术位.',
    )];
  }
  if (feat.key === 'Fey Touched' || feat.key === 'Fey-Touched') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'misty-step',
      '迷踪步',
      1,
      'longRest',
      '不消耗法术位施展迷踪步.',
    )];
  }
  if (feat.key === 'Shadow Touched' || feat.key === 'Shadow-Touched') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'invisibility',
      '隐形术',
      1,
      'longRest',
      '不消耗法术位施展隐形术.',
    )];
  }
  if (feat.key === 'Drow High Magic') {
    return [
      makeFeatResource(
        feat,
        ruleSystem,
        'levitate',
        '浮空术',
        1,
        'longRest',
        '不消耗法术位施展浮空术.',
      ),
      makeFeatResource(
        feat,
        ruleSystem,
        'dispel-magic',
        '解除魔法',
        1,
        'longRest',
        '不消耗法术位施展解除魔法.',
      ),
    ];
  }
  if (feat.key === 'Fey Teleportation') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'misty-step',
      '迷踪步',
      1,
      'shortRest',
      '短休或长休后恢复.',
    )];
  }
  if (feat.key === 'Poisoner') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'poison-doses',
      '酿毒',
      profBonus,
      'manual',
      '剂数等于熟练加值, 需花费时间和材料制作.',
    )];
  }
  if (feat.key === 'Mage Slayer' && feat.source === 'XPHB') {
    return [makeFeatResource(
      feat,
      ruleSystem,
      'guarded-mind',
      '审慎护心',
      1,
      'shortRest',
      '短休或长休后恢复.',
    )];
  }
  return [];
};

const createFeatOperations = (
  feats: AutoBuilderFeat[],
  ruleSystem: RuleSystem,
  characterLevel = 1,
): AdjustmentOperation[] => {
  return feats.flatMap(feat => {
    const featOperations: AdjustmentOperation[] = [];
    if (feat.key === 'Tough' || feat.name === '健壮') {
      featOperations.push({ type: 'addNumber', path: 'hpMaxBonus', value: Math.max(1, characterLevel) * 2 });
    }
    if (feat.key === 'Alert' || feat.name === '警觉') {
      featOperations.push({
        type: 'addNumber',
        path: 'initiativeBonus',
        value: feat.source === 'XPHB' ? calculateProficiencyBonus(Math.max(1, characterLevel)) : 5,
      });
    }
    if (feat.key === 'Mobile' || feat.key === 'Speedy' || feat.name === '移动' || feat.name === '迅捷') {
      featOperations.push({ type: 'addNumber', path: 'speedBonus', value: 10 });
    }
    if (feat.key === 'Squat Nimbleness') {
      featOperations.push({ type: 'addNumber', path: 'speedBonus', value: 5 });
    }
    if (feat.key === 'Tavern Brawler' && feat.source === 'PHB') {
      featOperations.push({ type: 'addProficiency', key: 'weapon:improvised' });
    }
    if (feat.key === 'Boon of Fortitude') {
      featOperations.push({ type: 'addNumber', path: 'hpMaxBonus', value: 40 });
    }
    if (feat.key === 'Boon of Speed') {
      featOperations.push({ type: 'addNumber', path: 'speedBonus', value: 30 });
    }
    featOperations.push(...createFeatEffectPresentationOperations(feat, ruleSystem));
    featOperations.push(...getFeatResourceOperations(feat, ruleSystem, characterLevel));
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
  character: CharacterData,
  oldCharacterLevel: number,
  newCharacterLevel: number,
): AdjustmentOperation[] => {
  const operations: AdjustmentOperation[] = [];
  const levelDelta = Math.max(0, newCharacterLevel - oldCharacterLevel);

  if (levelDelta > 0 && hasAppliedFeat(character, 'Tough')) {
    operations.push({ type: 'addNumber', path: 'hpMaxBonus', value: levelDelta * 2 });
  }

  if (hasAppliedFeat(character, 'Alert', 'XPHB')) {
    const oldBonus = calculateProficiencyBonus(Math.max(1, oldCharacterLevel));
    const newBonus = calculateProficiencyBonus(Math.max(1, newCharacterLevel));
    const bonusDelta = newBonus - oldBonus;
    if (bonusDelta > 0) {
      operations.push({ type: 'addNumber', path: 'initiativeBonus', value: bonusDelta });
    }
  }

  if (hasAppliedFeat(character, 'Lucky', 'XPHB')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Lucky', name: '幸运', source: 'XPHB' },
      '5r',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Chef', 'TCE')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Chef', name: '大厨', source: 'TCE' },
      '5e',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Chef', 'XPHB')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Chef', name: '大厨', source: 'XPHB' },
      '5r',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Poisoner', 'TCE')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Poisoner', name: '毒师', source: 'TCE' },
      '5e',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Poisoner', 'XPHB')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Poisoner', name: '毒师', source: 'XPHB' },
      '5r',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Squire of Solamnia', 'DSotDQ')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Squire of Solamnia', name: '索拉尼亚侍从', source: 'DSotDQ' },
      '5e',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Knight of the Crown', 'DSotDQ')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Knight of the Crown', name: '皇冠骑士', source: 'DSotDQ' },
      '5e',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Knight of the Rose', 'DSotDQ')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Knight of the Rose', name: '蔷薇骑士', source: 'DSotDQ' },
      '5e',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Knight of the Sword', 'DSotDQ')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Knight of the Sword', name: '圣剑骑士', source: 'DSotDQ' },
      '5e',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Gift of the Chromatic Dragon', 'FTD')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Gift of the Chromatic Dragon', name: '色彩龙赋礼', source: 'FTD' },
      '5e',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Gift of the Gem Dragon', 'FTD')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Gift of the Gem Dragon', name: '宝石龙赋礼', source: 'FTD' },
      '5e',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Gift of the Metallic Dragon', 'FTD')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Gift of the Metallic Dragon', name: '金属龙赋礼', source: 'FTD' },
      '5e',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Ember of the Fire Giant', 'BGG')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Ember of the Fire Giant', name: '火巨人之余烬', source: 'BGG' },
      '5e',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Fury of the Frost Giant', 'BGG')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Fury of the Frost Giant', name: '霜巨人之狂怒', source: 'BGG' },
      '5e',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Guile of the Cloud Giant', 'BGG')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Guile of the Cloud Giant', name: '云巨人之诡诈', source: 'BGG' },
      '5e',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Keenness of the Stone Giant', 'BGG')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Keenness of the Stone Giant', name: '石巨人之敏锐', source: 'BGG' },
      '5e',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Soul of the Storm Giant', 'BGG')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Soul of the Storm Giant', name: '风暴巨人之灵魂', source: 'BGG' },
      '5e',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Agent of Order', 'SatO')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Agent of Order', name: '秩序代行者', source: 'SatO' },
      '5e',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Baleful Scion', 'SatO')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Baleful Scion', name: '恶意后继者', source: 'SatO' },
      '5e',
      newCharacterLevel,
    ));
  }

  if (hasAppliedFeat(character, 'Righteous Heritor', 'SatO')) {
    operations.push(...getFeatResourceOperations(
      { key: 'Righteous Heritor', name: '公义传承者', source: 'SatO' },
      '5e',
      newCharacterLevel,
    ));
  }

  return operations;
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
      ...createFightingStyleFeatureOperations(content, { key: feat.key, name: feat.name, source: feat.source } as AutoBuilderClass, ruleSystem, choice.featFightingStyleFeatureId),
      ...createInvocationOperations(content, { invocationIds: choice.featInvocations || [] }, { ruleSystem, level: characterLevel }),
      ...createManeuverOperations(content, ruleSystem, choice.featManeuvers),
      ...createMetamagicOperations(content, ruleSystem, choice.featMetamagics),
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
  const mainClassId = 'auto-class-main';
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
    ...createFightingStyleFeatureOperations(content, cls, options.ruleSystem, options.classFeatureChoices?.fightingStyleFeatureId),
    ...createMetamagicOperations(content, options.ruleSystem, options.classFeatureChoices?.metamagics),
    ...createManeuverOperations(content, options.ruleSystem, options.classFeatureChoices?.maneuvers),
    ...createExpertiseChoiceOperations(options.classFeatureChoices?.expertise),
    ...createWeaponMasteryOperations(content, cls, options.ruleSystem, options.classFeatureChoices?.weaponMasteries),
    ...createClassFeatureOperations(cls, options.ruleSystem),
    ...createSubclassFeatureOperations(options.subclass, options.ruleSystem, 1),
    ...createInvocationOperations(content, options.invocationChoices, { ruleSystem: options.ruleSystem, level: 1 }),
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
	): { profiles: SpellcastingProfile[]; legacy: CharacterData['spellcasting'] } => {
	  const existingProfile = getSpellcastingProfileForClass(character, cls, classId);
	  const createdProfile = createSpellcastingProfile(content, cls, choices, newLevel, subclass, classId);
	  if (!createdProfile) {
	    return { profiles: character.spellcastingProfiles, legacy: character.spellcasting };
	  }
	
	  const isPreparedAll = createdProfile.preparationMode === 'preparedAll';
	  const isKnownCaster = isKnownCasterClass(cls);
	  const existingSpellIds = new Set(existingProfile?.spells.map(spell => spell.id) || []);
	  const selectedIds = new Set([...choices.cantrips, ...choices.leveled]);
	  const selectedCantripIds = new Set(choices.cantrips);
	  const spellOptions = getSpellOptionsForClassLevel(content, cls, newLevel, subclass);
	  const additionalPrepared = getAdditionalPreparedSpells(content, cls, newLevel, subclass);
	  const additionalIds = new Set(additionalPrepared.map(spell => spell.id));
		  const addedSpells = isPreparedAll
		    ? uniqueSpells([
		        ...spellOptions.filter(spell => spell.level > 0),
		        ...additionalPrepared,
		      ])
		        .map(spell => toCharacterSpell(spell, additionalIds.has(spell.id)))
		    : uniqueSpells([
		        ...spellOptions.filter(spell => selectedIds.has(spell.id)),
		        ...additionalPrepared,
		      ])
		        .filter(spell => !existingSpellIds.has(spell.id))
		        .map(spell => toCharacterSpell(spell, isKnownCaster || additionalIds.has(spell.id) || spell.level === 0));
		  const selectedNewCantrips = spellOptions
		    .filter(spell => spell.level === 0 && selectedCantripIds.has(spell.id) && !existingSpellIds.has(spell.id))
		    .map(spell => toCharacterSpell(spell, true));
		  const knownCantrips = [
		    ...(existingProfile?.spells.filter(spell => spell.level === 0) || []),
		    ...selectedNewCantrips,
		  ];
		
		  // Handle spell replacement on level-up (known-spell casters only)
		  let existingLeveledSpells = existingProfile?.spells.filter(spell => spell.level > 0) || [];
		  if (replaceSpell && replaceSpell.removeId && replaceSpell.addId) {
		    existingLeveledSpells = existingLeveledSpells
		      .filter(spell => spell.id !== replaceSpell.removeId);
		    const replacementSpell = spellOptions.find(spell => spell.id === replaceSpell.addId);
		    if (replacementSpell) {
		      existingLeveledSpells = [
		        ...existingLeveledSpells,
		        toCharacterSpell(replacementSpell, isKnownCaster || additionalIds.has(replacementSpell.id) || replacementSpell.level === 0),
		      ];
		    }
		  }
	
	  const nextProfile: SpellcastingProfile = existingProfile
	    ? {
	        ...existingProfile,
	        ability: createdProfile.ability,
	        preparationMode: createdProfile.preparationMode,
	        slots: createdProfile.slots,
	        spells: isPreparedAll
	          ? uniqueCharacterSpells([...knownCantrips, ...addedSpells])
	          : [...knownCantrips, ...existingLeveledSpells, ...addedSpells],
	      }
	    : createdProfile;
	
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
  const existingClass = character.classes.find(item => isCharacterClassForDefinition(item, cls));
  const isNewClass = !existingClass;
  const newClassId = existingClass?.id || `auto-class-${cls.key}-${Date.now()}`;
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
	    updateSpellcastingForLevel(character, content, cls, newLevel, options.spellChoices, selectedSubclass, newClassId, options.replaceSpell),
    content,
    newClassId,
    options.classFeatureChoices,
  );
	  const spellcastingProfiles = applySharedSpellSlotsToProfiles(content, classes, spellcasting.profiles);
	  const legacySpellcasting = getPrimaryLegacySpellcasting(spellcastingProfiles, spellcasting.legacy);

	  // Magical Secrets: add selected spells to Bard's profile
	  const magicalSecretOperations: AdjustmentOperation[] = [];
	  const msProfileId = `auto-${cls.key.toLowerCase()}-${cls.source.toLowerCase()}-spellcasting`;
	  if (options.magicalSecretChoices?.length) {
	    const maxLevel = getMaxSpellLevel(cls, newLevel);
	    const pool = getMagicalSecretSpellOptions(content, cls, maxLevel);
	    for (const spellId of options.magicalSecretChoices) {
	      const spell = pool.find(s => s.id === spellId);
	      if (spell) {
	        magicalSecretOperations.push({
	          type: 'addSpell',
	          profileId: msProfileId,
	          spell: toCharacterSpell(spell, true),
	        });
	      }
	    }
	  }
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
    options.ruleSystem,
    options.classFeatureChoices?.fightingStyleFeatureId,
  );
  const metamagicOperations = createMetamagicOperations(
    content,
    options.ruleSystem,
    options.classFeatureChoices?.metamagics,
  );
  const maneuverOperations = createManeuverOperations(
    content,
    options.ruleSystem,
    options.classFeatureChoices?.maneuvers,
  );
  const classExpertiseChoiceOperations = createExpertiseChoiceOperations(options.classFeatureChoices?.expertise);
  const classWeaponMasteryOperations = createWeaponMasteryOperations(
    content,
    cls,
    options.ruleSystem,
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
	        ...createSubclassFeatureOperations(selectedSubclass, options.ruleSystem, newLevel),
	        ...createInvocationOperations(content, options.invocationChoices, { ruleSystem: options.ruleSystem, level: newLevel }),
	        ...magicalSecretOperations,
	      ],
	    },
	  );
	return refreshCharacterAutomation(leveledCharacter, content);
};
