import React, { useState, useEffect, useRef } from 'react';
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
import { AutoCharacterBuilder } from './components/AutoCharacterBuilder';
import { CharacterData, INITIAL_CHARACTER, AbilityName } from './types';
import { calculatePassivePerception, calculateProficiencyBonus, getTotalLevel } from './utils/dndCalculations';
import { ABILITIES } from './constants';
import { useLanguage } from './contexts/LanguageContext';
import { useAuth } from './contexts/AuthContext';
import { normalizeCharacter, parseCharacterJson, serializeCharacter } from './utils/characterStorage';
import { removeCharacterAdjustments } from './utils/characterAdjustments';
import { loadAutoBuilderContent, type AutoBuilderContent } from './utils/autoBuilderRules';
import { refreshAutomaticArmorClass, refreshAutomaticStyleAttacks, refreshCharacterAutomation } from './utils/equipmentRules';

export default function App() {
  const [character, setCharacter] = useState<CharacterData>(INITIAL_CHARACTER);
  const [isTouchMode, setIsTouchMode] = useState(() => localStorage.getItem('dnd_touch_mode') === 'true');
  const [isAutoBuilderOpen, setIsAutoBuilderOpen] = useState(false);
  const [autoBuilderContent, setAutoBuilderContent] = useState<AutoBuilderContent | null>(null);
  const [featuresRatio, setFeaturesRatio] = useState(0.5);
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startRatio = featuresRatio;
    
    const handleDrag = (moveEvent: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const deltaY = currentY - startY;
      const containerHeight = containerRef.current.clientHeight;
      
      let newRatio = startRatio + (deltaY / containerHeight);
      newRatio = Math.max(0.1, Math.min(0.9, newRatio));
      setFeaturesRatio(newRatio);
    };
    
    const handleDragEnd = () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDrag);
      document.removeEventListener('touchend', handleDragEnd);
    };
    
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDrag);
    document.addEventListener('touchend', handleDragEnd);
  };

  useEffect(() => {
    document.body.classList.toggle('touch-mode', isTouchMode);
    localStorage.setItem('dnd_touch_mode', String(isTouchMode));

    return () => document.body.classList.remove('touch-mode');
  }, [isTouchMode]);

  useEffect(() => {
    loadAutoBuilderContent().then(setAutoBuilderContent).catch(() => setAutoBuilderContent(null));
  }, []);

  useEffect(() => {
    if (!user) return;

    const saved = localStorage.getItem(`dnd_data_${user.username}`);
    if (saved) {
      try {
        setCharacter(parseCharacterJson(saved));
      } catch (e) {
        console.error("Failed to load saved character", e);
        setCharacter(normalizeCharacter());
      }
    } else {
        setCharacter(normalizeCharacter());
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    localStorage.setItem(`dnd_data_${user.username}`, JSON.stringify(serializeCharacter(character)));
  }, [character, user]);

  const refreshDerivedCharacter = (next: CharacterData): CharacterData => (
    autoBuilderContent
      ? refreshCharacterAutomation(next, autoBuilderContent)
      : refreshAutomaticStyleAttacks(refreshAutomaticArmorClass(next))
  );

  const updateField = (field: keyof CharacterData, value: any) => {
    setCharacter(prev => {
      const next = { ...prev, [field]: value };
      return field === 'classes' ? refreshDerivedCharacter(next) : next;
    });
  };

  const updateAbility = (ability: AbilityName, val: number) => {
    setCharacter(prev => refreshDerivedCharacter({
      ...prev,
      abilities: { ...prev.abilities, [ability]: val },
    }));
  };

  const toggleProficiency = (key: string) => {
    setCharacter(prev => {
      const newProfs = new Set(prev.proficiencies);
      const newExps = new Set(prev.expertises);
      if (newProfs.has(key)) {
        newProfs.delete(key);
        newExps.delete(key);
      } else {
        newProfs.add(key);
      }
      return refreshDerivedCharacter({ ...prev, proficiencies: newProfs, expertises: newExps });
    });
  };

  const toggleExpertise = (key: string) => {
    setCharacter(prev => {
      const newExps = new Set(prev.expertises);
      if (newExps.has(key)) {
        newExps.delete(key);
      } else {
        newExps.add(key);
      }
      return refreshDerivedCharacter({ ...prev, expertises: newExps });
    });
  };

  const updateResource = (resourceId: string, current: number) => {
    setCharacter(prev => ({
      ...prev,
      resources: prev.resources.map(resource => (
        resource.id === resourceId
          ? { ...resource, current: Math.max(0, Math.min(resource.max, current)) }
          : resource
      )),
    }));
  };

  // Header Actions
  const handleSave = () => {
    if (!user) return;
    localStorage.setItem(`dnd_data_${user.username}`, JSON.stringify(serializeCharacter(character)));
    alert(t('header.saved'));
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(serializeCharacter(character), null, 2)], { type: 'application/json' });
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
              setCharacter(refreshDerivedCharacter(parseCharacterJson(event.target?.result as string)));
          } catch (err) {
              console.error("Failed to parse uploaded JSON", err);
              alert(t('header.invalidFile'));
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  if (!user) {
      return <AuthScreen />;
  }

  const totalLevel = getTotalLevel(character.classes);
  const profBonus = calculateProficiencyBonus(totalLevel);
  const passivePerception = calculatePassivePerception(
    character.abilities.WIS,
    profBonus,
    character.proficiencies.has('Perception'),
  );

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
        isTouchMode={isTouchMode}
        onToggleTouchMode={() => setIsTouchMode(!isTouchMode)}
        onOpenAutoBuilder={() => setIsAutoBuilderOpen(true)}
      />

      <AutoCharacterBuilder
        isOpen={isAutoBuilderOpen}
        data={character}
        onClose={() => setIsAutoBuilderOpen(false)}
        onApply={setCharacter}
      />

      {/* MAIN 3-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
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
                        expertises={character.expertises}
                        onChangeScore={(val) => updateAbility(ability, val)}
                        onToggleProficiency={toggleProficiency}
                        onToggleExpertise={toggleExpertise}
                        isTouchMode={isTouchMode}
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
                isTouchMode={isTouchMode}
            />

            <div className="flex-1 min-h-[300px]">
                <Attacks 
                    attacks={character.attacks} 
                    onUpdate={(atks) => updateField('attacks', atks)}
                />
            </div>

            <div className="flex-none">
                <Equipment data={character} onChange={updateField} onUpdateCharacter={setCharacter} />
            </div>
        </div>


        {/* RIGHT COLUMN (4/12) */}
        {/* Use h-full to stretch to match the tallest column (likely left/center), and min-h-screen to ensure it's big enough on start */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full min-h-[80vh]">
             <div className="flex-none">
                 <Personality data={character} onChange={updateField} />
             </div>

             {/* Resizable Container for Features & Backstory */}
             <div ref={containerRef} className="flex-1 flex flex-col min-h-[400px]">
                 <div style={{ flex: featuresRatio, minHeight: 0 }} className="flex flex-col">
                     <FeaturesBox
                        data={character}
                        onChange={(val) => updateField('features', val)}
                        onRemoveAdjustment={(sourceId) => setCharacter(prev => refreshDerivedCharacter(removeCharacterAdjustments(prev, sourceId)))}
                        onUpdateResource={updateResource}
                     />
                 </div>

                 {/* Draggable Divider */}
                 <div 
                    className="h-4 my-1 cursor-row-resize flex items-center justify-center group"
                    onMouseDown={handleDragStart}
                    onTouchStart={handleDragStart}
                 >
                    <div className="w-16 h-1 bg-gray-300 rounded-full group-hover:bg-dnd-red transition-colors" />
                 </div>

                 <div style={{ flex: 1 - featuresRatio, minHeight: 0 }} className="flex flex-col">
                     <BackstoryGenerator 
                        data={character}
                        onUpdate={(story) => updateField('backstory', story)}
                     />
                 </div>
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
