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

type AutoBuilderClass = {
  key: string;
  name: string;
  englishName: string;
  source: 'PHB' | 'XPHB';
  ruleSystem: RuleSystem;
  hitDie?: number;
  savingThrows?: string[];
  spellcastingAbility?: string;
  casterProgression?: string;
  preparedSpells?: string;
  preparedSpellsChange?: string;
  preparedSpellsProgression?: number[];
  cantripProgression?: number[];
  spellsKnownProgression?: number[];
  spellsKnownProgressionFixed?: number[];
  spellsKnownProgressionFixedByLevel?: Record<string, Record<string, number>>;
  spellsKnownProgressionFixedAllowLowerLevel?: boolean;
  spellSlotProgression?: number[][];
  pactSlotProgression?: Array<{ slots: number; level: number }>;
  additionalPreparedSpells?: Array<{
    mode?: 'prepared' | 'expanded';
    level: number;
    name: string;
    source: string;
  }>;
  invocationProgression?: number[];
  metamagicProgression?: number[];
  weaponMasteryProgression?: number[];
  channelDivinityProgression?: number[];
  favoredEnemyProgression?: number[];
  sorceryPointProgression?: number[];
  subclassLevels?: number[];
  startingProficiencies?: {
    armor?: ClassProficiencyEntry[];
    weapons?: ClassProficiencyEntry[];
    tools?: string[];
    toolProficiencies?: ProficiencyRecord[];
    skills?: Array<{ choose?: { from?: string[]; count?: number } }>;
  };
  multiclassProficiencies?: {
    armor?: ClassProficiencyEntry[];
    weapons?: ClassProficiencyEntry[];
    tools?: string[];
    toolProficiencies?: ProficiencyRecord[];
    skills?: Array<{ choose?: { from?: string[]; count?: number } }>;
  };
  levelOneFeatures: Array<{
    name: string;
    englishName?: string;
    source: string;
    level: number;
    description: string;
  }>;
  levelFeatures: Array<{
    name: string;
    englishName?: string;
    source: string;
    level: number;
    description: string;
  }>;
};

type AutoBuilderSpell = {
  id: string;
  name: string;
  englishName?: string;
  source: string;
  ruleSystem: RuleSystem;
  level: number;
  school?: string;
  time: Array<{ number?: number; unit?: string }>;
  range: unknown;
  components: Record<string, unknown>;
  duration: Array<Record<string, unknown>>;
  meta?: {
    ritual?: boolean;
  };
  damageInflict?: string[];
  spellAttack?: string[];
	  classKeys: string[];
	  subclassIds?: string[];
	  description?: string;
	};

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

export type AutoBuilderSubclass = {
  id: string;
  key: string;
  name: string;
  englishName?: string;
  shortName: string;
  source: string;
  className: string;
  classSource: string;
  features: Array<{
    name: string;
    englishName?: string;
    source: string;
    level: number;
    description: string;
  }>;
  maneuverProgression?: number[];
  additionalPreparedSpells?: Array<{
    mode?: 'prepared' | 'expanded';
    level: number;
    name: string;
    source: string;
  }>;
};

export type AutoBuilderWeapon = {
  id: string;
  key: string;
  name: string;
  englishName?: string;
  source: string;
  ruleSystem: RuleSystem;
  type?: string;
  weaponCategory?: string;
  property?: Array<string | { uid?: string; note?: string }>;
  mastery?: string[];
  range?: string;
  dmg1?: string;
  dmg2?: string;
  dmgType?: string;
  bonusWeapon?: string;
  entries?: unknown[];
};

export type AutoBuilderArmor = {
  id: string;
  key: string;
  name: string;
  englishName?: string;
  source: 'PHB' | 'XPHB';
  ruleSystem: RuleSystem;
  type?: string;
  ac?: number;
  strength?: string;
  stealth?: boolean;
};

export type AutoBuilderWeaponMastery = {
  id: string;
  key: string;
  name: string;
  englishName?: string;
  source: 'XPHB';
  description: string;
};

export type AutoBuilderInvocation = {
  id: string;
  key: string;
  name: string;
  englishName?: string;
  source: string;
  prerequisite?: unknown[];
  description: string;
};

export type AutoBuilderFightingStyle = {
  id: string;
  key: string;
  name: string;
  englishName?: string;
  source: string;
  featureTypes: string[];
  description: string;
};

export type AutoBuilderMetamagic = {
  id: string;
  key: string;
  name: string;
  englishName?: string;
  source: string;
  description: string;
};

export type AutoBuilderManeuver = {
  id: string;
  key: string;
  name: string;
  englishName?: string;
  source: string;
  description: string;
};

export type AutoBuilderFeat = {
  key: string;
  name: string;
  englishName?: string;
  source: 'PHB' | 'XPHB';
  category?: string;
  prerequisite?: unknown[];
  ability?: Array<Record<string, number> | { choose?: unknown }>;
  skillProficiencies?: ProficiencyRecord[];
  toolProficiencies?: ProficiencyRecord[];
  languageProficiencies?: ProficiencyRecord[];
  savingThrowProficiencies?: ProficiencyRecord[];
  weaponProficiencies?: ProficiencyRecord[];
  armorProficiencies?: ProficiencyRecord[];
  expertise?: ProficiencyRecord[];
  additionalSpells?: unknown[];
  fightingStyleCount?: number;
  invocationCount?: number;
  maneuverCount?: number;
  metamagicCount?: number;
  features: Array<{
    name: string;
    englishName?: string;
    description: string;
  }>;
};

type ProficiencyRecord = Record<string, true | number | { choose?: unknown } | { category?: string[]; count?: number }>;
type ClassProficiencyEntry = string | { proficiency?: string; full?: string };

type AutoBuilderOrigin = {
  key: string;
  name: string;
  englishName?: string;
  source: 'PHB' | 'XPHB';
  ruleSystem: RuleSystem;
  ability?: Array<Record<string, number> | { choose?: unknown }>;
  speed?: number | Record<string, number | boolean>;
  size?: string[];
  darkvision?: number;
  blindsight?: number;
  tremorsense?: number;
  truesight?: number;
  resist?: unknown[];
  immune?: unknown[];
  vulnerable?: unknown[];
  conditionImmune?: unknown[];
  skillProficiencies?: ProficiencyRecord[];
  toolProficiencies?: ProficiencyRecord[];
  languageProficiencies?: ProficiencyRecord[];
  weaponProficiencies?: ProficiencyRecord[];
  armorProficiencies?: ProficiencyRecord[];
  feats?: ProficiencyRecord[];
  features: Array<{
    name: string;
    englishName?: string;
    description: string;
  }>;
  raceName?: string;
  raceSource?: string;
};

export type AutoBuilderContent = {
  generatedAt: string;
  rules?: Record<RuleSystem, {
    primarySources: string[];
    spellSources: string[];
    invocationSources?: string[];
    fightingStyleSources?: string[];
    metamagicSources?: string[];
    maneuverSources?: string[];
    raceSources?: string[];
    officialExtensionsEnabled?: boolean;
  }>;
  classes: AutoBuilderClass[];
  subclasses: AutoBuilderSubclass[];
  races: AutoBuilderOrigin[];
  subraces: AutoBuilderOrigin[];
  backgrounds: AutoBuilderOrigin[];
  feats: AutoBuilderFeat[];
  invocations: AutoBuilderInvocation[];
  fightingStyles: AutoBuilderFightingStyle[];
  metamagics: AutoBuilderMetamagic[];
  maneuvers: AutoBuilderManeuver[];
  weapons: AutoBuilderWeapon[];
  weaponMasteries: AutoBuilderWeaponMastery[];
  armors: AutoBuilderArmor[];
  spells: AutoBuilderSpell[];
};

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

export type AutoBuilderClassFeatureChoice = {
  fightingStyle?: AutoBuilderFeatChoice;
  fightingStyleFeatureId?: string;
  fightingStyleCantrips?: string[];
  metamagics?: string[];
  maneuvers?: string[];
  expertise?: AutoBuilderSkillChoiceSelection;
  weaponMasteries?: string[];
};

