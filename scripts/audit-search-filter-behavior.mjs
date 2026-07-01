import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';

const ROOT = process.cwd();

const projectImport = relativePath => path.join(ROOT, relativePath).replaceAll(path.sep, '/');

const entrySource = `
import {
  getMonsterEnvironmentOptions,
  getMonsterTagOptions,
  monsterMatchesStructuredFilters,
} from '${projectImport('utils/searchFilters.ts')}';
import bestiary from '${projectImport('public/data/bestiary-index.json')}';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const monsters = bestiary.monsters;
const environmentOptions = getMonsterEnvironmentOptions(monsters);
const tagOptions = getMonsterTagOptions(monsters);

assert(environmentOptions.includes('幽暗地域'), 'monster environment options should include Underdark metadata');
assert(environmentOptions.includes('森林'), 'monster environment options should include forest metadata');
assert(tagOptions.includes('魔法抗性'), 'monster tag options should include Magic Resistance metadata');
assert(tagOptions.includes('传奇抗性'), 'monster tag options should include Legendary Resistance metadata');

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
  environment: '幽暗地域',
  tag: '魔法抗性',
}));
assert(combinedMatches.length > 0, 'combined monster environment and tag filter should match fixtures');
assert(
  combinedMatches.every(monster => monster.environment.includes('幽暗地域') && monster.tags.includes('魔法抗性')),
  'combined monster environment and tag filter should require both fields',
);

export default {
  environments: environmentOptions.length,
  tags: tagOptions.length,
  underdarkMatches: underdarkMatches.length,
  magicResistanceMatches: magicResistanceMatches.length,
  combinedMatches: combinedMatches.length,
  checks: [
    'monster environment options are derived from bestiary metadata',
    'monster tag options are derived from bestiary metadata',
    'monster environment filter requires matching metadata',
    'monster tag filter requires matching metadata',
    'combined monster filters require all selected fields',
    'SearchPanel exposes environment and tag filter controls',
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
assertPanel(panelSource.includes('monsterEnvironmentFilter'), 'SearchPanel should keep monster environment filter state');
assertPanel(panelSource.includes('monsterTagFilter'), 'SearchPanel should keep monster tag filter state');
assertPanel(panelSource.includes("t('search.filterMonsterEnvironment')"), 'SearchPanel should render monster environment filter label');
assertPanel(panelSource.includes("t('search.filterMonsterTag')"), 'SearchPanel should render monster tag filter label');

console.log(JSON.stringify(result.default, null, 2));
