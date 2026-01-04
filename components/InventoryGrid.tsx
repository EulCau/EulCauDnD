import React from 'react';
import { CharacterData } from '../types';

interface InventoryGridProps {
  data: CharacterData;
  onChange: (field: keyof CharacterData, value: any) => void;
}

const TextBox: React.FC<{ label: string, value: string, onChange: (val: string) => void, rows?: number }> = ({ label, value, onChange, rows=1 }) => (
    <div className="flex items-start text-sm mb-1">
        <span className="font-bold text-gray-600 w-24 flex-shrink-0 text-xs uppercase pt-1">{label}</span>
        <textarea 
            rows={rows}
            className="flex-1 bg-transparent border-b border-gray-200 outline-none resize-none overflow-hidden" 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

export const InventoryGrid: React.FC<InventoryGridProps> = ({ data, onChange }) => {
    const updateProfs = (key: keyof typeof data.proficienciesText, val: string) => {
        onChange('proficienciesText', { ...data.proficienciesText, [key]: val });
    };

    const updateMoney = (key: keyof typeof data.currency, val: string) => {
        onChange('currency', { ...data.currency, [key]: val });
    };
    
    const updateStatus = (key: keyof typeof data.status, val: any) => {
        onChange('status', { ...data.status, [key]: val });
    };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {/* Proficiencies */}
        <div className="bg-white border border-gray-300 rounded p-3 flex flex-col">
             <h4 className="text-[10px] text-gray-500 uppercase font-bold text-center mb-2 border-b pb-1">Proficiencies & Languages</h4>
             <TextBox label="Armor" value={data.proficienciesText.armor} onChange={(v) => updateProfs('armor', v)} />
             <TextBox label="Weapons" value={data.proficienciesText.weapons} onChange={(v) => updateProfs('weapons', v)} />
             <TextBox label="Tools" value={data.proficienciesText.tools} onChange={(v) => updateProfs('tools', v)} />
             <TextBox label="Languages" value={data.proficienciesText.languages} onChange={(v) => updateProfs('languages', v)} />
             <TextBox label="Other" value={data.proficienciesText.other} onChange={(v) => updateProfs('other', v)} />
        </div>

        {/* Money */}
        <div className="bg-white border border-gray-300 rounded p-3 flex flex-col">
             <h4 className="text-[10px] text-gray-500 uppercase font-bold text-center mb-2 border-b pb-1">Currency</h4>
             <div className="flex-1 flex flex-col justify-center space-y-2">
                 {['cp', 'sp', 'ep', 'gp', 'pp'].map(curr => (
                     <div key={curr} className="flex items-center">
                         <div className="w-10 h-8 rounded-l border border-gray-300 bg-gray-100 flex items-center justify-center font-bold text-gray-600 uppercase text-xs">
                            {curr}
                         </div>
                         <input 
                            type="text" 
                            className="flex-1 h-8 border-y border-r border-gray-300 px-2 outline-none"
                            value={data.currency[curr as keyof typeof data.currency]}
                            onChange={(e) => updateMoney(curr as keyof typeof data.currency, e.target.value)}
                         />
                     </div>
                 ))}
             </div>
        </div>

        {/* Status */}
         <div className="bg-white border border-gray-300 rounded p-3 flex flex-col">
             <h4 className="text-[10px] text-gray-500 uppercase font-bold text-center mb-2 border-b pb-1">Status & Notes</h4>
             
             <div className="flex items-center gap-2 mb-3 bg-gray-50 p-2 rounded border border-gray-200">
                <input 
                    type="checkbox" 
                    id="conc" 
                    checked={data.status.concentrating} 
                    onChange={(e) => updateStatus('concentrating', e.target.checked)}
                    className="w-4 h-4"
                />
                <label htmlFor="conc" className="font-bold text-gray-700 text-sm">Concentrating</label>
             </div>

             <div className="flex-1">
                 <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Conditions</label>
                 <textarea 
                    className="w-full border border-gray-200 rounded p-2 text-sm resize-none h-20 mb-2 outline-none"
                    value={data.status.conditions}
                    onChange={(e) => updateStatus('conditions', e.target.value)}
                 />
                  <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Other Notes</label>
                 <textarea 
                    className="w-full border border-gray-200 rounded p-2 text-sm resize-none h-20 outline-none"
                     value={data.status.other}
                    onChange={(e) => updateStatus('other', e.target.value)}
                 />
             </div>
        </div>
    </div>
  );
};