export type AutoBuilderRaceChoice = {
  resistance?: string;
  abilities?: AbilityName[];
  skills?: string[];
  size?: string;
  toolChoices?: AutoBuilderToolChoiceSelection;
  languageChoices?: AutoBuilderLanguageChoiceSelection;
  weaponChoices?: AutoBuilderWeaponChoiceSelection;
} & AutoBuilderFeatChoice;

const RULE_SOURCE: Record<RuleSystem, 'PHB' | 'XPHB'> = {
  '5e': 'PHB',
  '5r': 'XPHB',
};

const OFFICIAL_FEAT_SOURCES = new Set([
  'ABH',
  'BGG',
  'BMT',
  'DSotDQ',
  'EFA',
  'ERLW',
  'FRHoF',
  'FTD',
  'LFL',
  'MTF',
  'PHB',
  'PSK',
  'PSX',
  'RHW',
  'SatO',
  'SCC',
  'TCE',
  'XGE',
  'XPHB',
]);

const FEAT_SOURCE_PRIORITY: Record<RuleSystem, string[]> = {
  '5e': ['PHB', 'XGE', 'TCE', 'FTD', 'BGG', 'BMT', 'DSotDQ', 'ERLW', 'EFA', 'FRHoF', 'LFL', 'PSK', 'PSX', 'RHW', 'SCC', 'SatO', 'MTF', 'ABH'],
  '5r': ['XPHB', 'PHB', 'XGE', 'TCE', 'FTD', 'BGG', 'BMT', 'DSotDQ', 'ERLW', 'EFA', 'FRHoF', 'LFL', 'PSK', 'PSX', 'RHW', 'SCC', 'SatO', 'MTF', 'ABH'],
};

const RACE_SOURCE_PRIORITY: Record<RuleSystem, string[]> = {
  '5e': ['PHB', 'MPMM', 'AAG', 'FTD', 'TCE', 'ERLW', 'EFA', 'EGW', 'GGR', 'MOT', 'VRGR', 'WBtW', 'SCC', 'DSotDQ', 'AI', 'EEPC', 'MTF', 'VGM', 'SCAG', 'PSA', 'PSD', 'PSI', 'PSK', 'PSX', 'PSZ', 'LFL', 'RHW'],
  '5r': ['XPHB', 'MPMM', 'PHB', 'AAG', 'FTD', 'TCE', 'ERLW', 'EFA', 'EGW', 'GGR', 'MOT', 'VRGR', 'WBtW', 'SCC', 'DSotDQ', 'AI', 'EEPC', 'MTF', 'VGM', 'SCAG', 'PSA', 'PSD', 'PSI', 'PSK', 'PSX', 'PSZ', 'LFL', 'RHW'],
};

const BACKGROUND_SOURCE_PRIORITY: Record<RuleSystem, string[]> = {
  '5e': ['PHB'],
  '5r': ['XPHB', 'PHB'],
};

const SUBCLASS_SOURCE_PRIORITY: Record<RuleSystem, string[]> = {
  '5e': ['PHB', 'DMG', 'SCAG', 'XGE', 'TCE', 'FTD', 'BGG', 'DSotDQ', 'EGW', 'FRHoF', 'PSA', 'PSK', 'RHW', 'VRGR'],
  '5r': ['XPHB', 'PHB', 'DMG', 'SCAG', 'XGE', 'TCE', 'FTD', 'BGG', 'DSotDQ', 'EGW', 'FRHoF', 'PSA', 'PSK', 'RHW', 'VRGR'],
};

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

const ARTISAN_TOOLS = [
  "alchemist's supplies",
  "brewer's supplies",
  "calligrapher's supplies",
  "carpenter's tools",
  "cartographer's tools",
  "cobbler's tools",
  "cook's utensils",
  "glassblower's tools",
  "jeweler's tools",
  "leatherworker's tools",
  "mason's tools",
  "painter's supplies",
  "potter's tools",
  "smith's tools",
  "tinker's tools",
  "weaver's tools",
  "woodcarver's tools",
];

const MUSICAL_INSTRUMENTS = [
  'bagpipes',
  'drum',
  'dulcimer',
  'flute',
  'lute',
  'lyre',
  'horn',
  'pan flute',
  'shawm',
  'viol',
];

const GAMING_SETS = [
  'dice set',
  'dragonchess set',
  'playing card set',
  'three-dragon ante set',
];

const STANDARD_LANGUAGES = [
  'common',
  'dwarvish',
  'elvish',
  'giant',
  'gnomish',
  'goblin',
  'halfling',
  'orc',
];

const EXOTIC_LANGUAGES = [
  'abyssal',
  'celestial',
  'draconic',
  'deep speech',
  'infernal',
  'primordial',
  'sylvan',
  'undercommon',
];

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

const ARMOR_PROFICIENCY_ALIASES: Record<string, string[]> = {
  light: ['armor:light', 'armor:轻甲'],
  medium: ['armor:medium', 'armor:中甲'],
  heavy: ['armor:heavy', 'armor:重甲'],
  shield: ['armor:shield', 'armor:盾牌'],
};

const WEAPON_PROFICIENCY_ALIASES: Record<string, string[]> = {
  simple: ['weapon:simple', 'weapon:简易'],
  martial: ['weapon:martial', 'weapon:军用'],
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
    return response.json();
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
  return content.classes.find(cls => cls.key === classKey && cls.source === RULE_SOURCE[ruleSystem]);
};

export const getAutoBuilderRaces = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
): AutoBuilderOrigin[] => {
  const priority = content.rules?.[ruleSystem]?.raceSources || RACE_SOURCE_PRIORITY[ruleSystem];
  const allowedSources = new Set(priority);
  const byName = new Map<string, AutoBuilderOrigin>();
  content.races
    .filter(race => allowedSources.has(race.source))
    .filter(race => ruleSystem === '5r' || race.source !== 'XPHB')
    .forEach(race => {
      const key = normalizeKey(race.englishName || race.key || race.name).toLowerCase();
      const existing = byName.get(key);
      if (!existing || priority.indexOf(race.source) < priority.indexOf(existing.source)) {
        byName.set(key, race);
      }
    });
  return Array.from(byName.values())
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
};

const sourcePriorityRank = (priority: string[], source: string): number => {
  const index = priority.indexOf(source);
  return index >= 0 ? index : priority.length;
};

const dedupeByNameAndSourcePriority = <T extends { name: string; englishName?: string; key?: string; source: string }>(
  items: T[],
  priority: string[],
): T[] => {
  const byName = new Map<string, T>();
  items.forEach(item => {
    const key = normalizeKey(item.englishName || item.key || item.name).toLowerCase();
    const existing = byName.get(key);
    if (!existing || sourcePriorityRank(priority, item.source) < sourcePriorityRank(priority, existing.source)) {
      byName.set(key, item);
    }
  });
  return Array.from(byName.values())
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
};

export const getAutoBuilderBackgrounds = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
): AutoBuilderOrigin[] => {
  const priority = BACKGROUND_SOURCE_PRIORITY[ruleSystem];
  const allowedSources = new Set(priority);
  return dedupeByNameAndSourcePriority(
    content.backgrounds
      .filter(background => allowedSources.has(background.source))
      .filter(background => ruleSystem === '5r' || background.source !== 'XPHB'),
    priority,
  );
};

export const getAutoBuilderSubraces = (
  content: AutoBuilderContent,
  race: AutoBuilderOrigin | undefined,
): AutoBuilderOrigin[] => {
  if (!race) return [];
  return content.subraces
    .filter(subrace => subrace.raceName === race.name && subrace.raceSource === race.source)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
};

export const getAutoBuilderOrigin = (
  origins: AutoBuilderOrigin[],
  key: string,
): AutoBuilderOrigin | undefined => origins.find(origin => origin.key === key) || origins[0];

