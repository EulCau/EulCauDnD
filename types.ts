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

export interface ClassItem {
  id: string;
  name: string;
  level: number;
  subclass: string;
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
  initiativeOverride: number | null;
  speed: string;
  hpCurrent: number;
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

  // Spellcasting
  spellcasting: {
    class: string;
    ability: AbilityName;
    saveDCOverride: string;
    attackBonusOverride: string;
    slots: { [level: number]: SpellSlot }; // 1-9
    spells: Spell[];
  };

  backstory: string;
}

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
  initiativeOverride: null,
  speed: "30",
  hpCurrent: 10,
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
  spellcasting: {
    class: "",
    ability: 'INT',
    saveDCOverride: "",
    attackBonusOverride: "",
    slots: {
        1: { total: "0", expended: "0" },
        2: { total: "0", expended: "0" },
        3: { total: "0", expended: "0" },
        4: { total: "0", expended: "0" },
        5: { total: "0", expended: "0" },
        6: { total: "0", expended: "0" },
        7: { total: "0", expended: "0" },
        8: { total: "0", expended: "0" },
        9: { total: "0", expended: "0" },
    },
    spells: []
  },
  backstory: ""
};