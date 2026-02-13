import React, { useRef } from 'react';
import { CharacterData, ClassItem } from '../types';
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
  isTouchMode: boolean;
  onToggleTouchMode: () => void;
}

// Icons
const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
);
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
);
const TouchIcon = ({ active }: { active: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
);

const InputGroup = ({ label, value, onChange, placeholder = "" }: { label: string, value: string, onChange: (val: string) => void, placeholder?: string }) => (
    <div className="flex flex-col gap-0.5 w-full">
        <label className="text-[10px] text-gray-500 uppercase font-bold whitespace-nowrap overflow-hidden text-ellipsis">{label}</label>
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-transparent border-b border-gray-300 px-1 py-0.5 text-gray-800 focus:border-dnd-gold outline-none text-sm font-serif w-full"
        />
    </div>
);

export const Header: React.FC<HeaderProps> = ({ 
  data, onChange, onSave, onDownload, onUpload, onLogout, username, isTouchMode, onToggleTouchMode 
}) => {
  const { t, language, setLanguage } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateClass = (id: string, field: keyof ClassItem, value: any) => {
      const newClasses = data.classes.map(c => c.id === id ? { ...c, [field]: value } : c);
      onChange('classes', newClasses);
  };

  const addClass = () => {
      const newClass: ClassItem = {
          id: Date.now().toString(),
          name: 'Fighter',
          level: 1,
          subclass: ''
      };
      onChange('classes', [...data.classes, newClass]);
  };

  const removeClass = (id: string) => {
      if (data.classes.length > 1) {
          onChange('classes', data.classes.filter(c => c.id !== id));
      }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm mb-6 relative">
      <div className="absolute top-2 right-4 flex items-center gap-2">
         <span className="text-xs text-gray-400 hidden sm:inline">{t('auth.welcome')}, <span className="font-bold text-gray-600">{username}</span></span>
         <button onClick={onLogout} className="text-xs text-red-400 hover:text-red-600 hover:underline">{t('auth.logout')}</button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mt-4">
        
        {/* Name Section & Actions - Fixed Width or Flex */}
        <div className="md:w-1/4 flex flex-col gap-2 border-r-0 md:border-r border-gray-200 pr-0 md:pr-4">
            <div className="flex flex-col gap-1 w-full">
                <label className="text-[10px] text-gray-500 uppercase font-bold">{t('header.characterName')}</label>
                <input
                    type="text"
                    value={data.name}
                    onChange={(e) => onChange('name', e.target.value)}
                    className="w-full bg-gray-50 border-b border-gray-300 px-2 py-2 text-gray-900 focus:border-dnd-gold outline-none font-serif text-xl font-bold"
                    placeholder=""
                />
            </div>
            
            {/* Actions & Language Switcher */}
            <div className="flex flex-wrap gap-2 mt-2 items-center justify-between">
                 <div className="flex gap-1">
                     <button onClick={onToggleTouchMode} className={`p-1.5 rounded border ${isTouchMode ? 'bg-gray-200 text-dnd-gold border-dnd-gold' : 'bg-gray-100 text-gray-600 border-gray-300'}`} title="Touch Mode">
                         <TouchIcon active={isTouchMode} />
                     </button>
                     <button 
                        onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')} 
                        className="text-[10px] font-bold px-2 py-1 rounded text-gray-500 hover:text-dnd-red border border-transparent hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                        {language === 'en' ? '中文' : 'EN'}
                    </button>
                 </div>

                 <div className="flex gap-1">
                     <button onClick={onSave} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 border border-gray-300" title={t('header.save')}><SaveIcon /></button>
                     <button onClick={onDownload} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 border border-gray-300" title={t('header.download')}><DownloadIcon /></button>
                     <label className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 border border-gray-300 cursor-pointer" title={t('header.upload')}>
                        <UploadIcon />
                        <input type="file" hidden ref={fileInputRef} onChange={onUpload} accept=".json" />
                     </label>
                 </div>
            </div>
        </div>

        {/* Info Grid */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Class & Level (Multiclass) */}
            <div className="col-span-1 sm:col-span-2 flex flex-col gap-1 bg-gray-50 p-2 rounded border border-gray-100">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">{t('header.classLevel')}</label>
                    <button onClick={addClass} className="text-[10px] bg-white border border-gray-300 px-1 rounded hover:bg-gray-100">+</button>
                </div>
                <div className="max-h-[80px] overflow-y-auto pr-1 space-y-1">
                    {data.classes.map((cls) => (
                        <div key={cls.id} className="flex gap-1 items-center">
                            <select
                                value={cls.name}
                                onChange={(e) => updateClass(cls.id, 'name', e.target.value)}
                                className="bg-white border-b border-gray-300 py-0.5 w-1/3 text-gray-800 text-xs font-serif"
                            >
                                {CLASSES.map(c => <option key={c} value={c}>{t(`class.${c}` as any)}</option>)}
                            </select>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={cls.level}
                                onChange={(e) => updateClass(cls.id, 'level', parseInt(e.target.value) || 1)}
                                className="bg-white border-b border-gray-300 py-0.5 w-12 text-center text-gray-800 text-xs font-serif"
                            />
                            <input 
                                type="text"
                                placeholder={t('header.subclass')}
                                value={cls.subclass}
                                onChange={(e) => updateClass(cls.id, 'subclass', e.target.value)}
                                className="bg-white border-b border-gray-300 py-0.5 flex-1 text-gray-800 text-xs font-serif min-w-0"
                            />
                            {data.classes.length > 1 && (
                                <button onClick={() => removeClass(cls.id)} className="text-gray-400 hover:text-red-500 px-1">×</button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <InputGroup label={t('header.background')} value={data.background} onChange={(v) => onChange('background', v)} />
            <InputGroup label={t('header.playerName')} value={data.playerName} onChange={(v) => onChange('playerName', v)} />

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
                    className="bg-transparent border-b border-gray-300 py-0.5 text-gray-800 focus:border-dnd-gold outline-none text-sm font-serif w-full"
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