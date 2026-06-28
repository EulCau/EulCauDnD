import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';

const ROOT = process.cwd();

const projectImport = relativePath => path.join(ROOT, relativePath).replaceAll(path.sep, '/');

const entrySource = `
import {
  dedupeSearchResultsByNameAndSource,
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
const duplicateSpellName = Array.from(duplicateSpellNames)[0];
const duplicateSpells = content.spells.filter(spell => (spell.englishName || spell.name) === duplicateSpellName);
const deduped5rSpells = dedupeSearchResultsByNameAndSource(
  duplicateSpells,
  '5r',
  spell => spell.name,
  spell => spell.source,
  spell => spell.englishName,
);
assert(deduped5rSpells.length === 1, '5r spell search dedupe should keep one duplicate spell result');
assert(deduped5rSpells[0].source === 'XPHB', \`5r spell search dedupe should keep XPHB, got \${deduped5rSpells[0].source}\`);
const deduped5eSpells = dedupeSearchResultsByNameAndSource(
  duplicateSpells.filter(spell => isSearchSourceAllowedForRuleSystem(spell.source, '5e')),
  '5e',
  spell => spell.name,
  spell => spell.source,
  spell => spell.englishName,
);
assert(deduped5eSpells.length === 1, '5e spell search dedupe should keep one duplicate spell result');
assert(deduped5eSpells[0].source === 'PHB', \`5e spell search dedupe should keep PHB, got \${deduped5eSpells[0].source}\`);

const hasXdmItem = magicItems.items.some(item => item.source === 'XDMG');
const hasXmmMonster = bestiary.monsters.some(monster => monster.source === 'XMM');
assert(hasXdmItem, 'expected XDMG magic item fixture');
assert(hasXmmMonster, 'expected XMM monster fixture');
const duplicateMagicItemName = magicItems.items
  .find(item => item.source === 'DMG' && magicItems.items.some(candidate => candidate.source === 'XDMG' && (candidate.englishName || candidate.name) === (item.englishName || item.name)))?.englishName
  || 'Synthetic Magic Item';
const deduped5rItems = dedupeSearchResultsByNameAndSource(
  magicItems.items.some(item => (item.englishName || item.name) === duplicateMagicItemName)
    ? magicItems.items.filter(item => (item.englishName || item.name) === duplicateMagicItemName)
    : [
        { name: '合成魔法物品', englishName: duplicateMagicItemName, source: 'DMG' },
        { name: '合成魔法物品', englishName: duplicateMagicItemName, source: 'XDMG' },
      ],
  '5r',
  item => item.name,
  item => item.source,
  item => item.englishName,
);
assert(deduped5rItems.length === 1, '5r item search dedupe should keep one duplicate item result');
assert(deduped5rItems[0].source === 'XDMG', \`5r item search dedupe should keep XDMG, got \${deduped5rItems[0].source}\`);

const duplicateMonsterName = bestiary.monsters
  .find(monster => monster.source === 'MM' && bestiary.monsters.some(candidate => candidate.source === 'XMM' && (candidate.englishName || candidate.name) === (monster.englishName || monster.name)))?.englishName;
assert(duplicateMonsterName, 'expected MM/XMM duplicate monster fixture');
const deduped5rMonsters = dedupeSearchResultsByNameAndSource(
  bestiary.monsters.filter(monster => (monster.englishName || monster.name) === duplicateMonsterName),
  '5r',
  monster => monster.name,
  monster => monster.source,
  monster => monster.englishName,
);
assert(deduped5rMonsters.length === 1, '5r monster search dedupe should keep one duplicate monster result');
assert(deduped5rMonsters[0].source === 'XMM', \`5r monster search dedupe should keep XMM, got \${deduped5rMonsters[0].source}\`);

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
    'same-name search dedupe keeps 5r sources for spells, items, and monsters',
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
