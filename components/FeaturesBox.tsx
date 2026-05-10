import React from 'react';
import { CharacterData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { EditableMarkdown } from './EditableMarkdown';

interface FeaturesBoxProps {
  data: CharacterData;
  onChange: (val: string) => void;
}

export const FeaturesBox: React.FC<FeaturesBoxProps> = ({ data, onChange }) => {
  const { t } = useLanguage();

  return (
    <EditableMarkdown
      title={t('features.title')}
      value={data.features}
      placeholder={t('features.placeholder')}
      onChange={onChange}
      className="bg-white border border-gray-300 rounded p-3"
      textSizeClassName="text-xs"
    />
  );
};
