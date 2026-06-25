import React from 'react';
import { CharacterData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { ABILITIES, SKILLS } from '../constants';

interface ProficienciesBoxProps {
  data: CharacterData;
  onChange: (field: keyof CharacterData, value: any) => void;
}

export const ProficienciesBox: React.FC<ProficienciesBoxProps> = ({ data, onChange }) => {
    const { t } = useLanguage();
    const skillNames = new Set(SKILLS.map(skill => skill.name));
    const abilityNames = new Set<string>(ABILITIES);
    const updateProfs = (key: keyof typeof data.proficienciesText, val: string) => {
        onChange('proficienciesText', { ...data.proficienciesText, [key]: val });
    };
    const automaticProficiencies = Array.from(data.proficiencies).reduce<Record<keyof typeof data.proficienciesText, string[]>>((acc, proficiency) => {
        const [prefix, ...rest] = proficiency.split(':');
        const value = rest.join(':');
        if (prefix === 'armor' && value) acc.armor.push(value);
        else if (prefix === 'weapon' && value) acc.weapons.push(value);
        else if (prefix === 'tool' && value) acc.tools.push(value);
        else if (prefix === 'language' && value) acc.languages.push(value);
        else if (!skillNames.has(proficiency) && !abilityNames.has(proficiency)) acc.other.push(proficiency);
        return acc;
    }, {
        armor: [],
        weapons: [],
        tools: [],
        languages: [],
        other: [],
    });

    return (
        <div className="bg-white border border-gray-300 rounded p-3 flex flex-col gap-2 mt-4">
             <h4 className="text-[10px] text-gray-500 uppercase font-bold text-center border-b pb-1">{t('profs.title')}</h4>
             
             {['Armor', 'Weapons', 'Tools', 'Languages', 'Other'].map(label => {
                 const key = label.toLowerCase() as keyof typeof data.proficienciesText;
                 return (
                    <div key={label} className="flex flex-col">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">{t(`profs.${key}` as any)}</span>
                        <textarea 
                            rows={1}
                            className="bg-transparent border-b border-gray-200 outline-none resize-none overflow-hidden text-sm" 
                            value={data.proficienciesText[key]} 
                            onChange={(e) => updateProfs(key, e.target.value)}
                        />
                        {automaticProficiencies[key].length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {automaticProficiencies[key].sort((a, b) => a.localeCompare(b)).map(item => (
                                    <span key={item} className="text-[10px] bg-gray-100 border border-gray-200 text-gray-600 rounded px-1.5 py-0.5">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                 );
             })}
        </div>
    );
};
