import React from 'react';
import { AbilityName } from '../types';
import { calculateModifier, formatModifier } from '../utils/dndCalculations';
import { SKILLS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface AbilityScoreRowProps {
  ability: AbilityName;
  score: number;
  profBonus: number;
  proficiencies: Set<string>;
  onChangeScore: (val: number) => void;
  onToggleProficiency: (key: string) => void;
  isTouchMode: boolean;
}

export const AbilityScoreRow: React.FC<AbilityScoreRowProps> = ({
  ability,
  score,
  profBonus,
  proficiencies,
  onChangeScore,
  onToggleProficiency,
  isTouchMode,
}) => {
  const { t } = useLanguage();
  const mod = calculateModifier(score);
  const saveMod = mod + (proficiencies.has(ability) ? profBonus : 0);
  
  // Filter skills for this ability
  const abilitySkills = SKILLS.filter(s => s.ability === ability);

  return (
    <div className="flex flex-row items-center gap-4 mb-4">
      {/* Left: Ability Score Box */}
      <div className="flex flex-col items-center justify-center w-24 relative">
        <div className="border-2 border-gray-400 rounded-xl w-24 h-28 flex flex-col items-center bg-white relative shadow-sm">
           
           {/* Label inside top */}
           <span className="text-[10px] uppercase font-bold text-gray-500 mt-1">{ability}</span>

           {/* Modifier (Top, geometric shape) */}
           <div className="relative z-10 -mt-1 mb-1">
             <div className="w-16 h-10 bg-white border border-gray-400 flex items-center justify-center clip-trapezoid shadow-sm">
                <span className="text-xl font-bold font-serif">{formatModifier(mod)}</span>
             </div>
           </div>
           
           {/* Score (Bottom, big number) */}
           <div className="relative w-full flex justify-center items-center flex-1 mb-2 px-1">
               <div className="flex items-center justify-center">
                   <input
                      type="number"
                      value={score}
                      onChange={(e) => onChangeScore(parseInt(e.target.value) || 0)}
                      className={`text-3xl font-bold text-center w-16 bg-transparent outline-none font-serif z-0 p-0 ${isTouchMode ? 'no-native-spinner' : ''}`}
                   />
                   {isTouchMode && (
                       <div className="flex flex-col gap-0.5 ml-0.5">
                           <button 
                               onClick={() => onChangeScore(score + 1)}
                               className="w-5 h-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-t border border-gray-300 flex items-center justify-center text-[8px] leading-none active:bg-gray-300"
                           >
                               ▲
                           </button>
                           <button 
                               onClick={() => onChangeScore(score - 1)}
                               className="w-5 h-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-b border border-gray-300 border-t-0 flex items-center justify-center text-[8px] leading-none active:bg-gray-300"
                           >
                               ▼
                           </button>
                       </div>
                   )}
               </div>
           </div>
        </div>
        
        {/* Helper Badge for Score */}
        <div className="bg-white px-2 py-0.5 rounded-full border border-gray-300 text-[10px] -mt-3 z-20 font-bold text-gray-500 uppercase">
          {t('stats.score')}
        </div>
      </div>

      {/* Right: Skills & Save */}
      <div className="flex-1 flex flex-col gap-1">
         {/* Saving Throw Row */}
         <div className="flex items-center text-sm mb-1">
            <input 
                type="checkbox" 
                checked={proficiencies.has(ability)} 
                onChange={() => onToggleProficiency(ability)}
                className="w-4 h-4 rounded-full border-gray-400 mr-2 accent-black"
            />
            <span className="w-6 text-center border-b border-gray-300 mr-2 font-mono">{formatModifier(saveMod)}</span>
            <span className="font-bold text-gray-700">{t('stats.savingThrows')}</span>
         </div>

         {/* Skill Rows */}
         {abilitySkills.map(skill => {
            let skillMod = mod;
            if (proficiencies.has(skill.name)) skillMod += profBonus;

            return (
                <div key={skill.name} className="flex items-center text-sm">
                    <input 
                        type="checkbox" 
                        checked={proficiencies.has(skill.name)} 
                        onChange={() => onToggleProficiency(skill.name)}
                        className="w-4 h-4 rounded-full border-gray-400 mr-2 accent-black"
                    />
                    <span className="w-6 text-center border-b border-gray-300 mr-2 font-mono text-gray-600">
                        {formatModifier(skillMod)}
                    </span>
                    <span className="text-gray-800">{t(`skills.${skill.name}` as any)}</span>
                </div>
            )
         })}
      </div>
    </div>
  );
};