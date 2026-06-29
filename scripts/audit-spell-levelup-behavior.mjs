import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';

const ROOT = process.cwd();

const projectImport = relativePath => path.join(ROOT, relativePath).replaceAll(path.sep, '/');

const entrySource = `
import { INITIAL_CHARACTER } from '${projectImport('types.ts')}';
import {
  buildLevelOneCharacter,
  buildLevelUpCharacter,
  getSpellChoiceState,
} from '${projectImport('utils/autoBuilderRules.ts')}';
import content from '${projectImport('public/data/auto-builder-core.json')}';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const getClass = (key, source) => {
  const cls = content.classes.find(item => item.key === key && item.source === source);
  assert(cls, \`missing class \${key}|\${source}\`);
  return cls;
};

const getOrigin = (items, key, source) => {
  const item = items.find(entry => entry.key === key && entry.source === source);
  assert(item, \`missing origin \${key}|\${source}\`);
  return item;
};

const getProfile = (character, key, source) => {
  const id = \`auto-\${key.toLowerCase()}-\${source.toLowerCase()}-spellcasting\`;
  const profile = character.spellcastingProfiles.find(item => item.id === id);
  assert(profile, \`missing spellcasting profile \${id}\`);
  return profile;
};

const baseOptions = {
  ruleSystem: '5e',
  race: getOrigin(content.races, 'Human', 'PHB'),
  background: getOrigin(content.backgrounds, 'Acolyte', 'PHB'),
  skillChoices: [],
};

const chooseFirst = (items, count, exclude = new Set()) => items
  .filter(item => !exclude.has(item.id))
  .slice(0, count)
  .map(item => item.id);

const chooseSpellState = (state, existingIds = new Set()) => {
  const fixedIds = new Set(state.fixedLeveledGroups.flatMap(group => group.options.map(spell => spell.id)));
  const cantrips = chooseFirst(state.cantrips, state.needed.cantrips, existingIds);
  const regularLeveled = chooseFirst(
    state.leveled.filter(spell => !fixedIds.has(spell.id)),
    state.needed.leveled,
    existingIds,
  );
  const fixedLeveled = state.fixedLeveledGroups.flatMap(group => {
    const needed = Math.max(0, group.count - group.selected);
    return chooseFirst(group.options, needed, existingIds);
  });
  return { cantrips, leveled: [...regularLeveled, ...fixedLeveled] };
};

const getWizardSpellLevelCount = (character, spellLevel) => (
  getProfile(character, 'Wizard', 'PHB').spells.filter(spell => spell.level === spellLevel).length
);

const wizard = getClass('Wizard', 'PHB');
let wizardState = getSpellChoiceState(content, wizard, 1);
assert(wizardState.needed.cantrips === 3, \`PHB Wizard level 1 should need 3 cantrips, got \${wizardState.needed.cantrips}\`);
assert(wizardState.needed.leveled === 6, \`PHB Wizard level 1 should require 6 spellbook spells, got \${wizardState.needed.leveled}\`);
assert(wizardState.fixedLeveledGroups.length === 0, \`PHB Wizard should use spellbook choices rather than fixed spell-level groups, got \${wizardState.fixedLeveledGroups.length}\`);

let wizardCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, wizard, {
  ...baseOptions,
  spellChoices: chooseSpellState(wizardState),
});
assert(getWizardSpellLevelCount(wizardCharacter, 1) === 6, \`PHB Wizard level 1 should learn 6 level-1 spells, got \${getWizardSpellLevelCount(wizardCharacter, 1)}\`);

wizardState = getSpellChoiceState(content, wizard, 2, getProfile(wizardCharacter, 'Wizard', 'PHB').spells);
assert(wizardState.needed.leveled === 2, \`PHB Wizard level 2 should require 2 new spellbook spells, got \${wizardState.needed.leveled}\`);
wizardCharacter = buildLevelUpCharacter(wizardCharacter, content, wizard, {
  ruleSystem: '5e',
  spellChoices: chooseSpellState(wizardState, new Set(getProfile(wizardCharacter, 'Wizard', 'PHB').spells.map(spell => spell.id))),
});
assert(getWizardSpellLevelCount(wizardCharacter, 1) === 8, \`PHB Wizard level 2 should have 8 level-1 spellbook spells, got \${getWizardSpellLevelCount(wizardCharacter, 1)}\`);

wizardState = getSpellChoiceState(content, wizard, 3, getProfile(wizardCharacter, 'Wizard', 'PHB').spells);
assert(wizardState.needed.leveled === 2, \`PHB Wizard level 3 should require 2 new spellbook spells, got \${wizardState.needed.leveled}\`);
const existingWizardIds = new Set(getProfile(wizardCharacter, 'Wizard', 'PHB').spells.map(spell => spell.id));
const wizardLevelThreeChoices = {
  cantrips: [],
  leveled: chooseFirst(wizardState.leveled.filter(spell => spell.level === 2), 2, existingWizardIds),
};
assert(wizardLevelThreeChoices.leveled.length === 2, 'PHB Wizard level 3 should offer at least two level-2 spellbook options');
wizardCharacter = buildLevelUpCharacter(wizardCharacter, content, wizard, {
  ruleSystem: '5e',
  spellChoices: wizardLevelThreeChoices,
});
assert(getWizardSpellLevelCount(wizardCharacter, 2) === 2, \`PHB Wizard level 3 should add 2 level-2 spellbook spells, got \${getWizardSpellLevelCount(wizardCharacter, 2)}\`);

const sorcerer = getClass('Sorcerer', 'PHB');
let sorcererState = getSpellChoiceState(content, sorcerer, 1);
let sorcererCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, sorcerer, {
  ...baseOptions,
  spellChoices: chooseSpellState(sorcererState),
});
let sorcererProfile = getProfile(sorcererCharacter, 'Sorcerer', 'PHB');
assert(sorcererProfile.spells.filter(spell => spell.level > 0).length === 2, \`PHB Sorcerer level 1 should know 2 leveled spells, got \${sorcererProfile.spells.filter(spell => spell.level > 0).length}\`);
sorcererState = getSpellChoiceState(content, sorcerer, 2, sorcererProfile.spells);
assert(sorcererState.needed.leveled === 1, \`PHB Sorcerer level 2 should require 1 new leveled spell, got \${sorcererState.needed.leveled}\`);
const sorcererChoices = chooseSpellState(sorcererState, new Set(sorcererProfile.spells.map(spell => spell.id)));
sorcererCharacter = buildLevelUpCharacter(sorcererCharacter, content, sorcerer, {
  ruleSystem: '5e',
  spellChoices: sorcererChoices,
});
sorcererProfile = getProfile(sorcererCharacter, 'Sorcerer', 'PHB');
assert(sorcererProfile.spells.filter(spell => spell.level > 0).length === 3, \`PHB Sorcerer level 2 should know 3 leveled spells, got \${sorcererProfile.spells.filter(spell => spell.level > 0).length}\`);
assert(sorcererProfile.spells.filter(spell => spell.level > 0).every(spell => spell.prepared === true), 'PHB Sorcerer known spells should be prepared');

const cleric = getClass('Cleric', 'PHB');
let clericState = getSpellChoiceState(content, cleric, 1);
let clericCharacter = buildLevelOneCharacter(INITIAL_CHARACTER, content, cleric, {
  ...baseOptions,
  spellChoices: chooseSpellState(clericState),
});
let clericProfile = getProfile(clericCharacter, 'Cleric', 'PHB');
const clericLevelOneLeveled = clericProfile.spells.filter(spell => spell.level > 0).length;
assert(clericProfile.preparationMode === 'preparedAll', \`PHB Cleric should be preparedAll, got \${clericProfile.preparationMode}\`);
assert(clericLevelOneLeveled > 3, \`PHB Cleric level 1 should include the full level-1 spell list, got \${clericLevelOneLeveled}\`);
assert(clericProfile.spells.filter(spell => spell.level > 0).every(spell => spell.prepared === false), 'ordinary PHB Cleric prepared-all spells should not be auto-prepared');
clericState = getSpellChoiceState(content, cleric, 2, clericProfile.spells);
assert(clericState.isPreparedAll && clericState.needed.leveled === 0, 'PHB Cleric level 2 should not require leveled spell choices');
clericCharacter = buildLevelUpCharacter(clericCharacter, content, cleric, {
  ruleSystem: '5e',
  spellChoices: chooseSpellState(clericState, new Set(clericProfile.spells.map(spell => spell.id))),
});
clericProfile = getProfile(clericCharacter, 'Cleric', 'PHB');
assert(clericProfile.spells.filter(spell => spell.level > 0).length === clericLevelOneLeveled, 'PHB Cleric level 2 should retain full accessible prepared-all list without duplicate spells');

export default {
  checks: [
    'PHB Wizard spellbook choices require 6, then 2, then 2 learned spells',
    'PHB Sorcerer level-up requires and adds one known leveled spell',
    'PHB Cleric prepared-all level-up requires no leveled choices and avoids duplicates',
  ],
  wizardLevelThreeSpellbook: getProfile(wizardCharacter, 'Wizard', 'PHB').spells.filter(spell => spell.level > 0).length,
  sorcererLevelTwoKnown: sorcererProfile.spells.filter(spell => spell.level > 0).length,
  clericLevelTwoLeveled: clericProfile.spells.filter(spell => spell.level > 0).length,
};
`;

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'spell-levelup-audit-'));
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
      fileName: () => 'audit-spell-levelup-behavior.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },
});

const result = await import(pathToFileURL(path.join(outDir, 'audit-spell-levelup-behavior.js')).href);

console.log(JSON.stringify(result.default, null, 2));
