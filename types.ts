export type AbilityName = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export interface AbilityScores {
  STR: number;
  DEX: number;
  CON: number;
  INT: number;
  WIS: number;
  CHA: number;
}

export interface SkillDefinition {
  name: string;
  ability: AbilityName;
}

export interface Attack {
  id: string;
  name: string;
  bonus: string;
  damage: string;
  type: string;
  notes: string;
  sourceId?: string;
  sourceName?: string;
  automatic?: boolean;
}

export interface Currency {
  cp: string;
  sp: string;
  ep: string;
  gp: string;
  pp: string;
}

export interface Spell {
  id: string;
  level: number;
  name: string;
  prepared: boolean;
  time: string;
  range: string;
  components: string; // V, S, M
  duration: string;
  concentration: boolean;
  ritual: boolean;
}

export interface SpellSlot {
  total: string;
  expended: string;
}

export type RuleSystem = '5e' | '5r';

export type AdjustmentPath =
  | `abilities.${AbilityName}`
  | 'armorBase'
  | 'armorBonus'
  | 'initiativeBonus'
  | 'initiativeOverride'
  | 'speed'
  | 'speedBonus'
  | 'hpCurrent'
  | 'hpMaxBonus'
  | 'hpMaxOverride'
  | 'hitDiceTotal'
  | 'hitDiceUsed';

export type AdjustmentOperation =
  | {
      type: 'set';
      path: AdjustmentPath;
      value: number | string | null;
      previousValue?: number | string | null;
    }
  | {
      type: 'setStringField';
      field: 'race' | 'subrace' | 'background' | 'bodyType';
      value: string;
      previousValue?: string;
    }
  | {
      type: 'setClasses';
      value: ClassItem[];
      previousValue?: ClassItem[];
    }
  | {
      type: 'setAutomation';
      value: CharacterData['automation'];
      previousValue?: CharacterData['automation'];
    }
  | {
      type: 'setSpellcasting';
      value: CharacterData['spellcasting'];
      previousValue?: CharacterData['spellcasting'];
    }
  | {
      type: 'setSpellcastingProfiles';
      value: SpellcastingProfile[];
      previousValue?: SpellcastingProfile[];
    }
  | {
      type: 'upsertSpellcastingProfile';
      profile: SpellcastingProfile;
      previousProfile?: SpellcastingProfile;
    }
  | {
      type: 'upsertResource';
      resource: CharacterResource;
      previousResource?: CharacterResource;
    }
  | {
      type: 'addNumber';
      path: AdjustmentPath;
      value: number;
    }
  | {
      type: 'addProficiency';
      key: string;
      expertise?: boolean;
      previousProficient?: boolean;
      previousExpertise?: boolean;
    }
  | {
      type: 'removeProficiency';
      key: string;
      previousProficient?: boolean;
      previousExpertise?: boolean;
    }
  | {
      type: 'addFeature';
      feature: CharacterFeatureEntry;
      previousFeature?: CharacterFeatureEntry;
    }
  | {
      type: 'addAttack';
      attack: Attack;
      previousAttack?: Attack;
    }
  | {
      type: 'addSpell';
      profileId: string;
      spell: Spell;
      previousSpell?: Spell;
    };

export interface CharacterFeatureEntry {
  id: string;
  sourceId: string;
  sourceName: string;
  name: string;
  level?: number;
  ruleSystem?: RuleSystem;
  description: string;
}

export interface AppliedAdjustment {
  id: string;
  sourceId: string;
  sourceName: string;
  operations: AdjustmentOperation[];
  appliedAt: string;
}

export interface CharacterResource {
  id: string;
  sourceId: string;
  sourceName: string;
  name: string;
  current: number;
  max: number;
  reset: 'shortRest' | 'longRest' | 'dawn' | 'manual';
  note?: string;
  ruleSystem?: RuleSystem;
}

export interface SpellcastingProfile {
  id: string;
  classId?: string;
  className: string;
  ability: AbilityName;
  preparationMode: 'preparedAll' | 'knownSelection' | 'manual';
  slotSource?: 'class' | 'shared' | 'pact';
  saveDCOverride: string;
  attackBonusOverride: string;
  slots: { [level: number]: SpellSlot };
  spells: Spell[];
}

export interface ClassItem {
  id: string;
  name: string;
  level: number;
  subclass: string;
  source?: string;
}

export interface CharacterData {
  name: string;
  race: string;
  subrace: string;
  