export const getAutoBuilderSubclasses = (
  content: AutoBuilderContent,
  cls: AutoBuilderClass | undefined,
): AutoBuilderSubclass[] => {
  if (!cls) return [];
  const ruleSystem: RuleSystem = cls.source === 'XPHB' ? '5r' : '5e';
  const priority = SUBCLASS_SOURCE_PRIORITY[ruleSystem];
  const allowedSources = new Set(priority);
  return dedupeByNameAndSourcePriority(
    content.subclasses
      .filter(subclass => subclass.className === cls.name && subclass.classSource === cls.source)
      .filter(subclass => allowedSources.has(subclass.source))
      .filter(subclass => ruleSystem === '5r' || subclass.source !== 'XPHB'),
    priority,
  );
};

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
  if (!background?.feats?.length) return [];
  const refs = background.feats.flatMap(entry => (
    Object.entries(entry)
      .filter(([, value]) => value === true)
      .map(([key]) => parseEntityRef(key))
  ));
  return refs
    .map(ref => content.feats.find(feat => (
      (!ref.source || feat.source === ref.source)
      && (feat.name === ref.name || feat.key === ref.name || feat.englishName === ref.name)
    )))
    .filter((feat): feat is AutoBuilderFeat => Boolean(feat));
};

const expandToolChoiceKey = (key: string): string[] => {
	  const normalized = normalizeKey(key).toLowerCase();
	  if (normalized === 'anyartisanstool') return ARTISAN_TOOLS;
	  if (normalized === 'anymusicalinstrument') return MUSICAL_INSTRUMENTS;
	  if (normalized === 'anygamingset') return GAMING_SETS;
	  return [normalizeKey(key)];
	};

const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values));

const normalizeSkillName = (skill: string): string => {
  const normalized = normalizeKey(skill);
  return SKILL_MAP[normalized.toLowerCase()] || CHINESE_SKILL_MAP[normalized] || normalized;
};

const getSkillChoiceGroupsFromProficiencies = (
  proficiencies: ProficiencyRecord[] | undefined,
  sourceId: string,
): Array<{ id: string; label: string; from: string[]; count: number }> => {
  const choices: Array<{ id: string; label: string; from: string[]; count: number }> = [];
  (proficiencies || []).forEach((entry, entryIndex) => {
    Object.entries(entry).forEach(([key, value]) => {
      if (key === 'choose') {
        const choose = value as { from?: string[]; count?: number };
        if (!choose.from?.length) return;
        choices.push({
          id: `${sourceId}-skill-${entryIndex}-choose`,
          label: 'choose',
          from: uniqueStrings(choose.from.map(normalizeSkillName)),
          count: choose.count || 1,
        });
        return;
      }

      if (key === 'any' && typeof value === 'number') {
        choices.push({
          id: `${sourceId}-skill-${entryIndex}-any`,
          label: key,
          from: ALL_SKILLS,
          count: value,
        });
      }
    });
  });
  return choices.filter(choice => choice.from.length > 0 && choice.count > 0);
};

const getToolChoiceOptionsFromProficiencies = (
  proficiencies: ProficiencyRecord[] | undefined,
  sourceId: string,
): Array<{ id: string; label: string; from: string[]; count: number }> => {
  const choices: Array<{ id: string; label: string; from: string[]; count: number }> = [];
  (proficiencies || []).forEach((entry, entryIndex) => {
    Object.entries(entry).forEach(([key, value]) => {
      if (key === 'choose') {
        const choose = value as { from?: string[]; count?: number };
        if (!choose.from?.length) return;
        choices.push({
          id: `${sourceId}-tool-${entryIndex}-choose`,
          label: 'choose',
          from: uniqueStrings(choose.from.flatMap(expandToolChoiceKey)),
          count: choose.count || 1,
        });
        return;
      }

      if (typeof value === 'number') {
        choices.push({
          id: `${sourceId}-tool-${entryIndex}-${normalizeKey(key)}`,
          label: key,
          from: expandToolChoiceKey(key),
          count: value,
        });
      }
    });
  });
  return choices.filter(choice => choice.from.length > 0 && choice.count > 0);
};

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

const isMundaneWeaponFilter = (filter: string): boolean => (
  filter.includes('平凡') || filter.includes('寻常') || filter.toLowerCase().includes('mundane')
);

const getWeaponIdsFromFilter = (
  content: AutoBuilderContent,
  filter: string,
  ruleSystem: RuleSystem,
): string[] => {
  const lowerFilter = filter.toLowerCase();
  const wantsMartial = filter.includes('军用') || lowerFilter.includes('martial');
  const wantsSimple = filter.includes('简易') || lowerFilter.includes('simple');
  const preferredSource = RULE_SOURCE[ruleSystem];
  const sourceRank = (weapon: AutoBuilderWeapon): number => (
    weapon.source === preferredSource ? 0 : weapon.source === 'PHB' ? 1 : 2
  );
  return [...content.weapons]
    .filter(weapon => {
      if (wantsMartial && weapon.weaponCategory !== 'martial') return false;
      if (wantsSimple && weapon.weaponCategory !== 'simple') return false;
      if (isMundaneWeaponFilter(filter) && weapon.bonusWeapon) return false;
      return true;
    })
    .sort((a, b) => sourceRank(a) - sourceRank(b) || a.name.localeCompare(b.name, 'zh-Hans-CN'))
    .filter((weapon, index, weapons) => (
      weapons.findIndex(candidate => candidate.key === weapon.key) === index
    ))
    .map(weapon => weapon.id);
};

const getWeaponChoiceOptionsFromProficiencies = (
  content: AutoBuilderContent,
  proficiencies: ProficiencyRecord[] | undefined,
  sourceId: string,
  ruleSystem: RuleSystem,
): Array<{ id: string; label: string; from: string[]; count: number }> => {
  const choices: Array<{ id: string; label: string; from: string[]; count: number }> = [];
  (proficiencies || []).forEach((entry, entryIndex) => {
    const choose = entry.choose as { from?: string[]; fromFilter?: string; count?: number } | undefined;
    if (!choose) return;
    const from = choose.from?.length
      ? choose.from
          .map(ref => {
            const parsed = parseEntityRef(ref);
            return content.weapons.find(weapon => (
              (!parsed.source || weapon.source === parsed.source)
              && (weapon.key === parsed.name || weapon.name === parsed.name || weapon.englishName === parsed.name)
            ))?.id;
          })
          .filter((id): id is string => Boolean(id))
      : (choose.fromFilter ? getWeaponIdsFromFilter(content, choose.fromFilter, ruleSystem) : []);
    choices.push({
      id: `${sourceId}-weapon-${entryIndex}-choose`,
      label: 'choose',
      from: uniqueStrings(from),
      count: choose.count || 1,
    });
  });
  return choices.filter(choice => choice.from.length > 0 && choice.count > 0);
};

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
): Array<{ id: string; label: string; from: string[]; count: number }> => {
  const choices: Array<{ id: string; label: string; from: string[]; count: number }> = [];
  feat?.savingThrowProficiencies?.forEach((entry, index) => {
    Object.entries(entry).forEach(([key, value]) => {
      const choose = key === 'choose'
        ? value as { from?: string[]; count?: number }
        : (
            value && typeof value === 'object' && 'choose' in value
              ? (value.choose as { from?: string[]; count?: number })
              : null
          );
      if (!choose) return;
      const from = (choose.from || [])
        .map(normalizeAbilityName)
        .filter((ability): ability is AbilityName => Boolean(ability));
      if (from.length) {
        choices.push({
          id: `feat-${feat.key}-${feat.source}-save-${index}-${key}`,
          label: key,
          from,
          count: choose.count || 1,
        });
      }
    });
  });
  return choices;
};

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
): Array<{ id: string; label: string; from: string[]; count: number }> => {
  if (!feat?.expertise?.length) return [];
  const proficientSkills = uniqueStrings([
    ...Array.from(character.proficiencies).filter(skill => ALL_SKILLS.includes(skill)),
    ...getFixedFeatSkillProficiencies(feat),
    ...getSelectedSkillChoices(selectedSkillChoices),
  ]).sort((a, b) => a.localeCompare(b));

  const choices: Array<{ id: string; label: string; from: string[]; count: number }> = [];
  feat.expertise.forEach((entry, index) => {
    Object.entries(entry).forEach(([key, value]) => {
      if (key === 'anyProficientSkill' && typeof value === 'number') {
        choices.push({
          id: `feat-${feat.key}-${feat.source}-expertise-${index}-anyProficientSkill`,
          label: key,
          from: proficientSkills,
          count: value,
        });
      }
    });
  });
  return choices.filter(choice => choice.from.length > 0 && choice.count > 0);
};

