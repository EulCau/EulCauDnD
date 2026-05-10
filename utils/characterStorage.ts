import { CharacterData, ClassItem, INITIAL_CHARACTER } from '../types';

type StoredCharacter = Omit<CharacterData, 'proficiencies' | 'expertises'> & {
  proficiencies?: string[];
  expertises?: string[];
};

const cloneInitialCharacter = (): CharacterData => ({
  ...INITIAL_CHARACTER,
  abilities: { ...INITIAL_CHARACTER.abilities },
  classes: INITIAL_CHARACTER.classes.map(cls => ({ ...cls })),
  proficiencies: new Set(INITIAL_CHARACTER.proficiencies),
  expertises: new Set(INITIAL_CHARACTER.expertises),
  attacks: INITIAL_CHARACTER.attacks.map(attack => ({ ...attack })),
  proficienciesText: { ...INITIAL_CHARACTER.proficienciesText },
  currency: { ...INITIAL_CHARACTER.currency },
  status: { ...INITIAL_CHARACTER.status },
  deathSaves: {
    success: [...INITIAL_CHARACTER.deathSaves.success],
    failures: [...INITIAL_CHARACTER.deathSaves.failures],
  },
  spellcasting: {
    ...INITIAL_CHARACTER.spellcasting,
    slots: Object.fromEntries(
      Object.entries(INITIAL_CHARACTER.spellcasting.slots).map(([level, slot]) => [
        level,
        { ...slot },
      ]),
    ),
    spells: INITIAL_CHARACTER.spellcasting.spells.map(spell => ({ ...spell })),
  },
});

const normalizeClasses = (raw: Partial<CharacterData>): ClassItem[] => {
  if (Array.isArray(raw.classes) && raw.classes.length > 0) {
    return raw.classes.map((cls, index) => ({
      id: cls.id || `class-${index + 1}`,
      name: cls.name || 'Fighter',
      level: Number.isFinite(cls.level) ? cls.level : 1,
      subclass: cls.subclass || '',
    }));
  }

  return [
    {
      id: 'migrated-1',
      name: raw.class || 'Fighter',
      level: raw.level || 1,
      subclass: raw.subclass || '',
    },
  ];
};

export const normalizeCharacter = (raw: Partial<CharacterData> = {}): CharacterData => {
  const defaults = cloneInitialCharacter();
  const next = {
    ...defaults,
    ...raw,
    abilities: { ...defaults.abilities, ...raw.abilities },
    classes: normalizeClasses(raw),
    attacks: Array.isArray(raw.attacks) && raw.attacks.length > 0 ? raw.attacks : defaults.attacks,
    proficienciesText: { ...defaults.proficienciesText, ...raw.proficienciesText },
    currency: { ...defaults.currency, ...raw.currency },
    status: { ...defaults.status, ...raw.status },
    deathSaves: { ...defaults.deathSaves, ...raw.deathSaves },
    spellcasting:
      raw.spellcasting && typeof raw.spellcasting === 'object'
        ? {
            ...defaults.spellcasting,
            ...raw.spellcasting,
            slots: { ...defaults.spellcasting.slots, ...raw.spellcasting.slots },
            spells: Array.isArray(raw.spellcasting.spells) ? raw.spellcasting.spells : [],
          }
        : defaults.spellcasting,
    proficiencies: new Set(Array.isArray(raw.proficiencies) ? raw.proficiencies : []),
    expertises: new Set(Array.isArray(raw.expertises) ? raw.expertises : []),
  };

  if (typeof raw.spells === 'string') {
    next.spellcasting = defaults.spellcasting;
  }

  return next;
};

export const serializeCharacter = (character: CharacterData): StoredCharacter => ({
  ...character,
  proficiencies: Array.from(character.proficiencies),
  expertises: Array.from(character.expertises),
});

export const parseCharacterJson = (json: string): CharacterData => {
  return normalizeCharacter(JSON.parse(json));
};
