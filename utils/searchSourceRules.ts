import type { RuleSystem } from '../types';

const SEARCH_SOURCE_PRIORITY: Record<RuleSystem, string[]> = {
  '5e': ['PHB', 'DMG', 'MM', 'XGE', 'TCE', 'FTD', 'AAG', 'AI', 'BMT', 'BGG', 'EGW', 'ERLW', 'FRHoF', 'GGR', 'MOT', 'SCC', 'VRGR'],
  '5r': ['XPHB', 'XDMG', 'XMM', 'PHB', 'DMG', 'MM', 'XGE', 'TCE', 'FTD', 'AAG', 'AI', 'BMT', 'BGG', 'EGW', 'ERLW', 'FRHoF', 'GGR', 'MOT', 'SCC', 'VRGR'],
};

const SEARCH_2024_SOURCES = new Set(['XPHB', 'XDMG', 'XMM']);

export const getSearchSourcePriority = (ruleSystem: RuleSystem): string[] => SEARCH_SOURCE_PRIORITY[ruleSystem];

export const getSearchSourceRank = (source: string | undefined, ruleSystem: RuleSystem): number => {
  const priority = getSearchSourcePriority(ruleSystem);
  const index = priority.indexOf(source || '');
  return index >= 0 ? index : priority.length;
};

export const isSearchSourceAllowedForRuleSystem = (
  source: string | undefined,
  ruleSystem: RuleSystem,
  explicitSourceFilter = '',
): boolean => {
  if (explicitSourceFilter) return source === explicitSourceFilter;
  if (ruleSystem === '5e' && source && SEARCH_2024_SOURCES.has(source)) return false;
  return true;
};

export const getSearchFeatureSource = (
  feature: Pick<{ sourceName: string; sourceId: string }, 'sourceName' | 'sourceId'>,
): string => {
  const sourceIdParts = feature.sourceId.split(':');
  const sourceFromId = sourceIdParts[sourceIdParts.length - 2];
  if (sourceFromId && /^[A-Za-z0-9-]+$/.test(sourceFromId)) return sourceFromId;
  const sourceMatches = feature.sourceName.match(/\(([^()]+)\)/g) || [];
  const sourceMatch = sourceMatches[sourceMatches.length - 1];
  if (!sourceMatch) return '';
  return sourceMatch.replace(/[()]/g, '').split('·').pop()?.trim() || '';
};
