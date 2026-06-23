import {
  AdjustmentOperation,
  AdjustmentPath,
  AppliedAdjustment,
  CharacterData,
} from '../types';

type MutableCharacter = CharacterData;

const getPathValue = (character: CharacterData, path: AdjustmentPath): number | string | null => {
  if (path.startsWith('abilities.')) {
    const ability = path.split('.')[1] as keyof CharacterData['abilities'];
    return character.abilities[ability];
  }

  return character[path as keyof CharacterData] as number | string | null;
};

const setPathValue = (
  character: MutableCharacter,
  path: AdjustmentPath,
  value: number | string | null,
): MutableCharacter => {
  if (path.startsWith('abilities.')) {
    const ability = path.split('.')[1] as keyof CharacterData['abilities'];
    return {
      ...character,
      abilities: {
        ...character.abilities,
        [ability]: Number(value) || 0,
      },
    };
  }

  return {
    ...character,
    [path]: value,
  };
};

const addNumberAtPath = (
  character: MutableCharacter,
  path: AdjustmentPath,
  value: number,
): MutableCharacter => {
  const current = getPathValue(character, path);
  const numericCurrent = typeof current === 'number' ? current : Number(current || 0);
  return setPathValue(character, path, numericCurrent + value);
};

const cloneClasses = (classes: CharacterData['classes']): CharacterData['classes'] => (
  classes.map(cls => ({ ...cls }))
);

const cloneSpellcasting = (spellcasting: CharacterData['spellcasting']): CharacterData['spellcasting'] => ({
  ...spellcasting,
  slots: Object.fromEntries(Object.entries(spellcasting.slots).map(([level, slot]) => [level, { ...slot }])),
  spells: spellcasting.spells.map(spell => ({ ...spell })),
});

const cloneSpellcastingProfiles = (
  profiles: CharacterData['spellcastingProfiles'],
): CharacterData['spellcastingProfiles'] => profiles.map(profile => ({
  ...profile,
  slots: Object.fromEntries(Object.entries(profile.slots).map(([level, slot]) => [level, { ...slot }])),
  spells: profile.spells.map(spell => ({ ...spell })),
}));

const cloneSpellcastingProfile = (
  profile: CharacterData['spellcastingProfiles'][number],
): CharacterData['spellcastingProfiles'][number] => ({
  ...profile,
  slots: Object.fromEntries(Object.entries(profile.slots).map(([level, slot]) => [level, { ...slot }])),
  spells: profile.spells.map(spell => ({ ...spell })),
});

const cloneFeature = (feature: CharacterData['featureEntries'][number]): CharacterData['featureEntries'][number] => ({
  ...feature,
});

const cloneResource = (resource: CharacterData['resources'][number]): CharacterData['resources'][number] => ({
  ...resource,
});

const cloneAttack = (attack: CharacterData['attacks'][number]): CharacterData['attacks'][number] => ({
  ...attack,
});

const cloneSpell = (spell: CharacterData['spellcasting']['spells'][number]): CharacterData['spellcasting']['spells'][number] => ({
  ...spell,
});

const withPreviousValue = (character: CharacterData, operation: AdjustmentOperation): AdjustmentOperation => {
  switch (operation.type) {
    case 'set':
      return { ...operation, previousValue: getPathValue(character, operation.path) };
    case 'setStringField':
      return { ...operation, previousValue: character[operation.field] };
    case 'setClasses':
      return { ...operation, previousValue: cloneClasses(character.classes) };
    case 'setAutomation':
      return { ...operation, previousValue: { ...character.automation } };
    case 'setSpellcasting':
      return { ...operation, previousValue: cloneSpellcasting(character.spellcasting) };
    case 'setSpellcastingProfiles':
      return { ...operation, previousValue: cloneSpellcastingProfiles(character.spellcastingProfiles) };
    case 'upsertSpellcastingProfile': {
      const previousProfile = character.spellcastingProfiles.find(profile => profile.id === operation.profile.id);
      return {
        ...operation,
        previousProfile: previousProfile ? cloneSpellcastingProfile(previousProfile) : undefined,
      };
    }
    case 'upsertResource': {
      const previousResource = character.resources.find(resource => resource.id === operation.resource.id);
      return {
        ...operation,
        previousResource: previousResource ? cloneResource(previousResource) : undefined,
      };
    }
    case 'addProficiency':
    case 'removeProficiency':
      return {
        ...operation,
        previousProficient: character.proficiencies.has(operation.key),
        previousExpertise: character.expertises.has(operation.key),
      };
    case 'addFeature': {
      const previousFeature = character.featureEntries.find(feature => feature.id === operation.feature.id);
      return {
        ...operation,
        previousFeature: previousFeature ? cloneFeature(previousFeature) : undefined,
      };
    }
    case 'addAttack': {
      const previousAttack = character.attacks.find(attack => attack.id === operation.attack.id);
      return {
        ...operation,
        previousAttack: previousAttack ? cloneAttack(previousAttack) : undefined,
      };
    }
	    case 'addSpell': {
	      const profile = character.spellcastingProfiles.find(item => item.id === operation.profileId);
	      const previousSpell = profile?.spells.find(spell => spell.id === operation.spell.id);
	      return {
	        ...operation,
	        previousSpell: previousSpell ? cloneSpell(previousSpell) : undefined,
	      };
	    }
	    case 'addItem': {
	      const previousItem = character.inventory.find(item => item.id === operation.item.id);
	      return {
	        ...operation,
	        previousItem: previousItem ? { ...previousItem } : undefined,
	      };
	    }
    default:
      return operation;
  }
};

