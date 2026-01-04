import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AbilityScoreRow } from './components/AbilityScore';
import { Vitals } from './components/Vitals';
import { Personality } from './components/Personality';
import { Attacks } from './components/Attacks';
import { ProficienciesBox } from './components/ProficienciesBox';
import { Equipment } from './components/Equipment';
import { FeaturesBox } from './components/FeaturesBox';
import { SpellList } from './components/SpellList';
import { BackstoryGenerator } from './components/BackstoryGenerator';
import { AuthScreen } from './components/AuthScreen';
import { CharacterData, INITIAL_CHARACTER, AbilityName } from './types';
import { calculateProficiencyBonus, calculateModifier } from './utils/dndCalculations';
import { ABILITIES } from './constants';
import { useLanguage } from './contexts/LanguageContext';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const [character, setCharacter] = useState<CharacterData>(INITIAL_CHARACTER);
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  
  // Load data for user
  useEffect(() => {
    if (!user) return;

    const saved = localStorage.getItem(`dnd_data_${user.username}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.proficiencies = new Set(parsed.proficiencies);
        parsed.expertises = new Set(parsed.expertises);
        
        // Ensure defaults exist for migration
        const defaults = INITIAL_CHARACTER;
        if (!parsed.attacks) parsed.attacks = defaults.attacks;
        if (!parsed.currency) parsed.currency = defaults.currency;
        if (!parsed.proficienciesText) parsed.proficienciesText = defaults.proficienciesText;
        if (!parsed.status) parsed.status = defaults.status;
        if (!parsed.deathSaves) parsed.deathSaves = defaults.deathSaves;
        if (parsed.armorBase === undefined) parsed.armorBase = 10;
        if (parsed.armorBonus === undefined) parsed.armorBonus = 0;
        if (parsed.inspiration === undefined) parsed.inspiration = false;
        
        if (typeof parsed.spells === 'string' || !parsed.spellcasting) {
            parsed.spellcasting = defaults.spellcasting;
            delete parsed.spells;
        }
        if (!parsed.spellcasting.slots) parsed.spellcasting.slots = defaults.spellcasting.slots;

        setCharacter(parsed);
      } catch (e) {
        console.error("Failed to load saved character", e);
        setCharacter(INITIAL_CHARACTER);
      }
    } else {
        setCharacter(INITIAL_CHARACTER);
    }
  }, [user]);

  // Auto-save logic (Debounced slightly by React's nature, but we save on every render that changes character)
  useEffect(() => {
    if (!user) return;

    const toSave = {
      ...character,
      proficiencies: Array.from(character.proficiencies),
      expertises: Array.from(character.expertises)
    };
    localStorage.setItem(`dnd_data_${user.username}`, JSON.stringify(toSave));
  }, [character, user]);

  const updateField = (field: keyof CharacterData, value: any) => {
    setCharacter(prev => ({ ...prev, [field]: value }));
  };

  const updateAbility = (ability: AbilityName, val: number) => {
    setCharacter(prev => ({
      ...prev,
      abilities: { ...prev.abilities, [ability]: val }
    }));
  };

  const toggleProficiency = (key: string) => {
    setCharacter(prev => {
      const newProfs = new Set(prev.proficiencies);
      if (newProfs.has(key)) {
        newProfs.delete(key);
      } else {
        newProfs.add(key);
      }
      return { ...prev, proficiencies: newProfs };
    });
  };

  // Header Actions
  const handleSave = () => {
    if (!user) return;
    const toSave = {
        ...character,
        proficiencies: Array.from(character.proficiencies),
        expertises: Array.from(character.expertises)
    };
    localStorage.setItem(`dnd_data_${user.username}`, JSON.stringify(toSave));
    alert(t('header.saved'));
  };

  const handleDownload = () => {
    const toSave = {
        ...character,
        proficiencies: Array.from(character.proficiencies),
        expertises: Array.from(character.expertises)
    };
    const blob = new Blob([JSON.stringify(toSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${character.name || 'character'}_sheet.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const parsed = JSON.parse(event.target?.result as string);
              
              // Validate/Migrate similar to load
              parsed.proficiencies = new Set(parsed.proficiencies);
              parsed.expertises = new Set(parsed.expertises);
              const defaults = INITIAL_CHARACTER;
              // Simple spread to fill missing keys with defaults if possible, 
              // but mostly rely on the parsed data being correct or close to it.
              // For safety, we can merge with initial.
              const merged = { ...INITIAL_CHARACTER, ...parsed };
              // Fix sets again after merge if they were blown away (they shouldn't be if parsed is correct)
              merged.proficiencies = parsed.proficiencies; 
              
              setCharacter(merged);
          } catch (err) {
              console.error("Failed to parse uploaded JSON", err);
              alert("Invalid JSON file");
          }
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = '';
  };

  if (!user) {
      return <AuthScreen />;
  }

  const profBonus = calculateProficiencyBonus(character.level);
  const passivePerception = 10 + calculateModifier(character.abilities.WIS) + (character.proficiencies.has('Perception') ? profBonus : 0);

  return (
    <div className="container mx-auto max-w-7xl p-4 bg-white">
      
      {/* HEADER */}
      <Header 
        data={character} 
        onChange={updateField} 
        onSave={handleSave}
        onDownload={handleDownload}
        onUpload={handleUpload}
        onLogout={logout}
        username={user.username}
      />

      {/* MAIN 3-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN (3/12) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
             {/* Inspiration & Passive */}
             <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between bg-white border border-gray-300 rounded-full px-3 py-1 shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-gray-500">{t('stats.inspiration')}</span>
                    <input 
                        type="checkbox" 
                        checked={character.inspiration} 
                        onChange={(e) => updateField('inspiration', e.target.checked)}
                        className="w-5 h-5 accent-dnd-red"
                    />
                </div>
                <div className="flex items-center justify-between bg-white border border-gray-300 rounded px-3 py-1 shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-gray-500">{t('stats.proficiency')}</span>
                    <span className="font-bold text-lg">+{profBonus}</span>
                </div>
                <div className="flex items-center justify-between bg-white border border-gray-300 rounded px-3 py-1 shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-gray-500">{t('stats.passivePerception')}</span>
                    <span className="font-bold text-lg">{passivePerception}</span>
                </div>
             </div>

             {/* Ability Scores - White BG */}
             <div className="bg-white p-2 rounded-lg border border-gray-300 shadow-sm">
                {ABILITIES.map(ability => (
                    <AbilityScoreRow
                        key={ability}
                        ability={ability}
                        score={character.abilities[ability]}
                        profBonus={profBonus}
                        proficiencies={character.proficiencies}
                        onChangeScore={(val) => updateAbility(ability, val)}
                        onToggleProficiency={toggleProficiency}
                    />
                ))}
             </div>

             <ProficienciesBox data={character} onChange={updateField} />
        </div>


        {/* CENTER COLUMN (5/12) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
            
            <Vitals 
                data={character} 
                onChange={updateField} 
                profBonus={profBonus}
            />

            <div className="flex-1 min-h-[300px]">
                <Attacks 
                    attacks={character.attacks} 
                    onUpdate={(atks) => updateField('attacks', atks)}
                />
            </div>

            <div className="flex-none">
                <Equipment data={character} onChange={updateField} />
            </div>
        </div>


        {/* RIGHT COLUMN (4/12) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
             <div className="flex-none">
                 <Personality data={character} onChange={updateField} />
             </div>

             <div className="flex-1 min-h-[200px]">
                 <FeaturesBox data={character} onChange={(val) => updateField('features', val)} />
             </div>

             <div className="mt-auto">
                 <BackstoryGenerator 
                    data={character}
                    onUpdate={(story) => updateField('backstory', story)}
                 />
             </div>
        </div>
      </div>
      
      {/* Bottom Section: Spells Table */}
      <SpellList data={character} onChange={updateField} profBonus={profBonus} />

      <footer className="mt-12 text-center text-gray-400 text-xs pb-4">
        <p>&copy; {new Date().getFullYear()} {t('footer.text')}</p>
      </footer>
    </div>
  );
}