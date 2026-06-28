import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';

const ROOT = process.cwd();

const projectImport = relativePath => path.join(ROOT, relativePath).replaceAll(path.sep, '/');

const entrySource = `
import {
  getAutoBuilderBackgrounds,
  getAutoBuilderClass,
  getAutoBuilderSubclasses,
} from '${projectImport('utils/autoBuilderRules.ts')}';
import content from '${projectImport('public/data/auto-builder-core.json')}';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const normalize = value => String(value || '').toLowerCase();
const assertNoDuplicateNames = (items, label) => {
  const seen = new Set();
  for (const item of items) {
    const key = normalize(item.englishName || item.key || item.name);
    assert(!seen.has(key), \`\${label} contains duplicate option \${key}\`);
    seen.add(key);
  }
};

const backgrounds5e = getAutoBuilderBackgrounds(content, '5e');
const backgrounds5r = getAutoBuilderBackgrounds(content, '5r');
assertNoDuplicateNames(backgrounds5e, '5e backgrounds');
assertNoDuplicateNames(backgrounds5r, '5r backgrounds');
assert(backgrounds5e.every(background => background.source !== 'XPHB'), '5e backgrounds should not include XPHB');
assert(
  backgrounds5r.find(background => background.englishName === 'Acolyte')?.source === 'XPHB',
  '5r should prefer XPHB Acolyte background',
);
assert(
  backgrounds5r.some(background => background.source === 'PHB'),
  '5r backgrounds should still include PHB-only backgrounds',
);

const fighter5e = getAutoBuilderClass(content, 'Fighter', '5e');
const fighter5r = getAutoBuilderClass(content, 'Fighter', '5r');
assert(fighter5e, 'missing 5e Fighter');
assert(fighter5r, 'missing 5r Fighter');
const fighterSubclasses5e = getAutoBuilderSubclasses(content, fighter5e);
const fighterSubclasses5r = getAutoBuilderSubclasses(content, fighter5r);
assertNoDuplicateNames(fighterSubclasses5e, '5e Fighter subclasses');
assertNoDuplicateNames(fighterSubclasses5r, '5r Fighter subclasses');
assert(
  fighterSubclasses5e.every(subclass => subclass.source !== 'XPHB'),
  '5e Fighter subclasses should not include XPHB',
);
assert(
  fighterSubclasses5r.find(subclass => subclass.englishName === 'Battle Master')?.source === 'XPHB',
  '5r Fighter should prefer XPHB Battle Master',
);
assert(
  fighterSubclasses5r.some(subclass => subclass.source === 'XGE'),
  '5r Fighter subclasses should keep 5e-era extension subclasses',
);

export default {
  backgrounds5e: backgrounds5e.length,
  backgrounds5r: backgrounds5r.length,
  fighterSubclasses5e: fighterSubclasses5e.length,
  fighterSubclasses5r: fighterSubclasses5r.length,
  battleMaster5r: fighterSubclasses5r.find(subclass => subclass.englishName === 'Battle Master')?.source,
};
`;

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'source-priority-audit-'));
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
      fileName: () => 'audit-source-priority.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },
});

const result = await import(pathToFileURL(path.join(outDir, 'audit-source-priority.js')).href);

console.log(JSON.stringify({
  ...result.default,
  checks: [
    '5e backgrounds exclude XPHB and have no duplicate names',
    '5r backgrounds prefer XPHB but keep PHB-only backgrounds',
    '5e subclasses exclude XPHB and have no duplicate names',
    '5r subclasses prefer XPHB but keep 5e-era extension subclasses',
  ],
}, null, 2));