const applyOperation = (character: MutableCharacter, operation: AdjustmentOperation): MutableCharacter => {
  switch (operation.type) {
    case 'set':
      return setPathValue(character, operation.path, operation.value);
    case 'setStringField':
      return { ...character, [operation.field]: operation.value };
    case 'setClasses':
      return { ...character, classes: cloneClasses(operation.value) };
    case 'setAutomation':
      return { ...character, automation: { ...operation.value } };
    case 'setSpellcasting':
      return { ...character, spellcasting: cloneSpellcasting(operation.value) };
    case 'setSpellcastingProfiles':
      return { ...character, spellcastingProfiles: cloneSpellcastingProfiles(operation.value) };
    case 'upsertSpellcastingProfile':
      return {
        ...character,
        spellcastingProfiles: [
          ...character.spellcastingProfiles.filter(profile => profile.id !== operation.profile.id),
          cloneSpellcastingProfile(operation.profile),
        ],
      };
    case 'upsertResource':
      return {
        ...character,
        resources: [
          ...character.resources.filter(resource => resource.id !== operation.resource.id),
          {
            ...cloneResource(operation.resource),
            current: operation.previousResource
              ? Math.min(operation.resource.max, operation.previousResource.current)
              : operation.resource.current,
          },
        ],
      };
    case 'addNumber':
      return addNumberAtPath(character, operation.path, operation.value);
    case 'addProficiency': {
      const proficiencies = new Set(character.proficiencies);
      const expertises = new Set(character.expertises);
      proficiencies.add(operation.key);
      if (operation.expertise) expertises.add(operation.key);
      return { ...character, proficiencies, expertises };
    }
    case 'removeProficiency': {
      const proficiencies = new Set(character.proficiencies);
      const expertises = new Set(character.expertises);
      proficiencies.delete(operation.key);
      expertises.delete(operation.key);
      return { ...character, proficiencies, expertises };
    }
    case 'addFeature':
      return {
        ...character,
        featureEntries: [
          ...character.featureEntries.filter(feature => feature.id !== operation.feature.id),
          operation.feature,
        ],
      };
    case 'addAttack':
      return {
        ...character,
        attacks: [
          ...character.attacks.filter(attack => attack.id !== operation.attack.id),
          { ...operation.attack, automatic: true },
        ],
      };
    case 'addSpell':
      return {
        ...character,
        spellcastingProfiles: character.spellcastingProfiles.map(profile => (
          profile.id === operation.profileId
            ? {
                ...profile,
                spells: [
                  ...profile.spells.filter(spell => spell.id !== operation.spell.id),
                  operation.spell,
                ],
              }
            : profile
        )),
      };
    case 'addItem':
      return {
        ...character,
        inventory: [
          ...character.inventory.filter(item => item.id !== operation.item.id),
          { ...operation.item },
        ],
      };
    default:
      return character;
  }
};

