import React from 'react';
import { CharacterData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface PersonalityProps {
  data: CharacterData;
  onChange: (field: keyof CharacterData, value: any) => void;
}

const TextBox: React.FC<{ label: string, value: string, onChange: (val: string) => void }> = ({ label, value, onChange }) => (
  <div className="border-2 border-gray-800 bg-white rounded-lg p-3 flex flex-col shadow-sm min-h-[120px]">
    <textarea 
      className="flex-1 w-full text-sm font-serif resize-y outline-none mb-1 bg-transparent"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="..."
    />
    <span className="text-xs font-bold text-gray-600 uppercase text-center border-t border-gray-200 pt-1 tracking-wider">{label}</span>
  </div>
);

export const Personality: React.FC<PersonalityProps> = ({ data, onChange }) => {
  const { t } = useLanguage();
  return (
    <div className="bg-white p-2 rounded-lg flex flex-col gap-4">
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