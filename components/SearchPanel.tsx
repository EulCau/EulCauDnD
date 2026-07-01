import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { RuleSystem } from '../types';
import { loadBestiaryIndex, loadBestiaryMonsterDetail } from '../utils/bestiary';
import {
  dedupeSearchResultsByNameAndSource,
  getSearchFeatureSource,
  getSearchSourceRank,
  isSearchSourceAllowedForRuleSystem,
} from '../utils/searchSourceRules';

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
  searchText?: string;
  detailId?: string;
  statblock?: {
    abilities?: Record<string, string>;
    saves?: string;
    skills?: string;
    senses?: string;
    passive?: number | null;
    languages?: string;
    traits?: SearchableMonsterStatblockEntry[];
    spellcasting?: SearchableMonsterStatblockEntry[];
    actions?: SearchableMonsterStatblockEntry[];
    bonusActions?: SearchableMonsterStatblockEntry[];
    reactions?: SearchableMonsterStatblockEntry[];
    legendaryActions?: SearchableMonsterStatblockEntry[];
  };
}

export interface SearchableMonsterStatblockEntry {
  name: string;
  englishName?: string;
  entries: string;
}

interface SearchPanelProps {
  spells: SearchableSpell[];
  features: SearchableFeature[];
  magicItems: SearchableMagicItem[];
  monsters?: SearchableMonster[];
  ruleSystem: RuleSystem;
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

/** Convert a CR string to a numeric value for sorting. Unknown sorts last. */
const crToSortValue = (cr: string): number => {
  if (cr === '未知') return Infinity;
  const n = Number(cr);
  if (!isNaN(n)) return n;
  const parts = cr.split('/');
  if (parts.length === 2) return Number(parts[0]) / Number(parts[1]);
  return Infinity;
};

const getMonsterSearchText = (monster: SearchableMonster): string => {
  const statblock = monster.statblock;
  const sections = [
    statblock?.traits,
    statblock?.spellcasting,
    statblock?.actions,
    statblock?.bonusActions,
    statblock?.reactions,
    statblock?.legendaryActions,
  ];
  return [
    monster.name,
    monster.englishName,
    monster.source,
    monster.type,
    monster.cr,
    monster.size,
    monster.alignment,
    monster.ac,
    monster.hpFormula,
    monster.speed,
    ...monster.environment,
    ...monster.tags,
    statblock?.saves,
    statblock?.skills,
    statblock?.senses,
    statblock?.languages,
    ...sections.flatMap(section => (section || []).flatMap(entry => [entry.name, entry.englishName, entry.entries])),
    monster.searchText,
  ].filter(Boolean).join(' ').toLowerCase();
};

const MONSTER_ABILITY_LABELS: Record<string, string> = {
  STR: 'STR',
  DEX: 'DEX',
  CON: 'CON',
  INT: 'INT',
  WIS: 'WIS',
  CHA: 'CHA',
};

const renderMonsterSection = (title: string, entries: SearchableMonsterStatblockEntry[] | undefined) => {
  if (!entries?.length) return null;
  return (
    <div className="pt-2 border-t border-gray-200">
      <div className="text-[10px] font-bold uppercase text-gray-500 mb-1">{title}</div>
      <div className="space-y-1.5">
        {entries.map((entry, index) => (
          <div key={`${title}-${entry.name}-${index}`}>
            <div className="font-bold text-gray-700">{entry.name}</div>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{entry.entries}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const compareByNameAndSource = <T extends { name: string; source?: string }>(
  a: T,
  b: T,
  ruleSystem: RuleSystem,
): number => (
  a.name.localeCompare(b.name, 'zh-Hans-CN')
    || getSearchSourceRank(a.source, ruleSystem) - getSearchSourceRank(b.source, ruleSystem)
    || String(a.source || '').localeCompare(String(b.source || ''))
);

const SearchPanel: React.FC<SearchPanelProps> = ({ spells, features, magicItems, monsters: initialMonsters = [], ruleSystem, onPurchaseItem }) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [selectedSources, setSelectedSources] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<DetailView | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'spells' | 'features' | 'items' | 'monsters'>('all');
  const [recentlyPurchased, setRecentlyPurchased] = useState<Set<string>>(new Set());
  const [loadedMonsters, setLoadedMonsters] = useState<SearchableMonster[]>(initialMonsters);
  const [isLoadingMonsters, setIsLoadingMonsters] = useState(false);
  const [hasRequestedMonsters, setHasRequestedMonsters] = useState(initialMonsters.length > 0);
  const [monsterDetails, setMonsterDetails] = useState<Record<string, SearchableMonster['statblock']>>({});
  const [loadingMonsterDetails, setLoadingMonsterDetails] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState('');
  const [spellLevelFilter, setSpellLevelFilter] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('');
  const [itemRarityFilter, setItemRarityFilter] = useState('');
  const [monsterTypeFilter, setMonsterTypeFilter] = useState('');
  const [monsterCrFilter, setMonsterCrFilter] = useState('');
  const monsters = loadedMonsters;

  const sourceOptions = useMemo(() => uniqueSorted([
    ...spells.map(spell => spell.source),
    ...magicItems.map(item => item.source),
    ...monsters.map(monster => monster.source),
  ]), [spells, magicItems, monsters]);
  const itemCategoryOptions = useMemo(() => uniqueSorted(magicItems.map(item => item.category)), [magicItems]);
  const itemRarityOptions = useMemo(() => uniqueSorted(magicItems.map(item => item.rarity)), [magicItems]);
  const monsterTypeOptions = useMemo(() => uniqueSorted(monsters.map(monster => monster.type)), [monsters]);
  const monsterCrOptions = useMemo(() => Array.from(new Set(
    monsters.map(monster => (monster.cr || '').trim()).filter(Boolean),
  )).sort((a, b) => crToSortValue(a) - crToSortValue(b)), [monsters]);
  const hasActiveFilter = Boolean(sourceFilter || spellLevelFilter || itemCategoryFilter || itemRarityFilter || monsterTypeFilter || monsterCrFilter);
  const normalizedQuery = query.trim().toLowerCase();
  const shouldShowResults = Boolean(normalizedQuery || hasActiveFilter);
  const shouldLoadMonsters = (
    activeTab === 'monsters'
    || (activeTab === 'all' && shouldShowResults)
    || Boolean(monsterTypeFilter || monsterCrFilter)
  );
  const isMonsterSearchPending = isLoadingMonsters && (activeTab === 'all' || activeTab === 'monsters');

  useEffect(() => {
    if (!shouldLoadMonsters || hasRequestedMonsters) return;
    setHasRequestedMonsters(true);
    setIsLoadingMonsters(true);
    loadBestiaryIndex()
      .then(data => setLoadedMonsters(data.monsters))
      .catch(() => setLoadedMonsters([]))
      .finally(() => setIsLoadingMonsters(false));
  }, [hasRequestedMonsters, shouldLoadMonsters]);

  // Group features by name for source disambiguation
  const featureGroups = useMemo(() => {
    const groups = new Map<string, SearchableFeature[]>();
    for (const f of features) {
      const group = groups.get(f.name) || [];
      group.push(f);
      groups.set(f.name, group.sort((a, b) => (
        getSearchSourceRank(getSearchFeatureSource(a), ruleSystem) - getSearchSourceRank(getSearchFeatureSource(b), ruleSystem)
          || a.sourceName.localeCompare(b.sourceName, 'zh-Hans-CN')
      )));
    }
    return groups;
  }, [features, ruleSystem]);

  // Filter results based on query
  const filteredSpells = useMemo(() => {
    if (!shouldShowResults) return [];
    const matches = dedupeSearchResultsByNameAndSource(
      spells.filter(s =>
      isSearchSourceAllowedForRuleSystem(s.source, ruleSystem, sourceFilter)
      && (!spellLevelFilter || String(s.level) === spellLevelFilter)
      && (
        !normalizedQuery
        || s.name.toLowerCase().includes(normalizedQuery)
        || (s.englishName && s.englishName.toLowerCase().includes(normalizedQuery))
        || (s.description && s.description.toLowerCase().includes(normalizedQuery))
      )
      ),
      ruleSystem,
      spell => spell.name,
      spell => spell.source,
      spell => spell.englishName,
    ).sort((a, b) => compareByNameAndSource(a, b, ruleSystem));
    return normalizedQuery ? matches.slice(0, 50) : matches;
  }, [spells, normalizedQuery, shouldShowResults, sourceFilter, spellLevelFilter, ruleSystem]);

  const filteredFeatures = useMemo(() => {
    if (!shouldShowResults) return [];
    const matches = dedupeSearchResultsByNameAndSource(
      features.filter(f =>
      isSearchSourceAllowedForRuleSystem(getSearchFeatureSource(f), ruleSystem, sourceFilter)
      && (
        !normalizedQuery
        || f.name.toLowerCase().includes(normalizedQuery)
        || f.description.toLowerCase().includes(normalizedQuery)
        || f.sourceName.toLowerCase().includes(normalizedQuery)
      )
      ),
      ruleSystem,
      feature => feature.name,
      getSearchFeatureSource,
    ).sort((a, b) => (
      a.name.localeCompare(b.name, 'zh-Hans-CN')
        || getSearchSourceRank(getSearchFeatureSource(a), ruleSystem) - getSearchSourceRank(getSearchFeatureSource(b), ruleSystem)
        || a.sourceName.localeCompare(b.sourceName, 'zh-Hans-CN')
    ));
    return normalizedQuery ? matches.slice(0, 50) : matches;
  }, [features, normalizedQuery, shouldShowResults, sourceFilter, ruleSystem]);

  const filteredItems = useMemo(() => {
    if (!shouldShowResults) return [];
    const matches = dedupeSearchResultsByNameAndSource(
      magicItems.filter(item =>
      isSearchSourceAllowedForRuleSystem(item.source, ruleSystem, sourceFilter)
      && (!itemCategoryFilter || item.category === itemCategoryFilter)
      && (!itemRarityFilter || item.rarity === itemRarityFilter)
      && (
        !normalizedQuery
        || item.name.toLowerCase().includes(normalizedQuery)
        || (item.englishName && item.englishName.toLowerCase().includes(normalizedQuery))
        || item.description.toLowerCase().includes(normalizedQuery)
      )
      ),
      ruleSystem,
      item => item.name,
      item => item.source,
      item => item.englishName,
    ).sort((a, b) => compareByNameAndSource(a, b, ruleSystem));
    return normalizedQuery ? matches.slice(0, 50) : matches;
  }, [magicItems, normalizedQuery, shouldShowResults, sourceFilter, itemCategoryFilter, itemRarityFilter, ruleSystem]);

  const filteredMonsters = useMemo(() => {
    if (!shouldShowResults) return [];
    const matches = dedupeSearchResultsByNameAndSource(
      monsters.filter(monster =>
      isSearchSourceAllowedForRuleSystem(monster.source, ruleSystem, sourceFilter)
      && (!monsterTypeFilter || monster.type === monsterTypeFilter)
      && (!monsterCrFilter || monster.cr === monsterCrFilter)
      && (!normalizedQuery || getMonsterSearchText(monster).includes(normalizedQuery))
      ),
      ruleSystem,
      monster => monster.name,
      monster => monster.source,
      monster => monster.englishName,
    ).sort((a, b) => compareByNameAndSource(a, b, ruleSystem));
    return normalizedQuery ? matches.slice(0, 50) : matches;
  }, [monsters, normalizedQuery, shouldShowResults, sourceFilter, monsterTypeFilter, monsterCrFilter, ruleSystem]);

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
      return a.data.name.localeCompare(b.data.name, 'zh-Hans-CN')
        || getSearchSourceRank(a.type === 'feature' ? getSearchFeatureSource(a.data) : a.data.source, ruleSystem)
          - getSearchSourceRank(b.type === 'feature' ? getSearchFeatureSource(b.data) : b.data.source, ruleSystem);
    });
    return items;
  }, [filteredSpells, filteredFeatures, filteredItems, filteredMonsters, activeTab, ruleSystem]);

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
    if (type === 'monster' && data.id && !data.statblock && !monsterDetails[data.id] && !loadingMonsterDetails.has(data.id)) {
      setLoadingMonsterDetails(prev => new Set([...prev, data.id]));
      loadBestiaryMonsterDetail(data.detailId || data.id)
        .then(monsterDetail => {
          if (!monsterDetail?.statblock) return;
          setMonsterDetails(prev => ({
            ...prev,
            [data.id]: monsterDetail.statblock,
          }));
        })
        .catch(() => undefined)
        .finally(() => {
          setLoadingMonsterDetails(prev => {
            const next = new Set(prev);
            next.delete(data.id);
            return next;
          });
        });
    }
    setDetail(prev => prev?.data?.id === data.id ? null : { type, data });
  }, [featureGroups, loadingMonsterDetails, monsterDetails, selectedSources]);

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
            {(() => {
              const monster = data as SearchableMonster;
              const statblock = monsterDetails[monster.id] || monster.statblock;
              const abilities = statblock?.abilities || {};
              const isLoadingDetail = loadingMonsterDetails.has(monster.id);
              return (
                <>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <div><span className="font-bold text-gray-600">{t('search.cr')}:</span> {monster.cr || '-'}</div>
              <div><span className="font-bold text-gray-600">{t('search.size')}:</span> {monster.size || '-'}</div>
              <div><span className="font-bold text-gray-600">AC:</span> {monster.ac || '-'}</div>
              <div><span className="font-bold text-gray-600">HP:</span> {monster.hp ?? '-'} {monster.hpFormula ? `(${monster.hpFormula})` : ''}</div>
              <div className="col-span-2"><span className="font-bold text-gray-600">{t('search.type')}:</span> {monster.type || '-'}</div>
              <div className="col-span-2"><span className="font-bold text-gray-600">阵营:</span> {monster.alignment || '-'}</div>
              <div className="col-span-2"><span className="font-bold text-gray-600">{t('search.speed')}:</span> {monster.speed || '-'}</div>
              {monster.environment.length ? (
                <div className="col-span-2"><span className="font-bold text-gray-600">{t('search.environment')}:</span> {monster.environment.join(', ')}</div>
              ) : null}
            </div>

            {Object.keys(abilities).length ? (
              <div className="grid grid-cols-6 gap-1 text-center pt-2 border-t border-gray-200">
                {Object.entries(MONSTER_ABILITY_LABELS).map(([key, label]) => (
                  <div key={key} className="bg-white border border-gray-200 rounded px-1 py-1">
                    <div className="text-[9px] font-bold text-gray-500">{label}</div>
                    <div className="text-[10px] text-gray-800">{abilities[key] || '-'}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {(statblock?.saves || statblock?.skills || statblock?.senses || statblock?.passive || statblock?.languages) ? (
              <div className="space-y-1 pt-2 border-t border-gray-200">
                {statblock.saves ? <div><span className="font-bold text-gray-600">豁免:</span> {statblock.saves}</div> : null}
                {statblock.skills ? <div><span className="font-bold text-gray-600">技能:</span> {statblock.skills}</div> : null}
                {statblock.senses ? <div><span className="font-bold text-gray-600">感官:</span> {statblock.senses}</div> : null}
                {statblock.passive ? <div><span className="font-bold text-gray-600">被动察觉:</span> {statblock.passive}</div> : null}
                {statblock.languages ? <div><span className="font-bold text-gray-600">语言:</span> {statblock.languages}</div> : null}
              </div>
            ) : null}

            {renderMonsterSection('特性', statblock?.traits)}
            {renderMonsterSection('施法', statblock?.spellcasting)}
            {renderMonsterSection('动作', statblock?.actions)}
            {renderMonsterSection('附赠动作', statblock?.bonusActions)}
            {renderMonsterSection('反应', statblock?.reactions)}
            {renderMonsterSection('传奇动作', statblock?.legendaryActions)}

            {isLoadingDetail ? (
              <div className="pt-2 border-t border-gray-200 text-[10px] text-gray-500">
                {t('search.loadingMonsters')}
              </div>
            ) : null}

            {monster.tags.length ? (
              <div className="pt-2 border-t border-gray-200 text-[10px] text-gray-500">
                {monster.tags.slice(0, 12).join(', ')}
              </div>
            ) : null}
                </>
              );
            })()}
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
      ) : isMonsterSearchPending && totalCount === 0 ? (
        <p className="text-center text-gray-400 text-xs py-4">{t('search.loadingMonsters')}</p>
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
