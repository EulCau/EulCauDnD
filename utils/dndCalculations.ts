import { AbilityScores, AbilityName } from '../types';
import { HIT_DICE } from '../constants';

export const calculateModifier = (score: number): number => {
  return Math.floor((score - 10) / 2);
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
  charClass: string,
  level: number,
  conScore: number,
  override: number | null
): number => {
  if (override !== null) return override;
  
  const hitDie = HIT_DICE[charClass] || 8; // Default to d8 if unknown
  const conMod = calculateModifier(conScore);
  
  // Level 1: Max Hit Die + CON
  // Level 2+: Average Hit Die (rounded up) + CON
  
  const levelOneHP = hitDie + conMod;
  const subsequentHP = (Math.ceil(hitDie / 2) + 1 + conMod) * (level - 1);
  
  const total = levelOneHP + subsequentHP;
  return total > 0 ? total : 1; // Minimum 1 HP
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