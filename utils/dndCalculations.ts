import { AbilityScores, AbilityName, ClassItem } from '../types';
import { HIT_DICE } from '../constants';

export const calculateModifier = (score: number): number => {
  return Math.floor((score - 10) / 2);
};

export const getTotalLevel = (classes: ClassItem[]): number => {
  return classes.reduce((acc, curr) => acc + (curr.level || 0), 0);
};

export const calculateProficiencyBonus = (level: number): number => {
  if (level < 1) return 2;
  return Math.floor((level - 1) / 4) + 2;
};

export const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

export const calculatePassivePerception = (
  wisScore: number,
  profBonus: number,
  isProficient: boolean
): number => {
  return 10 + calculateModifier(wisScore) + (isProficient ? profBonus : 0);
};

export const calculateMaxHP = (
  classes: ClassItem[],
  conScore: number,
  override: number | null
): number => {
  if (override !== null) return override;
  
  let totalHP = 0;
  const conMod = calculateModifier(conScore);

  classes.forEach((cls, index) => {
    const hitDie = HIT_DICE[cls.name] || 8;
    const level = cls.level || 1;
    
    // First class level gets max die
    if (index === 0) {
      totalHP += hitDie + conMod;
      if (level > 1) {
        totalHP += (Math.ceil(hitDie / 2) + 1 + conMod) * (level - 1);
      }
    } else {
      // Multiclass levels get average
      totalHP += (Math.ceil(hitDie / 2) + 1 + conMod) * level;
    }
  });
  
  return totalHP > 0 ? totalHP : 1; // Minimum 1 HP
};

export const calculateSpellSaveDC = (
  abilityScore: number,
  profBonus: number
): number => {
  return 8 + calculateModifier(abilityScore) + profBonus;
};

export const calculateSpellAttackBonus = (
  abilityScore: number,
  profBonus: number
): number => {
  return calculateModifier(abilityScore) + profBonus;
};