import React from 'react';
import { CharacterData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface EquipmentProps {
  data: CharacterData;
  onChange: (field: keyof CharacterData, value: any) => void;
}

export const Equipment: React.FC<EquipmentProps> = ({ data, onChange }) => {
    const { t } = useLanguage();
    const updateMoney = (key: keyof typeof data.currency, val: string) => {
        onChange('currency', { ...data.currency, [key]: val });
    };
    
    const updateStatus = (key: keyof typeof data.status, val: any) => {
        onChange('status', { ...data.status, [key]: val });
    };

  return (
    <div className="bg-white border border-gray-300 rounded p-2 flex flex-col gap-2">
        {/* Status Section */}
         <div className="flex flex-col gap-2 p-2 bg-gray-50 rounded border border-gray-100">
             <div className="flex items-center gap-2">
                <input 
                    type="checkbox" 
                    id="conc" 
                    checked={data.status.concentrating} 
                    onChange={(e) => updateStatus('concentrating', e.target.checked)}
                    className="w-4 h-4"
                />
                <label htmlFor="conc" className="font-bold text-gray-700 text-xs uppercase">{t('equipment.concentrating')}</label>
             </div>
             <div>
                 <label className="text-[9px] text-gray-500 uppercase font-bold block">{t('equipment.conditions')}</label>
                 <input
                    type="text"
                    className="w-full border-b border-gray-300 bg-transparent text-sm outline-none"
                    value={data.status.conditions}
                    onChange={(e) => updateStatus('conditions', e.target.value)}
                 />
             </div>
         </div>

         {/* Money & Equipment Split */}
         <div className="flex gap-2">
             {/* Money Column */}
            <div className="flex flex-col gap-1 w-16 flex-shrink-0">
                 {['cp', 'sp', 'ep', 'gp', 'pp'].map(curr => (
                     <div key={curr} className="flex flex-col items-center bg-gray-100 rounded border border-gray-200 p-1">
                         <span className="text-[9px] font-bold text-gray-500 uppercase">{t(`equipment.${curr}` as any)}</span>
                         <input 
                            type="text" 
                            className="w-full text-center bg-transparent outline-none text-xs font-serif"
                            value={data.currency[curr as keyof typeof data.currency]}
                            onChange={(e) => updateMoney(curr as keyof typeof data.currency, e.target.value)}
                         />
                     </div>
                 ))}
            </div>
            
            {/* Equipment Text */}
            <div className="flex-1 flex flex-col border border-gray-200 rounded p-2 min-h-[160px]">
                <h4 className="text-[10px] text-gray-500 uppercase font-bold text-center border-b pb-1 mb-1">{t('equipment.title')}</h4>
                <textarea 
                    className="flex-1 w-full text-xs resize-none outline-none bg-transparent leading-relaxed"
                    placeholder="..."
                    value={data.status.other} // Reusing 'other' status for Equipment for now
                    onChange={(e) => updateStatus('other', e.target.value)}
                />
            </div>
         </div>
    </div>
  );
};