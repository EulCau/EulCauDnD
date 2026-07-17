import React from 'react';
import { ABILITIES } from '../constants';
import type { AbilityName, CharacterData } from '../types';
import type { AutoBuilderContent } from '../utils/autoBuilderRules';
import { AbilityScoreRow } from './AbilityScore';
import { Attacks } from './Attacks';
import { BackstoryGenerator } from './BackstoryGenerator';
import { Equipment } from './Equipment';
import { FeaturesBox } from './FeaturesBox';
import { Personality } from './Personality';
import { ProficienciesBox } from './ProficienciesBox';
import { SpellList } from './SpellList';
import { Vitals } from './Vitals';
import { useLanguage } from '../contexts/LanguageContext';

interface CharacterSheetProps {
  data: CharacterData;
  profBonus: number;
  passivePerception: number;
  isTouchMode: boolean;
  autoBuilderContent: AutoBuilderContent | null;
  magicItems?: React.ComponentProps<typeof Equipment>['magicItems'];
  onChange: (field: keyof CharacterData, value: any) => void;
  onUpdateCharacter: (character: CharacterData) => void;
  onUpdateAbility: (ability: AbilityName, value: number) => void;
  onToggleProficiency: (key: string) => void;
  onToggleExpertise: (key: string) => void;
  onRemoveAdjustment: (sourceId: string) => void;
  onUpdateResource: (resourceId: string, current: number) => void;
}

export const CharacterSheet: React.FC<CharacterSheetProps> = ({
  data,
  profBonus,
  passivePerception,
  isTouchMode,
  autoBuilderContent,
  magicItems,
  onChange,
  onUpdateCharacter,
  onUpdateAbility,
  onToggleProficiency,
  onToggleExpertise,
  onRemoveAdjustment,
  onUpdateResource,
}) => {
  const { t } = useLanguage();

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-3 flex flex-col gap-4 h-full">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between bg-white border border-gray-300 rounded-full px-3 py-1 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-gray-500">{t('stats.inspiration')}</span>
              <input
                type="checkbox"
                checked={data.inspiration}
                onChange={(event) => onChange('inspiration', event.target.checked)}
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

          <div className="bg-white p-2 rounded-lg border border-gray-300 shadow-sm">
            {ABILITIES.map((ability) => (
              <AbilityScoreRow
                key={ability}
                ability={ability}
                score={data.abilities[ability]}
                profBonus={profBonus}
                proficiencies={data.proficiencies}
                expertises={data.expertises}
                onChangeScore={(value) => onUpdateAbility(ability, value)}
                onToggleProficiency={onToggleProficiency}
                onToggleExpertise={onToggleExpertise}
                isTouchMode={isTouchMode}
              />
            ))}
          </div>

          <ProficienciesBox data={data} onChange={onChange} />
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4 h-full">
          <Vitals
            data={data}
            onChange={onChange}
            profBonus={profBonus}
            isTouchMode={isTouchMode}
          />

          <div className="flex-1 min-h-[200px] resize-y overflow-hidden">
            <Attacks
              attacks={data.attacks}
              onUpdate={(attacks) => onChange('attacks', attacks)}
            />
          </div>

          <div className="flex-none">
            <Equipment
              data={data}
              onChange={onChange}
              onUpdateCharacter={onUpdateCharacter}
              magicItems={magicItems}
              autoBuilderContent={autoBuilderContent}
            />
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4 h-full">
          <div className="flex-none">
            <Personality data={data} onChange={onChange} />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <BackstoryGenerator
              data={data}
              onUpdate={(story) => onChange('backstory', story)}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <FeaturesBox
          data={data}
          onChange={(value) => onChange('features', value)}
          onRemoveAdjustment={onRemoveAdjustment}
          onUpdateResource={onUpdateResource}
        />
        <SpellList data={data} onChange={onChange} profBonus={profBonus} />
      </div>
    </>
  );
};
