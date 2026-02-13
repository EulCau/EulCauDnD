import React from 'react';
import { CharacterData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface PersonalityProps {
  data: CharacterData;
  onChange: (field: keyof CharacterData, value: any) => void;
}

// Updated styling: Thinner border (gray-300), standard rounded corners, shadow-sm
const TextBox: React.FC<{ label: string, value: string, onChange: (val: string) => void }> = ({ label, value, onChange }) => (
  <div className="border border-gray-300 bg-white rounded p-2 flex flex-col shadow-sm min-h-[100px]">
    <textarea 
      className="flex-1 w-full text-xs font-serif resize-none outline-none mb-1 bg-transparent leading-relaxed"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="..."
    />
    <span className="text-[9px] font-bold text-gray-500 uppercase text-center border-t border-gray-100 pt-1 tracking-wider">{label}</span>
  </div>
);

export const Personality: React.FC<PersonalityProps> = ({ data, onChange }) => {
  const { t } = useLanguage();
  return (
    <div className="bg-white p-2 rounded-lg border border-gray-300 shadow-sm grid grid-cols-2 gap-2">
      <div className="flex-1">
        <TextBox label={t('personality.traits')} value={data.traits} onChange={(v) => onChange('traits', v)} />
      </div>
      <div className="flex-1">
        <TextBox label={t('personality.ideals')} value={data.ideals} onChange={(v) => onChange('ideals', v)} />
      </div>
      <div className="flex-1">
        <TextBox label={t('personality.bonds')} value={data.bonds} onChange={(v) => onChange('bonds', v)} />
      </div>
      <div className="flex-1">
        <TextBox label={t('personality.flaws')} value={data.flaws} onChange={(v) => onChange('flaws', v)} />
      </div>
    </div>
  );
};