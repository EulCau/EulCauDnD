import React from 'react';
import { CharacterData, Attack } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface AttacksProps {
  attacks: Attack[];
  onUpdate: (attacks: Attack[]) => void;
}

export const Attacks: React.FC<AttacksProps> = ({ attacks, onUpdate }) => {
  const { t } = useLanguage();
  
  const handleChange = (id: string, field: keyof Attack, value: string) => {
    const newAttacks = attacks.map(a => a.id === id ? { ...a, [field]: value } : a);
    onUpdate(newAttacks);
  };

  const addAttack = () => {
    const newId = Date.now().toString() + Math.random().toString().slice(2);
    onUpdate([...attacks, { id: newId, name: "", bonus: "", damage: "", type: "", notes: "" }]);
  };

  const deleteAttack = (id: string) => {
    onUpdate(attacks.filter(a => a.id !== id));
  };

  return (
    <div className="bg-white border border-gray-300 p-3 rounded-lg h-full flex flex-col">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm">
            <thead className="text-[10px] text-gray-500 uppercase border-b border-gray-300">
                <tr>
                    <th className="font-bold py-1 w-1/4">{t('attacks.name')}</th>
                    <th className="font-bold py-1 w-16 text-center">{t('attacks.bonus')}</th>
                    <th className="font-bold py-1 w-1/4">{t('attacks.damage')}</th>
                    <th className="font-bold py-1 w-20">{t('attacks.type')}</th>
                    <th className="font-bold py-1">{t('attacks.notes')}</th>
                    <th className="font-bold py-1 w-6"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {attacks.map(atk => (
                    <tr key={atk.id} className="group hover:bg-gray-50">
                        <td className="p-1">
                            <input type="text" className="w-full bg-transparent outline-none font-bold text-gray-800" value={atk.name} onChange={(e) => handleChange(atk.id, 'name', e.target.value)} placeholder=""/>
                        </td>
                        <td className="p-1">
                            <input type="text" className="w-full bg-transparent outline-none text-center" value={atk.bonus} onChange={(e) => handleChange(atk.id, 'bonus', e.target.value)} placeholder="+0"/>
                        </td>
                         <td className="p-1">
                            <input type="text" className="w-full bg-transparent outline-none" value={atk.damage} onChange={(e) => handleChange(atk.id, 'damage', e.target.value)} placeholder="1d8+2"/>
                        </td>
                         <td className="p-1">
                            <input type="text" className="w-full bg-transparent outline-none text-xs" value={atk.type} onChange={(e) => handleChange(atk.id, 'type', e.target.value)} placeholder=""/>
                        </td>
                         <td className="p-1">
                            <input type="text" className="w-full bg-transparent outline-none italic text-gray-500 text-xs" value={atk.notes} onChange={(e) => handleChange(atk.id, 'notes', e.target.value)} placeholder=""/>
                        </td>
                        <td className="p-1 text-center">
                            <button 
                                onClick={() => deleteAttack(atk.id)}
                                className="text-gray-300 hover:text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete Attack"
                            >
                                &times;
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
      <div className="mt-2 text-center border-t border-gray-100 pt-1">
        <button onClick={addAttack} className="text-[10px] uppercase font-bold text-gray-400 hover:text-dnd-gold transition-colors">{t('attacks.add')}</button>
      </div>
      <div className="text-center text-[10px] text-gray-500 uppercase font-bold mt-1">{t('attacks.title')}</div>
    </div>
  );
};