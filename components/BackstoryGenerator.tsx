import React from 'react';
import { CharacterData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { EditableMarkdown } from './EditableMarkdown';

interface BackstoryProps {
  data: CharacterData;
  onUpdate: (story: string) => void;
}

export const BackstoryGenerator: React.FC<BackstoryProps> = ({ data, onUpdate }) => {
  const { t } = useLanguage();

  return (
    <EditableMarkdown
      title={t('backstory.title')}
      value={data.backstory}
      placeholder={t('backstory.placeholder')}
      onChange={onUpdate}
      className="bg-white rounded-lg border border-gray-300 p-4 h-full"
      textSizeClassName="text-sm"
    />
  );
};
