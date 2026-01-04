import React from 'react';
import { CharacterData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ProficienciesBoxProps {
  data: CharacterData;
  onChange: (field: keyof CharacterData, value: any) => void;
}

export const ProficienciesBox: React.FC<ProficienciesBoxProps> = ({ data, onChange }) => {
    const { t } = useLanguage();
    const updateProfs = (key: keyof typeof data.proficienciesText, val: string) => {
        onChange('proficienciesText', { ...data.proficienciesText, [key]: val });
    };

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
                    </div>
                 );
             })}
        </div>
    );
};