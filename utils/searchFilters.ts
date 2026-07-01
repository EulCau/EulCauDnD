export type MonsterStructuredFilters = {
  type?: string;
  cr?: string;
  environment?: string;
  tag?: string;
};

export type MonsterFilterable = {
  type?: string;
  cr?: string;
  environment?: string[];
  tags?: string[];
};

const uniqueSorted = (values: Array<string | undefined | null>): string[] => Array.from(new Set(
  values
    .map(value => (value || '').trim())
    .filter(Boolean),
)).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));

export const getMonsterEnvironmentOptions = (monsters: MonsterFilterable[]): string[] => (
  uniqueSorted(monsters.flatMap(monster => monster.environment || []))
);

export const getMonsterTagOptions = (monsters: MonsterFilterable[]): string[] => (
  uniqueSorted(monsters.flatMap(monster => monster.tags || []))
);

export const monsterMatchesStructuredFilters = (
  monster: MonsterFilterable,
  filters: MonsterStructuredFilters,
): boolean => (
  (!filters.type || monster.type === filters.type)
  && (!filters.cr || monster.cr === filters.cr)
  && (!filters.environment || (monster.environment || []).includes(filters.environment))
  && (!filters.tag || (monster.tags || []).includes(filters.tag))
);
