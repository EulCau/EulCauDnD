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
  spells: SearchableSpell[];
  features: SearchableFeature[];
  magicItems: SearchableMagicItem[];
  onPurchaseItem?: (name: string, source: string) => void;
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

const SearchPanel: React.FC<SearchPanelProps> = ({ spells, features, magicItems, onPurchaseItem }) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [selectedSources, setSelectedSources] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<DetailView | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'spells' | 'features' | 'items'>('all');
  const [recentlyPurchased, setRecentlyPurchased] = useState<Set<string>>(new Set());

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

  const openDetail = useCallback((type: 'spell' | 'feature' | 'item', data: any) => {
    if (type === 'feature') {
      const group = featureGroups.get(data.name) || [];
      if (group.length > 1) {
        const chosenSource = selectedSources[data.name] || group[0].sourceId;
        const chosen = group.find(f => f.sourceId === chosenSource) || group[0];
        setDetail(prev => prev?.data?.id === chosen.id ? null : { type, data: chosen });
        return;
      }
    }
    setDetail(prev => prev?.data?.id === data.id ? null : { type, data });
  }, [featureGroups, selectedSources]);

  const handleSourceChange = (featureName: string, sourceId: string) => {
    setSelectedSources(prev => ({ ...prev, [featureName]: sourceId }));
    if (detail && detail.type === 'feature' && detail.data.name === featureName) {
      const group = featureGroups.get(featureName) || [];
      const chosen = group.find(f => f.sourceId === sourceId) || group[0];
      setDetail({ ...detail, data: chosen });
    }
  };

  const totalCount = filteredSpells.length + filteredFeatures.length + filteredItems.length;
  const totalFeaturesCount = features.length;
  const totalSpellsCount = spells.length;
  const totalItemsCount = magicItems.length;

  const renderDetailContent = () => {
    if (!detail) return null;
    const { type, data } = detail;

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{TYPE_ICONS[type]}</span>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">{data.name}</h4>
              <span className="text-[10px] uppercase text-gray-500">
                {type === 'spell' && `${(data as SearchableSpell).level === 0 ? t('spells.cantrips') : `${t('spells.level')} ${(data as SearchableSpell).level}`} · ${(data as SearchableSpell).source}`}
                {type === 'feature' && `${(data as SearchableFeature).sourceName}`}
                {type === 'item' && `${(data as SearchableMagicItem).typeLabel} · ${(data as SearchableMagicItem).rarity} · ${(data as SearchableMagicItem).source}`}
              </span>
            </div>
          </div>
          <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-700 text-sm leading-none">&times;</button>
        </div>

        {type === 'spell' && (
          <div className="space-y-1 text-xs">
            <div><span className="font-bold text-gray-600">{t('spells.level')}:</span> {(data as SearchableSpell).level === 0 ? t('spells.cantrips') : String((data as SearchableSpell).level)}</div>
            <div><span className="font-bold text-gray-600">{t('spells.comp')}:</span> V, S, M</div>
            <div className="flex gap-3 text-[10px] text-gray-500">
              {(data as SearchableSpell).concentration && <span>✦ {t('spells.concentration')}</span>}
              {(data as SearchableSpell).ritual && <span>◈ {t('spells.ritual')}</span>}
            </div>
            {(data as SearchableSpell).classKeys?.length ? (
              <div className="text-[10px] text-gray-400">{t('spells.class')}: {(data as SearchableSpell).classKeys!.join(', ')}</div>
            ) : null}
            {(data as SearchableSpell).description && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{(data as SearchableSpell).description}</p>
              </div>
            )}
          </div>
        )}

        {type === 'feature' && (
          <div className="space-y-1 text-xs">
            {(() => {
              const group = featureGroups.get(data.name) || [];
              if (group.length > 1) {
                return (
                  <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
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
            <div className="pt-2 border-t border-gray-200">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{(data as SearchableFeature).description}</p>
            </div>
          </div>
        )}

        {type === 'item' && (
          <div className="space-y-1 text-xs">
            <div className="flex gap-2 text-[10px] text-gray-500 mb-1">
              <span>{(data as SearchableMagicItem).typeLabel}</span>
              <span>{t('search.rarity')}: {(data as SearchableMagicItem).rarity}</span>
              <span>{(data as SearchableMagicItem).source}</span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{(data as SearchableMagicItem).description}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-3">
      {/* Header & Search Bar */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-gray-500">🔍</span>
        <input
          type="text"
          className="flex-1 outline-none text-xs bg-transparent"
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button onClick={clearSearch} className="text-gray-400 hover:text-gray-700 text-xs px-1">&times;</button>
        )}
      </div>

      {/* Tabs */}
      {query && (
        <div className="flex gap-1 border-b border-gray-100 mb-2">
          {(['all', 'spells', 'features', 'items'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-1 text-[10px] uppercase font-bold rounded-t transition-colors ${
                activeTab === tab
                  ? 'bg-dnd-red text-white'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab === 'all' && t('search.tabAll')}
              {tab === 'spells' && `${t('search.tabSpells')} (${totalSpellsCount})`}
              {tab === 'features' && `${t('search.tabFeatures')} (${totalFeaturesCount})`}
              {tab === 'items' && `${t('search.tabItems')} (${totalItemsCount})`}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {!query.trim() ? (
        <p className="text-center text-gray-400 text-xs py-4">{t('search.hint')}</p>
      ) : totalCount === 0 ? (
        <p className="text-center text-gray-400 text-xs py-4">{t('search.noResults')}</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {results.map((result, idx) => {
            const key = `${result.type}-${result.data.id || idx}`;
            const isMultiSource = result.type === 'feature' && (featureGroups.get(result.data.name)?.length || 0) > 1;
            const isExpanded = detail?.data?.id === result.data.id;

            return (
              <div key={key}>
                <button
                  onClick={() => openDetail(result.type, result.data)}
                  className={`w-full text-left px-2 py-1.5 hover:bg-gray-50 transition-colors flex items-start gap-2 ${isExpanded ? 'bg-gray-50' : ''}`}
                >
                  <span className="text-[10px] mt-0.5 text-gray-400 w-3 text-center shrink-0">{TYPE_ICONS[result.type]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-xs text-gray-900 truncate">{result.data.name}</span>
                      {isMultiSource && <span className="text-[8px] text-yellow-600 bg-yellow-50 border border-yellow-200 rounded px-0.5 shrink-0">{t('search.multiSource')}</span>}
                      {result.type === 'spell' && (
                        <span className="text-[9px] text-gray-400 shrink-0">
                          {result.data.level === 0 ? t('spells.cantrips') : `${t('spells.level')} ${result.data.level}`}
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-gray-400">
                      {result.type === 'spell' && result.data.source}
                      {result.type === 'feature' && result.data.sourceName}
                      {result.type === 'item' && `${result.data.rarity} · ${result.data.source}`}
                    </div>
                  </div>
                  {result.type === 'item' && onPurchaseItem && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPurchaseItem(result.data.name, result.data.source);
                        const key = `${result.data.name}|${result.data.source}`;
                        setRecentlyPurchased(prev => new Set(prev).add(key));
                        setTimeout(() => {
                          setRecentlyPurchased(prev => {
                            const next = new Set(prev);
                            next.delete(key);
                            return next;
                          });
                        }, 1500);
                      }}
                      className={`ml-1 shrink-0 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border transition-colors ${
                        recentlyPurchased.has(`${result.data.name}|${result.data.source}`)
                          ? 'border-green-500 bg-green-100 text-green-800'
                          : 'border-green-300 text-green-700 hover:bg-green-50'
                      }`}
                    >
                      {recentlyPurchased.has(`${result.data.name}|${result.data.source}`) ? '✓' : '购买'}
                    </button>
                  )}
                </button>
                {/* Inline detail */}
                {isExpanded && renderDetailContent()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchPanel;
