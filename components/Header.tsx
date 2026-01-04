import React, { useRef } from 'react';
import { CharacterData } from '../types';
import { CLASSES, ALIGNMENTS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  data: CharacterData;
  onChange: (field: keyof CharacterData, value: any) => void;
  onSave: () => void;
  onDownload: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogout: () => void;
  username: string;
}

// Moved outside to prevent re-creation on render
const InputGroup = ({ label, value, onChange, placeholder = "" }: { label: string, value: string, onChange: (val: string) => void, placeholder?: string }) => (
    <div className="flex flex-col gap-0.5">
    <label className="text-[10px] text-gray-500 uppercase font-bold">{label}</label>
    <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent border-b border-gray-300 px-1 py-0.5 text-gray-800 focus:border-dnd-gold outline-none text-sm font-serif"
    />
    </div>
);

export const Header: React.FC<HeaderProps> = ({ data, onChange, onSave, onDownload, onUpload, onLogout, username }) => {
  const { t, language, setLanguage } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm mb-6 relative">
      <div className="absolute top-2 right-4 flex items-center gap-2">
         <span className="text-xs text-gray-400 hidden sm:inline">{t('auth.welcome')}, <span className="font-bold text-gray-600">{username}</span></span>
         <button onClick={onLogout} className="text-xs text-red-400 hover:text-red-600 hover:underline">{t('auth.logout')}</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
        
        {/* Name Section */}
        <div className="md:col-span-3 flex flex-col gap-1 border-r border-gray-200 pr-4">
            <label className="text-[10px] text-gray-500 uppercase font-bold">{t('header.characterName')}</label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={data.name}
                    onChange={(e) => onChange('name', e.target.value)}
                    className="flex-1 bg-gray-50 border-b border-gray-300 px-2 py-2 text-gray-900 focus:border-dnd-gold outline-none font-serif text-xl font-bold"
                    placeholder=""
                />
            </div>
            
            {/* Actions & Language Switcher */}
            <div className="flex flex-wrap gap-2 mt-2 items-center justify-between">
                 <div className="flex gap-1">
                     <button onClick={onSave} className="text-[10px] font-bold px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 border border-gray-300 whitespace-nowrap">{t('header.save')}</button>
                     <button onClick={onDownload} className="text-[10px] font-bold px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 border border-gray-300 whitespace-nowrap">{t('header.download')}</button>
                     <label className="text-[10px] font-bold px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 border border-gray-300 cursor-pointer whitespace-nowrap">
                        {t('header.upload')}
                        <input type="file" hidden ref={fileInputRef} onChange={onUpload} accept=".json" />
                     </label>
                 </div>
                 
                <button 
                    onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')} 
                    className="text-[10px] font-bold px-2 py-1 rounded text-gray-500 hover:text-dnd-red border border-transparent hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                    {language === 'en' ? '中文' : 'EN'}
                </button>
            </div>
        </div>

        {/* Info Grid */}
        <div className="md:col-span-9 grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Row 1 */}
             <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-gray-500 uppercase font-bold">{t('header.classLevel')}</label>
                <div className="flex gap-2">
                    <select
                        value={data.class}
                        onChange={(e) => onChange('class', e.target.value)}
                        className="bg-transparent border-b border-gray-300 py-0.5 w-2/3 text-gray-800 focus:border-dnd-gold outline-none text-sm font-serif"
                    >
                        {CLASSES.map(c => <option key={c} value={c}>{t(`class.${c}` as any)}</option>)}
                    </select>
                    <input
                        type="number"
                        min="1"
                        max="20"
                        value={data.level}
                        onChange={(e) => onChange('level', parseInt(e.target.value) || 1)}
                        className="bg-transparent border-b border-gray-300 py-0.5 w-1/3 text-gray-800 focus:border-dnd-gold outline-none text-sm font-serif"
                    />
                </div>
            </div>

            <InputGroup label={t('header.subclass')} value={data.subclass} onChange={(v) => onChange('subclass', v)} />
            <InputGroup label={t('header.background')} value={data.background} onChange={(v) => onChange('background', v)} />
            <InputGroup label={t('header.playerName')} value={data.playerName} onChange={(v) => onChange('playerName', v)} />

            {/* Row 2 */}
            <div className="flex gap-2">
                 <div className="w-1/2">
                    <InputGroup label={t('header.race')} value={data.race} onChange={(v) => onChange('race', v)} />
                 </div>
                 <div className="w-1/2">
                     <InputGroup label={t('header.subrace')} value={data.subrace} onChange={(v) => onChange('subrace', v)} />
                 </div>
            </div>

            <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-gray-500 uppercase font-bold">{t('header.alignment')}</label>
                <select
                    value={data.alignment}
                    onChange={(e) => onChange('alignment', e.target.value)}
                    className="bg-transparent border-b border-gray-300 py-0.5 text-gray-800 focus:border-dnd-gold outline-none text-sm font-serif"
                >
                    <option value="">...</option>
                    {ALIGNMENTS.map(a => <option key={a} value={a}>{t(`alignment.${a}` as any)}</option>)}
                </select>
            </div>

            <InputGroup label={t('header.expPoints')} value={data.experience} onChange={(v) => onChange('experience', v)} />
            <InputGroup label={t('header.bodyType')} value={data.bodyType} onChange={(v) => onChange('bodyType', v)} />

        </div>
      </div>
    </div>
  );
};