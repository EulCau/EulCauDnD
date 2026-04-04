import React, { useState } from 'react';
import { CharacterData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface BackstoryProps {
  data: CharacterData;
  onUpdate: (story: string) => void;
}

export const BackstoryGenerator: React.FC<BackstoryProps> = ({ data, onUpdate }) => {
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2 flex-none">
        <h3 className="text-[10px] text-gray-500 uppercase font-bold flex-1">{t('backstory.title')}</h3>
        <button 
            onClick={() => setIsEditing(!isEditing)}
            className="text-[10px] text-gray-500 hover:text-dnd-red uppercase font-bold px-2 py-0.5 rounded border border-gray-200 hover:border-dnd-red transition-colors"
        >
            {isEditing ? 'Render' : 'Edit'}
        </button>
      </div>
      
      {isEditing ? (
        <textarea
          className="flex-1 w-full bg-white p-2 text-sm font-serif leading-relaxed resize-none focus:outline-none placeholder-gray-300"
          placeholder={t('backstory.placeholder')}
          value={data.backstory}
          onChange={(e) => onUpdate(e.target.value)}
        />
      ) : (
        <div className="flex-1 w-full p-2 overflow-y-auto prose prose-sm prose-slate max-w-none font-serif text-sm leading-relaxed prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-p:my-2 prose-ul:my-2 prose-ol:my-2">
            <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkMath]} 
                rehypePlugins={[rehypeKatex]}
            >
                {data.backstory || t('backstory.placeholder')}
            </ReactMarkdown>
        </div>
      )}
    </div>
  );
};