const expandLanguageChoiceKey = (key: string): string[] => {
  const normalized = normalizeKey(key);
  if (normalized === 'anystandard') return STANDARD_LANGUAGES;
  if (normalized === 'anyexotic') return EXOTIC_LANGUAGES;
  if (normalized === 'anylanguage' || normalized === 'any') return [...STANDARD_LANGUAGES, ...EXOTIC_LANGUAGES];
  return [normalized];
};

const getLanguageChoiceOptionsFromProficiencies = (
  proficiencies: ProficiencyRecord[] | undefined,
  sourceId: string,
): Array<{ id: string; label: string; from: string[]; count: number }> => {
  const choices: Array<{ id: string; label: string; from: string[]; count: number }> = [];
  (proficiencies || []).forEach((entry, entryIndex) => {
    Object.entries(entry).forEach(([key, value]) => {
      if (key === 'choose') {
        const choose = value as { from?: string[]; count?: number };
        if (!choose.from?.length) return;
        choices.push({
          id: `${sourceId}-language-${entryIndex}-choose`,
          label: 'choose',
          from: uniqueStrings(choose.from.flatMap(expandLanguageChoiceKey)),
          count: choose.count || 1,
        });
        return;
      }

      if (typeof value === 'number') {
        choices.push({
          id: `${sourceId}-language-${entryIndex}-${normalizeKey(key)}`,
          label: key,
          from: expandLanguageChoiceKey(key),
          count: value,
        });
      }
    });
  });
  return choices.filter(choice => choice.from.length > 0 && choice.count > 0);
};

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
    (origin?.resist || []).flatMap(entry => {
      if (typeof entry === 'string') return [];
      if (!entry || typeof entry !== 'object' || !('choose' in entry)) return [];
      const from = (entry.choose as { from?: unknown[] }).from;
      return Array.isArray(from) ? from.filter((value): value is string => typeof value === 'string') : [];
    })
  ));
  return Array.from(new Set(options));
};

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
      if (!('choose' in entry)) continue;
      const choose = entry.choose as { from?: string[]; count?: number };
      if (!choose.from?.length || !choose.count) continue;
      return {
        from: choose.from
          .map(ability => ABILITY_MAP[ability])
          .filter((ability): ability is AbilityName => Boolean(ability)),
        count: choose.count,
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
      if (typeof entry.any === 'number') {
        return { from: ALL_SKILLS, count: entry.any };
      }
      if (!('choose' in entry)) continue;
      const choose = entry.choose as { from?: string[]; count?: number };
      if (!choose.from?.length) continue;
      return {
        from: choose.from.map(normalizeSkillName),
        count: choose.count || 1,
      };
    }
  }
  return null;
};

const getOfficialFeatOptions = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  character: CharacterData,
  level: number,
  predicate: (feat: AutoBuilderFeat) => boolean,
): AutoBuilderFeat[] => {
  const priority = FEAT_SOURCE_PRIORITY[ruleSystem];
  const byName = new Map<string, AutoBuilderFeat>();
  content.feats
    .filter(feat => OFFICIAL_FEAT_SOURCES.has(feat.source))
    .filter(feat => ruleSystem === '5r' || feat.source !== 'XPHB')
    .filter(predicate)
    .filter(feat => isFeatPrerequisiteMet(feat, character, level))
    .forEach(feat => {
      const key = feat.englishName || feat.name;
      const existing = byName.get(key);
      const currentPriority = priority.indexOf(feat.source);
      const existingPriority = existing ? priority.indexOf(existing.source) : Number.MAX_SAFE_INTEGER;
      if (!existing || (currentPriority >= 0 && currentPriority < existingPriority)) {
        byName.set(key, feat);
      }
    });

  return Array.from(byName.values())
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
};

export const getRaceFeatChoiceOptions = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  character: CharacterData,
  race: AutoBuilderOrigin | undefined,
  subrace?: AutoBuilderOrigin,
): { from: AutoBuilderFeat[]; count: number } | null => {
  for (const origin of [race, subrace]) {
    for (const entry of origin?.feats || []) {
      if (typeof entry.any === 'number') {
        const from = getOfficialFeatOptions(
          content,
          ruleSystem,
          character,
          1,
          feat => !feat.prerequisite?.length,
        );
        if (!from.length) return null;
        return {
          count: entry.any,
          from,
        };
      }
      const categoryChoice = entry.anyFromCategory as { category?: string[]; count?: number } | undefined;
      if (categoryChoice?.category?.length) {
        const categories = new Set(categoryChoice.category);
        const from = getOfficialFeatOptions(
          content,
          ruleSystem,
          character,
          1,
          feat => Boolean(feat.category && categories.has(feat.category)),
        );
        if (!from.length) return null;
        return {
          count: categoryChoice.count || 1,
          from,
        };
      }
    }
  }
  return null;
};

export const getOriginFeatChoiceOptions = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  character: CharacterData,
): { from: AutoBuilderFeat[]; count: number } | null => {
  if (ruleSystem !== '5r') return null;
  const from = getOfficialFeatOptions(
    content,
    ruleSystem,
    character,
    1,
    feat => feat.category === 'O' && !feat.prerequisite?.length,
  );
  return from.length ? { count: 1, from } : null;
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
  return [{
    id: `class-${cls?.key || 'unknown'}-${cls?.source || 'unknown'}-${level}-expertise`,
    label: 'Expertise',
    from,
    count: 2,
  }];
};

const isAbilityPrerequisiteMet = (
  character: CharacterData,
  entries: unknown,
): boolean => {
  if (!Array.isArray(entries)) return true;
  return entries.some(entry => {
    if (!entry || typeof entry !== 'object') return false;
    return Object.entries(entry as Record<string, unknown>).every(([ability, minimum]) => {
      const abilityName = ABILITY_MAP[ability];
      return Boolean(abilityName && typeof minimum === 'number' && character.abilities[abilityName] >= minimum);
    });
  });
};

const hasTaggedProficiency = (
  character: CharacterData,
  prefix: 'armor' | 'weapon',
  value: string,
): boolean => {
  const normalized = normalizeKey(value).toLowerCase();
  const aliases = prefix === 'armor'
    ? ARMOR_PROFICIENCY_ALIASES[normalized] || [`armor:${normalized}`]
    : WEAPON_PROFICIENCY_ALIASES[normalized] || [`weapon:${normalized}`];
  return aliases.some(key => character.proficiencies.has(key));
};

const isProficiencyPrerequisiteMet = (
  character: CharacterData,
  entries: unknown,
): boolean => {
  if (!Array.isArray(entries)) return true;
  return entries.every(entry => {
    if (!entry || typeof entry !== 'object') return false;
    return Object.entries(entry as Record<string, unknown>).every(([kind, value]) => {
      if ((kind === 'armor' || kind === 'weapon') && typeof value === 'string') {
        return hasTaggedProficiency(character, kind, value);
      }
      return false;
    });
  });
};

const namesMatch = (current: string, expected: unknown): boolean => {
  if (!current) return false;
  if (typeof expected === 'string') return current === expected;
  if (!expected || typeof expected !== 'object') return false;
  const entry = expected as { name?: string; ENG_name?: string };
  return Boolean((entry.name && current.includes(entry.name)) || (entry.ENG_name && current.includes(entry.ENG_name)));
};

const isNamedPrerequisiteMet = (
  current: string,
  entries: unknown,
): boolean => {
  if (!Array.isArray(entries)) return true;
  return entries.some(entry => namesMatch(current, entry));
};

const hasFeatPrerequisite = (
  character: CharacterData,
  entries: unknown,
): boolean => {
  if (!Array.isArray(entries)) return true;
  const knownFeatNames = character.featureEntries
    .filter(feature => feature.sourceId.startsWith('auto-feat-'))
    .map(feature => `${feature.name} ${feature.sourceName}`);
  return entries.every(entry => {
    const refName = normalizeEntityRef(String(entry));
    return knownFeatNames.some(name => name.includes(refName));
  });
};

