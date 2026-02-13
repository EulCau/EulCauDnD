import React from 'react';
import { CharacterData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface BackstoryProps {
  data: CharacterData;
  onUpdate: (story: string) => void;
}

export const BackstoryGenerator: React.FC<BackstoryProps> = ({ data, onUpdate }) => {
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2 flex-none">
        <h3 className="text-[10px] text-gray-500 uppercase font-bold">{t('backstory.title')}</h3>
      </div>
      
      <textarea
        className="flex-1 w-full bg-white p-2 text-sm font-serif leading-relaxed resize-none focus:outline-none placeholder-gray-300"
        placeholder={t('backstory.placeholder')}
        value={data.backstory}
        onChange={(e) => onUpdate(e.target.value)}
      />
    </div>
  );
};