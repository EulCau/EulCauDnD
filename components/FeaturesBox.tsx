import React from 'react';
import { CharacterData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface FeaturesBoxProps {
  data: CharacterData;
  onChange: (val: string) => void;
}

export const FeaturesBox: React.FC<FeaturesBoxProps> = ({ data, onChange }) => {
  const { t } = useLanguage();
  return (
    <div className="bg-white border border-gray-300 rounded p-3 h-full flex flex-col overflow-hidden">
        <h4 className="text-[10px] text-gray-500 uppercase font-bold text-center mb-2 border-b pb-1 flex-none">{t('features.title')}</h4>
        <textarea 
            className="flex-1 w-full p-2 border border-gray-100 rounded text-xs font-serif leading-relaxed resize-none focus:outline-none focus:border-gray-300"
            placeholder={t('features.placeholder')}
            value={data.features}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
  );
};