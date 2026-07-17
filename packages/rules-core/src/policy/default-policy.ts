import type { RuleEntityKind } from '../catalog/identity.js';
import type { RuleCatalog, RuleSystem } from '../catalog/model.js';
import type { RuleAuthorizationPolicy } from './authorization.js';

const raceSourcePriority: Readonly<Record<RuleSystem, readonly string[]>> = {
  '5e': ['PHB', 'MPMM', 'AAG', 'FTD', 'TCE', 'ERLW', 'EFA', 'EGW', 'GGR', 'MOT', 'VRGR', 'WBtW', 'SCC', 'DSotDQ', 'AI', 'EEPC', 'MTF', 'VGM', 'SCAG', 'PSA', 'PSD', 'PSI', 'PSK', 'PSX', 'PSZ', 'LFL', 'RHW'],
  '5r': ['XPHB', 'MPMM', 'PHB', 'AAG', 'FTD', 'TCE', 'ERLW', 'EFA', 'EGW', 'GGR', 'MOT', 'VRGR', 'WBtW', 'SCC', 'DSotDQ', 'AI', 'EEPC', 'MTF', 'VGM', 'SCAG', 'PSA', 'PSD', 'PSI', 'PSK', 'PSX', 'PSZ', 'LFL', 'RHW'],
};

const backgroundSourcePriority: Readonly<Record<RuleSystem, readonly string[]>> = {
  '5e': ['PHB'],
  '5r': ['XPHB', 'PHB'],
};

const subclassSourcePriority: Readonly<Record<RuleSystem, readonly string[]>> = {
  '5e': ['PHB', 'DMG', 'SCAG', 'XGE', 'TCE', 'FTD', 'BGG', 'DSotDQ', 'EGW', 'FRHoF', 'PSA', 'PSK', 'RHW', 'VRGR'],
  '5r': ['XPHB', 'PHB', 'DMG', 'SCAG', 'XGE', 'TCE', 'FTD', 'BGG', 'DSotDQ', 'EGW', 'FRHoF', 'PSA', 'PSK', 'RHW', 'VRGR'],
};

export function createDefaultRuleAuthorizationPolicy(
  catalog: RuleCatalog,
  ruleSystem: RuleSystem,
): RuleAuthorizationPolicy {
  const configured = catalog.rules?.[ruleSystem];
  const classSources = configured?.primarySources ?? [ruleSystem === '5r' ? 'XPHB' : 'PHB'];
  const raceSources = configured?.raceSources ?? raceSourcePriority[ruleSystem];
  const subraceSources = orderedUnique([
    ...raceSources,
    ...catalog.subraces.map(({ source }) => source),
  ]);
  const allowedSources: Partial<Record<RuleEntityKind, readonly string[]>> = {
    class: classSources,
    subclass: subclassSourcePriority[ruleSystem],
    race: raceSources,
    subrace: subraceSources,
    background: backgroundSourcePriority[ruleSystem],
  };
  return {
    allowedSources,
    sourcePriority: {
      class: classSources,
      subclass: subclassSourcePriority[ruleSystem],
      race: raceSources,
      subrace: subraceSources,
      background: backgroundSourcePriority[ruleSystem],
    },
  };
}

function orderedUnique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
