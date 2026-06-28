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

export interface SearchableMonster {
  id: string;
  name: string;
  englishName?: string;
  source: string;
  size: string;
  type: string;
  alignment: string;
  cr: string;
  ac: string;
  hp: number | null;
  hpFormula: string;
  speed: string;
  environment: string[];
  tags: string[];
}

interface SearchPanelProps {
  spells: SearchableSpell[];
  features: SearchableFeature[];
  magicItems: SearchableMagicItem[];
  monsters?: SearchableMonster[];
  onPurchaseItem?: (name: string, source: string) => void;
}

interface DetailView {
  type: 'spell' | 'feature' | 'item' | 'monster';
  data: SearchableSpell | SearchableFeature | SearchableMagicItem | SearchableMonster;
}

const TYPE_ICONS: Record<string, string> = {
  spell: '✦',
  feature: '⚜',
  item: '◆',
  monster: '▣',
};

const uniqueSorted = (values: Array<string | undefined | null>) => Array.from(new Set(
  values
    .map(value => (value || '').trim())
    .filter(Boolean)
)).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));

const SearchPanel: React.FC<SearchPanelProps> = ({ spells, features, magicItems, monsters = [], onPurchaseItem }) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [selectedSources, setSelectedSources] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<DetailView | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'spells' | 'features' | 'items' | 'monsters'>('all');
  const [recentlyPurchased, setRecentlyPurchased] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState('');
  const [spellLevelFilter, setSpellLevelFilter] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('');
  const [itemRarityFilter, setItemRarityFilter] = useState('');
  const [monsterTypeFilter, setMonsterTypeFilter] = useState('');
  const [monsterCrFilter, setMonsterCrFilter] = useState('');

  const sourceOptions = useMemo(() => uniqueSorted([
    ...spells.map(spell => spell.source),
    ...magicItems.map(item => item.source),
    ...monsters.map(monster => monster.source),
  ]), [spells, magicItems, monsters]);
  const itemCategoryOptions = useMemo(() => uniqueSorted(magicItems.map(item => item.category)), [magicItems]);
  const itemRarityOptions = useMemo(() => uniqueSorted(magicItems.map(item => item.rarity)), [magicItems]);
  const monsterTypeOptions = useMemo(() => uniqueSorted(monsters.map(monster => monster.type)), [monsters]);
  const monsterCrOptions = useMemo(() => uniqueSorted(monsters.map(monster => monster.cr)), [monsters]);
  const hasActiveFilter = Boolean(sourceFilter || spellLevelFilter || itemCategoryFilter || itemRarityFilter || monsterTypeFilter || monsterCrFilter);
  const normalizedQuery = query.trim().toLowerCase();
  const shouldShowResults = Boolean(normalizedQuery || hasActiveFilter);

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
    if (!shouldShowResults) return [];
    const matches = spells.filter(s =>
      (!sourceFilter || s.source === sourceFilter)
      && (!spellLevelFilter || String(s.level) === spellLevelFilter)
      && (
        !normalizedQuery
        || s.name.toLowerCase().includes(normalizedQuery)
        || (s.englishName && s.englishName.toLowerCase().includes(normalizedQuery))
        || (s.description && s.description.toLowerCase().includes(normalizedQuery))
      )
    );
    return normalizedQuery ? matches.slice(0, 50) : matches;
  }, [spells, normalizedQuery, shouldShowResults, sourceFilter, spellLevelFilter]);

  const filteredFeatures = useMemo(() => {
    if (!shouldShowResults) return [];
    const matches = features.filter(f =>
      (!sourceFilter || f.sourceName.toLowerCase().includes(sourceFilter.toLowerCase()))
      && (
        !normalizedQuery
        || f.name.toLowerCase().includes(normalizedQuery)
        || f.description.toLowerCase().includes(normalizedQuery)
        || f.sourceName.toLowerCase().includes(normalizedQuery)
      )
    );
    return normalizedQuery ? matches.slice(0, 50) : matches;
  }, [features, normalizedQuery, shouldShowResults, sourceFilter]);

  const filteredItems = useMemo(() => {
    if (!shouldShowResults) return [];
    const matches = magicItems.filter(item =>
      (!sourceFilter || item.source === sourceFilter)
      && (!itemCategoryFilter || item.category === itemCategoryFilter)
      && (!itemRarityFilter || item.rarity === itemRarityFilter)
      && (
        !normalizedQuery
        || item.name.toLowerCase().includes(normalizedQuery)
        || (item.englishName && item.englishName.toLowerCase().includes(normalizedQuery))
        || item.description.toLowerCase().includes(normalizedQuery)
      )
    );
    return normalizedQuery ? matches.slice(0, 50) : matches;
  }, [magicItems, normalizedQuery, shouldShowResults, sourceFilter, itemCategoryFilter, itemRarityFilter]);

  const filteredMonsters = useMemo(() => {
    if (!shouldShowResults) return [];
    const matches = monsters.filter(monster =>
      (!sourceFilter || monster.source === sourceFilter)
      && (!monsterTypeFilter || monster.type === monsterTypeFilter)
      && (!monsterCrFilter || monster.cr === monsterCrFilter)
      && (
        !normalizedQuery
        || monster.name.toLowerCase().includes(normalizedQuery)
        || (monster.englishName && monster.englishName.toLowerCase().includes(normalizedQuery))
        || monster.source.toLowerCase().includes(normalizedQuery)
        || monster.type.toLowerCase().includes(normalizedQuery)
        || monster.cr.toLowerCase().includes(normalizedQuery)
        || monster.environment.some(env => env.toLowerCase().includes(normalizedQuery))
        || monster.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))
      )
    );
    return normalizedQuery ? matches.slice(0, 50) : matches;
  }, [monsters, normalizedQuery, shouldShowResults, sourceFilter, monsterTypeFilter, monsterCrFilter]);

  const results = useMemo(() => {
    const items: Array<{ type: 'spell' | 'feature' | 'item' | 'monster'; data: any }> = [];
    if (activeTab === 'all' || activeTab === 'spells') {
      for (const s of filteredSpells) items.push({ type: 'spell', data: s });
    }
    if (activeTab === 'all' || activeTab === 'features') {
      for (const f of filteredFeatures) items.push({ type: 'feature', data: f });
    }
    if (activeTab === 'all' || activeTab === 'items') {
      for (const i of filteredItems) items.push({ type: 'item', data: i });
    }
    if (activeTab === 'all' || activeTab === 'monsters') {
      for (const monster of filteredMonsters) items.push({ type: 'monster', data: monster });
    }
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.data.name.localeCompare(b.data.name, 'zh-Hans-CN');
    });
    return items;
  }, [filteredSpells, filteredFeatures, filteredItems, filteredMonsters, activeTab]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDetail(null);
  }, []);

  const clearFilters = useCallback(() => {
    setSourceFilter('');
    setSpellLevelFilter('');
    setItemCategoryFilter('');
    setItemRarityFilter('');
    setMonsterTypeFilter('');
    setMonsterCrFilter('');
  }, []);

  const openDetail = useCallback((type: 'spell' | 'feature' | 'item' | 'monster', data: any) => {
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

  const totalCount = filteredSpells.length + filteredFeatures.length + filteredItems.length + filteredMonsters.length;
  const totalFeaturesCount = features.length;
  const totalSpellsCount = spells.length;
  const totalItemsCount = magicItems.length;
  const totalMonstersCount = monsters.length;

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
                {type === 'monster' && `${t('search.cr')} ${(data as SearchableMonster).cr || '-'} · ${(data as SearchableMonster).type} · ${(data as SearchableMonster).source}`}
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

        {type === 'monster' && (
          <div className="space-y-1 text-xs">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <div><span className="font-bold text-gray-600">{t('search.cr')}:</span> {(data as SearchableMonster).cr || '-'}</div>
              <div><span className="font-bold text-gray-600">{t('search.size')}:</span> {(data as SearchableMonster).size || '-'}</div>
              <div><span className="font-bold text-gray-600">AC:</span> {(data as SearchableMonster).ac || '-'}</div>
              <div><span className="font-bold text-gray-600">HP:</span> {(data as SearchableMonster).hp ?? '-'} {(data as SearchableMonster).hpFormula ? `(${(data as SearchableMonster).hpFormula})` : ''}</div>
              <div className="col-span-2"><span className="font-bold text-gray-600">{t('search.type')}:</span> {(data as SearchableMonster).type || '-'}</div>
              <div className="col-span-2"><span className="font-bold text-gray-600">{t('search.speed')}:</span> {(data as SearchableMonster).speed || '-'}</div>
              {(data as SearchableMonster).environment.length ? (
                <div className="col-span-2"><span className="font-bold text-gray-600">{t('search.environment')}:</span> {(data as SearchableMonster).environment.join(', ')}</div>
              ) : null}
            </div>
            {(data as SearchableMonster).tags.length ? (
              <div className="pt-2 border-t border-gray-200 text-[10px] text-gray-500">
                {(data as SearchableMonster).tags.slice(0, 12).join(', ')}
              </div>
            ) : null}
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
      <div className="flex gap-1 border-b border-gray-100 mb-2">
        {(['all', 'spells', 'features', 'items', 'monsters'] as const).map(tab => (
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
            {tab === 'monsters' && `${t('search.tabMonsters')} (${totalMonstersCount})`}
          </button>
        ))}
      </div>

      {/* Structured Filters */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="min-w-[92px] max-w-[150px] text-[10px] border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700"
          aria-label={t('search.filterSource')}
        >
          <option value="">{t('search.filterSource')}</option>
          {sourceOptions.map(source => <option key={source} value={source}>{source}</option>)}
        </select>

          {(activeTab === 'all' || activeTab === 'spells') && (
            <select
              value={spellLevelFilter}
              onChange={(e) => setSpellLevelFilter(e.target.value)}
              className="min-w-[92px] max-w-[150px] text-[10px] border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700"
              aria-label={t('search.filterSpellLevel')}
            >
              <option value="">{t('search.filterSpellLevel')}</option>
              {Array.from({ length: 10 }, (_, level) => (
                <option key={level} value={String(level)}>
                  {level === 0 ? t('spells.cantrips') : `${t('spells.level')} ${level}`}
                </option>
              ))}
            </select>
          )}

          {(activeTab === 'all' || activeTab === 'items') && (
            <>
              <select
                value={itemCategoryFilter}
                onChange={(e) => setItemCategoryFilter(e.target.value)}
                className="min-w-[92px] max-w-[150px] text-[10px] border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700"
                aria-label={t('search.filterItemCategory')}
              >
                <option value="">{t('search.filterItemCategory')}</option>
                {itemCategoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
              <select
                value={itemRarityFilter}
                onChange={(e) => setItemRarityFilter(e.target.value)}
                className="min-w-[92px] max-w-[150px] text-[10px] border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700"
                aria-label={t('search.filterItemRarity')}
              >
                <option value="">{t('search.filterItemRarity')}</option>
                {itemRarityOptions.map(rarity => <option key={rarity} value={rarity}>{rarity}</option>)}
              </select>
            </>
          )}

          {(activeTab === 'all' || activeTab === 'monsters') && (
            <>
              <select
                value={monsterTypeFilter}
                onChange={(e) => setMonsterTypeFilter(e.target.value)}
                className="min-w-[92px] max-w-[150px] text-[10px] border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700"
                aria-label={t('search.filterMonsterType')}
              >
                <option value="">{t('search.filterMonsterType')}</option>
                {monsterTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
              <select
                value={monsterCrFilter}
                onChange={(e) => setMonsterCrFilter(e.target.value)}
                className="min-w-[72px] max-w-[120px] text-[10px] border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700"
                aria-label={t('search.filterMonsterCr')}
              >
                <option value="">{t('search.filterMonsterCr')}</option>
                {monsterCrOptions.map(cr => <option key={cr} value={cr}>{cr}</option>)}
              </select>
            </>
          )}

          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[10px] border border-gray-200 rounded px-1.5 py-1 text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            >
              {t('search.clearFilters')}
            </button>
          )}
      </div>

      {/* Results */}
      {!shouldShowResults ? (
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
                      {result.type === 'monster' && (
                        <span className="text-[9px] text-gray-400 shrink-0">
                          {t('search.cr')} {result.data.cr || '-'}
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-gray-400">
                      {result.type === 'spell' && result.data.source}
                      {result.type === 'feature' && result.data.sourceName}
                      {result.type === 'item' && `${result.data.rarity} · ${result.data.source}`}
                      {result.type === 'monster' && `${result.data.type} · ${result.data.source}`}
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
