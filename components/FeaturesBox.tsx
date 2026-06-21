import React from 'react';
import { CharacterData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { EditableMarkdown } from './EditableMarkdown';

interface FeaturesBoxProps {
  data: CharacterData;
  onChange: (val: string) => void;
  onRemoveAdjustment: (sourceId: string) => void;
  onUpdateResource: (resourceId: string, current: number) => void;
}

export const FeaturesBox: React.FC<FeaturesBoxProps> = ({ data, onChange, onRemoveAdjustment, onUpdateResource }) => {
  const { t } = useLanguage();

  return (
    <div className="bg-white border border-gray-300 rounded p-3 h-full flex flex-col overflow-hidden">
      {data.appliedAdjustments.length > 0 && (
        <div className="mb-3 border-b border-gray-200 pb-2">
          <h3 className="text-[10px] text-gray-500 uppercase font-bold text-center mb-2">
            {t('adjustments.title')}
          </h3>
          <div className="flex flex-wrap gap-1">
            {data.appliedAdjustments.map(adjustment => (
              <button
                key={adjustment.id}
                onClick={() => onRemoveAdjustment(adjustment.sourceId)}
                className="text-[10px] px-2 py-1 border border-gray-300 rounded bg-gray-50 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                title={t('adjustments.remove')}
              >
                {adjustment.sourceName} ×
              </button>
            ))}
          </div>
        </div>
      )}
      {data.resources.length > 0 && (
        <div className="mb-3 border-b border-gray-200 pb-2">
          <h3 className="text-[10px] text-gray-500 uppercase font-bold text-center mb-2">
            {t('resources.title')}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {data.resources.map(resource => (
              <div key={resource.id} className="border border-gray-200 rounded p-2 bg-gray-50">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-800 truncate">{resource.name}</div>
                    <div className="text-[9px] text-gray-500 truncate">{resource.sourceName}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={resource.max}
                      value={resource.current}
                      onChange={event => onUpdateResource(resource.id, Number(event.target.value) || 0)}
                      className="w-10 text-center text-xs border border-gray-300 rounded bg-white"
                    />
                    <span className="text-xs text-gray-500">/ {resource.max}</span>
                  </div>
                </div>
                <div className="mt-1 text-[9px] text-gray-500">
                  {t(`resources.reset.${resource.reset}` as any)}{resource.note ? `, ${resource.note}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.featureEntries.length > 0 && (
        <div className="mb-3 max-h-48 overflow-y-auto border-b border-gray-200 pb-2">
          <h3 className="text-[10px] text-gray-500 uppercase font-bold text-center mb-2">
            {t('features.automatic')}
          </h3>
          <div className="space-y-2">
            {data.featureEntries.map(feature => (
              <section key={feature.id} className="text-xs">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="font-bold text-gray-800">{feature.name}</h4>
                  <span className="text-[9px] uppercase text-gray-400 whitespace-nowrap">{feature.sourceName}</span>
                </div>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{feature.description}</p>
              </section>
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <EditableMarkdown
          title={t('features.title')}
          value={data.features}
          placeholder={t('features.placeholder')}
          onChange={onChange}
          className="h-full flex flex-col overflow-hidden"
          textSizeClassName="text-xs"
        />
      </div>
    </div>
  );
};
