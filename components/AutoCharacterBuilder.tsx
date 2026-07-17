import React, { useEffect, useMemo, useState } from 'react';
import { AbilityName, CharacterData, RuleSystem, Spell } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import {
  AutoBuilderContent,
  AutoBuilderAbilityChoice,
  AutoBuilderAbilityScoreImprovementChoice,
  AutoBuilderClassFeatureChoice,
  AutoBuilderFeatChoice,
  AutoBuilderLanguageChoiceSelection,
  AutoBuilderRaceChoice,
  AutoBuilderInvocationChoice,
  AutoBuilderSkillChoiceSelection,
  AutoBuilderSpellChoice,
  AutoBuilderTextChoiceSelection,
  AutoBuilderToolChoiceSelection,
  AutoBuilderWeaponChoiceSelection,
  areAutoBuilderChoiceGroupsComplete,
  areAutoBuilderOriginChoicesComplete,
  buildLevelOneCharacter,
  buildLevelUpCharacter,
  getAutoBuilderClass,
  getAutoBuilderClasses,
  getAutoBuilderBackgrounds,
  getAutoBuilderOrigin,
  getAutoBuilderOriginChoiceGroups,
  getAutoBuilderRaces,
  getAutoBuilderSubclasses,
  getAutoBuilderSubraces,
  getBackgroundAbilityOptions,
  getBackgroundFeats,
  getAbilityScoreImprovementFeatOptions,
  getFeatAbilityChoiceOptions,
  getFeatExpertiseChoiceOptions,
  getFeatFightingStyleChoiceState,
  getFeatInvocationChoiceState,
  getFeatLanguageChoiceOptions,
  getFeatManeuverChoiceState,
  getFeatMetamagicChoiceState,
  getFeatResistanceChoiceOptions,
  getFeatSavingThrowChoiceOptions,
  getFeatSkillChoiceOptions,
  getFeatSpellChoiceState,
  getFeatToolChoiceOptions,
  getFeatWeaponChoiceOptions,
  getClassLevel,
  getClassExpertiseChoiceOptions,
  getClassFixedToolProficiencies,
  getFightingStyleCantripChoiceState,
  getFightingStyleFeatureChoiceOptions,
  getFightingStyleFeatChoiceOptions,
  getExistingFeatSpellLevelUpChoiceState,
  getExistingFeatSpellLevelUpChoiceStates,
  getExistingOriginSpellLevelUpChoiceStates,
  getInvocationChoiceState,
  getInvocationPrerequisiteSummary,
  getManeuverChoiceState,
  getMetamagicChoiceState,
  isCharacterClassForDefinition,
  getLevelOneSpellChoiceState,
  getOriginFeatChoiceOptions,
  getOriginSpellChoiceState,
  getClassToolChoiceOptions,
  getMulticlassSkillChoiceOptions,
  getMulticlassToolChoiceOptions,
  getOriginFixedSkillProficiencies,
  getRaceFeatChoiceOptions,
  getSpellChoiceState,
  getSkillChoiceOptions,
  getWeaponMasteryChoiceState,
  isAbilityScoreImprovementLevel,
	  loadAutoBuilderContent,
	  getMagicalSecretLevels,
	  getMagicalSecretSpellOptions,
	  getMaxSpellLevel,
	} from '../utils/autoBuilderRules';
import { formatWeaponMasteryNames } from '../utils/equipmentRules';

