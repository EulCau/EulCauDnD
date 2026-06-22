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
import { AutoCharacterBuilder } from './components/AutoCharacterBuilder';
import SearchPanel from './components/SearchPanel';
import { CharacterData, INITIAL_CHARACTER, AbilityName } from './types';
import { calculatePassivePerception, calculateProficiencyBonus, getTotalLevel } from './utils/dndCalculations';
import { ABILITIES } from './constants';
import { useLanguage } from './contexts/LanguageContext';
import { useAuth } from './contexts/AuthContext';
import { normalizeCharacter, parseCharacterJson, serializeCharacter } from './utils/characterStorage';
import { removeCharacterAdjustments } from './utils/characterAdjustments';
import { loadAutoBuilderContent, type AutoBuilderContent } from './utils/autoBuilderRules';
import { loadMagicItems, type MagicItemData, type MagicItemsContent } from './utils/magicItems';
import { refreshAutomaticArmorClass, refreshAutomaticStyleAttacks, refreshCharacterAutomation } from './utils/equipmentRules';

export default function App() {
  const [character, setCharacter] = useState<CharacterData>(INITIAL_CHARACTER);
  const [isTouchMode, setIsTouchMode] = useState(() => localStorage.getItem('dnd_touch_mode') === 'true');
  const [isAutoBuilderOpen, setIsAutoBuilderOpen] = useState(false);
  const [autoBuilderContent, setAutoBuilderContent] = useState<AutoBuilderContent | null>(null);
  const [magicItems, setMagicItems] = useState<MagicItemData[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { t } = useLanguage();
  const { user, logout } = useAuth();

  useEffect(() => {
    document.body.classList.toggle('touch-mode', isTouchMode);
    localStorage.setItem('dnd_touch_mode', String(isTouchMode));

    return () => document.body.classList.remove('touch-mode');
  }, [isTouchMode]);

  useEffect(() => {
    loadAutoBuilderContent().then(setAutoBuilderContent).catch(() => setAutoBuilderContent(null));
    loadMagicItems().then(data => setMagicItems(data.items)).catch(() => {});
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
        <div className="lg:col-span-3 flex flex-col gap-4 h-full">
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
        <div className="lg:col-span-5 flex flex-col gap-4 h-full">

            <Vitals 
                data={character} 
                onChange={updateField} 
                profBonus={profBonus}
                isTouchMode={isTouchMode}
            />

            <div className="flex-1 min-h-[200px] resize-y overflow-hidden">
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
        <div className="lg:col-span-4 flex flex-col gap-4 h-full">
             <div className="flex-none">
                 <Personality data={character} onChange={updateField} />
             </div>

             <div className="flex-1 flex flex-col min-h-0">
                 <BackstoryGenerator 
                    data={character}
                    onUpdate={(story) => updateField('backstory', story)}
                 />
             </div>
        </div>
      </div>
      
      {/* Bottom Sections: Features, Resources, Adjustments — then Spells */}
      <div className="mt-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <FeaturesBox
            data={character}
            onChange={(val) => updateField('features', val)}
            onRemoveAdjustment={(sourceId) => setCharacter(prev => refreshDerivedCharacter(removeCharacterAdjustments(prev, sourceId)))}
            onUpdateResource={updateResource}
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="absolute right-2 top-2 z-10 text-[10px] font-bold uppercase px-2 py-1 rounded border border-gray-300 text-gray-500 hover:text-dnd-red hover:border-dnd-red transition-colors bg-white/80"
          >
            🔍 {t('search.open')}
          </button>
          <SpellList data={character} onChange={updateField} profBonus={profBonus} />
        </div>
      </div>

      <SearchPanel
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        spells={autoBuilderContent?.spells || []}
        features={character.featureEntries.map(f => ({ id: f.id, sourceId: f.sourceId, name: f.name, sourceName: f.sourceName, description: f.description }))}
        magicItems={magicItems.map(item => ({
          id: item.id,
          name: item.name,
          englishName: item.englishName,
          typeLabel: item.typeLabel,
          rarity: item.rarity,
          category: item.category,
          description: item.description,
          source: item.source,
        }))}
      />

      <footer className="mt-12 text-center text-gray-400 text-xs pb-4">
        <p>&copy; {new Date().getFullYear()} {t('footer.text')}</p>
      </footer>
    </div>
  );
}
