import React from 'react';
import { CharacterData } from '../types';
import { calculateModifier, calculateMaxHP } from '../utils/dndCalculations';
import { useLanguage } from '../contexts/LanguageContext';

interface VitalsProps {
  data: CharacterData;
  onChange: (field: keyof CharacterData, value: any) => void;
  profBonus: number;
}

export const Vitals: React.FC<VitalsProps> = ({ data, onChange }) => {
  const { t } = useLanguage();
  const dexMod = calculateModifier(data.abilities.DEX);
  
  // New AC Logic: Base (or 10) + Dex + Bonus
  const baseArmor = data.armorBase || 10;
  const armorBonus = data.armorBonus || 0;
  const calculatedAC = baseArmor + dexMod + armorBonus;
  const finalAC = data.acOverride !== null ? data.acOverride : calculatedAC;
  
  const maxHP = calculateMaxHP(data.class, data.level, data.abilities.CON, data.hpMaxOverride);
  const initiative = data.initiativeOverride !== null ? data.initiativeOverride : dexMod;
  const initiativeDisplay = initiative >= 0 ? `+${initiative}` : `${initiative}`;

  const updateDeathSave = (type: 'success' | 'failures', index: number) => {
    const arr = [...data.deathSaves[type]];
    arr[index] = !arr[index];
    onChange('deathSaves', { ...data.deathSaves, [type]: arr });
  };

  return (
    <div className="bg-white p-2 rounded-lg border border-gray-300 shadow-sm">
      {/* Top Row: AC, Init, Speed */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {/* AC */}
        <div className="border-2 border-gray-400 bg-white rounded-t-none rounded-b-3xl p-2 flex flex-col items-center relative group shadow-sm h-32 justify-between">
          <div className="text-[10px] font-bold text-gray-500 uppercase mt-1">{t('vitals.ac')}</div>
          <span className="text-4xl font-bold font-serif">{finalAC}</span>
          
          <div className="flex gap-1 w-full px-1">
             <div className="flex flex-col items-center w-1/2">
                <input 
                    type="number" 
                    className="w-full text-center text-xs border-b border-gray-300 outline-none bg-transparent"
                    placeholder={t('vitals.acBase')}
                    value={data.armorBase}
                    onChange={(e) => onChange('armorBase', parseInt(e.target.value) || 0)}
                />
                <span className="text-[8px] text-gray-400 uppercase">{t('vitals.acBase')}</span>
             </div>
             <div className="flex flex-col items-center w-1/2">
                <input 
                    type="number" 
                    className="w-full text-center text-xs border-b border-gray-300 outline-none bg-transparent"
                    placeholder={t('vitals.acBonus')}
                    value={data.armorBonus}
                    onChange={(e) => onChange('armorBonus', parseInt(e.target.value) || 0)}
                />
                <span className="text-[8px] text-gray-400 uppercase">{t('vitals.acBonus')}</span>
             </div>
          </div>
        </div>

        {/* Initiative */}
        <div className="border-2 border-gray-400 bg-white rounded p-2 flex flex-col items-center justify-start h-24 relative shadow-sm">
          <div className="text-[10px] font-bold text-gray-500 uppercase">{t('vitals.initiative')}</div>
          <span className="text-3xl font-bold font-serif mt-2">{initiativeDisplay}</span>
        </div>

        {/* Speed */}
        <div className="border-2 border-gray-400 bg-white rounded p-2 flex flex-col items-center justify-start h-24 relative shadow-sm">
          <div className="text-[10px] font-bold text-gray-500 uppercase">{t('vitals.speed')}</div>
          <input 
             type="text"
             className="text-3xl font-bold font-serif mt-2 text-center w-full outline-none bg-transparent"
             value={data.speed}
             onChange={(e) => onChange('speed', e.target.value)}
          />
        </div>
      </div>

      {/* HP Section */}
      <div className="border border-gray-300 bg-white rounded p-2 mb-2">
         <div className="flex justify-between items-center border-b border-gray-200 pb-1 mb-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase">{t('vitals.hp')}</span>
            <div className="flex items-center gap-2">
                 <span className="text-[10px] text-gray-400 uppercase">{t('vitals.hpMax')}:</span>
                 <input 
                    type="number" 
                    placeholder={maxHP.toString()}
                    className="w-12 border-b border-gray-300 text-right text-xs"
                    value={data.hpMaxOverride ?? ''}
                    onChange={(e) => onChange('hpMaxOverride', e.target.value ? parseInt(e.target.value) : null)}
                 />
            </div>
         </div>
         <div className="flex gap-2">
            <input 
                type="number" 
                className="flex-1 text-4xl font-serif text-center outline-none"
                value={data.hpCurrent}
                onChange={(e) => onChange('hpCurrent', parseInt(e.target.value) || 0)}
                placeholder={t('vitals.hpCurrent')}
            />
         </div>
         <div className="text-center text-[10px] text-gray-500 uppercase font-bold">{t('vitals.hpCurrent')}</div>
      </div>

       {/* Temp HP */}
       <div className="border border-gray-300 bg-white rounded p-2 mb-2">
         <input 
            type="text"
            className="w-full text-center text-xl font-serif outline-none"
            value={data.hpTemp}
            onChange={(e) => onChange('hpTemp', e.target.value)}
            placeholder="--"
         />
         <div className="text-center text-[10px] text-gray-500 uppercase font-bold mt-1">{t('vitals.hpTemp')}</div>
       </div>

       {/* HD and Death Saves */}
       <div className="grid grid-cols-2 gap-2">
          {/* Hit Dice */}
          <div className="border border-gray-300 bg-white rounded p-2">
             <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold mb-1">
                <span>{t('vitals.hitDice')}</span>
                <span className="text-[9px]">{t('vitals.total')}: {data.level}</span>
             </div>
             <div className="flex flex-col gap-1">
                 <input 
                    type="text" 
                    className="w-full text-center border-b border-gray-200 text-sm"
                    placeholder="Die Type"
                    value={data.hitDiceTotal}
                    onChange={(e) => onChange('hitDiceTotal', e.target.value)}
                 />
                 <input 
                    type="text" 
                    className="w-full text-center border-b border-gray-200 text-sm"
                    placeholder={t('vitals.used')}
                    value={data.hitDiceUsed}
                    onChange={(e) => onChange('hitDiceUsed', e.target.value)}
                 />
             </div>
          </div>

          {/* Death Saves */}
          <div className="border border-gray-300 bg-white rounded p-2">
             <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 text-center">{t('vitals.deathSaves')}</div>
             
             <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">{t('vitals.success')}</span>
                <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                        <input key={i} type="checkbox" checked={data.deathSaves.success[i]} onChange={() => updateDeathSave('success', i)} className="accent-green-600 w-3 h-3"/>
                    ))}
                </div>
             </div>
             <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] uppercase font-bold text-gray-400">{t('vitals.failures')}</span>
                <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                        <input key={i} type="checkbox" checked={data.deathSaves.failures[i]} onChange={() => updateDeathSave('failures', i)} className="accent-red-600 w-3 h-3"/>
                    ))}
                </div>
             </div>
          </div>
       </div>

    </div>
  );
};