const isSingleFeatPrerequisiteMet = (
  prerequisite: Record<string, unknown>,
  character: CharacterData,
  level: number,
): boolean => {
  for (const [key, value] of Object.entries(prerequisite)) {
    if (key === 'level') {
      if (typeof value !== 'number' || level < value) return false;
    } else if (key === 'ability') {
      if (!isAbilityPrerequisiteMet(character, value)) return false;
    } else if (key === 'spellcasting' || key === 'spellcasting2020') {
      if (!character.spellcastingProfiles.length) return false;
    } else if (key === 'proficiency') {
      if (!isProficiencyPrerequisiteMet(character, value)) return false;
    } else if (key === 'race') {
      if (!isNamedPrerequisiteMet(`${character.race} ${character.subrace}`.trim(), value)) return false;
    } else if (key === 'background') {
      if (!isNamedPrerequisiteMet(character.background, value)) return false;
    } else if (key === 'feat') {
      if (!hasFeatPrerequisite(character, value)) return false;
    } else {
      return false;
    }
  }
  return true;
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

const isFeatPrerequisiteMet = (
  feat: AutoBuilderFeat,
  character: CharacterData,
  level: number,
): boolean => {
  if (!feat.prerequisite?.length) return true;
  return feat.prerequisite.some(prerequisite => (
    Boolean(prerequisite)
    && typeof prerequisite === 'object'
    && isSingleFeatPrerequisiteMet(prerequisite as Record<string, unknown>, character, level)
  ));
};

export const getAbilityScoreImprovementFeatOptions = (
  content: AutoBuilderContent,
  ruleSystem: RuleSystem,
  character: CharacterData,
  level: number,
): AutoBuilderFeat[] => {
  return getOfficialFeatOptions(content, ruleSystem, character, level, () => true);
};

export const getFeatAbilityChoiceOptions = (feat: AutoBuilderFeat | undefined): AbilityName[] => {
  for (const entry of feat?.ability || []) {
    if (!('choose' in entry)) continue;
    const from = (entry.choose as { from?: string[] }).from;
    if (!from?.length) continue;
    return from
      .map(ability => ABILITY_MAP[ability])
      .filter((ability): ability is AbilityName => Boolean(ability));
  }
  return [];
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

export const getFeatSpellChoiceState = (
  content: AutoBuilderContent,
  feat: AutoBuilderFeat | undefined,
  ruleSystem: RuleSystem,
): { blocks: AutoBuilderFeatSpellBlockChoice[] } | null => {
  const blocks = (feat?.additionalSpells || [])
    .map((entry, index): AutoBuilderFeatSpellBlockChoice | null => {
      if (!entry || typeof entry !== 'object') return null;
      const block = entry as Record<string, unknown>;
      const id = `feat-${feat?.key || 'unknown'}-${feat?.source || 'unknown'}-spell-block-${index}`;
      const label = String(block.name || block.ENG_name || `${feat?.name || 'Feat'} ${index + 1}`);
      const parsed = collectFeatSpellChoices(block, content, ruleSystem, id);
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

const makeOriginResource = (
  origin: Pick<AutoBuilderOrigin, 'key' | 'name' | 'source'>,
  ruleSystem: RuleSystem,
  key: string,
  name: string,
  max: number,
  reset: CharacterResource['reset'],
  note?: string,
): AdjustmentOperation => ({
  type: 'upsertResource',
  resource: {
    id: `auto-resource-race-${origin.key}-${origin.source}-${key}`,
    sourceId: `auto-resource-race-${origin.key}-${origin.source}-${key}`,
    sourceName: `${origin.name} ${origin.source}`,
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

const createWeaponChoiceOperations = (
  content: AutoBuilderContent,
  choices?: AutoBuilderWeaponChoiceSelection,
): AdjustmentOperation[] => {
  return Object.values(choices || {}).flatMap(weaponIds => (
    weaponIds.flatMap(weaponId => {
      const weapon = content.weapons.find(item => item.id === weaponId);
      return weapon ? [{ type: 'addProficiency', key: `weapon:${weapon.key.toLowerCase()}` } satisfies AdjustmentOperation] : [];
    })
  ));
};

const createSkillChoiceOperations = (
  choices?: AutoBuilderSkillChoiceSelection,
): AdjustmentOperation[] => {
  return Object.values(choices || {}).flatMap(skills => (
    skills.map(skill => ({ type: 'addProficiency', key: normalizeSkillName(skill) } satisfies AdjustmentOperation))
  ));
};

const hasProficiencyAfterOperations = (
  character: CharacterData,
  operations: AdjustmentOperation[],
  key: string,
): boolean => {
  let proficient = character.proficiencies.has(key);
  for (const operation of operations) {
    if (operation.type === 'addProficiency' && operation.key === key) proficient = true;
    if (operation.type === 'removeProficiency' && operation.key === key) proficient = false;
  }
  return proficient;
};

const createFeatSkillChoiceOperations = (
  feat: AutoBuilderFeat,
  character: CharacterData,
  choices?: AutoBuilderSkillChoiceSelection,
  previousOperations: AdjustmentOperation[] = [],
): AdjustmentOperation[] => {
  if (feat.key !== 'Observant' || feat.source !== 'XPHB') return createSkillChoiceOperations(choices);
  return Object.values(choices || {}).flatMap(skills => (
    skills.map(skill => {
      const normalized = normalizeSkillName(skill);
      return {
        type: 'addProficiency',
        key: normalized,
        expertise: hasProficiencyAfterOperations(character, previousOperations, normalized),
      } satisfies AdjustmentOperation;
    })
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

const createSavingThrowChoiceOperations = (
  choices?: AutoBuilderSkillChoiceSelection,
): AdjustmentOperation[] => {
  return Object.values(choices || {}).flatMap(abilities => (
    abilities.map(ability => ({ type: 'addProficiency', key: ability } satisfies AdjustmentOperation))
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
): AdjustmentOperation[] => {
  const state = getFeatSpellChoiceState(content, feat, ruleSystem);
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
  const sourceKey = `auto-feat-${normalizeKey(feat.key)}-${feat.source}`;
  const profile: SpellcastingProfile = {
    id: `${sourceKey}-spells`,
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
): void => {
  if (!values.length) return;
  operations.push(...values.map(value => ({
    type: 'addTextEntry' as const,
    path,
    value,
  })));
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
): AdjustmentOperation[] => {
  const operations: AdjustmentOperation[] = [];
  const sourceId = `auto-${kind}-${entity.key}-${entity.source}`;
  if (kind === 'race' && entity.key === 'Warforged') {
    operations.push({ type: 'addNumber', path: 'armorBonus', value: 1 });
  }
  if (kind === 'race' && entity.key === 'Dwarf' && entity.source === 'XPHB') {
    operations.push({ type: 'addNumber', path: 'hpMaxBonus', value: Math.max(1, characterLevel) });
  }
  if (entity.darkvision) {
    addStructuredTextEntries(operations, 'senses', [`黑暗视觉 ${entity.darkvision} 尺`], {
      sourceId: `${sourceId}-darkvision`,
      sourceName: `${entity.name} ${entity.source}`,
      name: '黑暗视觉',
      ruleSystem,
      description: `你拥有 ${entity.darkvision} 尺黑暗视觉.`,
    });
  }
  if (entity.blindsight) {
    addStructuredTextEntries(operations, 'senses', [`盲视 ${entity.blindsight} 尺`], {
      sourceId: `${sourceId}-blindsight`,
      sourceName: `${entity.name} ${entity.source}`,
      name: '盲视',
      ruleSystem,
      description: `你拥有 ${entity.blindsight} 尺盲视.`,
    });
  }
  if (entity.tremorsense) {
    addStructuredTextEntries(operations, 'senses', [`震颤感知 ${entity.tremorsense} 尺`], {
      sourceId: `${sourceId}-tremorsense`,
      sourceName: `${entity.name} ${entity.source}`,
      name: '震颤感知',
      ruleSystem,
      description: `你拥有 ${entity.tremorsense} 尺震颤感知.`,
    });
  }
  if (entity.truesight) {
    addStructuredTextEntries(operations, 'senses', [`真实视觉 ${entity.truesight} 尺`], {
      sourceId: `${sourceId}-truesight`,
      sourceName: `${entity.name} ${entity.source}`,
      name: '真实视觉',
      ruleSystem,
      description: `你拥有 ${entity.truesight} 尺真实视觉.`,
    });
  }

  const sourceName = `${entity.name} ${entity.source}`;
  const fixedResistances = getFixedTextEntries(entity.resist);
  addStructuredTextEntries(operations, 'damageResistances', fixedResistances, {
    sourceId: `${sourceId}-fixed-resistances`,
    sourceName,
    name: '伤害抗性',
    ruleSystem,
    description: `你获得对 ${fixedResistances.join(', ')} 伤害的抗性.`,
  });
  const fixedImmunities = getFixedTextEntries(entity.immune);
  addStructuredTextEntries(operations, 'damageImmunities', fixedImmunities, {
    sourceId: `${sourceId}-fixed-immunities`,
    sourceName,
    name: '伤害免疫',
    ruleSystem,
    description: `你获得对 ${fixedImmunities.join(', ')} 伤害的免疫.`,
  });
  const fixedVulnerabilities = getFixedTextEntries(entity.vulnerable);
  addStructuredTextEntries(operations, 'damageVulnerabilities', fixedVulnerabilities, {
    sourceId: `${sourceId}-fixed-vulnerabilities`,
    sourceName,
    name: '伤害易伤',
    ruleSystem,
    description: `你对 ${fixedVulnerabilities.join(', ')} 伤害具有易伤.`,
  });
  const fixedConditionImmunities = getFixedTextEntries(entity.conditionImmune);
  addStructuredTextEntries(operations, 'conditionImmunities', fixedConditionImmunities, {
    sourceId: `${sourceId}-fixed-condition-immunities`,
    sourceName,
    name: '状态免疫',
    ruleSystem,
    description: `你免疫 ${fixedConditionImmunities.join(', ')} 状态.`,
  });

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

const createOriginResourceOperations = (
  entity: Pick<AutoBuilderOrigin, 'key' | 'name' | 'source'> & Partial<Pick<AutoBuilderOrigin, 'features'>>,
  kind: 'race' | 'background',
  ruleSystem: RuleSystem,
  characterLevel = 1,
): AdjustmentOperation[] => {
  if (kind !== 'race') return [];
  const operations: AdjustmentOperation[] = [];
  const profBonus = calculateProficiencyBonus(Math.max(1, characterLevel));
  if (entity.key === 'Orc' && entity.source === 'XPHB') {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'adrenaline-rush',
      '激昂冲锋',
      profBonus,
      'shortRest',
      '次数等于熟练加值. 使用时获得等同熟练加值的临时生命值.',
    ));
  }
  if (entity.key === 'Orc' && entity.source === 'MPMM') {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'adrenaline-rush',
      '激昂冲锋',
      profBonus,
      'longRest',
      '次数等于熟练加值. 使用时获得等同熟练加值的临时生命值.',
    ));
  }
  if (entity.key === 'Dwarf' && entity.source === 'XPHB') {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'stonecunning',
      '石中精妙',
      profBonus,
      'longRest',
      '次数等于熟练加值. 以附赠动作获得 60 尺震颤感知, 持续 10 分钟, 需位于或触碰岩石表面.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Relentless Endurance' || feature.name === '坚韧不屈')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'relentless-endurance',
      '坚韧不屈',
      1,
      'longRest',
      '生命值降至 0 且未立即死亡时, 可改为降至 1.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Healing Hands' || feature.name === '治愈之手')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'healing-hands',
      '治愈之手',
      1,
      'longRest',
      entity.source === 'VGM' ? '恢复等同角色等级的生命值.' : '恢复若干 d4, 骰数等同熟练加值.',
    ));
  }
  if (
    characterLevel >= 3
    && (entity.features || []).some(feature => feature.englishName === 'Celestial Revelation' || feature.name === '天界启示')
  ) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'celestial-revelation',
      '天界启示',
      1,
      'longRest',
      '以附赠动作变身, 持续 1 分钟.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === "Stone's Endurance" || feature.name === '石之坚韧')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'stones-endurance',
      '石之坚韧',
      entity.source === 'MPMM' ? profBonus : 1,
      entity.source === 'VGM' ? 'shortRest' : 'longRest',
      '以反应降低受到的伤害.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Giant Ancestry' || feature.name === '巨人先祖')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'giant-ancestry',
      '巨人先祖',
      profBonus,
      'longRest',
      '次数等于熟练加值. 使用你选择的巨人先祖恩惠, 如传送, 额外伤害, 减速, 击倒, 减伤或反击雷鸣伤害.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Starlight Step' || feature.name === '星光步')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'starlight-step',
      '星光步',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Rabbit Hop' || feature.name === '兔子跳跃')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'rabbit-hop',
      '兔子跳跃',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Taunt' || feature.name === '嘲讽')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'taunt',
      '嘲讽',
      profBonus,
      'longRest',
      '次数等于熟练加值. 以附赠动作迫使目标进行感知豁免, DC = 8 + 熟练加值 + 智力, 感知或魅力调整值.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Kenku Recall' || feature.name === '天狗回想')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'kenku-recall',
      '天狗回想',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Draconic Cry' || feature.name === '龙吼')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'draconic-cry',
      '龙吼',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Grovel, Cower, and Beg' || feature.name === '摇尾乞怜')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'grovel-cower-and-beg',
      '摇尾乞怜',
      1,
      'shortRest',
      '完成短休或长休后恢复.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Knowledge from a Past Life' || feature.name === '往昔学识')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'knowledge-from-a-past-life',
      '往昔学识',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Blessing of the Raven Queen' || feature.name === '鸦后祝福')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'blessing-of-the-raven-queen',
      '鸦后祝福',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Fearless' || feature.name === '无畏')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'fearless',
      '无畏',
      1,
      'longRest',
      '豁免失败时可改为成功.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Daunting Roar' || feature.name === '畏惧咆哮')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'daunting-roar',
      '畏惧咆哮',
      1,
      'shortRest',
      '完成短休或长休后恢复. 以附赠动作迫使 10 尺内目标进行感知豁免, DC = 8 + 熟练加值 + 体质调整值, 失败则陷入恐慌直到你的下回合结束.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Howl' || feature.name === '尖啸')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'howl',
      '尖啸',
      profBonus,
      'longRest',
      '次数等于熟练加值. 以附赠动作迫使 15 尺内目标进行感知豁免, DC = 8 + 熟练加值 + 体质调整值, 失败则攻击检定和豁免检定具有劣势直到你的下一回合开始.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Lethargy Resilience' || feature.name === '怠惰恢复力')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'lethargy-resilience',
      '怠惰恢复力',
      1,
      'manual',
      '为避免或结束昏迷状态的豁免失败时可改为成功. 使用后需要完成 1d4 次长休才可再次使用.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Partially Amphibious' || feature.name === '临时两栖')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'partially-amphibious',
      '临时两栖',
      1,
      'longRest',
      '可在水下呼吸最多 1 小时. 达到时限后, 直到完成长休前不能再次使用.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Eerie Token' || feature.name === '神秘信物')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'eerie-token',
      '神秘信物',
      1,
      'longRest',
      '以附赠动作创造魔法信物. 信物可用于远程传信或遥远视野, 完成长休后恢复.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Resourceful' || feature.name === '适应力')) {
    operations.push({ type: 'setBooleanField', field: 'inspiration', value: true });
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Fey Step' || feature.name === '妖精步伐')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'fey-step',
      '妖精步伐',
      entity.source === 'MPMM' ? profBonus : 1,
      entity.source === 'MPMM' ? 'longRest' : 'shortRest',
      entity.source === 'MPMM' ? '次数等于熟练加值.' : '完成短休或长休后恢复.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Hidden Step' || feature.name === '神隐步')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'hidden-step',
      '神隐步',
      entity.source === 'MPMM' ? profBonus : 1,
      entity.source === 'MPMM' ? 'longRest' : 'shortRest',
      entity.source === 'MPMM' ? '次数等于熟练加值.' : '完成短休或长休后恢复.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Hungry Jaws' || feature.name === '饥渴之喉')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'hungry-jaws',
      '饥渴之喉',
      entity.source === 'MPMM' ? profBonus : 1,
      entity.source === 'MPMM' ? 'longRest' : 'shortRest',
      entity.source === 'MPMM' ? '次数等于熟练加值.' : '完成短休或长休后恢复.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Vampiric Bite' || feature.name === '吸血啃咬')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'vampiric-bite',
      entity.source === 'RHW' ? '吸血啃咬增幅' : '吸血啃咬强化',
      profBonus,
      'longRest',
      '次数等于熟练加值. 命中非构装和非亡灵生物时, 可恢复生命值或强化下一次属性检定/攻击检定.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Svirfneblin Camouflage' || feature.name === '斯涅布力伪装')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'svirfneblin-camouflage',
      '斯涅布力伪装',
      profBonus,
      'longRest',
      '次数等于熟练加值. 使用时使一次敏捷(隐匿)检定具有优势.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Built for Success' || feature.name === '铸订成功')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'built-for-success',
      '铸订成功',
      profBonus,
      'longRest',
      '次数等于熟练加值. 看到 d20 后, 可为一次攻击检定, 属性检定或豁免检定追加 1d4.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Hadozee Dodge' || feature.name === '哈多兹闪避')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'hadozee-dodge',
      '哈多兹闪避',
      profBonus,
      'longRest',
      '次数等于熟练加值. 受伤时可以反应降低 1d6 + 熟练加值的伤害.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Astral Spark' || feature.name === '星界火花')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'astral-spark',
      '星界火花',
      profBonus,
      'longRest',
      '次数等于熟练加值. 每回合一次, 使用简易或军用武器命中时额外造成等同熟练加值的力场伤害.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Fey Gift' || feature.name === '精类赠礼')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'fey-gift',
      '精类赠礼',
      profBonus,
      'longRest',
      '次数等于熟练加值. 可用附赠动作执行协助动作; 3 级后可附加好客, 通行或恶意效果.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Shifting' || feature.name === '化形')) {
    const usesProficiency = entity.source === 'MPMM' || entity.source === 'EFA';
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'shifting',
      '化形',
      usesProficiency ? profBonus : 1,
      usesProficiency ? 'longRest' : 'shortRest',
      usesProficiency ? '次数等于熟练加值.' : '完成短休或长休后恢复.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Fury of the Small' || feature.name === '小个子的怒火')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'fury-of-the-small',
      '小个子的怒火',
      entity.source === 'MPMM' ? profBonus : 1,
      entity.source === 'MPMM' ? 'longRest' : 'shortRest',
      entity.source === 'MPMM' ? '次数等于熟练加值.' : '完成短休或长休后恢复.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Fortune from the Many' || feature.name === '集众之运')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'fortune-from-the-many',
      '集众之运',
      profBonus,
      'longRest',
      '次数等于熟练加值.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Saving Face' || feature.name === '挽回颜面')) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'saving-face',
      '挽回颜面',
      1,
      'shortRest',
      '完成短休或长休后恢复.',
    ));
  }
  if ((entity.features || []).some(feature => feature.englishName === 'Breath Weapon' || feature.name === '吐息武器')) {
    const usesProficiency = entity.source === 'XPHB' || entity.source === 'FTD';
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'breath-weapon',
      '吐息武器',
      usesProficiency ? profBonus : 1,
      usesProficiency ? 'longRest' : 'shortRest',
      usesProficiency ? '次数等于熟练加值.' : '完成短休或长休后恢复.',
    ));
  }
  if (
    characterLevel >= 5
    && (entity.features || []).some(feature => feature.englishName === 'Draconic Flight' || feature.name === '龙族飞翼')
  ) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'draconic-flight',
      '龙族飞翼',
      1,
      'longRest',
      '以附赠动作获得临时飞行速度, 持续 10 分钟.',
    ));
  }
  if (
    characterLevel >= 5
    && (entity.features || []).some(feature => feature.englishName === 'Chromatic Warding' || feature.name === '色彩守护')
  ) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'chromatic-warding',
      '色彩守护',
      1,
      'longRest',
      '以动作获得所选血统伤害类型免疫, 持续 1 分钟.',
    ));
  }
  if (
    characterLevel >= 5
    && (entity.features || []).some(feature => feature.englishName === 'Gem Flight' || feature.name === '宝石之翼')
  ) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'gem-flight',
      '宝石之翼',
      1,
      'longRest',
      '以附赠动作获得等同步行速度的飞行速度, 持续 1 分钟.',
    ));
  }
  if (
    characterLevel >= 5
    && (entity.features || []).some(feature => feature.englishName === 'Metallic Breath Weapon' || feature.name === '金属吐息武器')
  ) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'metallic-breath-weapon',
      '金属吐息武器',
      1,
      'longRest',
      '5 级起可使用第二种吐息武器.',
    ));
  }
  if (
    characterLevel >= 5
    && (entity.features || []).some(feature => feature.englishName === 'Large Form' || feature.name === '大型形态')
  ) {
    operations.push(makeOriginResource(
      entity,
      ruleSystem,
      'large-form',
      '大型形态',
      1,
      'longRest',
      '以附赠动作变为大型, 持续 10 分钟. 持续期间力量检定具有优势, 速度增加 10 尺.',
    ));
  }
  return operations;
};

