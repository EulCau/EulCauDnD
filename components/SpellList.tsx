import React from 'react';
import { CharacterData, Spell, AbilityName } from '../types';
import { calculateSpellSaveDC, calculateSpellAttackBonus, formatModifier } from '../utils/dndCalculations';
import { ABILITIES } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface SpellListProps {
  data: CharacterData;
  onChange: (field: keyof CharacterData, value: any) => void;
  profBonus: number;
}

export const SpellList: React.FC<SpellListProps> = ({ data, onChange, profBonus }) => {
  const { spellcasting } = data;
  const { t } = useLanguage();

  const updateSpellcasting = (field: keyof typeof spellcasting, value: any) => {
    onChange('spellcasting', { ...spellcasting, [field]: value });
  };

  const updateSlot = (level: string, field: 'total' | 'expended', value: string) => {
    const slots = { ...spellcasting.slots };
    slots[parseInt(level)] = { ...slots[parseInt(level)], [field]: value };
    updateSpellcasting('slots', slots);
  };

  const updateSpell = (id: string, field: keyof Spell, value: any) => {
    const spells = spellcasting.spells.map(s => s.id === id ? { ...s, [field]: value } : s);
    updateSpellcasting('spells', spells);
  };

  const addSpell = () => {
    const newSpell: Spell = {
        id: Date.now().toString(),
        level: 0,
        name: "",
        prepared: false,
        time: "",
        range: "",
        components: "",
        duration: "",
        concentration: false,
        ritual: false
    };
    updateSpellcasting('spells', [...spellcasting.spells, newSpell]);
  };

  const deleteSpell = (id: string) => {
    updateSpellcasting('spells', spellcasting.spells.filter(s => s.id !== id));
  };

  // Calculations
  const abilityScore = data.abilities[spellcasting.ability] || 10;
  // Standard DC = 8 + Prof + Mod
  const calcDC = calculateSpellSaveDC(abilityScore, profBonus);
  // Standard Atk = Prof + Mod
  const calcAtk = calculateSpellAttackBonus(abilityScore, profBonus);

  const displayDC = spellcasting.saveDCOverride || calcDC;
  const displayAtk = spellcasting.attackBonusOverride || formatModifier(calcAtk);

  // Sort spells by level then name
  const sortedSpells = [...spellcasting.spells].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  return (
    <div className="mt-6 bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
        
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 border-b border-gray-200 pb-4">
            <div className="bg-white border border-gray-300 rounded p-2 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-gray-400">{t('spells.class')}</span>
                <input 
                    type="text" 
                    className="font-serif text-lg font-bold outline-none" 
                    placeholder=""
                    value={spellcasting.class}
                    onChange={(e) => updateSpellcasting('class', e.target.value)}
                />
            </div>
            
            <div className="bg-white border border-gray-300 rounded p-2 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-gray-400">{t('spells.ability')}</span>
                <select 
                    className="font-serif text-lg font-bold outline-none bg-transparent"
                    value={spellcasting.ability}
                    onChange={(e) => updateSpellcasting('ability', e.target.value as AbilityName)}
                >
                    {ABILITIES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>

            <div className="bg-white border border-gray-300 rounded p-2 flex flex-col items-center relative">
                <span className="text-[10px] uppercase font-bold text-gray-400">{t('spells.saveDC')}</span>
                <div className="flex items-center gap-2">
                    <span className="font-serif text-2xl font-bold">{displayDC}</span>
                    <input 
                        type="text" 
                        placeholder="Ovr"
                        className="w-10 text-xs border-b border-gray-200 text-center outline-none"
                        value={spellcasting.saveDCOverride}
                        onChange={(e) => updateSpellcasting('saveDCOverride', e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white border border-gray-300 rounded p-2 flex flex-col items-center relative">
                <span className="text-[10px] uppercase font-bold text-gray-400">{t('spells.attackBonus')}</span>
                <div className="flex items-center gap-2">
                    <span className="font-serif text-2xl font-bold">{displayAtk}</span>
                    <input 
                        type="text" 
                        placeholder="Ovr"
                        className="w-10 text-xs border-b border-gray-200 text-center outline-none"
                        value={spellcasting.attackBonusOverride}
                        onChange={(e) => updateSpellcasting('attackBonusOverride', e.target.value)}
                    />
                </div>
            </div>
        </div>

        {/* Slot Trackers */}
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => (
                <div key={lvl} className="border border-gray-300 rounded p-1 flex flex-col items-center w-16 bg-white">
                    <span className="text-[9px] font-bold text-gray-400 uppercase">{t('spells.level')} {lvl}</span>
                    <div className="flex w-full border-t border-gray-200 mt-1">
                        <input 
                            type="text" 
                            className="w-1/2 text-center text-sm font-bold border-r border-gray-200 outline-none"
                            placeholder="T"
                            title={t('spells.slotsTotal')}
                            value={spellcasting.slots[lvl]?.total || ""}
                            onChange={(e) => updateSlot(lvl.toString(), 'total', e.target.value)}
                        />
                         <input 
                            type="text" 
                            className="w-1/2 text-center text-sm text-gray-500 outline-none"
                            placeholder="E"
                            title={t('spells.slotsExpended')}
                            value={spellcasting.slots[lvl]?.expended || ""}
                            onChange={(e) => updateSlot(lvl.toString(), 'expended', e.target.value)}
                        />
                    </div>
                </div>
            ))}
        </div>

        {/* Spell Table */}
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                    <tr className="border-b-2 border-dnd-red">
                        <th className="p-2 text-[10px] uppercase font-bold text-gray-500 w-8 text-center">{t('spells.prep')}</th>
                        <th className="p-2 text-[10px] uppercase font-bold text-gray-500 w-12 text-center">{t('spells.level')}</th>
                        <th className="p-2 text-[10px] uppercase font-bold text-gray-500 w-1/4">{t('spells.name')}</th>
                        <th className="p-2 text-[10px] uppercase font-bold text-gray-500 w-24">{t('spells.time')}</th>
                        <th className="p-2 text-[10px] uppercase font-bold text-gray-500 w-24">{t('spells.range')}</th>
                        <th className="p-2 text-[10px] uppercase font-bold text-gray-500 w-16 text-center">{t('spells.comp')}</th>
                        <th className="p-2 text-[10px] uppercase font-bold text-gray-500 w-24">{t('spells.duration')}</th>
                        <th className="p-2 text-[10px] uppercase font-bold text-gray-500 w-8 text-center" title="Concentration">{t('spells.concentration')}</th>
                        <th className="p-2 text-[10px] uppercase font-bold text-gray-500 w-8 text-center" title="Ritual">{t('spells.ritual')}</th>
                        <th className="p-2 text-[10px] uppercase font-bold text-gray-500 w-8"></th>
                    </tr>
                </thead>
                <tbody>
                    {sortedSpells.map(spell => (
                        <tr key={spell.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-2 text-center">
                                {spell.level > 0 && (
                                    <input 
                                        type="checkbox" 
                                        checked={spell.prepared}
                                        onChange={(e) => updateSpell(spell.id, 'prepared', e.target.checked)}
                                        className="w-4 h-4 accent-dnd-red"
                                    />
                                )}
                            </td>
                            <td className="p-2">
                                <input 
                                    type="number" 
                                    className="w-full text-center bg-transparent outline-none font-bold text-gray-700"
                                    value={spell.level}
                                    onChange={(e) => updateSpell(spell.id, 'level', parseInt(e.target.value) || 0)}
                                />
                            </td>
                            <td className="p-2">
                                <input 
                                    type="text" 
                                    className="w-full bg-transparent outline-none font-serif font-bold"
                                    placeholder=""
                                    value={spell.name}
                                    onChange={(e) => updateSpell(spell.id, 'name', e.target.value)}
                                />
                            </td>
                            <td className="p-2">
                                <input 
                                    type="text" 
                                    className="w-full bg-transparent outline-none text-xs"
                                    placeholder=""
                                    value={spell.time}
                                    onChange={(e) => updateSpell(spell.id, 'time', e.target.value)}
                                />
                            </td>
                            <td className="p-2">
                                <input 
                                    type="text" 
                                    className="w-full bg-transparent outline-none text-xs"
                                    placeholder=""
                                    value={spell.range}
                                    onChange={(e) => updateSpell(spell.id, 'range', e.target.value)}
                                />
                            </td>
                            <td className="p-2">
                                <input 
                                    type="text" 
                                    className="w-full bg-transparent outline-none text-xs text-center uppercase"
                                    placeholder=""
                                    value={spell.components}
                                    onChange={(e) => updateSpell(spell.id, 'components', e.target.value)}
                                />
                            </td>
                            <td className="p-2">
                                <input 
                                    type="text" 
                                    className="w-full bg-transparent outline-none text-xs"
                                    placeholder=""
                                    value={spell.duration}
                                    onChange={(e) => updateSpell(spell.id, 'duration', e.target.value)}
                                />
                            </td>
                            <td className="p-2 text-center">
                                <input 
                                    type="checkbox" 
                                    checked={spell.concentration}
                                    onChange={(e) => updateSpell(spell.id, 'concentration', e.target.checked)}
                                    className="w-4 h-4"
                                />
                            </td>
                            <td className="p-2 text-center">
                                <input 
                                    type="checkbox" 
                                    checked={spell.ritual}
                                    onChange={(e) => updateSpell(spell.id, 'ritual', e.target.checked)}
                                    className="w-4 h-4"
                                />
                            </td>
                             <td className="p-2 text-center">
                                <button 
                                    onClick={() => deleteSpell(spell.id)}
                                    className="text-gray-300 hover:text-red-500 font-bold"
                                    title="Delete Spell"
                                >
                                    &times;
                                </button>
                            </td>
                        </tr>
                    ))}
                    {/* Add Button Row */}
                    <tr>
                        <td colSpan={10} className="p-2 text-center">
                            <button 
                                onClick={addSpell}
                                className="text-xs uppercase font-bold text-gray-500 hover:text-dnd-gold transition-colors py-2 w-full border-t border-dashed border-gray-300 mt-1"
                            >
                                {t('spells.add')}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  );
};