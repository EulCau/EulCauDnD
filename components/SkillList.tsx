import React from 'react';
import { AbilityScores, CharacterData, SkillDefinition } from '../types';
import { SKILLS } from '../constants';
import { calculateModifier, formatModifier } from '../utils/dndCalculations';

interface SkillListProps {
  abilities: AbilityScores;
  profBonus: number;
  proficiencies: Set<string>;
  expertises: Set<string>;
  onToggleProficiency: (skill: string) => void;
}

export const SkillList: React.FC<SkillListProps> = ({
  abilities,
  profBonus,
  proficiencies,
  expertises,
  onToggleProficiency,
}) => {
  return (
    <div className="bg-dnd-slate rounded-lg border border-gray-700 p-4">
      <h3 className="text-dnd-gold font-serif text-xl border-b border-gray-600 mb-3 pb-1">Skills</h3>
      <div className="space-y-1">
        {SKILLS.map((skill) => {
          const isProficient = proficiencies.has(skill.name);
          const abilityScore = abilities[skill.ability];
          const abilityMod = calculateModifier(abilityScore);
          
          let totalMod = abilityMod;
          if (isProficient) totalMod += profBonus;
          
          return (
            <div key={skill.name} className="flex items-center hover:bg-gray-700 p-1 rounded transition-colors group">
              <input
                type="checkbox"
                checked={isProficient}
                onChange={() => onToggleProficiency(skill.name)}
                className="accent-dnd-gold h-4 w-4 mr-2 cursor-pointer"
              />
              <span className="font-mono w-8 text-right mr-3 text-dnd-gold font-bold">
                {formatModifier(totalMod)}
              </span>
              <span className="flex-1 text-sm text-gray-200 group-hover:text-white">
                {skill.name} <span className="text-xs text-gray-500 ml-1">({skill.ability})</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};