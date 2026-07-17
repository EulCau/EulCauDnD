import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { CharacterSheet } from './components/CharacterSheet';
import { AuthScreen } from './components/AuthScreen';
import { AutoCharacterBuilder } from './components/AutoCharacterBuilder';
import { FloatingDiceRoller } from './components/FloatingDiceRoller';
import SearchPanel from './components/SearchPanel';
import { ThemeToggle } from './components/ThemeToggle';
import { CharacterData, INITIAL_CHARACTER, AbilityName } from './types';
import { calculatePassivePerception, calculateProficiencyBonus, getTotalLevel } from './utils/dndCalculations';
import { useLanguage } from './contexts/LanguageContext';
import { useAuth } from './contexts/AuthContext';
import { normalizeCharacter, parseCharacterJson, serializeCharacter } from './utils/characterStorage';
import { applyCharacterAdjustments, removeCharacterAdjustments } from './utils/characterAdjustments';
import { loadAutoBuilderContent, type AutoBuilderContent } from './utils/autoBuilderRules';
import { loadMagicItems, type MagicItemData, type MagicItemsContent } from './utils/magicItems';
import { refreshAutomaticArmorClass, refreshAutomaticStyleAttacks, refreshCharacterAutomation } from './utils/equipmentRules';

export default function App() {
  const [character, setCharacter] = useState<CharacterData>(INITIAL_CHARACTER);
  const [isTouchMode, setIsTouchMode] = useState(() => localStorage.getItem('dnd_touch_mode') === 'true');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('dnd_theme') === 'dark');
  const [isAutoBuilderOpen, setIsAutoBuilderOpen] = useState(false);
  const [autoBuilderContent, setAutoBuilderContent] = useState<AutoBuilderContent | null>(null);
  const [magicItems, setMagicItems] = useState<MagicItemData[]>([]);

  // All class and subclass features for search
	  const allFeatures = useMemo(() => {
	    if (!autoBuilderContent) return [];
	    const result: Array<{ id: string; sourceId: string; name: string; sourceName: string; description: string }> = [];
	    for (const cls of autoBuilderContent.classes) {
	      for (const f of cls.levelOneFeatures || []) {
	        if (f.name && f.description) {
	          result.push({
	            id: `${cls.key}-${cls.source}-${f.name}`,
	            sourceId: `class:${cls.key}:${f.source}:L${f.level}`,
	            name: f.name,
	            sourceName: `${cls.name} (${f.source}) L${f.level}`,
	            description: f.description,
	          });
	        }
	      }
	      for (const f of cls.levelFeatures || []) {
	        if (f.name && f.description) {
	          result.push({
	            id: `${cls.key}-${cls.source}-L${f.level}-${f.name}`,
	            sourceId: `class:${cls.key}:${f.source}:L${f.level}`,
	            name: f.name,
	            sourceName: `${cls.name} L${f.level} (${f.source})`,
	            description: f.description,
	          });
	        }
	      }
	    }
	    for (const sub of autoBuilderContent.subclasses) {
	      for (const f of sub.features || []) {
	        if (f.name && f.description) {
	          result.push({
	            id: `subclass-${sub.id}-L${f.level}-${f.name}`,
	            sourceId: `subclass:${sub.id}:${f.source}:L${f.level}`,
	            name: f.name,
	            sourceName: `${sub.name} (${sub.className} · ${f.source}) L${f.level}`,
	            description: f.description,
	          });
	        }
	      }
	    }
	    return result;
	  }, [autoBuilderContent]);
  const { t } = useLanguage();
  const { user, logout } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
    localStorage.setItem('dnd_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

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

  // Purchase magic item from search → add to inventory
  const handlePurchaseItem = (itemName: string, itemSource: string) => {
    setCharacter(prev => {
      const existing = prev.inventory.find(i => i.name === itemName && i.source === itemSource);
      if (existing) {
        return applyCharacterAdjustments(prev, {
          id: `inv-${itemName}|${itemSource}`,
          sourceId: `inv-${itemName}|${itemSource}`,
          sourceName: itemName,
          operations: [{ type: 'addItem', item: { ...existing, count: existing.count + 1 } }],
        });
      }
      return applyCharacterAdjustments(prev, {
        id: `inv-${itemName}|${itemSource}`,
        sourceId: `inv-${itemName}|${itemSource}`,
        sourceName: itemName,
        operations: [{
          type: 'addItem',
          item: { id: `${itemName}|${itemSource}`, name: itemName, source: itemSource, count: 1 },
        }],
      });
    });
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
      return (
        <>
          <ThemeToggle isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(current => !current)} />
          <AuthScreen />
        </>
      );
  }

  const totalLevel = getTotalLevel(character.classes);
  const profBonus = calculateProficiencyBonus(totalLevel);
  const passivePerception = calculatePassivePerception(
    character.abilities.WIS,
    profBonus,
    character.proficiencies.has('Perception'),
  );

  return (
    <>
      <ThemeToggle isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(current => !current)} />
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

      <CharacterSheet
        data={character}
        profBonus={profBonus}
        passivePerception={passivePerception}
        isTouchMode={isTouchMode}
        autoBuilderContent={autoBuilderContent}
        magicItems={magicItems}
        onChange={updateField}
        onUpdateCharacter={setCharacter}
        onUpdateAbility={updateAbility}
        onToggleProficiency={toggleProficiency}
        onToggleExpertise={toggleExpertise}
        onRemoveAdjustment={(sourceId) => setCharacter((current) => (
          refreshDerivedCharacter(removeCharacterAdjustments(current, sourceId))
        ))}
        onUpdateResource={updateResource}
      />

      <div className="mt-4">
        <SearchPanel
		          spells={autoBuilderContent?.spells || []}
		          features={[...allFeatures, ...character.featureEntries.map(f => ({ id: f.id, sourceId: f.sourceId, name: f.name, sourceName: f.sourceName, description: f.description }))]}
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
		          ruleSystem={character.automation.ruleSystem}
		          onPurchaseItem={handlePurchaseItem}
		        />
      </div>

      <footer className="mt-12 text-center text-gray-400 text-xs pb-4">
        <p>&copy; {new Date().getFullYear()} {t('footer.text')}</p>
      </footer>
      <FloatingDiceRoller />
      </div>
    </>
  );
}