const removeOperation = (character: MutableCharacter, operation: AdjustmentOperation): MutableCharacter => {
  switch (operation.type) {
    case 'set':
      return setPathValue(character, operation.path, operation.previousValue ?? null);
    case 'setStringField':
      return { ...character, [operation.field]: operation.previousValue || '' };
    case 'setClasses':
      return { ...character, classes: cloneClasses(operation.previousValue || []) };
    case 'setAutomation':
      return operation.previousValue ? { ...character, automation: { ...operation.previousValue } } : character;
    case 'setSpellcasting':
      return operation.previousValue ? { ...character, spellcasting: cloneSpellcasting(operation.previousValue) } : character;
    case 'setSpellcastingProfiles':
      return { ...character, spellcastingProfiles: cloneSpellcastingProfiles(operation.previousValue || []) };
    case 'upsertSpellcastingProfile':
      if (operation.previousProfile) {
        return {
          ...character,
          spellcastingProfiles: [
            ...character.spellcastingProfiles.filter(profile => profile.id !== operation.profile.id),
            cloneSpellcastingProfile(operation.previousProfile),
          ],
        };
      }
      return {
        ...character,
        spellcastingProfiles: character.spellcastingProfiles.filter(profile => profile.id !== operation.profile.id),
      };
    case 'upsertResource':
      if (operation.previousResource) {
        return {
          ...character,
          resources: [
            ...character.resources.filter(resource => resource.id !== operation.resource.id),
            cloneResource(operation.previousResource),
          ],
        };
      }
      return {
        ...character,
        resources: character.resources.filter(resource => resource.id !== operation.resource.id),
      };
    case 'addNumber':
      return addNumberAtPath(character, operation.path, -operation.value);
    case 'addProficiency': {
      const proficiencies = new Set(character.proficiencies);
      const expertises = new Set(character.expertises);
      if (operation.previousProficient) {
        proficiencies.add(operation.key);
      } else {
        proficiencies.delete(operation.key);
      }
      if (operation.previousExpertise) {
        expertises.add(operation.key);
      } else {
        expertises.delete(operation.key);
      }
      return { ...character, proficiencies, expertises };
    }
    case 'removeProficiency': {
      const proficiencies = new Set(character.proficiencies);
      const expertises = new Set(character.expertises);
      if (operation.previousProficient) {
        proficiencies.add(operation.key);
      } else {
        proficiencies.delete(operation.key);
      }
      if (operation.previousExpertise) {
        expertises.add(operation.key);
      } else {
        expertises.delete(operation.key);
      }
      return { ...character, proficiencies, expertises };
    }
    case 'addFeature':
      if (operation.previousFeature) {
        return {
          ...character,
          featureEntries: [
            ...character.featureEntries.filter(feature => feature.id !== operation.feature.id),
            cloneFeature(operation.previousFeature),
          ],
        };
      }
      return {
        ...character,
        featureEntries: character.featureEntries.filter(feature => feature.id !== operation.feature.id),
      };
    case 'addAttack':
      if (operation.previousAttack) {
        return {
          ...character,
          attacks: [
            ...character.attacks.filter(attack => attack.id !== operation.attack.id),
            cloneAttack(operation.previousAttack),
          ],
        };
      }
      return {
        ...character,
        attacks: character.attacks.filter(attack => attack.id !== operation.attack.id),
      };
    case 'addSpell':
      return {
        ...character,
        spellcastingProfiles: character.spellcastingProfiles.map(profile => (
          profile.id === operation.profileId
            ? {
                ...profile,
                spells: operation.previousSpell
                  ? [
                      ...profile.spells.filter(spell => spell.id !== operation.spell.id),
                      cloneSpell(operation.previousSpell),
                    ]
                  : profile.spells.filter(spell => spell.id !== operation.spell.id),
              }
            : profile
        )),
      };
    case 'addItem':
      if (operation.previousItem) {
        return {
          ...character,
          inventory: [
            ...character.inventory.filter(item => item.id !== operation.item.id),
            { ...operation.previousItem },
          ],
        };
      }
      return {
        ...character,
        inventory: character.inventory.filter(item => item.id !== operation.item.id),
      };
    default:
      return character;
  }
};

export const applyCharacterAdjustments = (
  character: CharacterData,
  adjustment: Omit<AppliedAdjustment, 'id' | 'appliedAt'> & { id?: string; appliedAt?: string },
): CharacterData => {
  const adjustmentId = adjustment.id || `${adjustment.sourceId}-${Date.now()}`;
  const withoutPrevious = removeCharacterAdjustments(character, adjustment.sourceId);
  const operationsWithPrevious = adjustment.operations.map(operation => withPreviousValue(withoutPrevious, operation));
  const adjusted = operationsWithPrevious.reduce(applyOperation, withoutPrevious);

  return {
    ...adjusted,
    appliedAdjustments: [
      ...adjusted.appliedAdjustments,
      {
        id: adjustmentId,
        sourceId: adjustment.sourceId,
        sourceName: adjustment.sourceName,
        operations: operationsWithPrevious,
        appliedAt: adjustment.appliedAt || new Date().toISOString(),
      },
    ],
  };
};

export const removeCharacterAdjustments = (
  character: CharacterData,
  sourceId: string,
): CharacterData => {
  const adjustments = character.appliedAdjustments.filter(adjustment => adjustment.sourceId === sourceId);
  if (!adjustments.length) return character;

  const adjusted = adjustments
    .flatMap(adjustment => adjustment.operations)
    .reduceRight(removeOperation, character);

  return {
    ...adjusted,
    appliedAdjustments: adjusted.appliedAdjustments.filter(adjustment => adjustment.sourceId !== sourceId),
  };
};
