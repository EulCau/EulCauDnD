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
  getFeatSpellChoiceState,
  getLevelOneSpellChoiceState,
} from '${projectImport('utils/autoBuilderRules.ts')}';
import content from '${projectImport('public/data/auto-builder-core.json')}';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const feat = content.feats.find(item => item.key === 'Magic Initiate' && item.source === 'XPHB');
assert(feat, 'missing XPHB Magic Initiate feat');
const state = getFeatSpellChoiceState(content, feat, '5r');
assert(state?.blocks.length, 'XPHB Magic Initiate should expose spell choice blocks');
const block = state.blocks.find(item => item.label.includes('牧师')) || state.blocks[0];
const featSpellChoices = Object.fromEntries(block.choices.map(group => [
  group.id,
  group.options.slice(0, group.count).map(spell => spell.id),
]));

const wizard = content.classes.find(cls => cls.key === 'Wizard' && cls.source === 'XPHB');
const wizardSpellState = getLevelOneSpellChoiceState(content, wizard);
const character = buildLevelOneCharacter(INITIAL_CHARACTER, content, wizard, {
  ruleSystem: '5r',
  race: content.races.find(race => race.name === '人类' && race.source === 'XPHB') || content.races[0],
  background: content.backgrounds.find(background => background.source === 'XPHB') || content.backgrounds[0],
  decoupleOriginFromBackground: true,
  originFeatChoice: {
    featId: 'Magic Initiate|XPHB',
    featSpellBlockId: block.id,
    featSpellAbility: 'WIS',
    featSpellChoices,
  },
  skillChoices: [],
  spellChoices: {
    cantrips: wizardSpellState.cantrips.slice(0, wizardSpellState.needed.cantrips).map(spell => spell.id),
    leveled: wizardSpellState.leveled.slice(0, wizardSpellState.needed.leveled).map(spell => spell.id),
  },
});

const profile = character.spellcastingProfiles.find(item => item.id.includes('magic initiate') || item.className.includes(feat.name));
assert(
  profile,
  \`Magic Initiate should create a feat spellcasting profile, got profiles: \${character.spellcastingProfiles.map(item => \`\${item.id}|\${item.className}\`).join(', ')}\`,
);
assert(profile.ability === 'WIS', \`Magic Initiate profile ability should be WIS, got \${profile.ability}\`);
assert(profile.spells.length >= 3, \`Magic Initiate should add selected spells, got \${profile.spells.length}\`);
assert(
  profile.spells.every(spell => spell.prepared === true),
  \`Magic Initiate feat spells should all be prepared: \${profile.spells.map(spell => \`\${spell.name}:\${spell.prepared}\`).join(', ')}\`,
);

export default {
  feat: feat.name,
  block: block.label,
  spells: profile.spells.map(spell => ({ name: spell.name, level: spell.level, prepared: spell.prepared })),
};
`;

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'feat-spell-audit-'));
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
      fileName: () => 'audit-feat-spell-behavior.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },
});

const result = await import(pathToFileURL(path.join(outDir, 'audit-feat-spell-behavior.js')).href);

console.log(JSON.stringify({
  ...result.default,
  checks: [
    'XPHB Magic Initiate creates feat spellcasting profile',
    'feat spellcasting profile uses selected ability',
    'feat granted spells are prepared',
  ],
}, null, 2));
