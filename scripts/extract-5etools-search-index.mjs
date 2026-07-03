import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, 'third_party/5etools-cn/search/index.json');
const OUTPUT_PATH = path.join(ROOT, 'public/data/search-index.json');

const CATEGORY_LABELS = new Map([
  [1, '怪物'],
  [2, '法术'],
  [3, '背景'],
  [4, '物品'],
  [5, '职业'],
  [6, '状态'],
  [7, '专长'],
  [8, '魔能祈唤'],
  [9, '灵能'],
  [10, '种族'],
  [11, '其他奖励'],
  [12, '变体/可选规则'],
  [13, '冒险'],
  [14, '神祇'],
  [15, '物件'],
  [16, '陷阱'],
  [17, '危险'],
  [18, '快速参考 (5e/2014)'],
  [19, '异教'],
  [20, '恩惠'],
  [21, '疾病'],
  [22, '超魔法'],
  [23, '战技；战斗大师'],
  [24, '表格'],
  [25, '表格'],
  [26, '战技；骑兵'],
  [27, '秘法射击'],
  [28, '可选特性'],
  [29, '战斗风格'],
  [30, '职业特性'],
  [31, '载具'],
  [32, '契约恩赐'],
  [33, '四象法门'],
  [34, '注法'],
  [35, '船只升级'],
  [36, '炼狱战争机器升级'],
  [37, '符文骑士符文'],
  [38, '炼金师公式'],
  [39, '战技'],
  [40, '子职'],
  [41, '子职特性'],
  [42, '动作'],
  [43, '语言'],
  [44, '书籍'],
  [45, '页面'],
  [46, '传奇组'],
  [47, '角色创建选项'],
  [48, '食谱'],
  [49, '状态'],
  [50, '技能'],
  [51, '视野'],
  [52, '牌组'],
  [53, '卡牌'],
  [54, '物品专精'],
  [55, '据点'],
  [56, '载具升级'],
  [57, '手工艺品'],
]);

const CATEGORY_PROPS = new Map([
  [1, 'monster'],
  [2, 'spell'],
  [3, 'background'],
  [4, 'item'],
  [5, 'class'],
  [6, 'condition'],
  [7, 'feat'],
  [8, 'optionalfeature'],
  [9, 'psionic'],
  [10, 'race'],
  [11, 'reward'],
  [12, 'variantrule'],
  [13, 'adventure'],
  [14, 'deity'],
  [15, 'object'],
  [16, 'trap'],
  [17, 'hazard'],
  [19, 'cult'],
  [20, 'boon'],
  [21, 'condition'],
  [22, 'optionalfeature'],
  [23, 'optionalfeature'],
  [24, 'table'],
  [25, 'tableGroup'],
  [26, 'optionalfeature'],
  [27, 'optionalfeature'],
  [28, 'optionalfeature'],
  [29, 'optionalfeature'],
  [30, 'classFeature'],
  [31, 'vehicle'],
  [32, 'optionalfeature'],
  [33, 'optionalfeature'],
  [34, 'optionalfeature'],
  [35, 'vehicleUpgrade'],
  [36, 'vehicleUpgrade'],
  [37, 'optionalfeature'],
  [38, 'optionalfeature'],
  [39, 'optionalfeature'],
  [40, 'subclass'],
  [41, 'subclassFeature'],
  [42, 'action'],
  [43, 'language'],
  [44, 'book'],
  [46, 'legendaryGroup'],
  [47, 'charoption'],
  [48, 'recipe'],
  [49, 'status'],
  [50, 'skill'],
  [51, 'sense'],
  [52, 'deck'],
  [53, 'card'],
  [54, 'itemMastery'],
  [55, 'facility'],
  [56, 'vehicleUpgrade'],
  [57, 'crochetPattern'],
]);

const decodeHash = hash => {
  if (!hash) return '';
  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
};

const decompressIndex = indexGroup => {
  const { x: index, m: metadata } = indexGroup;
  const compressedProps = new Set();
  const lookups = {};

  Object.keys(metadata).forEach(prop => {
    compressedProps.add(prop);
    Object.entries(metadata[prop]).forEach(([rawValue, compressedValue]) => {
      lookups[prop] = lookups[prop] || {};
      lookups[prop][compressedValue] = rawValue;
    });
  });

  return index.map(entry => {
    const out = { ...entry };
    Object.keys(out)
      .filter(prop => compressedProps.has(prop))
      .forEach(prop => {
        out[prop] = lookups[prop][out[prop]] ?? out[prop];
      });
    return out;
  });
};

const normalizeEntry = entry => {
  const categoryId = Number(entry.c);
  const category = CATEGORY_LABELS.get(categoryId) ?? `分类 ${categoryId}`;
  const prop = CATEGORY_PROPS.get(categoryId) ?? null;
  const name = entry.cn || entry.n || '';
  const englishName = entry.n || '';
  const source = entry.s || '';
  const hash = decodeHash(entry.u || '');
  const searchText = [
    name,
    englishName,
    source,
    category,
    prop,
    hash,
    entry.q,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('zh-CN');

  return {
    id: entry.id,
    categoryId,
    category,
    prop,
    name,
    englishName,
    source,
    hash,
    page: entry.p ?? null,
    sitePage: entry.q ?? null,
    hover: Boolean(entry.h),
    searchText,
  };
};

const raw = JSON.parse(await fs.readFile(SOURCE_PATH, 'utf8'));
const sourceStat = await fs.stat(SOURCE_PATH);
const entries = decompressIndex(raw).map(normalizeEntry);

const sources = [...new Set(entries.map(entry => entry.source).filter(Boolean))].sort((a, b) => a.localeCompare(b));
const categories = [...CATEGORY_LABELS.entries()]
  .map(([id, label]) => ({
    id,
    label,
    prop: CATEGORY_PROPS.get(id) ?? null,
    count: entries.filter(entry => entry.categoryId === id).length,
  }))
  .filter(category => category.count > 0);

const payload = {
  generatedAt: sourceStat.mtime.toISOString(),
  source: path.relative(ROOT, SOURCE_PATH),
  total: entries.length,
  sources,
  categories,
  entries,
};

await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload)}\n`);

console.log(JSON.stringify({
  output: path.relative(ROOT, OUTPUT_PATH),
  total: payload.total,
  categories: payload.categories.length,
  sources: payload.sources.length,
}, null, 2));
