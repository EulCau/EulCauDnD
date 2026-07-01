export interface BestiaryMonsterData {
  id: string;
  name: string;
  englishName?: string;
  source: string;
  size: string;
  type: string;
  alignment: string;
  cr: string;
  crNumber: number | null;
  ac: string;
  acValue: number | null;
  hp: number | null;
  hpFormula: string;
  speed: string;
  environment: string[];
  tags: string[];
  searchText?: string;
  detailId?: string;
  statblock?: BestiaryMonsterStatblock;
}

export interface BestiaryStatblockEntry {
  name: string;
  englishName?: string;
  entries: string;
}

export interface BestiaryMonsterStatblock {
  abilities?: Record<string, string>;
  saves?: string;
  skills?: string;
  senses?: string;
  passive?: number | null;
  languages?: string;
  traits?: BestiaryStatblockEntry[];
  spellcasting?: BestiaryStatblockEntry[];
  actions?: BestiaryStatblockEntry[];
  bonusActions?: BestiaryStatblockEntry[];
  reactions?: BestiaryStatblockEntry[];
  legendaryActions?: BestiaryStatblockEntry[];
}

export interface BestiaryIndexContent {
  generatedAt: string;
  total: number;
  sources: Record<string, number>;
  monsters: BestiaryMonsterData[];
}

export interface BestiaryMonsterDetail {
  id: string;
  statblock: BestiaryMonsterStatblock;
}

interface BestiaryDetailsContent {
  generatedAt: string;
  total: number;
  monsters: Record<string, BestiaryMonsterDetail>;
}

let cachePromise: Promise<BestiaryIndexContent> | null = null;
let detailsCachePromise: Promise<BestiaryDetailsContent> | null = null;

export const loadBestiaryIndex = async (): Promise<BestiaryIndexContent> => {
  if (cachePromise) return cachePromise;
  cachePromise = (async () => {
    const response = await fetch('./data/bestiary-index.json');
    if (!response.ok) throw new Error(`Failed to load bestiary index: ${response.status}`);
    return response.json();
  })();
  return cachePromise;
};

const loadBestiaryDetails = async (): Promise<BestiaryDetailsContent> => {
  if (detailsCachePromise) return detailsCachePromise;
  detailsCachePromise = (async () => {
    const response = await fetch('./data/bestiary-details.json');
    if (!response.ok) throw new Error(`Failed to load bestiary details: ${response.status}`);
    return response.json();
  })();
  return detailsCachePromise;
};

export const loadBestiaryMonsterDetail = async (id: string): Promise<BestiaryMonsterDetail | null> => {
  const details = await loadBestiaryDetails();
  return details.monsters[id] || null;
};
