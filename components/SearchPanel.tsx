import React, { useMemo, useState, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export interface SearchableSpell {
	  id: string;
	  name: string;
	  englishName?: string;
	  level: number;
	  school?: string;
	  time?: unknown;
	  range?: unknown;
	  components?: unknown;
	  duration?: unknown;
	  concentration?: boolean;
	  ritual?: boolean;
	  classKeys?: string[];
	  description?: string;
	  source: string;
	}

export interface SearchableFeature {
  id: string;
  sourceId: string;
  name: string;
  sourceName: string;
  description: string;
}

export interface SearchableMagicItem {
  id: string;
  name: string;
  englishName?: string;
  typeLabel: string;
  rarity: string;
  category: string;
  description: string;
  source: string;
}

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  spells: SearchableSpell[];
  features: SearchableFeature[];
  magicItems: SearchableMagicItem[];
}

interface DetailView {
  type: 'spell' | 'feature' | 'item';
  data: SearchableSpell | SearchableFeature | SearchableMagicItem;
}

const TYPE_ICONS: Record<string, string> = {
  spell: '✦',
  feature: '⚜',
  item: '◆',
};

const SearchPanel: React.FC<SearchPanelProps> = ({ isOpen, onClose, spells, features, magicItems }) => {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState('');
  const [selectedSources, setSelectedSources] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<DetailView | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'spells' | 'features' | 'items'>('all');

  // Group features by name for source disambiguation
  const featureGroups = useMemo(() => {
    const groups = new Map<string, SearchableFeature[]>();
    for (const f of features) {
      const group = groups.get(f.name) || [];
      group.push(f);
      groups.set(f.name, group);
    }
    return groups;
  }, [features]);

  // Filter results based on query
  const filteredSpells = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return spells.filter(s =>
      s.name.toLowerCase().includes(q)
      || (s.englishName && s.englishName.toLowerCase().includes(q))
      || (s.description && s.description.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [spells, query]);

  const filteredFeatures = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return features.filter(f =>
      f.name.toLowerCase().includes(q)
      || f.description.toLowerCase().includes(q)
      || f.sourceName.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [features, query]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return magicItems.filter(item =>
      item.name.toLowerCase().includes(q)
      || (item.englishName && item.englishName.toLowerCase().includes(q))
      || item.description.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [magicItems, query]);

  const results = useMemo(() => {
    const items: Array<{ type: 'spell' | 'feature' | 'item'; data: any }> = [];
    if (activeTab === 'all' || activeTab === 'spells') {
      for (const s of filteredSpells) items.push({ type: 'spell', data: s });
    }
    if (activeTab === 'all' || activeTab === 'features') {
      for (const f of filteredFeatures) items.push({ type: 'feature', data: f });
    }
    if (activeTab === 'all' || activeTab === 'items') {
      for (const i of filteredItems) items.push({ type: 'item', data: i });
    }
    // Sort by type then name
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.data.name.localeCompare(b.data.name, 'zh-Hans-CN');
    });
    return items;
  }, [filteredSpells, filteredFeatures, filteredItems, activeTab]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDetail(null);
  }, []);

  const handleClose = useCallback(() => {
    clearSearch();
    onClose();
  }, [clearSearch, onClose]);

  const openDetail = useCallback((type: 'spell' | 'feature' | 'item', data: any) => {
    // For features: if multiple sources, let user pick
    if (type === 'feature') {
      const group = featureGroups.get(data.name) || [];
      if (group.length > 1) {
        const chosenSource = selectedSources[data.name] || group[0].sourceId;
        const chosen = group.find(f => f.sourceId === chosenSource) || group[0];
        setDetail({ type, data: chosen });
        return;
      }
    }
    setDetail({ type, data });
  }, [featureGroups, selectedSources]);

  const handleSourceChange = (featureName: string, sourceId: string) => {
    setSelectedSources(prev => ({ ...prev, [featureName]: sourceId }));
    // Update detail view if showing this feature
    if (detail && detail.type === 'feature' && detail.data.name === featureName) {
      const group = featureGroups.get(featureName) || [];
      const chosen = group.find(f => f.sourceId === sourceId) || group[0];
      setDetail({ ...detail, data: chosen });
    }
  };

  if (!isOpen) return null;

  const renderDetail = () => {
    if (!detail) return null;
    const { type, data } = detail;

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16" onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
        <div className="bg-white border-2 border-gray-300 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
          {/* Detail header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 bg-gray-50 rounded-t-lg flex-none">
            <div className="flex items-center gap-2">
              <span className="text-lg">{TYPE_ICONS[type]}</span>
              <div>
                <h3 className="font-bold text-gray-900">{data.name}</h3>
                <span className="text-[10px] uppercase text-gray-500">
                  {type === 'spell' && `${(data as SearchableSpell).level === 0 ? t('spells.cantrips') : `${t('spells.level')} ${(data as SearchableSpell).level}`} · ${(data as SearchableSpell).source}`}
                  {type === 'feature' && `${(data as SearchableFeature).sourceName}`}
                  {type === 'item' && `${(data as SearchableMagicItem).typeLabel} · ${(data as SearchableMagicItem).rarity} · ${(data as SearchableMagicItem).source}`}
                </span>
              </div>
            </div>
            <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
          </div>
          {/* Detail body */}
          <div className="overflow-y-auto p-4 flex-1">
            {type === 'spell' && (
              <div className="space-y-2 text-sm">
                <div><span className="font-bold text-gray-600">{t('spells.level')}:</span> {(data as SearchableSpell).level === 0 ? t('spells.cantrips') : String((data as SearchableSpell).level)}</div>
                <div><span className="font-bold text-gray-600">{t('spells.comp')}:</span> V, S, M</div>
                <div className="flex gap-4 text-[10px] text-gray-500">
                  {(data as SearchableSpell).concentration && <span>✦ {t('spells.concentration')}</span>}
                  {(data as SearchableSpell).ritual && <span>◈ {t('spells.ritual')}</span>}
                </div>
                {(data as SearchableSpell).classKeys?.length ? (
                  <div className="text-[10px] text-gray-400">
                    {t('spells.class')}: {(data as SearchableSpell).classKeys!.join(', ')}
                  </div>
                ) : null}
              </div>
            )}
            {type === 'feature' && (
              <div className="space-y-2 text-sm">
                {/* Source selector for multi-source features */}
                {(() => {
                  const group = featureGroups.get(data.name) || [];
                  if (group.length > 1) {
                    return (
                      <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">{t('search.chooseSource')}</label>
                        <select
                          value={selectedSources[data.name] || (data as SearchableFeature).sourceId}
                          onChange={(e) => handleSourceChange(data.name, e.target.value)}
                          className="w-full text-xs border border-gray-300 rounded p-1 bg-white"
                        >
                          {group.map(f => (
                            <option key={f.sourceId} value={f.sourceId}>{f.sourceName}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                  return null;
                })()}
                <div><span className="font-bold text-gray-600">{t('search.source')}:</span> {(data as SearchableFeature).sourceName}</div>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-xs">{(data as SearchableFeature).description}</p>
                </div>
              </div>
            )}
            {type === 'item' && (
              <div className="space-y-2 text-sm">
                <div className="flex gap-3 text-[10px] text-gray-500 mb-2">
                  <span>{(data as SearchableMagicItem).typeLabel}</span>
                  <span>{t('search.rarity')}: {(data as SearchableMagicItem).rarity}</span>
                  <span>{(data as SearchableMagicItem).source}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-xs">{(data as SearchableMagicItem).description}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const totalCount = filteredSpells.length + filteredFeatures.length + filteredItems.length;
  const totalFeaturesCount = features.length;
  const totalSpellsCount = spells.length;
  const totalItemsCount = magicItems.length;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={handleClose} />

      {/* Search Panel */}
      <div className="fixed inset-x-0 top-0 z-50 mx-auto mt-16 max-w-3xl w-full px-4">
        <div className="bg-white border-2 border-gray-300 rounded-lg shadow-2xl flex flex-col max-h-[80vh]">
          {/* Search Bar */}
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 flex-none">
            <span className="text-gray-400 text-lg">🔍</span>
            <input
              autoFocus
              type="text"
              className="flex-1 outline-none text-base"
              placeholder={t('search.placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { clearSearch(); onClose(); } }}
            />
            {query && (
              <button onClick={clearSearch} className="text-gray-400 hover:text-gray-700 text-sm px-1">&times;</button>
            )}
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 text-sm px-2 border-l border-gray-200">{t('auto.close')}</button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-4 pt-2 border-b border-gray-100 flex-none">
            {(['all', 'spells', 'features', 'items'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-[11px] uppercase font-bold rounded-t transition-colors ${
                  activeTab === tab
                    ? 'bg-dnd-red text-white'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tab === 'all' && t('search.tabAll')}
                {tab === 'spells' && `${t('search.tabSpells')} (${totalSpellsCount})`}
                {tab === 'features' && `${t('search.tabFeatures')} (${totalFeaturesCount})`}
                {tab === 'items' && `${t('search.tabItems')} (${totalItemsCount})`}
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="overflow-y-auto flex-1 p-2">
            {!query.trim() ? (
              <p className="text-center text-gray-400 text-sm py-8">{t('search.hint')}</p>
            ) : totalCount === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">{t('search.noResults')}</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {results.map((result, idx) => {
                  const key = `${result.type}-${result.data.id || idx}`;
                  // For features: check if multi-source to add indicator
                  const isMultiSource = result.type === 'feature' && (featureGroups.get(result.data.name)?.length || 0) > 1;

                  return (
                    <button
                      key={key}
                      onClick={() => openDetail(result.type, result.data)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors flex items-start gap-3"
                    >
                      <span className="text-xs mt-0.5 text-gray-400 w-4 text-center shrink-0">{TYPE_ICONS[result.type]}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900 truncate">{result.data.name}</span>
                          {isMultiSource && <span className="text-[9px] text-yellow-600 bg-yellow-50 border border-yellow-200 rounded px-1 shrink-0">{t('search.multiSource')}</span>}
                          {result.type === 'spell' && (
                            <span className="text-[10px] text-gray-400 shrink-0">
                              {result.data.level === 0 ? t('spells.cantrips') : `${t('spells.level')} ${result.data.level}`}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <span>
                            {result.type === 'spell' && result.data.source}
                            {result.type === 'feature' && result.data.sourceName}
                            {result.type === 'item' && `${result.data.rarity} · ${result.data.source}`}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {renderDetail()}
    </>
  );
};

export default SearchPanel;
