export interface SiteSearchEntry {
  id: number;
  categoryId: number;
  category: string;
  prop: string | null;
  name: string;
  englishName: string;
  source: string;
  hash: string;
  page: number | null;
  sitePage: string | null;
  hover: boolean;
  searchText: string;
}

export interface SiteSearchCategory {
  id: number;
  label: string;
  prop: string | null;
  count: number;
}

export interface SiteSearchIndexContent {
  generatedAt: string;
  source: string;
  total: number;
  sources: string[];
  categories: SiteSearchCategory[];
  entries: SiteSearchEntry[];
}

let cachePromise: Promise<SiteSearchIndexContent> | null = null;

export const loadSiteSearchIndex = async (): Promise<SiteSearchIndexContent> => {
  if (cachePromise) return cachePromise;
  cachePromise = (async () => {
    const response = await fetch('./data/search-index.json');
    if (!response.ok) throw new Error(`Failed to load site search index: ${response.status}`);
    return response.json();
  })();
  return cachePromise;
};