const ALL_ABILITIES: AbilityName[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

const collectSkillChoices = (choices?: AutoBuilderSkillChoiceSelection): string[] => (
  Object.values(choices || {}).flat()
);

const collectToolChoices = (choices?: AutoBuilderToolChoiceSelection): string[] => (
  Object.values(choices || {}).flat().map(tool => `tool:${tool}`)
);

interface AutoCharacterBuilderProps {
  isOpen: boolean;
  data: CharacterData;
  onClose: () => void;
  onApply: (character: CharacterData) => void;
}

export const AutoCharacterBuilder: React.FC<AutoCharacterBuilderProps> = ({
  isOpen,
  data,
  onClose,
  onApply,
}) => {
  const { t } = useLanguage();
  const [ruleSystem, setRuleSystem] = useState<RuleSystem>(data.automation.ruleSystem);
  const [raceKey, setRaceKey] = useState('');
  const [subraceKey, setSubraceKey] = useState('');
  const [backgroundKey, setBackgroundKey] = useState('');
  const [className, setClassName] = useState(data.classes[0]?.name || 'Fighter');
  const [content, setContent] = useState<AutoBuilderContent | null>(null);
  const [loadError, setLoadError] = useState('');
  const [skillChoices, setSkillChoices] = useState<string[]>([]);
  const [spellChoices, setSpellChoices] = useState<AutoBuilderSpellChoice>({ cantrips: [], leveled: [] });
  const [invocationChoices, setInvocationChoices] = useState<AutoBuilderInvocationChoice>({ invocationIds: [] });
  const [decoupleOriginFromBackground, setDecoupleOriginFromBackground] = useState(Boolean(data.automation.originDecoupled));
  const [backgroundAbilityChoice, setBackgroundAbilityChoice] = useState<AutoBuilderAbilityChoice>({ mode: 'plus2plus1' });
  const [originFeatChoice, setOriginFeatChoice] = useState<AutoBuilderRaceChoice>({});
  const [raceChoices, setRaceChoices] = useState<AutoBuilderRaceChoice>({});
  const [classToolChoices, setClassToolChoices] = useState<AutoBuilderToolChoiceSelection>({});
  const [backgroundToolChoices, setBackgroundToolChoices] = useState<AutoBuilderToolChoiceSelection>({});
  const [backgroundLanguageChoices, setBackgroundLanguageChoices] = useState<AutoBuilderLanguageChoiceSelection>({});
  const [abilityScoreImprovementChoice, setAbilityScoreImprovementChoice] = useState<AutoBuilderAbilityScoreImprovementChoice>({ mode: 'plus2', plus2: 'STR' });
  const [classFeatureChoices, setClassFeatureChoices] = useState<AutoBuilderClassFeatureChoice>({});
  const [subclassId, setSubclassId] = useState('');
  const [spellReplaceRemoveId, setSpellReplaceRemoveId] = useState<string | null>(null);
  const [spellReplaceAddId, setSpellReplaceAddId] = useState<string | null>(null);
  const [magicalSecretChoices, setMagicalSecretChoices] = useState<string[]>([]);
  const [magicalSecretReplaceId, setMagicalSecretReplaceId] = useState<string | null>(null);
  const [magicalSecretReplaceAddId, setMagicalSecretReplaceAddId] = useState<string | null>(null);
  const [existingFeatChoices, setExistingFeatChoices] = useState<Record<string, AutoBuilderFeatChoice>>({});
  const [existingOriginSpellChoices, setExistingOriginSpellChoices] = useState<Record<string, AutoBuilderRaceChoice>>({});
  const isLevelUpMode = data.automation.active;

  useEffect(() => {
    if (!isOpen || content) return;
    loadAutoBuilderContent()
      .then(setContent)
      .catch(error => setLoadError(error instanceof Error ? error.message : String(error)));
  }, [content, isOpen]);

  const classOptions = useMemo(() => (
    content ? getAutoBuilderClasses(content, ruleSystem) : []
  ), [content, ruleSystem]);
  const isOriginDecoupled = ruleSystem === '5r' && decoupleOriginFromBackground;
  const raceOptions = useMemo(() => (
    content ? getAutoBuilderRaces(content, ruleSystem) : []
  ), [content, ruleSystem]);
  const backgroundOptions = useMemo(() => (
    content ? getAutoBuilderBackgrounds(content, ruleSystem) : []
  ), [content, ruleSystem]);
  const selectedClass = content ? getAutoBuilderClass(content, className, ruleSystem) || classOptions[0] : undefined;
  const subclassOptions = content ? getAutoBuilderSubclasses(content, selectedClass) : [];
  const selectedRace = getAutoBuilderOrigin(raceOptions, raceKey);
  const subraceOptions = useMemo(() => (
    content ? getAutoBuilderSubraces(content, selectedRace, ruleSystem) : []
  ), [content, selectedRace, ruleSystem]);
  const selectedSubrace = getAutoBuilderOrigin(subraceOptions, subraceKey);
  const selectedBackground = getAutoBuilderOrigin(backgroundOptions, backgroundKey);
  const currentCharacterLevel = Math.max(0, data.classes.reduce((total, item) => total + item.level, 0));
  const targetCharacterLevel = Math.max(
    1,
    currentCharacterLevel + (isLevelUpMode ? 1 : 0),
  );
  const raceOriginChoiceGroups = content
    ? getAutoBuilderOriginChoiceGroups(content, ruleSystem, selectedRace, selectedSubrace)
    : null;
  const raceResistanceOptions = raceOriginChoiceGroups?.resistance[0]?.from || [];
  const raceSizeOptions = raceOriginChoiceGroups?.size[0]?.options.map(option => ({
    value: option.id,
    label: option.name,
  })) || [];
  const raceFeatureChoiceOptions = raceOriginChoiceGroups?.feature.map(group => ({
    id: group.id,
    label: group.label,
    options: group.options.map(option => ({ value: option.id, label: option.name })),
  })) || [];
  const raceAbilityChoiceState = raceOriginChoiceGroups?.ability[0]
    ? {
        from: raceOriginChoiceGroups.ability[0].from as AbilityName[],
        count: raceOriginChoiceGroups.ability[0].count,
      }
    : null;
  const raceSkillChoiceState = raceOriginChoiceGroups?.skill[0]
    ? {
        from: raceOriginChoiceGroups.skill[0].from,
        count: raceOriginChoiceGroups.skill[0].count,
      }
    : null;
  const raceFeatChoiceState = content ? getRaceFeatChoiceOptions(content, ruleSystem, data, selectedRace, selectedSubrace) : null;
  const selectedRaceFeat = raceFeatChoiceState?.from.find(feat => (
    `${feat.key}|${feat.source}` === raceChoices.featId || feat.key === raceChoices.featId
  ));
  const raceFeatAbilityOptions = getFeatAbilityChoiceOptions(selectedRaceFeat);
  const raceFeatSkillChoiceOptions = getFeatSkillChoiceOptions(selectedRaceFeat);
  const raceFeatToolChoiceOptions = getFeatToolChoiceOptions(selectedRaceFeat);
  const raceFeatWeaponChoiceOptions = content ? getFeatWeaponChoiceOptions(content, selectedRaceFeat, ruleSystem) : [];
  const raceFeatResistanceChoiceOptions = getFeatResistanceChoiceOptions(selectedRaceFeat);
  const raceFeatExpertiseChoiceOptions = getFeatExpertiseChoiceOptions(selectedRaceFeat, data, raceChoices.featSkillChoices);
  const raceFeatLanguageChoiceOptions = getFeatLanguageChoiceOptions(selectedRaceFeat);
  const raceFeatSavingThrowChoiceOptions = getFeatSavingThrowChoiceOptions(selectedRaceFeat);
  const raceFeatSpellChoiceState = content ? getFeatSpellChoiceState(content, selectedRaceFeat, ruleSystem, 1) : null;
  const raceOriginSpellStates = content
    ? [
        getOriginSpellChoiceState(content, selectedRace, ruleSystem, 1),
        getOriginSpellChoiceState(content, selectedSubrace, ruleSystem, 1),
      ].filter((state): state is NonNullable<ReturnType<typeof getOriginSpellChoiceState>> => Boolean(state))
    : [];
  const raceOriginSpellChoiceState = raceOriginSpellStates.length
    ? { blocks: raceOriginSpellStates.flatMap(state => state.blocks) }
    : null;
  const backgroundAbilityOptions = isOriginDecoupled ? ALL_ABILITIES : getBackgroundAbilityOptions(selectedBackground);
  const backgroundFeats = content && !isOriginDecoupled ? getBackgroundFeats(content, selectedBackground) : [];
  const originFeatChoiceState = content && isOriginDecoupled ? getOriginFeatChoiceOptions(content, ruleSystem, data) : null;
  const selectedOriginFeat = originFeatChoiceState?.from.find(feat => (
    `${feat.key}|${feat.source}` === originFeatChoice.featId || feat.key === originFeatChoice.featId
  ));
  const originFeatAbilityOptions = getFeatAbilityChoiceOptions(selectedOriginFeat);
  const originFeatSkillChoiceOptions = getFeatSkillChoiceOptions(selectedOriginFeat);
  const originFeatToolChoiceOptions = getFeatToolChoiceOptions(selectedOriginFeat);
  const originFeatWeaponChoiceOptions = content ? getFeatWeaponChoiceOptions(content, selectedOriginFeat, ruleSystem) : [];
  const originFeatResistanceChoiceOptions = getFeatResistanceChoiceOptions(selectedOriginFeat);
  const originFeatExpertiseChoiceOptions = getFeatExpertiseChoiceOptions(selectedOriginFeat, data, originFeatChoice.featSkillChoices);
  const originFeatLanguageChoiceOptions = getFeatLanguageChoiceOptions(selectedOriginFeat);
  const originFeatSavingThrowChoiceOptions = getFeatSavingThrowChoiceOptions(selectedOriginFeat);
  const originFeatSpellChoiceState = content ? getFeatSpellChoiceState(content, selectedOriginFeat, ruleSystem, 1) : null;
  const skillChoiceState = selectedClass ? getSkillChoiceOptions(selectedClass) : null;
  const currentClassLevel = selectedClass ? getClassLevel(data, selectedClass) : 0;
  const targetClassLevel = isLevelUpMode ? currentClassLevel + 1 : 1;
  const existingClass = selectedClass ? data.classes.find(item => isCharacterClassForDefinition(item, selectedClass)) : undefined;
  const isNewMulticlass = isLevelUpMode && currentClassLevel === 0;
  const activeSkillChoiceState = selectedClass
    ? (isNewMulticlass ? getMulticlassSkillChoiceOptions(selectedClass) : (!isLevelUpMode ? skillChoiceState : null))
    : null;
  const backgroundOriginChoiceGroups = content
    ? getAutoBuilderOriginChoiceGroups(content, ruleSystem, selectedBackground)
    : null;
  const raceToolChoiceOptions = raceOriginChoiceGroups?.tool || [];
  const raceWeaponChoiceOptions = raceOriginChoiceGroups?.weapon || [];
  const backgroundToolChoiceOptions = backgroundOriginChoiceGroups?.tool || [];
  const raceLanguageChoiceOptions = raceOriginChoiceGroups?.language || [];
  const backgroundLanguageChoiceOptions = backgroundOriginChoiceGroups?.language || [];
  const classToolChoiceOptions = selectedClass
    ? (isNewMulticlass ? getMulticlassToolChoiceOptions(selectedClass) : (!isLevelUpMode ? getClassToolChoiceOptions(selectedClass) : []))
    : [];
  const fightingStyleChoiceState = content && selectedClass
    ? getFightingStyleFeatChoiceOptions(content, ruleSystem, data, selectedClass, targetClassLevel)
    : null;
  const fightingStyleFeatureChoiceState = content && selectedClass
    ? getFightingStyleFeatureChoiceOptions(content, ruleSystem, data, selectedClass, targetClassLevel)
    : null;
  const selectedFightingStyleFeat = fightingStyleChoiceState?.from.find(feat => (
    `${feat.key}|${feat.source}` === classFeatureChoices.fightingStyle?.featId
    || feat.key === classFeatureChoices.fightingStyle?.featId
  ));
  const selectedFightingStyleFeature = fightingStyleFeatureChoiceState?.from.find(style => (
    style.id === classFeatureChoices.fightingStyleFeatureId
  ));
  const fightingStyleManeuverCount = (
    selectedFightingStyleFeature?.key === 'Superior Technique'
    || selectedFightingStyleFeature?.name === '卓越技巧'
  ) ? 1 : 0;
  const fightingStyleFeatAbilityOptions = getFeatAbilityChoiceOptions(selectedFightingStyleFeat);
  const fightingStyleFeatSkillChoiceOptions = getFeatSkillChoiceOptions(selectedFightingStyleFeat);
  const fightingStyleFeatToolChoiceOptions = getFeatToolChoiceOptions(selectedFightingStyleFeat);
  const fightingStyleFeatWeaponChoiceOptions = content ? getFeatWeaponChoiceOptions(content, selectedFightingStyleFeat, ruleSystem) : [];
  const fightingStyleFeatResistanceChoiceOptions = getFeatResistanceChoiceOptions(selectedFightingStyleFeat);
  const fightingStyleFeatExpertiseChoiceOptions = getFeatExpertiseChoiceOptions(selectedFightingStyleFeat, data, classFeatureChoices.fightingStyle?.featSkillChoices);
  const fightingStyleFeatLanguageChoiceOptions = getFeatLanguageChoiceOptions(selectedFightingStyleFeat);
  const fightingStyleFeatSavingThrowChoiceOptions = getFeatSavingThrowChoiceOptions(selectedFightingStyleFeat);
  const fightingStyleFeatSpellChoiceState = content ? getFeatSpellChoiceState(content, selectedFightingStyleFeat, ruleSystem, targetCharacterLevel) : null;
  const fightingStyleCantripChoiceState = content ? getFightingStyleCantripChoiceState(content, selectedFightingStyleFeat || selectedFightingStyleFeature) : null;
  const pendingProficiencies = [
    ...skillChoices,
    ...(raceChoices.skills || []),
    ...getOriginFixedSkillProficiencies(selectedRace, selectedSubrace, selectedBackground),
    ...collectSkillChoices(raceChoices.featSkillChoices),
    ...collectSkillChoices(originFeatChoice.featSkillChoices),
    ...collectSkillChoices(classFeatureChoices.fightingStyle?.featSkillChoices),
    ...collectSkillChoices(abilityScoreImprovementChoice.featSkillChoices),
    ...getClassFixedToolProficiencies(selectedClass, isNewMulticlass),
    ...collectToolChoices(raceChoices.toolChoices),
    ...collectToolChoices(backgroundToolChoices),
    ...collectToolChoices(classToolChoices),
    ...collectToolChoices(raceChoices.featToolChoices),
    ...collectToolChoices(originFeatChoice.featToolChoices),
    ...collectToolChoices(classFeatureChoices.fightingStyle?.featToolChoices),
    ...collectToolChoices(abilityScoreImprovementChoice.featToolChoices),
  ];
  const classExpertiseChoiceOptions = selectedClass
    ? getClassExpertiseChoiceOptions(selectedClass, data, targetClassLevel, pendingProficiencies)
    : [];
  const weaponMasteryChoiceState = content && selectedClass
    ? getWeaponMasteryChoiceState(content, selectedClass, data, targetClassLevel)
    : null;
  const needsAbilityScoreImprovementChoice = isLevelUpMode && isAbilityScoreImprovementLevel(selectedClass, targetClassLevel);
  const abilityScoreImprovementFeatOptions = content ? getAbilityScoreImprovementFeatOptions(content, ruleSystem, data, targetClassLevel) : [];
  const selectedAbilityScoreImprovementFeat = abilityScoreImprovementFeatOptions.find(feat => (
    `${feat.key}|${feat.source}` === abilityScoreImprovementChoice.featId || feat.key === abilityScoreImprovementChoice.featId
  ));
  const abilityScoreImprovementFeatAbilityOptions = getFeatAbilityChoiceOptions(selectedAbilityScoreImprovementFeat);
  const abilityScoreImprovementFeatSkillChoiceOptions = getFeatSkillChoiceOptions(selectedAbilityScoreImprovementFeat);
  const abilityScoreImprovementFeatToolChoiceOptions = getFeatToolChoiceOptions(selectedAbilityScoreImprovementFeat);
  const abilityScoreImprovementFeatWeaponChoiceOptions = content ? getFeatWeaponChoiceOptions(content, selectedAbilityScoreImprovementFeat, ruleSystem) : [];
  const abilityScoreImprovementFeatResistanceChoiceOptions = getFeatResistanceChoiceOptions(selectedAbilityScoreImprovementFeat);
  const abilityScoreImprovementFeatLanguageChoiceOptions = getFeatLanguageChoiceOptions(selectedAbilityScoreImprovementFeat);
  const abilityScoreImprovementFeatSavingThrowChoiceOptions = getFeatSavingThrowChoiceOptions(selectedAbilityScoreImprovementFeat);
  const abilityScoreImprovementFeatSpellChoiceState = content ? getFeatSpellChoiceState(content, selectedAbilityScoreImprovementFeat, ruleSystem, targetCharacterLevel) : null;
  const existingFeatSpellChoiceStates = content && isLevelUpMode
    ? getExistingFeatSpellLevelUpChoiceStates(content, data, ruleSystem, currentCharacterLevel, targetCharacterLevel)
    : [];
  const getExistingFeatChoice = (featKey: string, featSource: string): AutoBuilderFeatChoice => {
    const featId = `${featKey}|${featSource}`;
    return existingFeatChoices[featId] || { featId };
  };
  const existingOriginSpellChoiceStates = content && isLevelUpMode
    ? getExistingOriginSpellLevelUpChoiceStates(
        content,
        data,
        ruleSystem,
        currentCharacterLevel,
        targetCharacterLevel,
      )
    : [];
  const abilityScoreImprovementFeatFightingStyleChoiceState = content
    ? getFeatFightingStyleChoiceState(content, selectedAbilityScoreImprovementFeat, data)
    : null;
  const selectedAbilityScoreImprovementFeatFightingStyle = abilityScoreImprovementFeatFightingStyleChoiceState?.from.find(style => (
    style.id === abilityScoreImprovementChoice.featFightingStyleFeatureId
  ));
  const abilityScoreImprovementFeatFightingStyleManeuverCount = (
    selectedAbilityScoreImprovementFeatFightingStyle?.key === 'Superior Technique'
    || selectedAbilityScoreImprovementFeatFightingStyle?.name === '卓越技巧'
  ) ? 1 : 0;
  const abilityScoreImprovementFeatManeuverChoiceState = content
    ? getFeatManeuverChoiceState(
        content,
        selectedAbilityScoreImprovementFeat,
        data,
        ruleSystem,
        abilityScoreImprovementFeatFightingStyleManeuverCount,
      )
    : null;
  const abilityScoreImprovementFeatInvocationChoiceState = content
    ? getFeatInvocationChoiceState(
        content,
        selectedAbilityScoreImprovementFeat,
        data,
        ruleSystem,
        targetCharacterLevel,
        abilityScoreImprovementChoice.featInvocations || [],
        [...spellChoices.cantrips, ...spellChoices.leveled],
      )
    : null;
  const abilityScoreImprovementFeatMetamagicChoiceState = content
    ? getFeatMetamagicChoiceState(content, selectedAbilityScoreImprovementFeat, data, ruleSystem)
    : null;
  const abilityScoreImprovementFeatExpertiseChoiceOptions = getFeatExpertiseChoiceOptions(
    selectedAbilityScoreImprovementFeat,
    data,
    abilityScoreImprovementChoice.featSkillChoices,
  );
  const needsSubclassChoice = Boolean(selectedClass?.subclassLevels?.includes(targetClassLevel) && !existingClass?.subclass);
  const selectedSubclass = subclassOptions.find(subclass => subclass.id === subclassId)
    || subclassOptions.find(subclass => existingClass?.subclass && subclass.name === existingClass.subclass);
  const activeSpellSubclass = needsSubclassChoice || existingClass?.subclass ? selectedSubclass : undefined;
  const selectedSpellProfileId = selectedClass
    ? `auto-${selectedClass.key.toLowerCase()}-${selectedClass.source.toLowerCase()}-spellcasting`
    : '';
  const existingSpellProfile = selectedClass
    ? (
        data.spellcastingProfiles.find(profile => profile.id === selectedSpellProfileId)
        || (existingClass ? data.spellcastingProfiles.find(profile => profile.classId === existingClass.id) : undefined)
        || data.spellcastingProfiles.find(profile => !profile.classId && (profile.className === selectedClass.name || profile.className === selectedClass.key))
      )
    : undefined;
  const existingSpellIds = new Set(existingSpellProfile?.spells.map(spell => spell.id) || []);
  const spellChoiceState = content && selectedClass
    ? (isLevelUpMode
        ? getSpellChoiceState(content, selectedClass, targetClassLevel, existingSpellProfile?.spells || [], activeSpellSubclass)
        : getLevelOneSpellChoiceState(content, selectedClass, activeSpellSubclass))
    : null;
  const neededSpellChoices = spellChoiceState?.needed || { cantrips: 0, leveled: 0 };
  const fixedLeveledSpellGroups = spellChoiceState?.fixedLeveledGroups || [];
  const fixedLeveledSpellIds = new Set(fixedLeveledSpellGroups.flatMap(group => group.options.map(spell => spell.id)));
  const selectedFixedLeveledSpellIds = spellChoices.leveled.filter(id => fixedLeveledSpellIds.has(id));
  const selectedRegularLeveledSpellIds = spellChoices.leveled.filter(id => !fixedLeveledSpellIds.has(id));
  // Spell replacement on level-up for known-spell casters
  const isKnownCaster = isLevelUpMode && selectedClass
    && selectedClass.preparedSpellsChange !== 'restLong'
    && !!(selectedClass.spellsKnownProgression?.length
      || selectedClass.spellsKnownProgressionFixedByLevel
      || selectedClass.spellsKnownProgressionFixedAllowLowerLevel
      || selectedClass.preparedSpellsProgression?.length);
  const canReplaceSpell = isKnownCaster
    && (existingSpellProfile?.spells.filter(s => s.level > 0).length || 0) > 0;
  const existingReplaceableSpells = existingSpellProfile?.spells.filter(s => s.level > 0) || [];
  const replacementSpellOptions = spellChoiceState?.leveled.filter(spell => !existingSpellIds.has(spell.id) && spell.id !== spellReplaceRemoveId) || [];
  const isValidSpellReplacement = !spellReplaceRemoveId || !spellReplaceAddId
    || (existingReplaceableSpells.some(s => s.id === spellReplaceRemoveId) && replacementSpellOptions.some(s => s.id === spellReplaceAddId));
  const invocationChoiceState = content
    ? getInvocationChoiceState(
        content,
        selectedClass,
        data,
        targetClassLevel,
        invocationChoices.invocationIds,
        [...spellChoices.cantrips, ...spellChoices.leveled],
      )
    : { isInvocationClass: false, needed: 0, options: [] };
  const metamagicChoiceState = content && selectedClass
    ? getMetamagicChoiceState(content, selectedClass, data, targetClassLevel)
    : { isMetamagicClass: false, needed: 0, options: [] };
	  const maneuverChoiceState = content
	    ? getManeuverChoiceState(content, selectedSubclass, data, targetClassLevel, fightingStyleManeuverCount, ruleSystem)
	    : { isManeuverSubclass: false, needed: 0, options: [] };

	  // Magical Secrets — only 5e (PHB) Bard uses a special selection panel
	  const isMagicalSecretLevel = isLevelUpMode
	    && selectedClass?.englishName === 'Bard'
	    && selectedClass?.source === 'PHB'
	    && [10, 14, 18].includes(targetClassLevel);
	  const msPool = (content && selectedClass && isMagicalSecretLevel)
	    ? getMagicalSecretSpellOptions(content, selectedClass, getMaxSpellLevel(selectedClass, targetClassLevel))
	    : [];
	  // 5r (XPHB) Bard gets the expanded pool from the engine (getSpellOptionsForClassLevel)
	  // so no special UI needed; normal spell selection just shows more options.

	  useEffect(() => {
	    setSkillChoices([]);
	    setSpellChoices({ cantrips: [], leveled: [] });
	    setInvocationChoices({ invocationIds: [] });
	    setOriginFeatChoice({});
	    setRaceChoices({});
	    setClassToolChoices({});
	    setBackgroundToolChoices({});
	    setBackgroundLanguageChoices({});
	    setAbilityScoreImprovementChoice({ mode: 'plus2', plus2: 'STR' });
	    setClassFeatureChoices({});
	    setSubclassId('');
	    setSpellReplaceRemoveId(null);
	    setSpellReplaceAddId(null);
	    setMagicalSecretChoices([]);
	    setMagicalSecretReplaceId(null);
	    setMagicalSecretReplaceAddId(null);
	  }, [className, ruleSystem, raceKey, subraceKey, backgroundKey, isOriginDecoupled, isOpen]);

  useEffect(() => {
    if (ruleSystem !== '5r') setDecoupleOriginFromBackground(false);
  }, [ruleSystem]);

  useEffect(() => {
    const originChoiceGroups = content
      ? getAutoBuilderOriginChoiceGroups(content, ruleSystem, selectedRace, selectedSubrace)
      : null;
    const featChoice = content ? getRaceFeatChoiceOptions(content, ruleSystem, data, selectedRace, selectedSubrace) : null;
    setRaceChoices({
      resistance: originChoiceGroups?.resistance[0]?.from[0],
      size: originChoiceGroups?.size[0]?.from[0],
      featId: featChoice?.from[0] ? `${featChoice.from[0].key}|${featChoice.from[0].source}` : undefined,
    });
  }, [content, data, ruleSystem, selectedRace, selectedSubrace]);

  useEffect(() => {
    const abilities = isOriginDecoupled ? ALL_ABILITIES : getBackgroundAbilityOptions(selectedBackground);
    setBackgroundAbilityChoice({
      mode: 'plus2plus1',
      plus2: abilities[0],
      plus1: abilities.find(ability => ability !== abilities[0]),
      plus1a: abilities[0],
      plus1b: abilities.find(ability => ability !== abilities[0]),
      plus1c: abilities.find(ability => ability !== abilities[0] && ability !== abilities[1]),
    });
  }, [selectedBackground, isOriginDecoupled]);

  useEffect(() => {
    setRaceKey('');
    setSubraceKey('');
    setBackgroundKey('');
  }, [ruleSystem]);

  useEffect(() => {
    setSubraceKey('');
  }, [raceKey]);

	  useEffect(() => {
	    setSpellChoices({ cantrips: [], leveled: [] });
	    setInvocationChoices({ invocationIds: [] });
	    setSpellReplaceRemoveId(null);
	    setSpellReplaceAddId(null);
	    setMagicalSecretChoices([]);
	    setMagicalSecretReplaceId(null);
	    setMagicalSecretReplaceAddId(null);
	  }, [subclassId]);

  if (!isOpen) return null;

  const toggleLimitedChoice = (value: string, current: string[], limit: number): string[] => {
    if (current.includes(value)) return current.filter(item => item !== value);
    if (current.length >= limit) return current;
    return [...current, value];
  };

  const toggleSkill = (skill: string) => {
    if (!activeSkillChoiceState) return;
    setSkillChoices(prev => toggleLimitedChoice(skill, prev, activeSkillChoiceState.count));
  };

  const toggleRaceAbility = (ability: AbilityName) => {
    if (!raceAbilityChoiceState) return;
    setRaceChoices(prev => ({
      ...prev,
      abilities: toggleLimitedChoice(ability, prev.abilities || [], raceAbilityChoiceState.count) as AbilityName[],
    }));
  };

  const toggleRaceSkill = (skill: string) => {
    if (!raceSkillChoiceState) return;
    setRaceChoices(prev => ({
      ...prev,
      skills: toggleLimitedChoice(skill, prev.skills || [], raceSkillChoiceState.count),
    }));
  };

  const toggleSpell = (kind: keyof AutoBuilderSpellChoice, spellId: string) => {
    if (!spellChoiceState) return;
    const limit = neededSpellChoices[kind === 'cantrips' ? 'cantrips' : 'leveled'];
    setSpellChoices(prev => ({
      ...prev,
      [kind]: toggleLimitedChoice(spellId, prev[kind], limit),
    }));
  };

  const toggleLeveledSpell = (spellId: string, limit: number, optionIds: Set<string>) => {
    setSpellChoices(prev => {
      const currentGroupIds = prev.leveled.filter(id => optionIds.has(id));
      const nextGroupIds = toggleLimitedChoice(spellId, currentGroupIds, limit);
      return {
        ...prev,
        leveled: [
          ...prev.leveled.filter(id => !optionIds.has(id)),
          ...nextGroupIds,
        ],
      };
    });
  };

  const toggleInvocation = (invocationId: string) => {
    const currentIds = new Set(invocationChoiceState.options.map(invocation => invocation.id));
    setInvocationChoices(prev => ({
      invocationIds: toggleLimitedChoice(
        invocationId,
        prev.invocationIds.filter(id => currentIds.has(id)),
        invocationChoiceState.needed,
      ),
    }));
  };

  const toggleWeaponMastery = (weaponId: string) => {
    if (!weaponMasteryChoiceState) return;
    const currentIds = new Set(weaponMasteryChoiceState.options.map(weapon => weapon.id));
    setClassFeatureChoices(prev => ({
      ...prev,
      weaponMasteries: toggleLimitedChoice(
        weaponId,
        (prev.weaponMasteries || []).filter(id => currentIds.has(id)),
        weaponMasteryChoiceState.needed,
      ),
    }));
  };

  const toggleMetamagic = (metamagicId: string) => {
    const currentIds = new Set(metamagicChoiceState.options.map(metamagic => metamagic.id));
    setClassFeatureChoices(prev => ({
      ...prev,
      metamagics: toggleLimitedChoice(
        metamagicId,
        (prev.metamagics || []).filter(id => currentIds.has(id)),
        metamagicChoiceState.needed,
      ),
    }));
  };

  const toggleManeuver = (maneuverId: string) => {
    const currentIds = new Set(maneuverChoiceState.options.map(maneuver => maneuver.id));
    setClassFeatureChoices(prev => ({
      ...prev,
      maneuvers: toggleLimitedChoice(
        maneuverId,
        (prev.maneuvers || []).filter(id => currentIds.has(id)),
        maneuverChoiceState.needed,
      ),
    }));
  };

  const toggleToolChoice = (
    choiceId: string,
    tool: string,
    limit: number,
    setChoices: React.Dispatch<React.SetStateAction<AutoBuilderToolChoiceSelection>>,
  ) => {
    setChoices(prev => ({
      ...prev,
      [choiceId]: toggleLimitedChoice(tool, prev[choiceId] || [], limit),
    }));
  };

  const toggleSkillChoice = (
    choiceId: string,
    skill: string,
    limit: number,
    setChoices: React.Dispatch<React.SetStateAction<AutoBuilderSkillChoiceSelection>>,
  ) => {
    setChoices(prev => ({
      ...prev,
      [choiceId]: toggleLimitedChoice(skill, prev[choiceId] || [], limit),
    }));
  };

  const toggleTextChoice = (
    choiceId: string,
    value: string,
    limit: number,
    setChoices: React.Dispatch<React.SetStateAction<AutoBuilderTextChoiceSelection>>,
  ) => {
    setChoices(prev => ({
      ...prev,
      [choiceId]: toggleLimitedChoice(value, prev[choiceId] || [], limit),
    }));
  };

  const renderSkillChoiceGroup = (
    title: string,
    choices: Array<{ id: string; from: string[]; count: number }>,
    values: AutoBuilderSkillChoiceSelection,
    setValues: React.Dispatch<React.SetStateAction<AutoBuilderSkillChoiceSelection>>,
  ) => choices.length > 0 && (
    <div className="md:col-span-2 border border-gray-200 rounded p-3">
      <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">{title}</h3>
      <div className="grid grid-cols-1 gap-3">
        {choices.map(choice => (
          <div key={choice.id}>
            <div className="text-xs font-bold text-gray-700 mb-1">
              {title} {(values[choice.id] || []).length}/{choice.count}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {choice.from.map(skill => (
                <label key={`${choice.id}-${skill}`} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={(values[choice.id] || []).includes(skill)}
                    onChange={() => toggleSkillChoice(choice.id, skill, choice.count, setValues)}
                    disabled={!(values[choice.id] || []).includes(skill) && (values[choice.id] || []).length >= choice.count}
                    className="accent-dnd-red"
                  />
                  {skill.startsWith('tool:') ? skill.slice(5) : t(`skills.${skill}` as any)}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderToolChoiceGroup = (
    title: string,
    choices: Array<{ id: string; from: string[]; count: number }>,
    values: AutoBuilderToolChoiceSelection,
    setValues: React.Dispatch<React.SetStateAction<AutoBuilderToolChoiceSelection>>,
  ) => choices.length > 0 && (
    <div className="md:col-span-2 border border-gray-200 rounded p-3">
      <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">{title}</h3>
      <div className="grid grid-cols-1 gap-3">
        {choices.map(choice => (
          <div key={choice.id}>
            <div className="text-xs font-bold text-gray-700 mb-1">
              {t('auto.toolChoices')} {(values[choice.id] || []).length}/{choice.count}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {choice.from.map(tool => (
                <label key={`${choice.id}-${tool}`} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={(values[choice.id] || []).includes(tool)}
                    onChange={() => toggleToolChoice(choice.id, tool, choice.count, setValues)}
                    disabled={!(values[choice.id] || []).includes(tool) && (values[choice.id] || []).length >= choice.count}
                    className="accent-dnd-red"
                  />
                  {tool}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderWeaponChoiceGroup = (
    title: string,
    choices: Array<{ id: string; from: string[]; count: number }>,
    values: AutoBuilderWeaponChoiceSelection,
    setValues: React.Dispatch<React.SetStateAction<AutoBuilderWeaponChoiceSelection>>,
  ) => choices.length > 0 && content && (
    <div className="md:col-span-2 border border-gray-200 rounded p-3">
      <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">{title}</h3>
      <div className="grid grid-cols-1 gap-3">
        {choices.map(choice => (
          <div key={choice.id}>
            <div className="text-xs font-bold text-gray-700 mb-1">
              {title} {(values[choice.id] || []).length}/{choice.count}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {choice.from.map(weaponId => {
                const weapon = content.weapons.find(item => item.id === weaponId);
                return weapon ? (
                  <label key={`${choice.id}-${weaponId}`} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={(values[choice.id] || []).includes(weaponId)}
                      onChange={() => toggleToolChoice(choice.id, weaponId, choice.count, setValues)}
                      disabled={!(values[choice.id] || []).includes(weaponId) && (values[choice.id] || []).length >= choice.count}
                      className="accent-dnd-red"
                    />
                    {weapon.name} ({weapon.source})
                  </label>
                ) : null;
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTextChoiceGroup = (
    title: string,
    choices: Array<{ id: string; from: string[]; count: number }>,
    values: AutoBuilderTextChoiceSelection,
    setValues: React.Dispatch<React.SetStateAction<AutoBuilderTextChoiceSelection>>,
  ) => choices.length > 0 && (
    <div className="md:col-span-2 border border-gray-200 rounded p-3">
      <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">{title}</h3>
      <div className="grid grid-cols-1 gap-3">
        {choices.map(choice => (
          <div key={choice.id}>
            <div className="text-xs font-bold text-gray-700 mb-1">
              {title} {(values[choice.id] || []).length}/{choice.count}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {choice.from.map(value => (
                <label key={`${choice.id}-${value}`} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={(values[choice.id] || []).includes(value)}
                    onChange={() => toggleTextChoice(choice.id, value, choice.count, setValues)}
                    disabled={!(values[choice.id] || []).includes(value) && (values[choice.id] || []).length >= choice.count}
                    className="accent-dnd-red"
                  />
                  {value}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLanguageChoiceGroup = (
    title: string,
    choices: Array<{ id: string; from: string[]; count: number }>,
    values: AutoBuilderLanguageChoiceSelection,
    setValues: React.Dispatch<React.SetStateAction<AutoBuilderLanguageChoiceSelection>>,
  ) => choices.length > 0 && (
    <div className="md:col-span-2 border border-gray-200 rounded p-3">
      <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">{title}</h3>
      <div className="grid grid-cols-1 gap-3">
        {choices.map(choice => (
          <div key={choice.id}>
            <div className="text-xs font-bold text-gray-700 mb-1">
              {t('auto.languageChoices')} {(values[choice.id] || []).length}/{choice.count}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {choice.from.map(language => (
                <label key={`${choice.id}-${language}`} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={(values[choice.id] || []).includes(language)}
                    onChange={() => toggleToolChoice(choice.id, language, choice.count, setValues)}
                    disabled={!(values[choice.id] || []).includes(language) && (values[choice.id] || []).length >= choice.count}
                    className="accent-dnd-red"
                  />
                  {language}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const updateBackgroundAbilityChoice = (patch: Partial<AutoBuilderAbilityChoice>) => {
    setBackgroundAbilityChoice(prev => ({ ...prev, ...patch }));
  };

  const renderAbilityOption = (ability: AbilityName) => <option key={ability} value={ability}>{ability}</option>;
  const updateAbilityScoreImprovementChoice = (patch: Partial<AutoBuilderAbilityScoreImprovementChoice>) => {
    setAbilityScoreImprovementChoice(prev => ({ ...prev, ...patch }));
  };
	  const areChoiceGroupsComplete = (
	    choices: Array<{ id: string; from?: string[]; count: number; options?: Array<{ id: string }> }>,
	    values: Record<string, string[]> | undefined,
	  ): boolean => areAutoBuilderChoiceGroupsComplete(choices, values);

  const getSelectedFeatSpellBlock = (
    state: ReturnType<typeof getFeatSpellChoiceState>,
    choice: AutoBuilderFeatChoice,
  ) => state?.blocks.find(block => block.id === choice.featSpellBlockId) || (state?.blocks.length === 1 ? state.blocks[0] : undefined);

  const isFeatSpellChoiceComplete = (
    state: ReturnType<typeof getFeatSpellChoiceState>,
    choice: AutoBuilderFeatChoice,
  ): boolean => {
    if (!state) return true;
    const block = getSelectedFeatSpellBlock(state, choice);
    if (!block) return false;
    return (
      (!block.abilityOptions.length || Boolean(choice.featSpellAbility))
      && areChoiceGroupsComplete(block.choices, choice.featSpellChoices)
    );
  };

  const getSelectedOriginSpellBlock = (
    state: ReturnType<typeof getOriginSpellChoiceState>,
    choice: AutoBuilderRaceChoice,
  ) => state?.blocks.find(block => block.id === choice.originSpellBlockId) || (state?.blocks.length === 1 ? state.blocks[0] : undefined);

  const isOriginSpellChoiceComplete = (
    state: ReturnType<typeof getOriginSpellChoiceState>,
    choice: AutoBuilderRaceChoice,
  ): boolean => {
    if (!state) return true;
    const block = getSelectedOriginSpellBlock(state, choice);
    if (!block) return false;
    return (
      (!block.abilityOptions.length || Boolean(choice.originSpellAbility))
      && areChoiceGroupsComplete(block.choices, choice.originSpellChoices)
    );
  };

  const renderFeatSpellChoiceGroup = (
    state: ReturnType<typeof getFeatSpellChoiceState>,
    choice: AutoBuilderFeatChoice,
    setChoice: (updater: (previous: AutoBuilderFeatChoice) => AutoBuilderFeatChoice) => void,
  ) => {
    if (!state) return null;
    const block = getSelectedFeatSpellBlock(state, choice);
    return (
      <div className="md:col-span-2 border border-gray-200 rounded p-3">
        <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">{t('auto.featSpells')}</h3>
        <div className="grid grid-cols-1 gap-3">
          {state.blocks.length > 1 && (
            <label className="flex flex-col gap-1 text-xs max-w-xs">
              <span className="text-[10px] text-gray-500 uppercase font-bold">{t('auto.spellList')}</span>
              <select
                value={choice.featSpellBlockId || ''}
                onChange={event => setChoice(previous => ({
                  ...previous,
                  featSpellBlockId: event.target.value,
                  featSpellAbility: undefined,
                  featSpellChoices: {},
                }))}
                className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
              >
                <option value="">{t('auto.chooseSpellList')}</option>
                {state.blocks.map(option => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
          )}
          {block?.abilityOptions.length ? (
            <label className="flex flex-col gap-1 text-xs max-w-xs">
              <span className="text-[10px] text-gray-500 uppercase font-bold">{t('spells.ability')}</span>
              <select
                value={choice.featSpellAbility || ''}
                onChange={event => setChoice(previous => ({
                  ...previous,
                  featSpellAbility: event.target.value as AbilityName,
                }))}
                className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
              >
                <option value="">{t('auto.chooseAbility')}</option>
                {block.abilityOptions.map(renderAbilityOption)}
              </select>
            </label>
          ) : null}
          {block?.fixedSpells.length ? (
            <div className="text-xs text-gray-700">
              <span className="font-bold">{t('auto.fixedSpells')}: </span>
              {block.fixedSpells.map(spell => spell.name).join(', ')}
            </div>
          ) : null}
          {block?.choices.map(group => (
            <div key={group.id}>
              <div className="text-xs font-bold text-gray-700 mb-1">
                {t('auto.chooseSpells')} {(choice.featSpellChoices?.[group.id] || []).length}/{group.count}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {group.options.map(spell => {
                  const selected = choice.featSpellChoices?.[group.id] || [];
                  return (
                    <label key={`${group.id}-${spell.id}`} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={selected.includes(spell.id)}
                        onChange={() => setChoice(previous => ({
                          ...previous,
                          featSpellChoices: {
                            ...(previous.featSpellChoices || {}),
                            [group.id]: toggleLimitedChoice(spell.id, previous.featSpellChoices?.[group.id] || [], group.count),
                          },
                        }))}
                        disabled={!selected.includes(spell.id) && selected.length >= group.count}
                        className="accent-dnd-red"
                      />
                      {spell.name}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderOriginSpellChoiceGroup = (
    state: ReturnType<typeof getOriginSpellChoiceState>,
    choice: AutoBuilderRaceChoice,
    setChoice: (updater: (previous: AutoBuilderRaceChoice) => AutoBuilderRaceChoice) => void,
  ) => {
    if (!state) return null;
    const block = getSelectedOriginSpellBlock(state, choice);
    return (
      <div className="md:col-span-2 border border-gray-200 rounded p-3">
        <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">{t('auto.originSpells')}</h3>
        <div className="grid grid-cols-1 gap-3">
          {state.blocks.length > 1 && (
            <label className="flex flex-col gap-1 text-xs max-w-xs">
              <span className="text-[10px] text-gray-500 uppercase font-bold">{t('auto.spellList')}</span>
              <select
                value={choice.originSpellBlockId || ''}
                onChange={event => setChoice(previous => ({
                  ...previous,
                  originSpellBlockId: event.target.value,
                  originSpellAbility: undefined,
                  originSpellChoices: {},
                }))}
                className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
              >
                <option value="">{t('auto.chooseSpellList')}</option>
                {state.blocks.map(option => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
          )}
          {block?.abilityOptions.length ? (
            <label className="flex flex-col gap-1 text-xs max-w-xs">
              <span className="text-[10px] text-gray-500 uppercase font-bold">{t('spells.ability')}</span>
              <select
                value={choice.originSpellAbility || ''}
                onChange={event => setChoice(previous => ({
                  ...previous,
                  originSpellAbility: event.target.value as AbilityName,
                }))}
                className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
              >
                <option value="">{t('auto.chooseAbility')}</option>
                {block.abilityOptions.map(renderAbilityOption)}
              </select>
            </label>
          ) : null}
          {block?.fixedSpells.length ? (
            <div className="text-xs text-gray-700">
              <span className="font-bold">{t('auto.fixedSpells')}: </span>
              {block.fixedSpells.map(spell => spell.name).join(', ')}
            </div>
          ) : null}
          {block?.choices.map(group => (
            <div key={group.id}>
              <div className="text-xs font-bold text-gray-700 mb-1">
                {t('auto.chooseSpells')} {(choice.originSpellChoices?.[group.id] || []).length}/{group.count}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {group.options.map(spell => {
                  const selected = choice.originSpellChoices?.[group.id] || [];
                  return (
                    <label key={`${group.id}-${spell.id}`} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={selected.includes(spell.id)}
                        onChange={() => setChoice(previous => ({
                          ...previous,
                          originSpellChoices: {
                            ...(previous.originSpellChoices || {}),
                            [group.id]: toggleLimitedChoice(spell.id, previous.originSpellChoices?.[group.id] || [], group.count),
                          },
                        }))}
                        disabled={!selected.includes(spell.id) && selected.length >= group.count}
                        className="accent-dnd-red"
                      />
                      {spell.name}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFeatSpellReplacementChoice = (
    replacement: NonNullable<ReturnType<typeof getExistingFeatSpellLevelUpChoiceState>>['replacement'],
    choice: AutoBuilderFeatChoice,
    setChoice: (updater: (previous: AutoBuilderFeatChoice) => AutoBuilderFeatChoice) => void,
  ) => {
    if (!replacement) return null;
    return (
      <div className="md:col-span-2 border border-gray-200 rounded p-3">
        <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">{t('auto.spellReplacement')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[10px] text-gray-500 uppercase font-bold">{t('auto.replaceRemove')}</span>
            <select
              value={choice.featSpellReplaceRemoveId || ''}
              onChange={event => setChoice(previous => ({
                ...previous,
                featSpellReplaceRemoveId: event.target.value || undefined,
                featSpellReplaceAddId: undefined,
              }))}
              className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
            >
              <option value="">{t('auto.replaceNone')}</option>
              {replacement.removeOptions.map(spell => (
                <option key={spell.id} value={spell.id}>
                  {spell.name}{spell.source ? ` ${spell.source}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[10px] text-gray-500 uppercase font-bold">{t('auto.replaceAdd')}</span>
            <select
              value={choice.featSpellReplaceAddId || ''}
              onChange={event => setChoice(previous => ({
                ...previous,
                featSpellReplaceAddId: event.target.value || undefined,
              }))}
              disabled={!choice.featSpellReplaceRemoveId}
              className="bg-white border border-gray-300 rounded px-2 py-2 text-xs disabled:bg-gray-100"
            >
              <option value="">{t('auto.replaceChooseNew')}</option>
              {replacement.addOptions.map(spell => (
                <option key={spell.id} value={spell.id}>
                  {spell.name}{spell.source ? ` ${spell.source}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    );
  };

  const isSkillSelectionComplete = !activeSkillChoiceState || skillChoices.length === activeSkillChoiceState.count;
  const currentCantripIds = new Set(spellChoiceState?.cantrips.map(spell => spell.id) || []);
  const currentLeveledSpellIds = new Set(spellChoiceState?.leveled.map(spell => spell.id) || []);
  const validCantripChoices = spellChoices.cantrips.filter(id => currentCantripIds.has(id));
  const validLeveledSpellChoices = spellChoices.leveled.filter(id => currentLeveledSpellIds.has(id));
  const validRegularLeveledSpellChoices = validLeveledSpellChoices.filter(id => !fixedLeveledSpellIds.has(id));
  const areFixedLeveledSpellGroupsComplete = fixedLeveledSpellGroups.every(group => {
    const optionIds = new Set(group.options.map(spell => spell.id));
    const selected = spellChoices.leveled.filter(id => optionIds.has(id)).length;
    return selected === Math.max(0, group.count - group.selected);
  });
  const currentInvocationIds = new Set(invocationChoiceState.options.map(invocation => invocation.id));
  const validInvocationChoices = invocationChoices.invocationIds.filter(id => currentInvocationIds.has(id));
  const validInvocationChoicePayload: AutoBuilderInvocationChoice = { invocationIds: validInvocationChoices };
	  const isSpellSelectionComplete = !spellChoiceState?.isSpellcaster
	    || isMagicalSecretLevel
	    || (
	      validCantripChoices.length === neededSpellChoices.cantrips
	      && areFixedLeveledSpellGroupsComplete
	      && (spellChoiceState.isPreparedAll || validRegularLeveledSpellChoices.length === neededSpellChoices.leveled)
	    );
  const isInvocationSelectionComplete = !invocationChoiceState.isInvocationClass
    || validInvocationChoices.length === invocationChoiceState.needed;
  const isBackgroundAbilityComplete = isLevelUpMode
    || backgroundAbilityOptions.length === 0
    || (
      backgroundAbilityChoice.mode === 'plus1three'
      && (
        !isOriginDecoupled
        || Boolean(
          backgroundAbilityChoice.plus1a
          && backgroundAbilityChoice.plus1b
          && backgroundAbilityChoice.plus1c
          && backgroundAbilityChoice.plus1a !== backgroundAbilityChoice.plus1b
          && backgroundAbilityChoice.plus1a !== backgroundAbilityChoice.plus1c
          && backgroundAbilityChoice.plus1b !== backgroundAbilityChoice.plus1c,
        )
      )
    )
    || Boolean(
      backgroundAbilityChoice.plus2
      && backgroundAbilityChoice.plus1
      && backgroundAbilityChoice.plus2 !== backgroundAbilityChoice.plus1,
    );
	  const isOriginFeatChoiceComplete = isLevelUpMode
	    || !originFeatChoiceState
	    || (
	      Boolean(originFeatChoice.featId ?? originFeatChoiceState.from[0] ? `${originFeatChoiceState.from[0].key}|${originFeatChoiceState.from[0].source}` : undefined)
	      && (originFeatAbilityOptions.length === 0 || Boolean(originFeatChoice.featAbility))
	      && areChoiceGroupsComplete(originFeatSkillChoiceOptions, originFeatChoice.featSkillChoices)
	      && areChoiceGroupsComplete(originFeatToolChoiceOptions, originFeatChoice.featToolChoices)
	      && areChoiceGroupsComplete(originFeatWeaponChoiceOptions, originFeatChoice.featWeaponChoices)
	      && areChoiceGroupsComplete(originFeatResistanceChoiceOptions, originFeatChoice.featResistanceChoices)
	      && areChoiceGroupsComplete(originFeatExpertiseChoiceOptions, originFeatChoice.featExpertiseChoices)
	      && areChoiceGroupsComplete(originFeatLanguageChoiceOptions, originFeatChoice.featLanguageChoices)
	      && areChoiceGroupsComplete(originFeatSavingThrowChoiceOptions, originFeatChoice.featSavingThrowChoices)
	      && isFeatSpellChoiceComplete(originFeatSpellChoiceState, originFeatChoice)
	    );
	  const isRaceChoiceComplete = isLevelUpMode
	    || (
	      (!raceOriginChoiceGroups || areAutoBuilderOriginChoicesComplete(raceOriginChoiceGroups, raceChoices))
	      && (!raceFeatChoiceState || (
	        Boolean(raceChoices.featId ?? raceFeatChoiceState.from[0] ? `${raceFeatChoiceState.from[0].key}|${raceFeatChoiceState.from[0].source}` : undefined)
	        && (raceFeatAbilityOptions.length === 0 || Boolean(raceChoices.featAbility))
	        && areChoiceGroupsComplete(raceFeatSkillChoiceOptions, raceChoices.featSkillChoices)
	        && areChoiceGroupsComplete(raceFeatToolChoiceOptions, raceChoices.featToolChoices)
	        && areChoiceGroupsComplete(raceFeatWeaponChoiceOptions, raceChoices.featWeaponChoices)
	        && areChoiceGroupsComplete(raceFeatResistanceChoiceOptions, raceChoices.featResistanceChoices)
	        && areChoiceGroupsComplete(raceFeatExpertiseChoiceOptions, raceChoices.featExpertiseChoices)
	        && areChoiceGroupsComplete(raceFeatLanguageChoiceOptions, raceChoices.featLanguageChoices)
	        && areChoiceGroupsComplete(raceFeatSavingThrowChoiceOptions, raceChoices.featSavingThrowChoices)
	        && isFeatSpellChoiceComplete(raceFeatSpellChoiceState, raceChoices)
      ))
      && isOriginSpellChoiceComplete(raceOriginSpellChoiceState, raceChoices)
    );
	  const isBackgroundToolChoiceComplete = isLevelUpMode
	    || areChoiceGroupsComplete(backgroundToolChoiceOptions, backgroundToolChoices);
	  const isBackgroundLanguageChoiceComplete = isLevelUpMode
	    || areChoiceGroupsComplete(backgroundLanguageChoiceOptions, backgroundLanguageChoices);
  const isClassToolChoiceComplete = areChoiceGroupsComplete(classToolChoiceOptions, classToolChoices);
  const isFightingStyleFeatChoiceComplete = !fightingStyleChoiceState
    || (
      Boolean(classFeatureChoices.fightingStyle?.featId)
      && (fightingStyleFeatAbilityOptions.length === 0 || Boolean(classFeatureChoices.fightingStyle?.featAbility))
      && areChoiceGroupsComplete(fightingStyleFeatSkillChoiceOptions, classFeatureChoices.fightingStyle?.featSkillChoices)
      && areChoiceGroupsComplete(fightingStyleFeatToolChoiceOptions, classFeatureChoices.fightingStyle?.featToolChoices)
      && areChoiceGroupsComplete(fightingStyleFeatWeaponChoiceOptions, classFeatureChoices.fightingStyle?.featWeaponChoices)
      && areChoiceGroupsComplete(fightingStyleFeatResistanceChoiceOptions, classFeatureChoices.fightingStyle?.featResistanceChoices)
      && areChoiceGroupsComplete(fightingStyleFeatExpertiseChoiceOptions, classFeatureChoices.fightingStyle?.featExpertiseChoices)
      && areChoiceGroupsComplete(fightingStyleFeatLanguageChoiceOptions, classFeatureChoices.fightingStyle?.featLanguageChoices)
      && areChoiceGroupsComplete(fightingStyleFeatSavingThrowChoiceOptions, classFeatureChoices.fightingStyle?.featSavingThrowChoices)
      && isFeatSpellChoiceComplete(fightingStyleFeatSpellChoiceState, classFeatureChoices.fightingStyle || {})
    );
  const isFightingStyleFeatureChoiceComplete = !fightingStyleFeatureChoiceState || Boolean(classFeatureChoices.fightingStyleFeatureId);
  const isFightingStyleCantripChoiceComplete = !fightingStyleCantripChoiceState || (classFeatureChoices.fightingStyleCantrips || []).filter(id => (
    fightingStyleCantripChoiceState.from.some(spell => spell.id === id)
  )).length === fightingStyleCantripChoiceState.count;
  const isClassFeatureChoiceComplete = isFightingStyleFeatChoiceComplete
    && isFightingStyleFeatureChoiceComplete
    && isFightingStyleCantripChoiceComplete;
  const isExistingFeatChoiceComplete = existingFeatSpellChoiceStates.every((entry) => {
    const choice = getExistingFeatChoice(entry.feat.key, entry.feat.source);
    return (
      (!entry.state.blocks.length || isFeatSpellChoiceComplete(entry.state, choice))
      && (!choice.featSpellReplaceRemoveId || Boolean(choice.featSpellReplaceAddId))
    );
  });
  const isExistingOriginSpellChoiceComplete = existingOriginSpellChoiceStates.every((entry) => {
    const stored = existingOriginSpellChoices[entry.id] || {};
    return isOriginSpellChoiceComplete(entry.state, {
      ...stored,
      originSpellBlockId: stored.originSpellBlockId || entry.defaultBlockId,
    });
  });
  const isClassExpertiseChoiceComplete = classExpertiseChoiceOptions.length === 0
    || areChoiceGroupsComplete(classExpertiseChoiceOptions, classFeatureChoices.expertise);
  const currentWeaponMasteryIds = new Set(weaponMasteryChoiceState?.options.map(weapon => weapon.id) || []);
  const validWeaponMasteryChoices = (classFeatureChoices.weaponMasteries || []).filter(id => currentWeaponMasteryIds.has(id));
  const currentMetamagicIds = new Set(metamagicChoiceState.options.map(metamagic => metamagic.id));
  const validMetamagicChoices = (classFeatureChoices.metamagics || []).filter(id => currentMetamagicIds.has(id));
  const currentManeuverIds = new Set(maneuverChoiceState.options.map(maneuver => maneuver.id));
  const validManeuverChoices = (classFeatureChoices.maneuvers || []).filter(id => currentManeuverIds.has(id));
  const currentAbilityScoreImprovementFeatManeuverIds = new Set(abilityScoreImprovementFeatManeuverChoiceState?.options.map(maneuver => maneuver.id) || []);
  const validAbilityScoreImprovementFeatManeuvers = (abilityScoreImprovementChoice.featManeuvers || []).filter(id => currentAbilityScoreImprovementFeatManeuverIds.has(id));
  const currentAbilityScoreImprovementFeatInvocationIds = new Set(abilityScoreImprovementFeatInvocationChoiceState?.options.map(invocation => invocation.id) || []);
  const validAbilityScoreImprovementFeatInvocations = (abilityScoreImprovementChoice.featInvocations || []).filter(id => currentAbilityScoreImprovementFeatInvocationIds.has(id));
  const currentAbilityScoreImprovementFeatMetamagicIds = new Set(abilityScoreImprovementFeatMetamagicChoiceState?.options.map(metamagic => metamagic.id) || []);
  const validAbilityScoreImprovementFeatMetamagics = (abilityScoreImprovementChoice.featMetamagics || []).filter(id => currentAbilityScoreImprovementFeatMetamagicIds.has(id));
  const currentFightingStyleCantripIds = new Set(fightingStyleCantripChoiceState?.from.map(spell => spell.id) || []);
  const validFightingStyleCantripChoices = (classFeatureChoices.fightingStyleCantrips || []).filter(id => currentFightingStyleCantripIds.has(id));
  const isWeaponMasteryChoiceComplete = !weaponMasteryChoiceState
    || validWeaponMasteryChoices.length === weaponMasteryChoiceState.needed;
  const isMetamagicChoiceComplete = !metamagicChoiceState.isMetamagicClass
    || validMetamagicChoices.length === metamagicChoiceState.needed;
  const isManeuverChoiceComplete = !maneuverChoiceState.isManeuverSubclass
    || validManeuverChoices.length === maneuverChoiceState.needed;
  const isMagicalSecretComplete = !isMagicalSecretLevel || magicalSecretChoices.length === 2;
  const isAbilityScoreImprovementComplete = !needsAbilityScoreImprovementChoice
    || (
      (abilityScoreImprovementChoice.mode === 'plus2' && Boolean(abilityScoreImprovementChoice.plus2))
      || (
        abilityScoreImprovementChoice.mode === 'plus1plus1'
        && Boolean(abilityScoreImprovementChoice.plus1a)
        && Boolean(abilityScoreImprovementChoice.plus1b)
        && abilityScoreImprovementChoice.plus1a !== abilityScoreImprovementChoice.plus1b
      )
      || (
        abilityScoreImprovementChoice.mode === 'feat'
        && Boolean(abilityScoreImprovementChoice.featId)
        && (
          abilityScoreImprovementFeatAbilityOptions.length === 0
          || Boolean(abilityScoreImprovementChoice.featAbility)
        )
        && areChoiceGroupsComplete(abilityScoreImprovementFeatSkillChoiceOptions, abilityScoreImprovementChoice.featSkillChoices)
        && areChoiceGroupsComplete(abilityScoreImprovementFeatToolChoiceOptions, abilityScoreImprovementChoice.featToolChoices)
        && areChoiceGroupsComplete(abilityScoreImprovementFeatWeaponChoiceOptions, abilityScoreImprovementChoice.featWeaponChoices)
        && areChoiceGroupsComplete(abilityScoreImprovementFeatResistanceChoiceOptions, abilityScoreImprovementChoice.featResistanceChoices)
        && areChoiceGroupsComplete(abilityScoreImprovementFeatExpertiseChoiceOptions, abilityScoreImprovementChoice.featExpertiseChoices)
        && areChoiceGroupsComplete(abilityScoreImprovementFeatLanguageChoiceOptions, abilityScoreImprovementChoice.featLanguageChoices)
        && areChoiceGroupsComplete(abilityScoreImprovementFeatSavingThrowChoiceOptions, abilityScoreImprovementChoice.featSavingThrowChoices)
        && isFeatSpellChoiceComplete(abilityScoreImprovementFeatSpellChoiceState, abilityScoreImprovementChoice)
        && (!abilityScoreImprovementFeatFightingStyleChoiceState || Boolean(abilityScoreImprovementChoice.featFightingStyleFeatureId))
        && (!abilityScoreImprovementFeatInvocationChoiceState || validAbilityScoreImprovementFeatInvocations.length === abilityScoreImprovementFeatInvocationChoiceState.needed)
        && (!abilityScoreImprovementFeatManeuverChoiceState || validAbilityScoreImprovementFeatManeuvers.length === abilityScoreImprovementFeatManeuverChoiceState.needed)
        && (!abilityScoreImprovementFeatMetamagicChoiceState || validAbilityScoreImprovementFeatMetamagics.length === abilityScoreImprovementFeatMetamagicChoiceState.needed)
      )
    );
  const isSubclassSelectionComplete = !needsSubclassChoice || Boolean(selectedSubclass);

  const applyBuild = () => {
    if (!content || !selectedClass) return;
    const validAbilityScoreImprovementChoice: AutoBuilderAbilityScoreImprovementChoice = {
      ...abilityScoreImprovementChoice,
      featInvocations: validAbilityScoreImprovementFeatInvocations,
      featManeuvers: validAbilityScoreImprovementFeatManeuvers,
      featMetamagics: validAbilityScoreImprovementFeatMetamagics,
    };
    const validClassFeatureChoices: AutoBuilderClassFeatureChoice = {
      ...classFeatureChoices,
      fightingStyleCantrips: validFightingStyleCantripChoices,
      weaponMasteries: validWeaponMasteryChoices,
      metamagics: validMetamagicChoices,
      maneuvers: validManeuverChoices,
    };

	    if (isLevelUpMode) {
	      const spellReplace = (canReplaceSpell && spellReplaceRemoveId && spellReplaceAddId)
	        ? { removeId: spellReplaceRemoveId, addId: spellReplaceAddId }
	        : undefined;
		      onApply(buildLevelUpCharacter(data, content, selectedClass, {
		        ruleSystem,
		        spellChoices,
		        invocationChoices: validInvocationChoicePayload,
		        skillChoices,
		        toolChoices: classToolChoices,
		        abilityScoreImprovementChoice: needsAbilityScoreImprovementChoice ? validAbilityScoreImprovementChoice : undefined,
		        existingFeatChoices: existingFeatSpellChoiceStates.length
              ? existingFeatSpellChoiceStates.map(entry => getExistingFeatChoice(entry.feat.key, entry.feat.source))
              : undefined,
		        existingOriginSpellChoices,
		        classFeatureChoices: validClassFeatureChoices,
		        subclass: needsSubclassChoice ? selectedSubclass : undefined,
		        replaceSpell: spellReplace,
		        magicalSecretChoices: isMagicalSecretLevel ? magicalSecretChoices : undefined,
		      }));
      onClose();
      return;
    }

    if (!selectedRace || !selectedBackground) return;

    onApply(buildLevelOneCharacter(data, content, selectedClass, {
        ruleSystem,
        race: selectedRace,
        subrace: selectedSubrace,
        raceChoices: (raceResistanceOptions.length || raceSizeOptions.length || raceFeatureChoiceOptions.length || raceAbilityChoiceState || raceSkillChoiceState || raceFeatChoiceState || raceToolChoiceOptions.length || raceLanguageChoiceOptions.length || raceOriginSpellChoiceState) ? raceChoices : undefined,
        background: selectedBackground,
        subclass: needsSubclassChoice ? selectedSubclass : undefined,
        decoupleOriginFromBackground: isOriginDecoupled,
        originFeatChoice: originFeatChoiceState ? originFeatChoice : undefined,
        backgroundAbilityChoice: backgroundAbilityOptions.length ? backgroundAbilityChoice : undefined,
        backgroundToolChoices,
        backgroundLanguageChoices,
        classToolChoices,
        classFeatureChoices: validClassFeatureChoices,
        skillChoices,
        spellChoices,
        invocationChoices: validInvocationChoicePayload,
    }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl bg-white border border-gray-300 rounded-lg shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="font-serif text-xl font-bold text-gray-900">{isLevelUpMode ? t('auto.levelUpTitle') : t('auto.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-xl leading-none" aria-label={t('auto.close')}>
            &times;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 max-h-[70vh] overflow-y-auto">
          {loadError && (
            <div className="md:col-span-2 border border-red-200 bg-red-50 text-red-700 rounded p-2 text-xs">
              {loadError}
            </div>
          )}
          {!content && !loadError && (
            <div className="md:col-span-2 text-sm text-gray-500">{t('auto.loading')}</div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 uppercase font-bold">{t('auto.ruleSystem')}</label>
            <select
              value={ruleSystem}
              onChange={event => setRuleSystem(event.target.value as RuleSystem)}
              className="bg-white border border-gray-300 rounded px-2 py-2 text-sm"
            >
              <option value="5e">{t('auto.rule5e')}</option>
              <option value="5r">{t('auto.rule5r')}</option>
            </select>
          </div>

          {!isLevelUpMode && ruleSystem === '5r' && (
            <label className="md:col-span-2 flex items-start gap-2 border border-gray-200 rounded p-3 text-xs bg-gray-50">
              <input
                type="checkbox"
                checked={decoupleOriginFromBackground}
                onChange={event => setDecoupleOriginFromBackground(event.target.checked)}
                className="mt-0.5 accent-dnd-red"
              />
              <span>
                <span className="block text-[10px] text-gray-500 uppercase font-bold">{t('auto.decoupleOrigin')}</span>
                <span className="text-gray-600">{t('auto.decoupleOriginHint')}</span>
              </span>
            </label>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 uppercase font-bold">{t('header.classLevel')}</label>
            <select
              value={selectedClass?.key || className}
              onChange={event => setClassName(event.target.value)}
              className="bg-white border border-gray-300 rounded px-2 py-2 text-sm"
              disabled={!content}
            >
              {classOptions.map(cls => <option key={`${cls.key}-${cls.source}`} value={cls.key}>{t(`class.${cls.key}` as any)}</option>)}
            </select>
          </div>

          {!isLevelUpMode && <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 uppercase font-bold">{t('header.race')}</label>
            <select
              value={selectedRace?.key || raceKey}
              onChange={event => setRaceKey(event.target.value)}
              className="bg-white border border-gray-300 rounded px-2 py-2 text-sm"
              disabled={!content}
            >
              {raceOptions.map(race => (
                <option key={`${race.key}-${race.source}`} value={race.key}>{race.name}</option>
              ))}
            </select>
          </div>}

          {!isLevelUpMode && <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 uppercase font-bold">{t('header.background')}</label>
            <select
              value={selectedBackground?.key || backgroundKey}
              onChange={event => setBackgroundKey(event.target.value)}
              className="bg-white border border-gray-300 rounded px-2 py-2 text-sm"
              disabled={!content}
            >
              {backgroundOptions.map(background => (
                <option key={`${background.key}-${background.source}`} value={background.key}>{background.name}</option>
              ))}
            </select>
          </div>}

          {!isLevelUpMode && subraceOptions.length > 0 && (
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-[10px] text-gray-500 uppercase font-bold">{t('header.subrace')}</label>
              <select
                value={selectedSubrace?.key || subraceKey}
                onChange={event => setSubraceKey(event.target.value)}
                className="bg-white border border-gray-300 rounded px-2 py-2 text-sm"
              >
                {subraceOptions.map(subrace => (
                  <option key={`${subrace.key}-${subrace.source}`} value={subrace.key}>{subrace.name}</option>
                ))}
              </select>
            </div>
          )}

          {!isLevelUpMode && (selectedRace || selectedBackground) && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedRace && (
                <div className="border border-gray-200 rounded p-3 bg-gray-50">
                  <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t('header.race')}</h3>
                  <div className="text-sm font-bold text-gray-800 mb-1">
                    {selectedRace.name}{selectedSubrace ? ` (${selectedSubrace.name})` : ''} {selectedRace.source}
                  </div>
                  <div className="text-xs text-gray-600">
                    {[...selectedRace.features, ...(selectedSubrace?.features || [])].slice(0, 6).map(feature => feature.name).join(', ')}
                  </div>
                </div>
              )}
              {selectedBackground && (
                <div className="border border-gray-200 rounded p-3 bg-gray-50">
                  <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t('header.background')}</h3>
                  <div className="text-sm font-bold text-gray-800 mb-1">{selectedBackground.name} {selectedBackground.source}</div>
                  <div className="text-xs text-gray-600">
                    {selectedBackground.features.slice(0, 5).map(feature => feature.name).join(', ')}
                  </div>
                  {backgroundFeats.length > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      {t('auto.originFeat')}: {backgroundFeats.map(feat => feat.name).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!isLevelUpMode && (raceResistanceOptions.length > 0 || raceSizeOptions.length > 0 || raceFeatureChoiceOptions.length > 0 || raceAbilityChoiceState || raceSkillChoiceState || raceFeatChoiceState || raceOriginSpellChoiceState) && (
            <div className="md:col-span-2 border border-gray-200 rounded p-3">
              <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">{t('auto.raceChoices')}</h3>
              <div className="grid grid-cols-1 gap-3">
                {raceSizeOptions.length > 0 && (
                  <label className="flex flex-col gap-1 text-xs max-w-xs">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">{t('auto.raceSize')}</span>
                    <select
                      value={raceChoices.size || ''}
                      onChange={event => setRaceChoices(prev => ({ ...prev, size: event.target.value }))}
                      className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                    >
                      {raceSizeOptions.map(size => (
                        <option key={size.value} value={size.value}>{size.label}</option>
                      ))}
                    </select>
                  </label>
                )}
                {raceResistanceOptions.length > 0 && (
                  <label className="flex flex-col gap-1 text-xs max-w-xs">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">{t('auto.damageResistance')}</span>
                    <select
                      value={raceChoices.resistance || ''}
                      onChange={event => setRaceChoices(prev => ({ ...prev, resistance: event.target.value }))}
                      className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                    >
                      {raceResistanceOptions.map(resistance => (
                        <option key={resistance} value={resistance}>{resistance}</option>
                      ))}
                    </select>
                  </label>
                )}
                {raceFeatureChoiceOptions.map(choice => (
                  <label key={choice.id} className="flex flex-col gap-1 text-xs max-w-xs">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">{choice.label}</span>
                    <select
                      value={raceChoices.featureChoices?.[choice.id] || ''}
                      onChange={event => setRaceChoices(prev => ({
                        ...prev,
                        featureChoices: {
                          ...(prev.featureChoices || {}),
                          [choice.id]: event.target.value,
                        },
                      }))}
                      className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                    >
                      <option value="">{t('auto.choose')}</option>
                      {choice.options.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                ))}
                {raceAbilityChoiceState && (
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">
                      {t('auto.raceAbilities')} {(raceChoices.abilities || []).length}/{raceAbilityChoiceState.count}
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {raceAbilityChoiceState.from.map(ability => (
                        <label key={ability} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={(raceChoices.abilities || []).includes(ability)}
                            onChange={() => toggleRaceAbility(ability)}
                            disabled={!(raceChoices.abilities || []).includes(ability) && (raceChoices.abilities || []).length >= raceAbilityChoiceState.count}
                            className="accent-dnd-red"
                          />
                          {ability}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {raceSkillChoiceState && (
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">
                      {t('auto.raceSkills')} {(raceChoices.skills || []).length}/{raceSkillChoiceState.count}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {raceSkillChoiceState.from.map(skill => (
                        <label key={skill} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={(raceChoices.skills || []).includes(skill)}
                            onChange={() => toggleRaceSkill(skill)}
                            disabled={!(raceChoices.skills || []).includes(skill) && (raceChoices.skills || []).length >= raceSkillChoiceState.count}
                            className="accent-dnd-red"
                          />
                          {t(`skills.${skill}` as any)}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {raceFeatChoiceState && (
                  <label className="flex flex-col gap-1 text-xs max-w-xs">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">
                      {t('auto.raceFeat')} 1/{raceFeatChoiceState.count}
                    </span>
                    <select
                      value={raceChoices.featId || ''}
                      onChange={event => setRaceChoices(prev => ({
                        ...prev,
                        featId: event.target.value,
                        featAbility: undefined,
                        featSkillChoices: {},
                        featToolChoices: {},
                        featWeaponChoices: {},
                        featResistanceChoices: {},
                        featExpertiseChoices: {},
                        featLanguageChoices: {},
                        featSavingThrowChoices: {},
                        featSpellBlockId: undefined,
                        featSpellAbility: undefined,
                        featSpellChoices: {},
                      }))}
                      className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                    >
                      {raceFeatChoiceState.from.map(feat => (
                        <option key={`${feat.key}-${feat.source}`} value={`${feat.key}|${feat.source}`}>{feat.name}</option>
                      ))}
                    </select>
                  </label>
                )}
                {raceFeatChoiceState && raceFeatAbilityOptions.length > 0 && (
                  <label className="flex flex-col gap-1 text-xs max-w-xs">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">+1</span>
                    <select
                      value={raceChoices.featAbility || ''}
                      onChange={event => setRaceChoices(prev => ({ ...prev, featAbility: event.target.value as AbilityName }))}
                      className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                    >
                      <option value="">{t('auto.chooseAbility')}</option>
                      {raceFeatAbilityOptions.map(renderAbilityOption)}
                    </select>
                  </label>
                )}
                {raceOriginSpellChoiceState && renderOriginSpellChoiceGroup(
                  raceOriginSpellChoiceState,
                  raceChoices,
                  updater => setRaceChoices(prev => updater(prev)),
                )}
                {raceFeatChoiceState && renderSkillChoiceGroup(
                  t('auto.featSkills'),
                  raceFeatSkillChoiceOptions,
                  raceChoices.featSkillChoices || {},
                  updater => setRaceChoices(prev => ({
                    ...prev,
                    featSkillChoices: typeof updater === 'function' ? updater(prev.featSkillChoices || {}) : updater,
                  })),
                )}
                {raceFeatChoiceState && renderToolChoiceGroup(
                  t('auto.featTools'),
                  raceFeatToolChoiceOptions,
                  raceChoices.featToolChoices || {},
                  updater => setRaceChoices(prev => ({
                    ...prev,
                    featToolChoices: typeof updater === 'function' ? updater(prev.featToolChoices || {}) : updater,
                  })),
                )}
                {raceFeatChoiceState && renderWeaponChoiceGroup(
                  t('auto.featWeapons'),
                  raceFeatWeaponChoiceOptions,
                  raceChoices.featWeaponChoices || {},
                  updater => setRaceChoices(prev => ({
                    ...prev,
                    featWeaponChoices: typeof updater === 'function' ? updater(prev.featWeaponChoices || {}) : updater,
                  })),
                )}
                {raceFeatChoiceState && renderTextChoiceGroup(
                  t('auto.damageResistance'),
                  raceFeatResistanceChoiceOptions,
                  raceChoices.featResistanceChoices || {},
                  updater => setRaceChoices(prev => ({
                    ...prev,
                    featResistanceChoices: typeof updater === 'function' ? updater(prev.featResistanceChoices || {}) : updater,
                  })),
                )}
                {raceFeatChoiceState && renderLanguageChoiceGroup(
                  t('auto.featLanguages'),
                  raceFeatLanguageChoiceOptions,
                  raceChoices.featLanguageChoices || {},
                  updater => setRaceChoices(prev => ({
                    ...prev,
                    featLanguageChoices: typeof updater === 'function' ? updater(prev.featLanguageChoices || {}) : updater,
                  })),
                )}
                {raceFeatChoiceState && renderSkillChoiceGroup(
                  t('auto.featSavingThrows'),
                  raceFeatSavingThrowChoiceOptions,
                  raceChoices.featSavingThrowChoices || {},
                  updater => setRaceChoices(prev => ({
                    ...prev,
                    featSavingThrowChoices: typeof updater === 'function' ? updater(prev.featSavingThrowChoices || {}) : updater,
                  })),
                )}
                {raceFeatChoiceState && renderSkillChoiceGroup(
                  t('auto.featExpertise'),
                  raceFeatExpertiseChoiceOptions,
                  raceChoices.featExpertiseChoices || {},
                  updater => setRaceChoices(prev => ({
                    ...prev,
                    featExpertiseChoices: typeof updater === 'function' ? updater(prev.featExpertiseChoices || {}) : updater,
                  })),
                )}
                {raceFeatChoiceState && renderFeatSpellChoiceGroup(
                  raceFeatSpellChoiceState,
                  raceChoices,
                  updater => setRaceChoices(prev => ({ ...prev, ...updater(prev) })),
                )}
              </div>
            </div>
          )}

          {!isLevelUpMode && renderToolChoiceGroup(
            t('auto.raceTools'),
            raceToolChoiceOptions,
            raceChoices.toolChoices || {},
            updater => setRaceChoices(prev => ({
              ...prev,
              toolChoices: typeof updater === 'function' ? updater(prev.toolChoices || {}) : updater,
            })),
          )}

          {!isLevelUpMode && renderWeaponChoiceGroup(
            t('auto.raceWeapons'),
            raceWeaponChoiceOptions,
            raceChoices.weaponChoices || {},
            updater => setRaceChoices(prev => ({
              ...prev,
              weaponChoices: typeof updater === 'function' ? updater(prev.weaponChoices || {}) : updater,
            })),
          )}

          {!isLevelUpMode && renderLanguageChoiceGroup(
            t('auto.raceLanguages'),
            raceLanguageChoiceOptions,
            raceChoices.languageChoices || {},
            updater => setRaceChoices(prev => ({
              ...prev,
              languageChoices: typeof updater === 'function' ? updater(prev.languageChoices || {}) : updater,
            })),
          )}

          {!isLevelUpMode && backgroundAbilityOptions.length > 0 && (
            <div className="md:col-span-2 border border-gray-200 rounded p-3">
              <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">{t('auto.backgroundAbilities')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">{t('auto.abilityMode')}</span>
                  <select
                    value={backgroundAbilityChoice.mode}
                    onChange={event => updateBackgroundAbilityChoice({ mode: event.target.value as AutoBuilderAbilityChoice['mode'] })}
                    className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                  >
                    <option value="plus2plus1">{t('auto.abilityPlus2Plus1')}</option>
                    <option value="plus1three">{t('auto.abilityPlus1Three')}</option>
                  </select>
                </label>
                {backgroundAbilityChoice.mode === 'plus2plus1' && (
                  <>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">+2</span>
                      <select
                        value={backgroundAbilityChoice.plus2 || ''}
                        onChange={event => updateBackgroundAbilityChoice({ plus2: event.target.value as AbilityName })}
                        className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                      >
                        {backgroundAbilityOptions.map(renderAbilityOption)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">+1</span>
                      <select
                        value={backgroundAbilityChoice.plus1 || ''}
                        onChange={event => updateBackgroundAbilityChoice({ plus1: event.target.value as AbilityName })}
                        className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                      >
                        {backgroundAbilityOptions.map(renderAbilityOption)}
                      </select>
                    </label>
                  </>
                )}
              </div>
              {backgroundAbilityChoice.mode === 'plus1three' && (
                isOriginDecoupled ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">+1</span>
                      <select
                        value={backgroundAbilityChoice.plus1a || ''}
                        onChange={event => updateBackgroundAbilityChoice({ plus1a: event.target.value as AbilityName })}
                        className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                      >
                        <option value="">{t('auto.chooseAbility')}</option>
                        {backgroundAbilityOptions.map(renderAbilityOption)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">+1</span>
                      <select
                        value={backgroundAbilityChoice.plus1b || ''}
                        onChange={event => updateBackgroundAbilityChoice({ plus1b: event.target.value as AbilityName })}
                        className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                      >
                        <option value="">{t('auto.chooseAbility')}</option>
                        {backgroundAbilityOptions.map(renderAbilityOption)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">+1</span>
                      <select
                        value={backgroundAbilityChoice.plus1c || ''}
                        onChange={event => updateBackgroundAbilityChoice({ plus1c: event.target.value as AbilityName })}
                        className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                      >
                        <option value="">{t('auto.chooseAbility')}</option>
                        {backgroundAbilityOptions.map(renderAbilityOption)}
                      </select>
                    </label>
                  </div>
                ) : (
                  <div className="text-xs text-gray-600 mt-2">
                    {backgroundAbilityOptions.join(', ')} +1
                  </div>
                )
              )}
            </div>
          )}

          {!isLevelUpMode && originFeatChoiceState && (
            <div className="md:col-span-2 border border-gray-200 rounded p-3">
              <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">{t('auto.originFeat')}</h3>
              <div className="grid grid-cols-1 gap-3">
                <label className="flex flex-col gap-1 text-xs max-w-xs">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">
                    {t('auto.chooseFeat')} 1/{originFeatChoiceState.count}
                  </span>
                  <select
                    value={originFeatChoice.featId || ''}
                    onChange={event => setOriginFeatChoice({
                      featId: event.target.value,
                      featAbility: undefined,
                      featSkillChoices: {},
                      featToolChoices: {},
                      featWeaponChoices: {},
                      featResistanceChoices: {},
                      featExpertiseChoices: {},
                      featLanguageChoices: {},
                      featSavingThrowChoices: {},
                      featSpellBlockId: undefined,
                      featSpellAbility: undefined,
                      featSpellChoices: {},
                    })}
                    className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                  >
                    <option value="">{t('auto.chooseFeat')}</option>
                    {originFeatChoiceState.from.map(feat => (
                      <option key={`${feat.key}-${feat.source}`} value={`${feat.key}|${feat.source}`}>{feat.name}</option>
                    ))}
                  </select>
                </label>
                {originFeatAbilityOptions.length > 0 && (
                  <label className="flex flex-col gap-1 text-xs max-w-xs">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">+1</span>
                    <select
                      value={originFeatChoice.featAbility || ''}
                      onChange={event => setOriginFeatChoice(prev => ({ ...prev, featAbility: event.target.value as AbilityName }))}
                      className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                    >
                      <option value="">{t('auto.chooseAbility')}</option>
                      {originFeatAbilityOptions.map(renderAbilityOption)}
                    </select>
                  </label>
                )}
                {renderSkillChoiceGroup(
                  t('auto.featSkills'),
                  originFeatSkillChoiceOptions,
                  originFeatChoice.featSkillChoices || {},
                  updater => setOriginFeatChoice(prev => ({
                    ...prev,
                    featSkillChoices: typeof updater === 'function' ? updater(prev.featSkillChoices || {}) : updater,
                  })),
                )}
                {renderToolChoiceGroup(
                  t('auto.featTools'),
                  originFeatToolChoiceOptions,
                  originFeatChoice.featToolChoices || {},
                  updater => setOriginFeatChoice(prev => ({
                    ...prev,
                    featToolChoices: typeof updater === 'function' ? updater(prev.featToolChoices || {}) : updater,
                  })),
                )}
                {renderWeaponChoiceGroup(
                  t('auto.featWeapons'),
                  originFeatWeaponChoiceOptions,
                  originFeatChoice.featWeaponChoices || {},
                  updater => setOriginFeatChoice(prev => ({
                    ...prev,
                    featWeaponChoices: typeof updater === 'function' ? updater(prev.featWeaponChoices || {}) : updater,
                  })),
                )}
                {renderTextChoiceGroup(
                  t('auto.damageResistance'),
                  originFeatResistanceChoiceOptions,
                  originFeatChoice.featResistanceChoices || {},
                  updater => setOriginFeatChoice(prev => ({
                    ...prev,
                    featResistanceChoices: typeof updater === 'function' ? updater(prev.featResistanceChoices || {}) : updater,
                  })),
                )}
                {renderLanguageChoiceGroup(
                  t('auto.featLanguages'),
                  originFeatLanguageChoiceOptions,
                  originFeatChoice.featLanguageChoices || {},
                  updater => setOriginFeatChoice(prev => ({
                    ...prev,
                    featLanguageChoices: typeof updater === 'function' ? updater(prev.featLanguageChoices || {}) : updater,
                  })),
                )}
                {renderSkillChoiceGroup(
                  t('auto.featSavingThrows'),
                  originFeatSavingThrowChoiceOptions,
                  originFeatChoice.featSavingThrowChoices || {},
                  updater => setOriginFeatChoice(prev => ({
                    ...prev,
                    featSavingThrowChoices: typeof updater === 'function' ? updater(prev.featSavingThrowChoices || {}) : updater,
                  })),
                )}
                {renderSkillChoiceGroup(
                  t('auto.featExpertise'),
                  originFeatExpertiseChoiceOptions,
                  originFeatChoice.featExpertiseChoices || {},
                  updater => setOriginFeatChoice(prev => ({
                    ...prev,
                    featExpertiseChoices: typeof updater === 'function' ? updater(prev.featExpertiseChoices || {}) : updater,
                  })),
                )}
                {renderFeatSpellChoiceGroup(
                  originFeatSpellChoiceState,
                  originFeatChoice,
                  updater => setOriginFeatChoice(prev => ({ ...prev, ...updater(prev) })),
                )}
              </div>
            </div>
          )}

          {!isLevelUpMode && renderToolChoiceGroup(
            t('auto.backgroundTools'),
            backgroundToolChoiceOptions,
            backgroundToolChoices,
            setBackgroundToolChoices,
          )}

          {!isLevelUpMode && renderLanguageChoiceGroup(
            t('auto.backgroundLanguages'),
            backgroundLanguageChoiceOptions,
            backgroundLanguageChoices,
            setBackgroundLanguageChoices,
          )}

          {selectedClass && (
            <div className="md:col-span-2 border border-gray-200 rounded p-3 bg-gray-50">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className="text-sm font-bold text-gray-800">{selectedClass.name} {selectedClass.source}</h3>
                <span className="text-[10px] uppercase text-gray-400">d{selectedClass.hitDie || 8}</span>
                {isLevelUpMode && (
                  <span className="text-[10px] uppercase text-gray-400">
                    {currentClassLevel > 0 ? `${currentClassLevel} -> ${targetClassLevel}` : t('auto.multiclassNew')}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-600">
                {(isLevelUpMode
                  ? selectedClass.levelFeatures.filter(feature => feature.level === targetClassLevel)
                  : selectedClass.levelOneFeatures
                ).map(feature => feature.name).join(', ') || t('auto.noNewFeatures')}
              </div>
            </div>
          )}

          {needsSubclassChoice && (
            <div className="md:col-span-2 border border-gray-200 rounded p-3">
              <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">{t('auto.subclassChoice')}</h3>
              <select
                value={selectedSubclass?.id || ''}
                onChange={event => setSubclassId(event.target.value)}
                className="bg-white border border-gray-300 rounded px-2 py-2 text-sm w-full"
                disabled={!subclassOptions.length}
              >
                <option value="">{t('auto.chooseSubclass')}</option>
                {subclassOptions.map(subclass => (
                  <option key={subclass.id} value={subclass.id}>{subclass.name} {subclass.source}</option>
                ))}
              </select>
              {selectedSubclass && (
                <div className="mt-2 text-xs text-gray-600">
                  {selectedSubclass.features.filter(feature => feature.level === targetClassLevel).map(feature => feature.name).join(', ') || t('auto.noNewFeatures')}
                </div>
              )}
            </div>
          )}

          {(fightingStyleChoiceState || fightingStyleFeatureChoiceState) && (
            <div className="md:col-span-2 border border-gray-200 rounded p-3">
              <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">{t('auto.fightingStyle')}</h3>
              <div className="grid grid-cols-1 gap-3">
                {fightingStyleFeatureChoiceState && (
                  <label className="flex flex-col gap-1 text-xs max-w-xs">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">
                      {t('auto.fightingStyle')} 1/{fightingStyleFeatureChoiceState.count}
                    </span>
                    <select
                      value={classFeatureChoices.fightingStyleFeatureId || ''}
                      onChange={event => setClassFeatureChoices({
                        ...classFeatureChoices,
                        fightingStyle: undefined,
                        fightingStyleFeatureId: event.target.value,
                        fightingStyleCantrips: [],
                        maneuvers: [],
                      })}
                      className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                    >
                      <option value="">{t('auto.fightingStyle')}</option>
                      {fightingStyleFeatureChoiceState.from.map(style => (
                        <option key={style.id} value={style.id}>{style.name} {style.source}</option>
                      ))}
                    </select>
                    {selectedFightingStyleFeature && (
                      <span className="text-gray-500">{selectedFightingStyleFeature.description.split('\n')[0]}</span>
                    )}
                  </label>
                )}
                {fightingStyleChoiceState && <label className="flex flex-col gap-1 text-xs max-w-xs">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">
                    {t('auto.chooseFeat')} 1/{fightingStyleChoiceState.count}
                  </span>
                  <select
                    value={classFeatureChoices.fightingStyle?.featId || ''}
                    onChange={event => setClassFeatureChoices({
                      ...classFeatureChoices,
                      fightingStyleFeatureId: undefined,
                      maneuvers: [],
                      fightingStyle: {
                        featId: event.target.value,
                        featAbility: undefined,
                        featSkillChoices: {},
                        featToolChoices: {},
                        featWeaponChoices: {},
                        featResistanceChoices: {},
                        featExpertiseChoices: {},
                        featLanguageChoices: {},
                        featSavingThrowChoices: {},
                        featSpellBlockId: undefined,
                        featSpellAbility: undefined,
                        featSpellChoices: {},
                      },
                      fightingStyleCantrips: [],
                    })}
                    className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                  >
                    <option value="">{t('auto.chooseFeat')}</option>
                    {fightingStyleChoiceState.from.map(feat => (
                      <option key={`${feat.key}-${feat.source}`} value={`${feat.key}|${feat.source}`}>{feat.name}</option>
                    ))}
                  </select>
                </label>}
                {fightingStyleFeatAbilityOptions.length > 0 && (
                  <label className="flex flex-col gap-1 text-xs max-w-xs">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">+1</span>
                    <select
                      value={classFeatureChoices.fightingStyle?.featAbility || ''}
                      onChange={event => setClassFeatureChoices(prev => ({
                        ...prev,
                        fightingStyle: { ...prev.fightingStyle, featAbility: event.target.value as AbilityName },
                      }))}
                      className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                    >
                      <option value="">{t('auto.chooseAbility')}</option>
                      {fightingStyleFeatAbilityOptions.map(renderAbilityOption)}
                    </select>
                  </label>
                )}
                {renderSkillChoiceGroup(
                  t('auto.featSkills'),
                  fightingStyleFeatSkillChoiceOptions,
                  classFeatureChoices.fightingStyle?.featSkillChoices || {},
                  updater => setClassFeatureChoices(prev => ({
                    ...prev,
                    fightingStyle: {
                      ...prev.fightingStyle,
                      featSkillChoices: typeof updater === 'function' ? updater(prev.fightingStyle?.featSkillChoices || {}) : updater,
                    },
                  })),
                )}
                {renderToolChoiceGroup(
                  t('auto.featTools'),
                  fightingStyleFeatToolChoiceOptions,
                  classFeatureChoices.fightingStyle?.featToolChoices || {},
                  updater => setClassFeatureChoices(prev => ({
                    ...prev,
                    fightingStyle: {
                      ...prev.fightingStyle,
                      featToolChoices: typeof updater === 'function' ? updater(prev.fightingStyle?.featToolChoices || {}) : updater,
                    },
                  })),
                )}
                {renderWeaponChoiceGroup(
                  t('auto.featWeapons'),
                  fightingStyleFeatWeaponChoiceOptions,
                  classFeatureChoices.fightingStyle?.featWeaponChoices || {},
                  updater => setClassFeatureChoices(prev => ({
                    ...prev,
                    fightingStyle: {
                      ...prev.fightingStyle,
                      featWeaponChoices: typeof updater === 'function' ? updater(prev.fightingStyle?.featWeaponChoices || {}) : updater,
                    },
                  })),
                )}
                {renderTextChoiceGroup(
                  t('auto.damageResistance'),
                  fightingStyleFeatResistanceChoiceOptions,
                  classFeatureChoices.fightingStyle?.featResistanceChoices || {},
                  updater => setClassFeatureChoices(prev => ({
                    ...prev,
                    fightingStyle: {
                      ...prev.fightingStyle,
                      featResistanceChoices: typeof updater === 'function' ? updater(prev.fightingStyle?.featResistanceChoices || {}) : updater,
                    },
                  })),
                )}
                {renderLanguageChoiceGroup(
                  t('auto.featLanguages'),
                  fightingStyleFeatLanguageChoiceOptions,
                  classFeatureChoices.fightingStyle?.featLanguageChoices || {},
                  updater => setClassFeatureChoices(prev => ({
                    ...prev,
                    fightingStyle: {
                      ...prev.fightingStyle,
                      featLanguageChoices: typeof updater === 'function' ? updater(prev.fightingStyle?.featLanguageChoices || {}) : updater,
                    },
                  })),
                )}
                {renderSkillChoiceGroup(
                  t('auto.featSavingThrows'),
                  fightingStyleFeatSavingThrowChoiceOptions,
                  classFeatureChoices.fightingStyle?.featSavingThrowChoices || {},
                  updater => setClassFeatureChoices(prev => ({
                    ...prev,
                    fightingStyle: {
                      ...prev.fightingStyle,
                      featSavingThrowChoices: typeof updater === 'function' ? updater(prev.fightingStyle?.featSavingThrowChoices || {}) : updater,
                    },
                  })),
                )}
                {renderSkillChoiceGroup(
                  t('auto.featExpertise'),
                  fightingStyleFeatExpertiseChoiceOptions,
                  classFeatureChoices.fightingStyle?.featExpertiseChoices || {},
                  updater => setClassFeatureChoices(prev => ({
                    ...prev,
                    fightingStyle: {
                      ...prev.fightingStyle,
                      featExpertiseChoices: typeof updater === 'function' ? updater(prev.fightingStyle?.featExpertiseChoices || {}) : updater,
                    },
                  })),
                )}
                {renderFeatSpellChoiceGroup(
                  fightingStyleFeatSpellChoiceState,
                  classFeatureChoices.fightingStyle || {},
                  updater => setClassFeatureChoices(prev => ({
                    ...prev,
                    fightingStyle: {
                      ...prev.fightingStyle,
                      ...updater(prev.fightingStyle || {}),
                    },
                  })),
                )}
                {fightingStyleCantripChoiceState && (
                  <div className="md:col-span-2 border border-gray-200 rounded p-3">
                    <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">
                      {t('spells.cantrips')} {validFightingStyleCantripChoices.length}/{fightingStyleCantripChoiceState.count}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {fightingStyleCantripChoiceState.from.map(spell => (
                        <label key={spell.id} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={validFightingStyleCantripChoices.includes(spell.id)}
                            onChange={() => setClassFeatureChoices(prev => ({
                              ...prev,
                              fightingStyleCantrips: toggleLimitedChoice(spell.id, validFightingStyleCantripChoices, fightingStyleCantripChoiceState.count),
                            }))}
                            disabled={!validFightingStyleCantripChoices.includes(spell.id) && validFightingStyleCantripChoices.length >= fightingStyleCantripChoiceState.count}
                            className="accent-dnd-red"
                          />
                          {spell.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

	          {metamagicChoiceState.isMetamagicClass && metamagicChoiceState.needed > 0 && (
	            <div className="md:col-span-2 border border-gray-200 rounded p-3">
	              <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">
	                {t('auto.metamagic')} {validMetamagicChoices.length}/{metamagicChoiceState.needed}
	              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {metamagicChoiceState.options.map(metamagic => (
                  <label key={metamagic.id} className="flex items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={validMetamagicChoices.includes(metamagic.id)}
                      onChange={() => toggleMetamagic(metamagic.id)}
                      disabled={!validMetamagicChoices.includes(metamagic.id) && validMetamagicChoices.length >= metamagicChoiceState.needed}
                      className="mt-0.5 accent-dnd-red"
                    />
                    <span>
                      <span className="font-bold">
                        {metamagic.name}
                        <span className="text-gray-400"> {metamagic.source}</span>
                      </span>
                      <span className="block text-gray-500 mt-0.5">{metamagic.description.split('\n')[0]}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

	          {maneuverChoiceState.isManeuverSubclass && maneuverChoiceState.needed > 0 && (
	            <div className="md:col-span-2 border border-gray-200 rounded p-3">
	              <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">
	                {t('auto.maneuver')} {validManeuverChoices.length}/{maneuverChoiceState.needed}
	              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {maneuverChoiceState.options.map(maneuver => (
                  <label key={maneuver.id} className="flex items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={validManeuverChoices.includes(maneuver.id)}
                      onChange={() => toggleManeuver(maneuver.id)}
                      disabled={!validManeuverChoices.includes(maneuver.id) && validManeuverChoices.length >= maneuverChoiceState.needed}
                      className="mt-0.5 accent-dnd-red"
                    />
                    <span>
                      <span className="font-bold">
                        {maneuver.name}
                        <span className="text-gray-400"> {maneuver.source}</span>
                      </span>
                      <span className="block text-gray-500 mt-0.5">{maneuver.description.split('\n')[0]}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {renderSkillChoiceGroup(
            t('auto.expertise'),
            classExpertiseChoiceOptions,
            classFeatureChoices.expertise || {},
            updater => setClassFeatureChoices(prev => ({
              ...prev,
              expertise: typeof updater === 'function' ? updater(prev.expertise || {}) : updater,
            })),
          )}

          {weaponMasteryChoiceState && (
            <div className="md:col-span-2 border border-gray-200 rounded p-3">
              <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">
                {t('auto.weaponMastery')} {validWeaponMasteryChoices.length}/{weaponMasteryChoiceState.needed}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {weaponMasteryChoiceState.options.map(weapon => (
                  <label key={weapon.id} className="flex items-start gap-2 text-xs border border-gray-100 rounded p-2">
                    <input
                      type="checkbox"
                      checked={validWeaponMasteryChoices.includes(weapon.id)}
                      onChange={() => toggleWeaponMastery(weapon.id)}
                      disabled={!validWeaponMasteryChoices.includes(weapon.id) && validWeaponMasteryChoices.length >= weaponMasteryChoiceState.needed}
                      className="mt-0.5 accent-dnd-red"
                    />
                    <span>
                      <span className="block font-bold text-gray-800">{weapon.name}</span>
                      <span className="block text-[10px] text-gray-500">
                        {weapon.dmg1 || '-'} {weapon.dmgType || ''}{weapon.range ? ` | ${weapon.range}` : ''} | {formatWeaponMasteryNames(weapon)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {needsAbilityScoreImprovementChoice && (
            <div className="md:col-span-2 border border-gray-200 rounded p-3">
              <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">{t('auto.asiChoice')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">{t('auto.abilityMode')}</span>
                  <select
                    value={abilityScoreImprovementChoice.mode}
                    onChange={event => updateAbilityScoreImprovementChoice({ mode: event.target.value as AutoBuilderAbilityScoreImprovementChoice['mode'] })}
                    className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                  >
                    <option value="plus2">{t('auto.asiPlus2')}</option>
                    <option value="plus1plus1">{t('auto.asiPlus1Plus1')}</option>
                    <option value="feat">{t('auto.asiFeat')}</option>
                  </select>
                </label>
                {abilityScoreImprovementChoice.mode === 'plus2' && (
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">+2</span>
                    <select
                      value={abilityScoreImprovementChoice.plus2 || ''}
                      onChange={event => updateAbilityScoreImprovementChoice({ plus2: event.target.value as AbilityName })}
                      className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                    >
                      {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as AbilityName[]).map(renderAbilityOption)}
                    </select>
                  </label>
                )}
                {abilityScoreImprovementChoice.mode === 'plus1plus1' && (
                  <>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">+1</span>
                      <select
                        value={abilityScoreImprovementChoice.plus1a || ''}
                        onChange={event => updateAbilityScoreImprovementChoice({ plus1a: event.target.value as AbilityName })}
                        className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                      >
                        {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as AbilityName[]).map(renderAbilityOption)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">+1</span>
                      <select
                        value={abilityScoreImprovementChoice.plus1b || ''}
                        onChange={event => updateAbilityScoreImprovementChoice({ plus1b: event.target.value as AbilityName })}
                        className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                      >
                        {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as AbilityName[]).map(renderAbilityOption)}
                      </select>
                    </label>
                  </>
                )}
                {abilityScoreImprovementChoice.mode === 'feat' && (
                  <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">{t('auto.asiFeat')}</span>
                    <select
                      value={abilityScoreImprovementChoice.featId || ''}
                      onChange={event => updateAbilityScoreImprovementChoice({
                        featId: event.target.value,
                        featAbility: undefined,
                        featSkillChoices: {},
                        featToolChoices: {},
                        featWeaponChoices: {},
                        featResistanceChoices: {},
                        featExpertiseChoices: {},
                        featLanguageChoices: {},
                        featSavingThrowChoices: {},
                        featSpellBlockId: undefined,
                        featSpellAbility: undefined,
                        featSpellChoices: {},
                        featFightingStyleFeatureId: undefined,
                        featInvocations: [],
                        featManeuvers: [],
                        featMetamagics: [],
                      })}
                      className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                    >
                      <option value="">{t('auto.chooseFeat')}</option>
                      {abilityScoreImprovementFeatOptions.map(feat => (
                        <option key={`${feat.key}-${feat.source}`} value={`${feat.key}|${feat.source}`}>{feat.name}</option>
                      ))}
                    </select>
                  </label>
                )}
                {abilityScoreImprovementChoice.mode === 'feat' && abilityScoreImprovementFeatAbilityOptions.length > 0 && (
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">+1</span>
                    <select
                      value={abilityScoreImprovementChoice.featAbility || ''}
                      onChange={event => updateAbilityScoreImprovementChoice({ featAbility: event.target.value as AbilityName })}
                      className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                    >
                      <option value="">{t('auto.chooseAbility')}</option>
                      {abilityScoreImprovementFeatAbilityOptions.map(renderAbilityOption)}
                    </select>
                  </label>
                )}
                {abilityScoreImprovementChoice.mode === 'feat' && renderSkillChoiceGroup(
                  t('auto.featSkills'),
                  abilityScoreImprovementFeatSkillChoiceOptions,
                  abilityScoreImprovementChoice.featSkillChoices || {},
                  updater => updateAbilityScoreImprovementChoice({
                    featSkillChoices: typeof updater === 'function' ? updater(abilityScoreImprovementChoice.featSkillChoices || {}) : updater,
                  }),
                )}
                {abilityScoreImprovementChoice.mode === 'feat' && renderToolChoiceGroup(
                  t('auto.featTools'),
                  abilityScoreImprovementFeatToolChoiceOptions,
                  abilityScoreImprovementChoice.featToolChoices || {},
                  updater => updateAbilityScoreImprovementChoice({
                    featToolChoices: typeof updater === 'function' ? updater(abilityScoreImprovementChoice.featToolChoices || {}) : updater,
                  }),
                )}
                {abilityScoreImprovementChoice.mode === 'feat' && renderWeaponChoiceGroup(
                  t('auto.featWeapons'),
                  abilityScoreImprovementFeatWeaponChoiceOptions,
                  abilityScoreImprovementChoice.featWeaponChoices || {},
                  updater => updateAbilityScoreImprovementChoice({
                    featWeaponChoices: typeof updater === 'function' ? updater(abilityScoreImprovementChoice.featWeaponChoices || {}) : updater,
                  }),
                )}
                {abilityScoreImprovementChoice.mode === 'feat' && renderTextChoiceGroup(
                  t('auto.damageResistance'),
                  abilityScoreImprovementFeatResistanceChoiceOptions,
                  abilityScoreImprovementChoice.featResistanceChoices || {},
                  updater => updateAbilityScoreImprovementChoice({
                    featResistanceChoices: typeof updater === 'function' ? updater(abilityScoreImprovementChoice.featResistanceChoices || {}) : updater,
                  }),
                )}
                {abilityScoreImprovementChoice.mode === 'feat' && renderLanguageChoiceGroup(
                  t('auto.featLanguages'),
                  abilityScoreImprovementFeatLanguageChoiceOptions,
                  abilityScoreImprovementChoice.featLanguageChoices || {},
                  updater => updateAbilityScoreImprovementChoice({
                    featLanguageChoices: typeof updater === 'function' ? updater(abilityScoreImprovementChoice.featLanguageChoices || {}) : updater,
                  }),
                )}
                {abilityScoreImprovementChoice.mode === 'feat' && renderSkillChoiceGroup(
                  t('auto.featSavingThrows'),
                  abilityScoreImprovementFeatSavingThrowChoiceOptions,
                  abilityScoreImprovementChoice.featSavingThrowChoices || {},
                  updater => updateAbilityScoreImprovementChoice({
                    featSavingThrowChoices: typeof updater === 'function' ? updater(abilityScoreImprovementChoice.featSavingThrowChoices || {}) : updater,
                  }),
                )}
                {abilityScoreImprovementChoice.mode === 'feat' && renderSkillChoiceGroup(
                  t('auto.featExpertise'),
                  abilityScoreImprovementFeatExpertiseChoiceOptions,
                  abilityScoreImprovementChoice.featExpertiseChoices || {},
                  updater => updateAbilityScoreImprovementChoice({
                    featExpertiseChoices: typeof updater === 'function' ? updater(abilityScoreImprovementChoice.featExpertiseChoices || {}) : updater,
                  }),
                )}
                {abilityScoreImprovementChoice.mode === 'feat' && renderFeatSpellChoiceGroup(
                  abilityScoreImprovementFeatSpellChoiceState,
                  abilityScoreImprovementChoice,
                  updater => updateAbilityScoreImprovementChoice(updater(abilityScoreImprovementChoice)),
                )}
                {abilityScoreImprovementChoice.mode === 'feat' && abilityScoreImprovementFeatFightingStyleChoiceState && (
                  <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">
                      {t('auto.fightingStyle')} 1/{abilityScoreImprovementFeatFightingStyleChoiceState.count}
                    </span>
                    <select
                      value={abilityScoreImprovementChoice.featFightingStyleFeatureId || ''}
                      onChange={event => updateAbilityScoreImprovementChoice({
                        featFightingStyleFeatureId: event.target.value,
                        featManeuvers: [],
                      })}
                      className="bg-white border border-gray-300 rounded px-2 py-2 text-xs"
                    >
                      <option value="">{t('auto.fightingStyle')}</option>
                      {abilityScoreImprovementFeatFightingStyleChoiceState.from.map(style => (
                        <option key={style.id} value={style.id}>{style.name} {style.source}</option>
                      ))}
                    </select>
                    {selectedAbilityScoreImprovementFeatFightingStyle && (
                      <span className="text-gray-500">{selectedAbilityScoreImprovementFeatFightingStyle.description.split('\n')[0]}</span>
                    )}
                  </label>
                )}
                {abilityScoreImprovementChoice.mode === 'feat' && abilityScoreImprovementFeatInvocationChoiceState && (
                  <div className="sm:col-span-2 border border-gray-200 rounded p-3">
                    <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">
                      {t('auto.invocations')} {validAbilityScoreImprovementFeatInvocations.length}/{abilityScoreImprovementFeatInvocationChoiceState.needed}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {abilityScoreImprovementFeatInvocationChoiceState.options.map(invocation => (
                        <label key={invocation.id} className="flex items-start gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={validAbilityScoreImprovementFeatInvocations.includes(invocation.id)}
                            onChange={() => updateAbilityScoreImprovementChoice({
                              featInvocations: toggleLimitedChoice(
                                invocation.id,
                                validAbilityScoreImprovementFeatInvocations,
                                abilityScoreImprovementFeatInvocationChoiceState.needed,
                              ),
                            })}
                            disabled={!validAbilityScoreImprovementFeatInvocations.includes(invocation.id) && validAbilityScoreImprovementFeatInvocations.length >= abilityScoreImprovementFeatInvocationChoiceState.needed}
                            className="mt-0.5 accent-dnd-red"
                          />
                          <span>
                            <span className="font-bold">
                              {invocation.name}
                              <span className="text-gray-400"> {invocation.source}</span>
                            </span>
	                            {getInvocationPrerequisiteSummary(invocation) && (
	                              <span className="block text-gray-500 mt-0.5">{t('auto.prerequisite')} {getInvocationPrerequisiteSummary(invocation)}</span>
	                            )}
                            <span className="block text-gray-500 mt-0.5">{invocation.description.split('\n')[0]}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
	                {abilityScoreImprovementChoice.mode === 'feat' && abilityScoreImprovementFeatManeuverChoiceState && (
	                  <div className="sm:col-span-2 border border-gray-200 rounded p-3">
	                    <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">
	                      {t('auto.maneuver')} {validAbilityScoreImprovementFeatManeuvers.length}/{abilityScoreImprovementFeatManeuverChoiceState.needed}
	                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {abilityScoreImprovementFeatManeuverChoiceState.options.map(maneuver => (
                        <label key={maneuver.id} className="flex items-start gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={validAbilityScoreImprovementFeatManeuvers.includes(maneuver.id)}
                            onChange={() => updateAbilityScoreImprovementChoice({
                              featManeuvers: toggleLimitedChoice(
                                maneuver.id,
                                validAbilityScoreImprovementFeatManeuvers,
                                abilityScoreImprovementFeatManeuverChoiceState.needed,
                              ),
                            })}
                            disabled={!validAbilityScoreImprovementFeatManeuvers.includes(maneuver.id) && validAbilityScoreImprovementFeatManeuvers.length >= abilityScoreImprovementFeatManeuverChoiceState.needed}
                            className="mt-0.5 accent-dnd-red"
                          />
                          <span>
                            <span className="font-bold">
                              {maneuver.name}
                              <span className="text-gray-400"> {maneuver.source}</span>
                            </span>
                            <span className="block text-gray-500 mt-0.5">{maneuver.description.split('\n')[0]}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
	                {abilityScoreImprovementChoice.mode === 'feat' && abilityScoreImprovementFeatMetamagicChoiceState && (
	                  <div className="sm:col-span-2 border border-gray-200 rounded p-3">
	                    <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">
	                      {t('auto.metamagic')} {validAbilityScoreImprovementFeatMetamagics.length}/{abilityScoreImprovementFeatMetamagicChoiceState.needed}
	                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {abilityScoreImprovementFeatMetamagicChoiceState.options.map(metamagic => (
                        <label key={metamagic.id} className="flex items-start gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={validAbilityScoreImprovementFeatMetamagics.includes(metamagic.id)}
                            onChange={() => updateAbilityScoreImprovementChoice({
                              featMetamagics: toggleLimitedChoice(
                                metamagic.id,
                                validAbilityScoreImprovementFeatMetamagics,
                                abilityScoreImprovementFeatMetamagicChoiceState.needed,
                              ),
                            })}
                            disabled={!validAbilityScoreImprovementFeatMetamagics.includes(metamagic.id) && validAbilityScoreImprovementFeatMetamagics.length >= abilityScoreImprovementFeatMetamagicChoiceState.needed}
                            className="mt-0.5 accent-dnd-red"
                          />
                          <span>
                            <span className="font-bold">
                              {metamagic.name}
                              <span className="text-gray-400"> {metamagic.source}</span>
                            </span>
                            <span className="block text-gray-500 mt-0.5">{metamagic.description.split('\n')[0]}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSkillChoiceState && (
            <div className="md:col-span-2 border border-gray-200 rounded p-3">
              <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">
                {t('auto.skillChoices')} {skillChoices.length}/{activeSkillChoiceState.count}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {activeSkillChoiceState.from.map(skill => (
                  <label key={skill} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={skillChoices.includes(skill)}
                      onChange={() => toggleSkill(skill)}
                      disabled={!skillChoices.includes(skill) && skillChoices.length >= activeSkillChoiceState.count}
                      className="accent-dnd-red"
                    />
                    {t(`skills.${skill}` as any)}
                  </label>
                ))}
              </div>
            </div>
          )}

          {renderToolChoiceGroup(
            isNewMulticlass ? t('auto.multiclassTools') : t('auto.classTools'),
            classToolChoiceOptions,
            classToolChoices,
            setClassToolChoices,
          )}

          {invocationChoiceState.isInvocationClass && invocationChoiceState.needed > 0 && (
            <div className="md:col-span-2 border border-gray-200 rounded p-3">
              <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">
                {t('auto.invocations')} {validInvocationChoices.length}/{invocationChoiceState.needed}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {invocationChoiceState.options.map(invocation => (
                  <label key={invocation.id} className="flex items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={invocationChoices.invocationIds.includes(invocation.id)}
                      onChange={() => toggleInvocation(invocation.id)}
                      disabled={!invocationChoices.invocationIds.includes(invocation.id) && validInvocationChoices.length >= invocationChoiceState.needed}
                      className="accent-dnd-red mt-0.5"
                    />
                    <span className="min-w-0">
                      <span>
                        {invocation.name}
                        <span className="text-gray-400"> {invocation.source}</span>
                      </span>
                      {getInvocationPrerequisiteSummary(invocation) && (
                        <span className="block text-[10px] text-gray-500 leading-snug">
                          {getInvocationPrerequisiteSummary(invocation)}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {existingFeatSpellChoiceStates.map((entry) => {
            if (!entry.state.blocks.length) return null;
            const featId = `${entry.feat.key}|${entry.feat.source}`;
            const choice = getExistingFeatChoice(entry.feat.key, entry.feat.source);
            return (
              <React.Fragment key={`feat-spells-${featId}`}>
                {renderFeatSpellChoiceGroup(
                  entry.state,
                  choice,
                  updater => setExistingFeatChoices(previous => ({
                    ...previous,
                    [featId]: {
                      ...choice,
                      ...updater(choice),
                      featId,
                    },
                  })),
                )}
              </React.Fragment>
            );
          })}

          {existingOriginSpellChoiceStates.map((entry) => {
            const stored = existingOriginSpellChoices[entry.id] || {};
            const choice = {
              ...stored,
              originSpellBlockId: stored.originSpellBlockId || entry.defaultBlockId,
            };
            return (
              <React.Fragment key={entry.id}>
                {renderOriginSpellChoiceGroup(
                  entry.state,
                  choice,
                  updater => setExistingOriginSpellChoices(previous => ({
                    ...previous,
                    [entry.id]: {
                      ...choice,
                      ...updater(choice),
                    },
                  })),
                )}
              </React.Fragment>
            );
          })}

          {existingFeatSpellChoiceStates.map((entry) => {
            if (!entry.replacement) return null;
            const featId = `${entry.feat.key}|${entry.feat.source}`;
            const choice = getExistingFeatChoice(entry.feat.key, entry.feat.source);
            return (
              <React.Fragment key={`feat-spell-replacement-${featId}`}>
                {renderFeatSpellReplacementChoice(
                  entry.replacement,
                  choice,
                  updater => setExistingFeatChoices(previous => ({
                    ...previous,
                    [featId]: {
                      ...choice,
                      ...updater(choice),
                      featId,
                    },
                  })),
                )}
              </React.Fragment>
            );
          })}

          {spellChoiceState?.isSpellcaster && spellChoiceState.isPreparedAll && (
            <div className="md:col-span-2 border border-gray-200 rounded p-3">
              <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t('auto.spells')}</h3>
              <p className="text-xs text-gray-600">
                {t('auto.preparedAllNote')} {spellChoiceState.leveled.length}
              </p>
            </div>
          )}

	          {spellChoiceState?.isSpellcaster && !isMagicalSecretLevel && (!spellChoiceState.isPreparedAll || neededSpellChoices.cantrips > 0) && (
            <div className="md:col-span-2 border border-gray-200 rounded p-3">
              <h3 className="text-[10px] text-gray-500 uppercase font-bold mb-2">{t('auto.spells')}</h3>
              {neededSpellChoices.cantrips > 0 && (
                <>
                  <div className="text-xs font-bold text-gray-700 mb-1">
                    {t('spells.cantrips')} {spellChoices.cantrips.length}/{neededSpellChoices.cantrips}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3 max-h-32 overflow-y-auto">
                    {spellChoiceState.cantrips.filter(spell => !existingSpellIds.has(spell.id)).map(spell => (
                      <label key={spell.id} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={spellChoices.cantrips.includes(spell.id)}
                          onChange={() => toggleSpell('cantrips', spell.id)}
                          disabled={!spellChoices.cantrips.includes(spell.id) && spellChoices.cantrips.length >= neededSpellChoices.cantrips}
                          className="accent-dnd-red"
                        />
                        {spell.name}
                      </label>
                    ))}
                  </div>
                </>
              )}
              {neededSpellChoices.leveled > 0 && (
                <>
                  <div className="text-xs font-bold text-gray-700 mb-1">
                    {t('auto.leveledSpells')} {selectedRegularLeveledSpellIds.length}/{neededSpellChoices.leveled}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {spellChoiceState.leveled.filter(spell => !existingSpellIds.has(spell.id) && !fixedLeveledSpellIds.has(spell.id)).map(spell => {
                      const regularOptionIds = new Set(spellChoiceState.leveled
                        .filter(option => !fixedLeveledSpellIds.has(option.id))
                        .map(option => option.id));
                      return (
                      <label key={spell.id} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={spellChoices.leveled.includes(spell.id)}
                          onChange={() => toggleLeveledSpell(spell.id, neededSpellChoices.leveled, regularOptionIds)}
                          disabled={!spellChoices.leveled.includes(spell.id) && selectedRegularLeveledSpellIds.length >= neededSpellChoices.leveled}
                          className="accent-dnd-red"
                        />
                        {spell.name} <span className="text-gray-400">{spell.level}</span>
                      </label>
                      );
                    })}
                  </div>
                </>
              )}
              {fixedLeveledSpellGroups.map(group => {
                const optionIds = new Set(group.options.map(spell => spell.id));
                const needed = Math.max(0, group.count - group.selected);
                const selected = selectedFixedLeveledSpellIds.filter(id => optionIds.has(id)).length;
                if (needed === 0) return null;
                return (
                  <div key={`${group.classLevel}-${group.spellLevel}`} className="mt-3">
                    <div className="text-xs font-bold text-gray-700 mb-1">
                      {group.spellLevel} {t('spells.level')} {selected}/{needed}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                      {group.options.filter(spell => !existingSpellIds.has(spell.id)).map(spell => (
                        <label key={spell.id} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={spellChoices.leveled.includes(spell.id)}
                            onChange={() => toggleLeveledSpell(spell.id, needed, optionIds)}
                            disabled={!spellChoices.leveled.includes(spell.id) && selected >= needed}
                            className="accent-dnd-red"
                          />
                          {spell.name}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              {canReplaceSpell && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h4 className="text-[10px] text-gray-500 uppercase font-bold mb-2">{t('auto.spellReplacement')}</h4>
                  <p className="text-[10px] text-gray-400 mb-2">{t('auto.spellReplacementHint')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold block mb-1">{t('auto.replaceRemove')}</label>
                      <select
                        value={spellReplaceRemoveId || ''}
                        onChange={(e) => {
                          setSpellReplaceRemoveId(e.target.value || null);
                          setSpellReplaceAddId(null);
                        }}
                        className="w-full text-xs border border-gray-300 rounded p-1"
                      >
                        <option value="">{t('auto.replaceNone')}</option>
                        {existingReplaceableSpells.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    {spellReplaceRemoveId && (
                      <div>
                        <label className="text-[10px] text-gray-500 font-bold block mb-1">{t('auto.replaceAdd')}</label>
                        <select
                          value={spellReplaceAddId || ''}
                          onChange={(e) => setSpellReplaceAddId(e.target.value || null)}
                          className="w-full text-xs border border-gray-300 rounded p-1"
                        >
                          <option value="">{t('auto.replaceChooseNew')}</option>
                          {replacementSpellOptions.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.level})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {isMagicalSecretLevel && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h4 className="text-[10px] text-gray-500 uppercase font-bold mb-2">{t('auto.magicalSecrets')}</h4>
                  <p className="text-[10px] text-gray-400 mb-2">{t('auto.magicalSecretsHint')}</p>
                  <div className="text-xs font-bold text-gray-700 mb-1">
                    {t('auto.chooseSpells')} {magicalSecretChoices.length}/2
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto mb-3">
                    {msPool.map(spell => (
                      <label key={spell.id} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={magicalSecretChoices.includes(spell.id)}
                          onChange={() => setMagicalSecretChoices(prev =>
                            prev.includes(spell.id)
                              ? prev.filter(id => id !== spell.id)
                              : prev.length < 2 ? [...prev, spell.id] : prev
                          )}
                          disabled={!magicalSecretChoices.includes(spell.id) && magicalSecretChoices.length >= 2}
                          className="accent-dnd-red"
                        />
                        {spell.name} <span className="text-gray-400">{spell.level}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4">
          <p className="text-xs text-gray-600 leading-relaxed mb-4">{isLevelUpMode ? t('auto.levelUpNote') : t('auto.stageOneNote')}</p>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-2 text-xs font-bold uppercase text-gray-500 hover:text-gray-800">
              {t('auto.cancel')}
            </button>
            <button
              onClick={applyBuild}
              disabled={!content || !selectedClass || (!isLevelUpMode && (!selectedRace || !selectedBackground)) || !isSkillSelectionComplete || !isSpellSelectionComplete || !isInvocationSelectionComplete || !isMetamagicChoiceComplete || !isManeuverChoiceComplete || !isBackgroundAbilityComplete || !isOriginFeatChoiceComplete || !isRaceChoiceComplete || !isBackgroundToolChoiceComplete || !isBackgroundLanguageChoiceComplete || !isClassToolChoiceComplete || !isClassFeatureChoiceComplete || !isExistingFeatChoiceComplete || !isExistingOriginSpellChoiceComplete || !isClassExpertiseChoiceComplete || !isWeaponMasteryChoiceComplete || !isAbilityScoreImprovementComplete || !isSubclassSelectionComplete || !isMagicalSecretComplete}
              className="px-3 py-2 text-xs font-bold uppercase bg-dnd-red text-white rounded hover:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLevelUpMode ? t('auto.applyLevelUp') : t('auto.applyLevelOne')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
