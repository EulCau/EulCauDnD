import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';

const ROOT = process.cwd();

const projectImport = relativePath => path.join(ROOT, relativePath).replaceAll(path.sep, '/');

const entrySource = `
import {
  getSearchFeatureSource,
  getSearchSourceRank,
  isSearchSourceAllowedForRuleSystem,
} from '${projectImport('utils/searchSourceRules.ts')}';
import content from '${projectImport('public/data/auto-builder-core.json')}';
import magicItems from '${projectImport('public/data/magic-items.json')}';
import bestiary from '${projectImport('public/data/bestiary-index.json')}';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(isSearchSourceAllowedForRuleSystem('PHB', '5e'), '5e search should allow PHB');
assert(isSearchSourceAllowedForRuleSystem('XGE', '5e'), '5e search should allow 5e-era extensions');
assert(!isSearchSourceAllowedForRuleSystem('XPHB', '5e'), '5e search should exclude XPHB by default');
assert(!isSearchSourceAllowedForRuleSystem('XDMG', '5e'), '5e search should exclude XDMG by default');
assert(!isSearchSourceAllowedForRuleSystem('XMM', '5e'), '5e search should exclude XMM by default');
assert(isSearchSourceAllowedForRuleSystem('XPHB', '5e', 'XPHB'), 'explicit source filter should allow XPHB in 5e search');
assert(isSearchSourceAllowedForRuleSystem('XPHB', '5r'), '5r search should allow XPHB');
assert(isSearchSourceAllowedForRuleSystem('PHB', '5r'), '5r search should still allow PHB');

assert(getSearchSourceRank('XPHB', '5r') < getSearchSourceRank('PHB', '5r'), '5r search should rank XPHB before PHB');
assert(getSearchSourceRank('XDMG', '5r') < getSearchSourceRank('DMG', '5r'), '5r search should rank XDMG before DMG');
assert(getSearchSourceRank('XMM', '5r') < getSearchSourceRank('MM', '5r'), '5r search should rank XMM before MM');
assert(getSearchSourceRank('PHB', '5e') < getSearchSourceRank('XGE', '5e'), '5e search should rank PHB before XGE');

const duplicateSpellNames = new Set(
  content.spells
    .filter(spell => spell.source === 'PHB')
    .map(spell => spell.englishName || spell.name)
    .filter(name => content.spells.some(spell => spell.source === 'XPHB' && (spell.englishName || spell.name) === name)),
);
assert(duplicateSpellNames.size > 0, 'expected PHB/XPHB duplicate spell fixtures');

const hasXdmItem = magicItems.items.some(item => item.source === 'XDMG');
const hasXmmMonster = bestiary.monsters.some(monster => monster.source === 'XMM');
assert(hasXdmItem, 'expected XDMG magic item fixture');
assert(hasXmmMonster, 'expected XMM monster fixture');

assert(
  getSearchFeatureSource({ sourceId: 'class:Wizard:PHB:L1', sourceName: '法师 L1 (PHB)' }) === 'PHB',
  'feature source parser should read class source ids',
);
assert(
  getSearchFeatureSource({ sourceId: 'subclass:Fighter|XPHB|Battle Master|XPHB:XPHB:L3', sourceName: '战斗大师 (战士 · XPHB) L3' }) === 'XPHB',
  'feature source parser should read subclass source ids',
);

export default {
  duplicateSpellFixtures: duplicateSpellNames.size,
  checks: [
    '5e search excludes 2024 sources by default',
    'explicit source filter can still select a 2024 source',
    '5r search ranks XPHB/XDMG/XMM before PHB/DMG/MM',
    'feature source parsing supports class and subclass source ids',
  ],
};
`;

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'search-source-audit-'));
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
      fileName: () => 'audit-search-source-behavior.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },
});

const result = await import(pathToFileURL(path.join(outDir, 'audit-search-source-behavior.js')).href);

console.log(JSON.stringify(result.default, null, 2));
