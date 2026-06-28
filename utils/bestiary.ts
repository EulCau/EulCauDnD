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
}

export interface BestiaryIndexContent {
  generatedAt: string;
  total: number;
  sources: Record<string, number>;
  monsters: BestiaryMonsterData[];
}

let cachePromise: Promise<BestiaryIndexContent> | null = null;

export const loadBestiaryIndex = async (): Promise<BestiaryIndexContent> => {
  if (cachePromise) return cachePromise;
  cachePromise = (async () => {
    const response = await fetch('./data/bestiary-index.json');
    if (!response.ok) throw new Error(`Failed to load bestiary index: ${response.status}`);
    return response.json();
  })();
  return cachePromise;
};
