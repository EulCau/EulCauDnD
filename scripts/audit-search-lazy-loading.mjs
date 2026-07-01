import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const app = read('App.tsx');
const searchPanel = read('components/SearchPanel.tsx');

assert(
  !app.includes('loadBestiaryIndex'),
  'App.tsx should not import or call loadBestiaryIndex during app startup',
);
assert(
  !app.includes('setMonsters') && !app.includes('useState<BestiaryMonsterData'),
  'App.tsx should not keep bestiary monster state',
);
assert(
  searchPanel.includes("import { loadBestiaryIndex, loadBestiaryMonsterDetail } from '../utils/bestiary';"),
  'SearchPanel should own bestiary loading',
);
assert(
  searchPanel.includes('shouldLoadMonsters'),
  'SearchPanel should gate bestiary loading behind an explicit trigger',
);
assert(
  searchPanel.includes("activeTab === 'monsters'") && searchPanel.includes("activeTab === 'all' && shouldShowResults"),
  'SearchPanel should load monsters when the monster tab is opened or all-tab search needs results',
);
assert(
  searchPanel.includes('hasRequestedMonsters'),
  'SearchPanel should request the bestiary at most once per panel lifecycle',
);
assert(
  searchPanel.includes('loadBestiaryMonsterDetail') && searchPanel.includes('loadingMonsterDetails'),
  'SearchPanel should load monster statblock details on demand',
);

console.log(JSON.stringify({
  checks: [
    'App startup does not load bestiary index',
    'SearchPanel owns bestiary loading',
    'SearchPanel loads monsters on monster tab or all-tab search',
    'SearchPanel requests bestiary at most once per panel lifecycle',
    'SearchPanel loads monster statblock details on demand',
  ],
}, null, 2));
