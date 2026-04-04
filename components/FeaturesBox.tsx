import React, { useState } from 'react';
import { CharacterData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface FeaturesBoxProps {
  data: CharacterData;
  onChange: (val: string) => void;
}

export const FeaturesBox: React.FC<FeaturesBoxProps> = ({ data, onChange }) => {
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="bg-white border border-gray-300 rounded p-3 h-full flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-2 border-b pb-1 flex-none">
            <h4 className="text-[10px] text-gray-500 uppercase font-bold text-center flex-1">{t('features.title')}</h4>
            <button 
                onClick={() => setIsEditing(!isEditing)}
                className="text-[10px] text-gray-500 hover:text-dnd-red uppercase font-bold px-2 py-0.5 rounded border border-gray-200 hover:border-dnd-red transition-colors"
            >
                {isEditing ? 'Render' : 'Edit'}
            </button>
        </div>
        {isEditing ? (
            <textarea 
                className="flex-1 w-full p-2 border border-gray-100 rounded text-xs font-serif leading-relaxed resize-none focus:outline-none focus:border-gray-300"
                placeholder={t('features.placeholder')}
                value={data.features}
                onChange={(e) => onChange(e.target.value)}
            />
        ) : (
            <div className="flex-1 w-full p-2 overflow-y-auto prose prose-sm prose-slate max-w-none font-serif text-xs leading-relaxed prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-sm prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                >
                    {data.features || t('features.placeholder')}
                </ReactMarkdown>
            </div>
        )}
    </div>
  );
};