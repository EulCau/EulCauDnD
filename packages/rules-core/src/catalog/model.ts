import type { JsonObject, JsonValue } from '../model/json.js';

export type RuleSystem = '5e' | '5r';
export type RuleAbilityName = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export interface RuleEntity {
  id?: string;
  key: string;
  name: string;
  englishName?: string;
  source: string;
}

export type RuleProficiencyRecord = Record<
  string,
  true | number | { choose?: unknown } | { category?: string[]; count?: number }
>;
export type RuleClassProficiencyEntry = string | { proficiency?: string; full?: string };

export interface RuleFeature {
  name: string;
  englishName?: string;
  source?: string;
  level?: number;
  description: string;
}

export interface RuleClass extends RuleEntity {
  englishName: string;
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
  additionalPreparedSpells?: RuleAdditionalPreparedSpell[];
  invocationProgression?: number[];
  metamagicProgression?: number[];
  weaponMasteryProgression?: number[];
  channelDivinityProgression?: number[];
  favoredEnemyProgression?: number[];
  sorceryPointProgression?: number[];
  subclassLevels?: number[];
  startingProficiencies?: RuleClassProficiencies;
  multiclassProficiencies?: RuleClassProficiencies;
  levelOneFeatures: RuleFeature[];
  levelFeatures: RuleFeature[];
}

export interface RuleAdditionalPreparedSpell {
  mode?: 'prepared' | 'expanded';
  level: number;
  name: string;
  source: string;
}

export interface RuleClassProficiencies {
  armor?: RuleClassProficiencyEntry[];
  weapons?: RuleClassProficiencyEntry[];
  tools?: string[];
  toolProficiencies?: RuleProficiencyRecord[];
  skills?: Array<{ choose?: { from?: string[]; count?: number } }>;
}

export interface RuleSubclass extends RuleEntity {
  id: string;
  shortName: string;
  className: string;
  classSource: string;
  features: RuleFeature[];
  maneuverProgression?: number[];
  additionalPreparedSpells?: RuleAdditionalPreparedSpell[];
}

export interface RuleOrigin extends RuleEntity {
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
  skillProficiencies?: RuleProficiencyRecord[];
  toolProficiencies?: RuleProficiencyRecord[];
  languageProficiencies?: RuleProficiencyRecord[];
  weaponProficiencies?: RuleProficiencyRecord[];
  armorProficiencies?: RuleProficiencyRecord[];
  feats?: RuleProficiencyRecord[];
  additionalSpells?: unknown[];
  features: RuleFeature[];
  raceName?: string;
  raceSource?: string;
}

export interface RuleFeatCatalogEntry extends RuleEntity {
  category?: string;
  prerequisite?: unknown[];
  ability?: Array<Record<string, number> | { choose?: unknown }>;
  darkvision?: number;
  blindsight?: number;
  tremorsense?: number;
  truesight?: number;
  resist?: unknown[];
  immune?: unknown[];
  vulnerable?: unknown[];
  conditionImmune?: unknown[];
  skillProficiencies?: RuleProficiencyRecord[];
  toolProficiencies?: RuleProficiencyRecord[];
  languageProficiencies?: RuleProficiencyRecord[];
  savingThrowProficiencies?: RuleProficiencyRecord[];
  weaponProficiencies?: RuleProficiencyRecord[];
  armorProficiencies?: RuleProficiencyRecord[];
  expertise?: RuleProficiencyRecord[];
  additionalSpells?: unknown[];
  fightingStyleCount?: number;
  invocationCount?: number;
  maneuverCount?: number;
  metamagicCount?: number;
  features: RuleFeature[];
}

export interface RuleSpell {
  id: string;
  key?: string;
  name: string;
  englishName?: string;
  source: string;
  ruleSystem: RuleSystem;
  level: number;
  school?: string;
  time: Array<{ number?: number; unit?: string }>;
  range: JsonValue;
  components: JsonObject;
  duration: JsonObject[];
  meta?: { ritual?: boolean };
  damageInflict?: string[];
  spellAttack?: string[];
  classKeys: string[];
  subclassIds?: string[];
  description?: string;
}

export interface RuleWeapon extends RuleEntity {
  id: string;
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
}

export interface RuleArmor extends RuleEntity {
  id: string;
  ruleSystem: RuleSystem;
  type?: string;
  ac?: number;
  strength?: string;
  stealth?: boolean;
}

export interface RuleWeaponMastery extends RuleEntity {
  id: string;
  description: string;
}

export interface RuleOptionalFeature extends RuleEntity {
  id: string;
  description: string;
  prerequisite?: unknown[];
}

export interface RuleFightingStyle extends RuleOptionalFeature {
  featureTypes: string[];
}

export interface RuleSourceConfiguration {
  primarySources: string[];
  spellSources: string[];
  invocationSources?: string[];
  fightingStyleSources?: string[];
  metamagicSources?: string[];
  maneuverSources?: string[];
  raceSources?: string[];
  officialExtensionsEnabled?: boolean;
}

export interface RuleCatalog {
  generatedAt: string;
  rules?: Partial<Record<RuleSystem, RuleSourceConfiguration>>;
  classes: RuleClass[];
  subclasses: RuleSubclass[];
  races: RuleOrigin[];
  subraces: RuleOrigin[];
  backgrounds: RuleOrigin[];
  feats: RuleFeatCatalogEntry[];
  invocations: RuleOptionalFeature[];
  fightingStyles: RuleFightingStyle[];
  metamagics: RuleOptionalFeature[];
  maneuvers: RuleOptionalFeature[];
  weapons: RuleWeapon[];
  weaponMasteries: RuleWeaponMastery[];
  armors: RuleArmor[];
  spells: RuleSpell[];
}