  // Multiclassing support
  classes: ClassItem[];
  // Legacy fields for backward compatibility types (will be migrated)
  class?: string;
  subclass?: string;
  level?: number;

  alignment: string;
  background: string;
  playerName: string;
  experience: string;
  bodyType: string;
  
  // Stats
  abilities: AbilityScores;
  inspiration: boolean;
  
  // Proficiencies
  proficiencies: Set<string>;
  expertises: Set<string>;

  // Combat Stats
  acOverride: number | null;
  armorBase: number;
  armorBonus: number;
  initiativeBonus: number;
  initiativeOverride: number | null;
  speed: string;
  speedBonus: number;
  hpCurrent: number;
  hpMaxBonus: number;
  hpMaxOverride: number | null;
  hpTemp: string;
  hitDiceTotal: string;
  hitDiceUsed: string;
  
  deathSaves: {
    success: [boolean, boolean, boolean];
    failures: [boolean, boolean, boolean];
  };
  
  // Personality
  traits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  
  // Attacks
  attacks: Attack[];
  
  // Inventory / Bottom Section
  proficienciesText: {
    armor: string;
    weapons: string;
    tools: string;
    languages: string;
    other: string;
  };
  currency: Currency;
  status: {
    concentrating: boolean;
    conditions: string;
    other: string;
  };
  
  // Features & Traits
  features: string;
  featureEntries: CharacterFeatureEntry[];
  resources: CharacterResource[];
  appliedAdjustments: AppliedAdjustment[];
  automation: {
    ruleSystem: RuleSystem;
    officialExtensionsEnabled: boolean;
    active: boolean;
    originDecoupled?: boolean;
  };

  // Spellcasting
  spellcasting: {
    class: string;
    ability: AbilityName;
    saveDCOverride: string;
    attackBonusOverride: string;
    slots: { [level: number]: SpellSlot }; // 1-9
    spells: Spell[];
  };
  spellcastingProfiles: SpellcastingProfile[];

  backstory: string;
}

export const createEmptySpellSlots = (): { [level: number]: SpellSlot } => ({
  1: { total: "0", expended: "0" },
  2: { total: "0", expended: "0" },
  3: { total: "0", expended: "0" },
  4: { total: "0", expended: "0" },
  5: { total: "0", expended: "0" },
  6: { total: "0", expended: "0" },
  7: { total: "0", expended: "0" },
  8: { total: "0", expended: "0" },
  9: { total: "0", expended: "0" },
});

export const INITIAL_CHARACTER: CharacterData = {
  name: "",
  race: "",
  subrace: "",
  classes: [
    { id: '1', name: 'Fighter', level: 1, subclass: '' }
  ],
  alignment: "",
  background: "",
  playerName: "",
  experience: "0",
  bodyType: "",
  abilities: {
    STR: 10,
    DEX: 10,
    CON: 10,
    INT: 10,
    WIS: 10,
    CHA: 10,
  },
  inspiration: false,
  proficiencies: new Set(),
  expertises: new Set(),
  acOverride: null,
  armorBase: 10,
  armorBonus: 0,
  initiativeBonus: 0,
  initiativeOverride: null,
  speed: "30",
  speedBonus: 0,
  hpCurrent: 10,
  hpMaxBonus: 0,
  hpMaxOverride: null,
  hpTemp: "",
  hitDiceTotal: "1d10",
  hitDiceUsed: "0",
  deathSaves: {
    success: [false, false, false],
    failures: [false, false, false]
  },
  traits: "",
  ideals: "",
  bonds: "",
  flaws: "",
  attacks: [
    { id: '1', name: "", bonus: "", damage: "", type: "", notes: "" },
    { id: '2', name: "", bonus: "", damage: "", type: "", notes: "" },
    { id: '3', name: "", bonus: "", damage: "", type: "", notes: "" },
  ],
  proficienciesText: {
    armor: "",
    weapons: "",
    tools: "",
    languages: "",
    other: ""
  },
  currency: {
    cp: "", sp: "", ep: "", gp: "", pp: ""
  },
  status: {
    concentrating: false,
    conditions: "",
    other: ""
  },
  features: "",
  featureEntries: [],
  resources: [],
  appliedAdjustments: [],
  automation: {
    ruleSystem: "5e",
    officialExtensionsEnabled: true,
    active: false,
    originDecoupled: false,
  },
  spellcasting: {
    class: "",
    ability: 'INT',
    saveDCOverride: "",
    attackBonusOverride: "",
    slots: createEmptySpellSlots(),
    spells: []
  },
  spellcastingProfiles: [],
  backstory: ""
};
