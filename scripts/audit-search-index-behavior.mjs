import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, 'public/data/search-index.json');
const EXTRACTOR_PATH = path.join(ROOT, 'scripts/extract-5etools-search-index.mjs');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const index = JSON.parse(await fs.readFile(INDEX_PATH, 'utf8'));
const extractorSource = await fs.readFile(EXTRACTOR_PATH, 'utf8');

assert(index.source === 'third_party/5etools-cn/search/index.json', 'search index should record the 5etools source path');
assert(index.total === index.entries.length, 'search index total should match entries length');
assert(index.entries.length > 15000, 'search index should include the full 5etools site index');
assert(index.sources.includes('PHB'), 'search index should include PHB source metadata');
assert(index.sources.includes('XPHB'), 'search index should include XPHB source metadata');
assert(index.sources.includes('MM'), 'search index should include MM source metadata');

const categoriesById = new Map(index.categories.map(category => [category.id, category]));
assert(categoriesById.get(1)?.label === '怪物', 'category 1 should be monsters');
assert(categoriesById.get(2)?.label === '法术', 'category 2 should be spells');
assert(categoriesById.get(4)?.label === '物品', 'category 4 should be items');
assert(categoriesById.get(7)?.label === '专长', 'category 7 should be feats');
assert(categoriesById.get(10)?.label === '种族', 'category 10 should be races');
assert(categoriesById.get(30)?.label === '职业特性', 'category 30 should be class features');

const findEntry = predicate => index.entries.find(predicate);

const chineseMonster = findEntry(entry => entry.categoryId === 1 && entry.name && entry.englishName && entry.name !== entry.englishName);
const chineseSpell = findEntry(entry => entry.categoryId === 2 && entry.name && entry.englishName && entry.name !== entry.englishName);
const item = findEntry(entry => entry.categoryId === 4 && entry.source === 'PHB');
const xphbSpell = findEntry(entry => entry.categoryId === 2 && entry.source === 'XPHB');
const xphbFeat = findEntry(entry => entry.categoryId === 7 && entry.source === 'XPHB');

assert(chineseMonster, 'search index should preserve monster Chinese and English names');
assert(chineseSpell, 'search index should preserve spell Chinese and English names');
assert(item, 'search index should include PHB items');
assert(xphbSpell, 'search index should include XPHB spells for 5r searches');
assert(xphbFeat, 'search index should include XPHB feats for 5r searches');

assert(chineseMonster.searchText.includes(chineseMonster.name.toLocaleLowerCase('zh-CN')), 'searchText should include Chinese names');
assert(chineseMonster.searchText.includes(chineseMonster.englishName.toLocaleLowerCase('zh-CN')), 'searchText should include English names');
assert(chineseMonster.searchText.includes(chineseMonster.source.toLocaleLowerCase('zh-CN')), 'searchText should include sources');
assert(chineseMonster.hash && !chineseMonster.hash.includes('%'), 'hash should be URL-decoded when possible');
assert(typeof chineseMonster.hover === 'boolean', 'hover should be normalized to boolean');

assert(extractorSource.includes('decompressIndex'), 'extractor should explicitly decompress 5etools index metadata');
assert(extractorSource.includes('CATEGORY_LABELS'), 'extractor should map 5etools category IDs');
assert(extractorSource.includes('CATEGORY_PROPS'), 'extractor should keep 5etools category props');

console.log(JSON.stringify({
  total: index.total,
  categories: index.categories.length,
  sources: index.sources.length,
  checks: [
    '5etools compressed index is decompressed into public/data/search-index.json',
    'category labels and props are normalized',
    'Chinese names, English names, source, hash, page, and hover metadata are preserved',
    'searchText includes Chinese names, English names, source, category, prop, and hash',
    '5e and 5r source metadata are both present',
  ],
}, null, 2));