const createOriginOperations = (
  entity: AutoBuilderOrigin,
  kind: 'race' | 'background',
  ruleSystem: RuleSystem,
  abilityChoice?: AutoBuilderAbilityChoice,
  toolChoices?: AutoBuilderToolChoiceSelection,
  characterLevel = 1,
): AdjustmentOperation[] => {
  const operations: AdjustmentOperation[] = [
    ...createEntityFeatureOperations(entity, kind, ruleSystem),
    ...createOriginStructuredFeatureOperations(entity, kind, ruleSystem, characterLevel),
    ...createOriginResourceOperations(entity, kind, ruleSystem, characterLevel),
    ...createAbilityOperations(entity, abilityChoice),
    ...createFixedProficiencyOperations(entity.skillProficiencies, ''),
    ...createFixedProficiencyOperations(entity.toolProficiencies, 'tool'),
    ...createToolChoiceOperations(toolChoices),
    ...createFixedProficiencyOperations(entity.languageProficiencies, 'language'),
    ...createFixedProficiencyOperations(entity.weaponProficiencies, 'weapon'),
    ...createFixedProficiencyOperations(entity.armorProficiencies, 'armor'),
  ];

  const walkSpeed = getWalkSpeed(entity.speed);
  if (walkSpeed !== null) {
    operations.push({ type: 'set', path: 'speed', value: String(walkSpeed) });
  }
  if (entity.size?.length === 1) {
    operations.push({ type: 'setStringField', field: 'bodyType', value: formatSize(entity.size[0]) });
  }
  if (
    kind === 'race'
    && (entity.features || []).some(feature => feature.englishName === 'Hare-Trigger' || feature.name === '野兔敏锐')
  ) {
    operations.push({ type: 'addNumber', path: 'initiativeBonus', value: calculateProficiencyBonus(Math.max(1, characterLevel)) });
  }

  return operations;
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
): AdjustmentOperation[] => {
  const operations: AdjustmentOperation[] = [];
  for (const ability of choices?.abilities || []) {
    operations.push({ type: 'addNumber', path: `abilities.${ability}`, value: 1 });
  }
  for (const skill of choices?.skills || []) {
    operations.push({ type: 'addProficiency', key: skill });
  }
  if (choices?.resistance) {
    const sourceId = `auto-race-${race.key}-${race.source}-choice-resistance`;
    operations.push({
      type: 'addTextEntry',
      path: 'damageResistances',
      value: choices.resistance,
    });
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
  if (choices?.size) {
    operations.push({ type: 'setStringField', field: 'bodyType', value: formatSize(choices.size) });
  }
  operations.push(...createWeaponChoiceOperations(content, choices?.weaponChoices));
  operations.push(...createChosenFeatOperations(content, character, ruleSystem, choices, operations));
  return operations;
};

const createChosenFeatOperations = (
  content: AutoBuilderContent,
  character: CharacterData,
  ruleSystem: RuleSystem,
  choices?: AutoBuilderFeatChoice,
  previousOperations: AdjustmentOperation[] = [],
  characterLevel = Math.max(1, getTotalLevel(character.classes)),
): AdjustmentOperation[] => {
  if (!choices?.featId) return [];
  const feat = content.feats.find(item => item.key === choices.featId || `${item.key}|${item.source}` === choices.featId);
  if (!feat) return [];

  const abilitiesAfterPreviousOperations = ABILITY_OPTIONS.reduce<CharacterData['abilities']>((abilities, ability) => ({
    ...abilities,
    [ability]: abilities[ability] + getAbilityDeltaFromOperations(previousOperations, ability),
  }), { ...character.abilities });

  return [
    ...createFeatOperations([feat], ruleSystem, characterLevel),
    ...createFeatFixedAbilityOperations(feat, abilitiesAfterPreviousOperations, choices.featAbility),
    ...createFeatSkillChoiceOperations(feat, character, choices.featSkillChoices, previousOperations),
    ...createToolChoiceOperations(choices.featToolChoices),
    ...createWeaponChoiceOperations(content, choices.featWeaponChoices),
    ...createExpertiseChoiceOperations(choices.featExpertiseChoices),
    ...createLanguageChoiceOperations(choices.featLanguageChoices),
    ...createSavingThrowChoiceOperations(choices.featSavingThrowChoices),
    ...createFeatSpellOperations(content, ruleSystem, feat, choices),
    ...createFightingStyleFeatureOperations(content, { key: feat.key, name: feat.name, source: feat.source } as AutoBuilderClass, ruleSystem, choices.featFightingStyleFeatureId),
    ...createInvocationOperations(content, { invocationIds: choices.featInvocations || [] }, { ruleSystem, level: characterLevel }),
    ...createManeuverOperations(content, ruleSystem, choices.featManeuvers),
    ...createMetamagicOperations(content, ruleSystem, choices.featMetamagics),
  ];
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
    if (feat.key === 'Boon of Truesight') {
      featOperations.push({ type: 'addTextEntry', path: 'senses', value: '真实视觉 60 尺' });
    }
    if (feat.key === 'Ember of the Fire Giant') {
      featOperations.push({ type: 'addTextEntry', path: 'damageResistances', value: '火焰' });
    }
    if (feat.key === 'Fury of the Frost Giant') {
      featOperations.push({ type: 'addTextEntry', path: 'damageResistances', value: '寒冷' });
    }
    featOperations.push(...getFeatResourceOperations(feat, ruleSystem, characterLevel));
    const fixedSavingThrows = (feat.savingThrowProficiencies || []).flatMap(entry => (
      Object.entries(entry).flatMap(([key, value]) => {
        if (value !== true) return [];
        const ability = normalizeAbilityName(key);
        return ability ? [{ type: 'addProficiency', key: ability } satisfies AdjustmentOperation] : [];
      })
    ));
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
      ...createFixedProficiencyOperations(feat.skillProficiencies, ''),
      ...createFixedProficiencyOperations(feat.toolProficiencies, 'tool'),
      ...createFixedProficiencyOperations(feat.languageProficiencies, 'language'),
      ...fixedSavingThrows,
      ...createFixedProficiencyOperations(feat.weaponProficiencies, 'weapon'),
      ...createFixedProficiencyOperations(feat.armorProficiencies, 'armor'),
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
    operations.push(...createOriginResourceOperations(
      { key, name, source, features },
      'race',
      ruleSystem,
      newCharacterLevel,
    ));
  };
  if (hasAppliedRace(character, 'Dwarf', 'XPHB')) {
    operations.push({ type: 'addNumber', path: 'hpMaxBonus', value: levelDelta });
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
  if (hasAppliedRace(character, 'Harengon', 'MPMM') || hasAppliedRace(character, 'Harengon', 'WBtW')) {
    const oldBonus = calculateProficiencyBonus(Math.max(1, oldCharacterLevel));
    const newBonus = calculateProficiencyBonus(Math.max(1, newCharacterLevel));
    const bonusDelta = newBonus - oldBonus;
    if (bonusDelta > 0) {
      operations.push({ type: 'addNumber', path: 'initiativeBonus', value: bonusDelta });
    }
  }
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

const createFeatFixedAbilityOperations = (
  feat: AutoBuilderFeat,
  abilities: CharacterData['abilities'],
  selectedAbility?: AbilityName,
): AdjustmentOperation[] => {
  const operations: AdjustmentOperation[] = [];
  for (const abilityEntry of feat.ability || []) {
    if ('choose' in abilityEntry) {
      if (!selectedAbility) continue;
      const from = ((abilityEntry.choose as { from?: string[] }).from || [])
        .map(ability => ABILITY_MAP[ability])
        .filter((ability): ability is AbilityName => Boolean(ability));
      if (!from.includes(selectedAbility)) continue;
      const max = typeof (abilityEntry as { max?: unknown }).max === 'number' ? (abilityEntry as { max: number }).max : 20;
      const delta = Math.min(1, Math.max(0, max - abilities[selectedAbility]));
      if (delta > 0) operations.push({ type: 'addNumber', path: `abilities.${selectedAbility}`, value: delta });
      continue;
    }
    for (const [ability, value] of Object.entries(abilityEntry)) {
      const abilityName = ABILITY_MAP[ability];
      if (!abilityName || typeof value !== 'number') continue;
      const delta = Math.min(value, Math.max(0, 20 - abilities[abilityName]));
      if (delta > 0) operations.push({ type: 'addNumber', path: `abilities.${abilityName}`, value: delta });
    }
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
      ...createFeatFixedAbilityOperations(feat, character.abilities, choice.featAbility),
      ...createFeatSkillChoiceOperations(feat, character, choice.featSkillChoices),
      ...createToolChoiceOperations(choice.featToolChoices),
      ...createWeaponChoiceOperations(content, choice.featWeaponChoices),
      ...createExpertiseChoiceOperations(choice.featExpertiseChoices),
      ...createLanguageChoiceOperations(choice.featLanguageChoices),
      ...createSavingThrowChoiceOperations(choice.featSavingThrowChoices),
      ...createFeatSpellOperations(content, ruleSystem, feat, choice),
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
): { from: string[]; count: number } | null => {
  const skills = proficiencies?.skills;
  if (!Array.isArray(skills)) return null;
  const choose = skills.find((entry: any) => entry.choose)?.choose;
  if (!choose?.from?.length || !choose.count) return null;
  return {
    count: choose.count,
    from: choose.from.map((skill: string) => SKILL_MAP[skill] || skill),
  };
};

export const getSkillChoiceOptions = (cls: AutoBuilderClass): { from: string[]; count: number } | null => (
  getSkillChoiceOptionsFromProficiencies(cls.startingProficiencies)
);

export const getMulticlassSkillChoiceOptions = (cls: AutoBuilderClass): { from: string[]; count: number } | null => (
  getSkillChoiceOptionsFromProficiencies(cls.multiclassProficiencies)
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
    ...createOriginOperations(options.race, 'race', options.ruleSystem),
    ...(options.subrace ? createOriginOperations(options.subrace, 'race', options.ruleSystem) : []),
    ...createRaceChoiceOperations(content, character, options.race, options.ruleSystem, options.raceChoices),
    ...createToolChoiceOperations(options.raceChoices?.toolChoices),
    ...createLanguageChoiceOperations(options.raceChoices?.languageChoices),
    ...(options.decoupleOriginFromBackground
      ? [
          ...createOriginProficiencyOperations(options.background, options.backgroundToolChoices),
          ...createAbilityOperations(options.background, options.backgroundAbilityChoice, false),
        ]
      : createOriginOperations(options.background, 'background', options.ruleSystem, options.backgroundAbilityChoice, options.backgroundToolChoices)
    ),
    ...createLanguageChoiceOperations(options.backgroundLanguageChoices),
    ...createFeatOperations(backgroundFeats, options.ruleSystem, 1),
    ...createChosenFeatOperations(content, character, options.ruleSystem, options.originFeatChoice, [], 1),
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
  const existingOriginLevelUpOperations = createExistingOriginLevelUpOperations(
    character,
    oldTotalLevel,
    newTotalLevel,
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
	        ...existingOriginLevelUpOperations,
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
