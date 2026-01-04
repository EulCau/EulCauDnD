import React from 'react';
import { CharacterData, Spell } from '../types';
import { ABILITIES } from '../constants';
import { calculateSpellSaveDC, calculateSpellAttackBonus, formatModifier } from '../utils/dndCalculations';

interface SpellSheetProps {
  data: CharacterData;
  onChange: (field: keyof CharacterData, value: any) => void;
  profBonus: number;
}

interface SpellBlockProps {
    level: number;
    totalSlots: string;
    expendedSlots: string;
    spells: Spell[];
    onUpdateSlot: (level: number, field: 'total' | 'expended', value: string) => void;
    onUpdateSpell: (id: string, field: keyof Spell, value: any) => void;
    onAddSpell: (level: number) => void;
    onDeleteSpell: (id: string) => void;
}

const SpellBlock: React.FC<SpellBlockProps> = ({ 
    level, 
    totalSlots, 
    expendedSlots, 
    spells, 
    onUpdateSlot, 
    onUpdateSpell,
    onAddSpell,
    onDeleteSpell
}) => {
    const isCantrip = level === 0;
    
    return (
      <div className="bg-white border-2 border-gray-300 rounded mb-4 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-100 border-b border-gray-300 p-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
                 <div className="bg-white border border-gray-400 rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg font-serif">
                     {level}
                 </div>
                 <span className="text-[10px] uppercase font-bold text-gray-500">
                     {isCantrip ? "Cantrips" : "Spell Level"}
                 </span>
            </div>
            {!isCantrip && (
                <div className="flex gap-2 text-xs">
                    <div className="flex flex-col items-center bg-white border border-gray-300 rounded px-2 py-0.5">
                        <span className="text-[8px] uppercase text-gray-400">Slots Total</span>
                        <input 
                            type="text" 
                            className="w-8 text-center font-bold outline-none"
                            value={totalSlots}
                            onChange={(e) => onUpdateSlot(level, 'total', e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col items-center bg-white border border-gray-300 rounded px-2 py-0.5">
                         <span className="text-[8px] uppercase text-gray-400">Expended</span>
                        <input 
                            type="text" 
                            className="w-8 text-center font-bold outline-none"
                            value={expendedSlots}
                            onChange={(e) => onUpdateSlot(level, 'expended', e.target.value)}
                        />
                    </div>
                </div>
            )}
        </div>

        {/* Spells List */}
        <div className="p-2 space-y-1 flex-1">
            {spells.map((spell) => (
                <div key={spell.id} className="flex items-center gap-2 border-b border-gray-100 last:border-0 pb-1 group">
                    {!isCantrip && (
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded-full border-gray-300 accent-dnd-red"
                            checked={spell.prepared}
                            onChange={(e) => onUpdateSpell(spell.id, 'prepared', e.target.checked)}
                            title="Prepared"
                        />
                    )}
                    <input 
                        type="text"
                        className="flex-1 bg-transparent outline-none text-sm font-serif"
                        placeholder="Spell Name"
                        value={spell.name}
                        onChange={(e) => onUpdateSpell(spell.id, 'name', e.target.value)}
                    />
                    <button 
                        onClick={() => onDeleteSpell(spell.id)}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        &times;
                    </button>
                </div>
            ))}
            {/* Add Button */}
            <button 
                onClick={() => onAddSpell(level)}
                className="w-full text-left text-[10px] text-gray-400 hover:text-dnd-gold uppercase font-bold py-1"
            >
                + Add Spell
            </button>
        </div>
      </div>
    );
};

export const SpellSheet: React.FC<SpellSheetProps> = ({ data, onChange, profBonus }) => {
  const { spellcasting } = data;

  const updateSpellcasting = (field: keyof typeof spellcasting, value: any) => {
    onChange('spellcasting', { ...spellcasting, [field]: value });
  };

  const handleUpdateSlot = (level: number, field: 'total' | 'expended', value: string) => {
    const slots = { ...spellcasting.slots };
    if (!slots[level]) slots[level] = { total: "0", expended: "0" };
    slots[level] = { ...slots[level], [field]: value };
    updateSpellcasting('slots', slots);
  };

  const handleUpdateSpell = (id: string, field: keyof Spell, value: any) => {
    const spells = spellcasting.spells.map(s => s.id === id ? { ...s, [field]: value } : s);
    updateSpellcasting('spells', spells);
  };

  const handleAddSpell = (level: number) => {
      const newSpell: Spell = {
        id: Date.now().toString() + Math.random().toString().slice(2),
        level,
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

  const handleDeleteSpell = (id: string) => {
      updateSpellcasting('spells', spellcasting.spells.filter(s => s.id !== id));
  };

  // Calculations
  const abilityScore = data.abilities[spellcasting.ability] || 10;
  const saveDC = calculateSpellSaveDC(abilityScore, profBonus);
  const attackBonus = calculateSpellAttackBonus(abilityScore, profBonus);
  
  const displayDC = spellcasting.saveDCOverride || saveDC;
  const displayAtk = spellcasting.attackBonusOverride || formatModifier(attackBonus);

  const renderBlock = (level: number) => {
      const levelSpells = spellcasting.spells.filter(s => s.level === level);
      const slotInfo = spellcasting.slots[level] || { total: "0", expended: "0" };

      return (
        <SpellBlock 
            key={level}
            level={level}
            totalSlots={slotInfo.total}
            expendedSlots={slotInfo.expended}
            spells={levelSpells}
            onUpdateSlot={handleUpdateSlot}
            onUpdateSpell={handleUpdateSpell}
            onAddSpell={handleAddSpell}
            onDeleteSpell={handleDeleteSpell}
        />
      );
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Header Info */}
      <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="flex flex-col">
                 <label className="text-[10px] uppercase font-bold text-gray-500">Spellcasting Class</label>
                 <input 
                    type="text" 
                    className="border-b border-gray-300 py-1 font-serif text-lg outline-none"
                    value={data.spellcasting.class}
                    onChange={(e) => updateSpellcasting('class', e.target.value)}
                    placeholder={data.class}
                 />
             </div>
             
             <div className="flex flex-col">
                 <label className="text-[10px] uppercase font-bold text-gray-500">Spellcasting Ability</label>
                 <select 
                    className="border-b border-gray-300 py-1 font-serif text-lg outline-none bg-transparent"
                    value={data.spellcasting.ability}
                    onChange={(e) => updateSpellcasting('ability', e.target.value)}
                 >
                     {ABILITIES.map(a => <option key={a} value={a}>{a}</option>)}
                 </select>
             </div>

             <div className="flex flex-col items-center border border-gray-300 rounded p-1 bg-gray-50">
                 <label className="text-[10px] uppercase font-bold text-gray-500">Spell Save DC</label>
                 <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold font-serif">{displayDC}</span>
                    <input 
                        type="text" 
                        className="w-10 text-center text-xs border-b border-gray-300 bg-transparent outline-none" 
                        placeholder="Ovr"
                        value={data.spellcasting.saveDCOverride}
                        onChange={(e) => updateSpellcasting('saveDCOverride', e.target.value)}
                    />
                 </div>
             </div>

             <div className="flex flex-col items-center border border-gray-300 rounded p-1 bg-gray-50">
                 <label className="text-[10px] uppercase font-bold text-gray-500">Spell Attack Bonus</label>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold font-serif">{displayAtk}</span>
                    <input 
                        type="text" 
                        className="w-10 text-center text-xs border-b border-gray-300 bg-transparent outline-none" 
                        placeholder="Ovr"
                        value={data.spellcasting.attackBonusOverride}
                        onChange={(e) => updateSpellcasting('attackBonusOverride', e.target.value)}
                    />
                 </div>
             </div>
         </div>
      </div>

      {/* Main Grid: 3 Columns matching PDF Page 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 1: Cantrips, 1, 2 */}
          <div className="flex flex-col">
              {renderBlock(0)}
              {renderBlock(1)}
              {renderBlock(2)}
          </div>

          {/* Column 2: 3, 4, 5 */}
          <div className="flex flex-col">
              {renderBlock(3)}
              {renderBlock(4)}
              {renderBlock(5)}
          </div>

          {/* Column 3: 6, 7, 8, 9 */}
          <div className="flex flex-col">
              {renderBlock(6)}
              {renderBlock(7)}
              {renderBlock(8)}
              {renderBlock(9)}
          </div>

      </div>
    </div>
  );
};