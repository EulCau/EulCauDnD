import { CharacterData, ClassItem, createEmptySpellSlots, INITIAL_CHARACTER, SpellcastingProfile } from '../types';

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
  damageResistances: [...INITIAL_CHARACTER.damageResistances],
  senses: [...INITIAL_CHARACTER.senses],
  featureEntries: INITIAL_CHARACTER.featureEntries.map(feature => ({ ...feature })),
  appliedAdjustments: INITIAL_CHARACTER.appliedAdjustments.map(adjustment => ({
    ...adjustment,
    operations: adjustment.operations.map(operation => ({ ...operation })),
  })),
  automation: { ...INITIAL_CHARACTER.automation },
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
  spellcastingProfiles: INITIAL_CHARACTER.spellcastingProfiles.map(profile => ({
    ...profile,
    slots: Object.fromEntries(Object.entries(profile.slots).map(([level, slot]) => [level, { ...slot }])),
    spells: profile.spells.map(spell => ({ ...spell })),
  })),
});

const normalizeClassLevel = (value: unknown): number => {
  const level = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(level) && level > 0 ? Math.floor(level) : 1;
};

const normalizeClasses = (raw: Partial<CharacterData>): ClassItem[] => {
  if (Array.isArray(raw.classes) && raw.classes.length > 0) {
    return raw.classes.map((cls, index) => ({
      id: cls.id || `class-${index + 1}`,
      name: cls.name || 'Fighter',
      level: normalizeClassLevel(cls.level),
      subclass: cls.subclass || '',
      source: cls.source,
    }));
  }

  return [
    {
      id: 'migrated-1',
      name: raw.class || 'Fighter',
      level: normalizeClassLevel(raw.level),
      subclass: raw.subclass || '',
      source: undefined,
    },
  ];
};

const normalizeSpellcastingProfile = (
  raw: Partial<SpellcastingProfile>,
  index: number,
): SpellcastingProfile => ({
  id: raw.id || `spellcasting-${index + 1}`,
  classId: raw.classId,
  className: raw.className || '',
  ability: raw.ability || 'INT',
  preparationMode: raw.preparationMode || 'manual',
  slotSource: raw.slotSource || 'class',
  saveDCOverride: raw.saveDCOverride || '',
  attackBonusOverride: raw.attackBonusOverride || '',
  slots: { ...createEmptySpellSlots(), ...raw.slots },
	  spells: Array.isArray(raw.spells) ? raw.spells.map(spell => ({ ...spell, material: (spell as any).material || '' })) : [],
});

const normalizeSpellcastingProfiles = (raw: Partial<CharacterData>): SpellcastingProfile[] => {
  if (Array.isArray(raw.spellcastingProfiles) && raw.spellcastingProfiles.length > 0) {
    return raw.spellcastingProfiles.map(normalizeSpellcastingProfile);
  }

  if (raw.spellcasting && typeof raw.spellcasting === 'object') {
    return [
      normalizeSpellcastingProfile(
        {
          id: 'legacy-spellcasting',
          className: raw.spellcasting.class || '',
          ability: raw.spellcasting.ability || 'INT',
          preparationMode: 'manual',
          saveDCOverride: raw.spellcasting.saveDCOverride || '',
          attackBonusOverride: raw.spellcasting.attackBonusOverride || '',
          slots: raw.spellcasting.slots,
          spells: raw.spellcasting.spells,
        },
        0,
      ),
    ];
  }

  return [];
};

export const normalizeCharacter = (raw: Partial<CharacterData> = {}): CharacterData => {
  const defaults = cloneInitialCharacter();
  const legacyRaw = raw as Partial<CharacterData> & { spells?: unknown };
  const next = {
    ...defaults,
    ...raw,
    abilities: { ...defaults.abilities, ...raw.abilities },
    classes: normalizeClasses(raw),
    attacks: Array.isArray(raw.attacks) && raw.attacks.length > 0 ? raw.attacks : defaults.attacks,
    damageResistances: Array.isArray(raw.damageResistances) ? [...raw.damageResistances] : defaults.damageResistances,
    senses: Array.isArray(raw.senses) ? [...raw.senses] : defaults.senses,
    featureEntries: Array.isArray(raw.featureEntries) ? raw.featureEntries.map(feature => ({ ...feature })) : [],
    resources: Array.isArray(raw.resources) ? raw.resources.map(resource => ({ ...resource })) : [],
    appliedAdjustments: Array.isArray(raw.appliedAdjustments)
      ? raw.appliedAdjustments.map(adjustment => ({
          ...adjustment,
          operations: Array.isArray(adjustment.operations)
            ? adjustment.operations.map(operation => ({ ...operation }))
            : [],
        }))
      : [],
    automation: { ...defaults.automation, ...raw.automation },
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
	    spellcastingProfiles: normalizeSpellcastingProfiles(raw),
	    inventory: Array.isArray(raw.inventory) ? raw.inventory.map(item => ({ ...item })) : [],
	    proficiencies: new Set(Array.isArray(raw.proficiencies) ? raw.proficiencies : []),
    expertises: new Set(Array.isArray(raw.expertises) ? raw.expertises : []),
  };

  if (typeof legacyRaw.spells === 'string') {
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
