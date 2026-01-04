import React, { useState } from 'react';
import { CharacterData } from '../types';
import { generateBackstory } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

interface BackstoryProps {
  data: CharacterData;
  onUpdate: (story: string) => void;
}

export const BackstoryGenerator: React.FC<BackstoryProps> = ({ data, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const story = await generateBackstory(data);
      onUpdate(story);
    } catch (err) {
      setError("Failed to generate backstory.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
        <h3 className="text-[10px] text-gray-500 uppercase font-bold">{t('backstory.title')}</h3>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className={`px-3 py-1 text-xs rounded font-bold transition-all ${
            loading 
            ? 'bg-gray-200 cursor-not-allowed text-gray-400' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
          }`}
        >
          {loading ? t('backstory.thinking') : t('backstory.generate')}
        </button>
      </div>
      
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      <textarea
        className="flex-1 w-full bg-white p-2 text-sm font-serif leading-relaxed resize-none focus:outline-none placeholder-gray-300"
        placeholder={t('backstory.placeholder')}
        value={data.backstory}
        onChange={(e) => onUpdate(e.target.value)}
      />
    </div>
  );
};