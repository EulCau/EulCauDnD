import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { useLanguage } from '../contexts/LanguageContext';

interface EditableMarkdownProps {
  title: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
  textSizeClassName?: string;
}

export const EditableMarkdown: React.FC<EditableMarkdownProps> = ({
  title,
  value,
  placeholder,
  onChange,
  className = 'bg-white rounded-lg border border-gray-300 p-4',
  textSizeClassName = 'text-sm',
}) => {
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className={`${className} h-full flex flex-col overflow-hidden`}>
      <div className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2 flex-none">
        <h3 className="text-[10px] text-gray-500 uppercase font-bold flex-1 text-center">{title}</h3>
        <button
          type="button"
          onClick={() => setIsEditing(prev => !prev)}
          className="text-[10px] text-gray-500 hover:text-dnd-red uppercase font-bold px-2 py-0.5 rounded border border-gray-200 hover:border-dnd-red transition-colors"
          aria-pressed={isEditing}
        >
          {isEditing ? t('common.preview') : t('common.edit')}
        </button>
      </div>

      {isEditing ? (
        <textarea
          className={`flex-1 w-full bg-white p-2 font-serif leading-relaxed resize-none focus:outline-none placeholder-gray-300 ${textSizeClassName}`}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <div className={`flex-1 w-full p-2 overflow-y-auto prose prose-sm prose-slate max-w-none font-serif leading-relaxed prose-headings:font-bold prose-p:my-2 prose-ul:my-2 prose-ol:my-2 ${textSizeClassName}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
            {value || placeholder}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};
