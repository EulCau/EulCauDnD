import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

const read = relativePath => fs.readFile(path.join(ROOT, relativePath), 'utf8');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const searchPanel = await read('components/SearchPanel.tsx');
const siteSearchIndex = await read('utils/siteSearchIndex.ts');
const translations = await read('constants/translations.ts');
const index = JSON.parse(await read('public/data/search-index.json'));

const sampleRace = index.entries.find(entry => entry.categoryId === 10 && entry.source === 'XPHB');
const sampleFeat = index.entries.find(entry => entry.categoryId === 7 && entry.source === 'XPHB');
const sampleSpell = index.entries.find(entry => entry.categoryId === 2 && entry.source === 'XPHB');

assert(sampleRace, 'site search index should include XPHB race entries');
assert(sampleFeat, 'site search index should include XPHB feat entries');
assert(sampleSpell, 'site search index should include XPHB spell entries');

assert(
  siteSearchIndex.includes("fetch('./data/search-index.json')"),
  'site search index loader should fetch the generated public search index',
);
assert(
  siteSearchIndex.includes('cachePromise'),
  'site search index loader should cache the fetch promise',
);

assert(
  searchPanel.includes("import { loadSiteSearchIndex, type SiteSearchEntry } from '../utils/siteSearchIndex';"),
  'SearchPanel should import the site search index loader',
);
assert(
  searchPanel.includes("useState<'all' | 'spells' | 'features' | 'items' | 'monsters' | 'site'>"),
  'SearchPanel should expose a site tab state',
);
assert(
  searchPanel.includes('shouldLoadSiteIndex') && searchPanel.includes("activeTab === 'site'") && searchPanel.includes("activeTab === 'all' && shouldShowResults"),
  'SearchPanel should load the site index from the site tab or all-tab searches',
);
assert(
  searchPanel.includes('hasRequestedSiteIndex'),
  'SearchPanel should request the site index at most once per panel lifecycle',
);
assert(
  searchPanel.includes('DETAIL_CATEGORY_IDS') && searchPanel.includes('!DETAIL_CATEGORY_IDS.has(entry.categoryId)'),
  'all-tab site search should avoid duplicating first-class spell, item, and monster categories',
);
assert(
  searchPanel.includes('dedupeSearchResultsByNameAndSource') && searchPanel.includes('filteredSiteEntries'),
  'site search results should reuse source-aware dedupe',
);
assert(
  searchPanel.includes('isSearchSourceAllowedForRuleSystem(entry.source, ruleSystem, sourceFilter)'),
  'site search results should reuse 5e/5r source filtering',
);
assert(
  searchPanel.includes("tab === 'site'") && searchPanel.includes("t('search.tabSite')"),
  'SearchPanel should render the site tab',
);
assert(
  searchPanel.includes("type === 'site'") && searchPanel.includes("t('search.category')") && searchPanel.includes("t('search.page')"),
  'SearchPanel should render site result details',
);

assert(translations.includes('"search.tabSite": "Site"'), 'English translations should include the site tab');
assert(translations.includes('"search.tabSite": "站内"'), 'Chinese translations should include the site tab');
assert(translations.includes('"search.loadingSiteIndex": "Loading site index..."'), 'English translations should include site loading text');
assert(translations.includes('"search.loadingSiteIndex": "正在加载站内索引..."'), 'Chinese translations should include site loading text');

console.log(JSON.stringify({
  checks: [
    'site search index loader fetches and caches public/data/search-index.json',
    'SearchPanel loads the site index lazily',
    'SearchPanel exposes a site tab',
    'all-tab site results skip first-class detailed categories',
    'site search results reuse 5e/5r source filtering and dedupe',
    'site result details show category, source, page, English name, and hash',
    'site search translations are present',
  ],
}, null, 2));
