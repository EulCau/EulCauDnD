import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';

const ROOT = process.cwd();

const projectImport = relativePath => path.join(ROOT, relativePath).replaceAll(path.sep, '/');

const entrySource = `
import {
  getMonsterAlignmentOptions,
  getMonsterEnvironmentOptions,
  getMonsterSizeOptions,
  getMonsterTagOptions,
  monsterMatchesStructuredFilters,
} from '${projectImport('utils/searchFilters.ts')}';
import bestiary from '${projectImport('public/data/bestiary-index.json')}';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const monsters = bestiary.monsters;
const sizeOptions = getMonsterSizeOptions(monsters);
const alignmentOptions = getMonsterAlignmentOptions(monsters);
const environmentOptions = getMonsterEnvironmentOptions(monsters);
const tagOptions = getMonsterTagOptions(monsters);

assert(sizeOptions.includes('中型'), 'monster size options should include medium metadata');
assert(sizeOptions.includes('大型'), 'monster size options should include large metadata');
assert(alignmentOptions.includes('无阵营'), 'monster alignment options should include unaligned metadata');
assert(alignmentOptions.includes('混乱 邪恶'), 'monster alignment options should include chaotic evil metadata');
assert(environmentOptions.includes('幽暗地域'), 'monster environment options should include Underdark metadata');
assert(environmentOptions.includes('森林'), 'monster environment options should include forest metadata');
assert(tagOptions.includes('魔法抗性'), 'monster tag options should include Magic Resistance metadata');
assert(tagOptions.includes('传奇抗性'), 'monster tag options should include Legendary Resistance metadata');

const mediumMatches = monsters.filter(monster => monsterMatchesStructuredFilters(monster, {
  size: '中型',
}));
assert(mediumMatches.length > 0, 'medium size filter should match at least one monster');
assert(
  mediumMatches.every(monster => monster.size === '中型'),
  'medium size filter should not include monsters with another size',
);

const unalignedMatches = monsters.filter(monster => monsterMatchesStructuredFilters(monster, {
  alignment: '无阵营',
}));
assert(unalignedMatches.length > 0, 'unaligned filter should match at least one monster');
assert(
  unalignedMatches.every(monster => monster.alignment === '无阵营'),
  'unaligned filter should not include monsters with another alignment',
);

const underdarkMatches = monsters.filter(monster => monsterMatchesStructuredFilters(monster, {
  environment: '幽暗地域',
}));
assert(underdarkMatches.length > 0, 'Underdark environment filter should match at least one monster');
assert(
  underdarkMatches.every(monster => monster.environment.includes('幽暗地域')),
  'Underdark environment filter should not include monsters without Underdark metadata',
);

const magicResistanceMatches = monsters.filter(monster => monsterMatchesStructuredFilters(monster, {
  tag: '魔法抗性',
}));
assert(magicResistanceMatches.length > 0, 'Magic Resistance tag filter should match at least one monster');
assert(
  magicResistanceMatches.every(monster => monster.tags.includes('魔法抗性')),
  'Magic Resistance tag filter should not include monsters without that tag',
);

const combinedMatches = monsters.filter(monster => monsterMatchesStructuredFilters(monster, {
  size: '中型',
  alignment: '混乱 邪恶',
  environment: '幽暗地域',
  tag: '魔法抗性',
}));
assert(combinedMatches.length > 0, 'combined monster structured filter should match fixtures');
assert(
  combinedMatches.every(monster => (
    monster.size === '中型'
    && monster.alignment === '混乱 邪恶'
    && monster.environment.includes('幽暗地域')
    && monster.tags.includes('魔法抗性')
  )),
  'combined monster structured filter should require every selected field',
);

export default {
  sizes: sizeOptions.length,
  alignments: alignmentOptions.length,
  environments: environmentOptions.length,
  tags: tagOptions.length,
  mediumMatches: mediumMatches.length,
  unalignedMatches: unalignedMatches.length,
  underdarkMatches: underdarkMatches.length,
  magicResistanceMatches: magicResistanceMatches.length,
  combinedMatches: combinedMatches.length,
  checks: [
    'monster size options are derived from bestiary metadata',
    'monster alignment options are derived from bestiary metadata',
    'monster environment options are derived from bestiary metadata',
    'monster tag options are derived from bestiary metadata',
    'monster size filter requires matching metadata',
    'monster alignment filter requires matching metadata',
    'monster environment filter requires matching metadata',
    'monster tag filter requires matching metadata',
    'combined monster filters require all selected fields',
    'SearchPanel exposes size, alignment, environment, and tag filter controls',
  ],
};
`;

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'search-filter-audit-'));
const entryPath = path.join(tempDir, 'entry.ts');
const outDir = path.join(tempDir, 'dist');

await fs.writeFile(entryPath, entrySource);
await build({
  logLevel: 'silent',
  configFile: false,
  build: {
    outDir,
    emptyOutDir: true,
    lib: {
      entry: entryPath,
      formats: ['es'],
      fileName: () => 'audit-search-filter-behavior.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },
});

const result = await import(pathToFileURL(path.join(outDir, 'audit-search-filter-behavior.js')).href);

const panelSource = await fs.readFile(path.join(ROOT, 'components/SearchPanel.tsx'), 'utf8');
const assertPanel = (condition, message) => {
  if (!condition) throw new Error(message);
};
assertPanel(panelSource.includes('monsterSizeFilter'), 'SearchPanel should keep monster size filter state');
assertPanel(panelSource.includes('monsterAlignmentFilter'), 'SearchPanel should keep monster alignment filter state');
assertPanel(panelSource.includes('monsterEnvironmentFilter'), 'SearchPanel should keep monster environment filter state');
assertPanel(panelSource.includes('monsterTagFilter'), 'SearchPanel should keep monster tag filter state');
assertPanel(panelSource.includes("t('search.filterMonsterSize')"), 'SearchPanel should render monster size filter label');
assertPanel(panelSource.includes("t('search.filterMonsterAlignment')"), 'SearchPanel should render monster alignment filter label');
assertPanel(panelSource.includes("t('search.filterMonsterEnvironment')"), 'SearchPanel should render monster environment filter label');
assertPanel(panelSource.includes("t('search.filterMonsterTag')"), 'SearchPanel should render monster tag filter label');

console.log(JSON.stringify(result.default, null, 2));
