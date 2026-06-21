import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, 'public/character-content/auto-builder-core.json');
const content = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const getClass = (key, source) => {
  const cls = content.classes.find(item => item.key === key && item.source === source);
  assert(cls, `missing class ${key}|${source}`);
  return cls;
};

const isPreparedAllClass = cls => (
  cls.preparedSpellsChange === 'restLong'
  && !cls.spellsKnownProgressionFixed?.length
  && !cls.spellsKnownProgressionFixedByLevel
  && !cls.spellsKnownProgression?.length
);

const getMaxSpellLevel = (cls, level) => {
  const slots = cls.spellSlotProgression?.[level - 1];
  if (!slots?.length) return -1;
  for (let index = slots.length - 1; index >= 0; index -= 1) {
    if (Number(slots[index]) > 0) return index + 1;
  }
  return -1;
};

const getClassSpellOptions = (cls, level) => {
  const maxSpellLevel = getMaxSpellLevel(cls, level);
  return content.spells.filter(spell => (
    spell.level <= maxSpellLevel
    && spell.classKeys?.includes(cls.key)
  ));
};

const getKnownSpellLimit = (cls, level) => {
  const index = level - 1;
  const fixedKnown = cls.spellsKnownProgressionFixed
    ?.slice(0, level)
    .reduce((total, count) => total + (Number(count) || 0), 0);
  const fixedByLevel = cls.spellsKnownProgressionFixedByLevel
    ? Object.entries(cls.spellsKnownProgressionFixedByLevel)
      .filter(([classLevel]) => Number(classLevel) <= level)
      .reduce((total, [, spellLevels]) => (
        total + Object.values(spellLevels).reduce((sum, count) => sum + (Number(count) || 0), 0)
      ), 0)
    : 0;
  const levelPrepared = cls.preparedSpellsChange === 'level'
    ? cls.preparedSpellsProgression?.[index]
    : 0;
  return (fixedKnown || cls.spellsKnownProgression?.[index] || levelPrepared || 0) + fixedByLevel;
};

const preparedAllCases = [
  ['Cleric', 'PHB', 3],
  ['Cleric', 'XPHB', 5],
  ['Druid', 'PHB', 3],
  ['Druid', 'XPHB', 5],
  ['Paladin', 'XPHB', 5],
];

const knownSelectionCases = [
  ['Bard', 'PHB', 2],
  ['Bard', 'XPHB', 2],
  ['Sorcerer', 'PHB', 3],
  ['Sorcerer', 'XPHB', 3],
  ['Warlock', 'PHB', 2],
  ['Warlock', 'XPHB', 2],
];

for (const [key, source, level] of preparedAllCases) {
  const cls = getClass(key, source);
  assert(isPreparedAllClass(cls), `${key}|${source} should be treated as prepared-all`);
  const leveledOptions = getClassSpellOptions(cls, level).filter(spell => spell.level > 0);
  assert(leveledOptions.length > 0, `${key}|${source} has no leveled spell options at level ${level}`);
  if (cls.preparedSpellsProgression?.[level - 1]) {
    assert(
      leveledOptions.length > cls.preparedSpellsProgression[level - 1],
      `${key}|${source} appears capped to prepared count instead of full accessible spell list`,
    );
  }
}

for (const [key, source, level] of knownSelectionCases) {
  const cls = getClass(key, source);
  assert(!isPreparedAllClass(cls), `${key}|${source} should require spell choices`);
  const currentLimit = getKnownSpellLimit(cls, level);
  const previousLimit = getKnownSpellLimit(cls, level - 1);
  assert(currentLimit > previousLimit, `${key}|${source} level ${level} should gain selectable spells`);
}

const wizard = getClass('Wizard', 'PHB');
assert(!isPreparedAllClass(wizard), 'PHB Wizard should use fixed spell-learning choices');
assert(wizard.spellsKnownProgressionFixed?.[0] === 6, 'PHB Wizard should learn six 1st-level spells at level 1');

console.log(JSON.stringify({
  preparedAllCases: preparedAllCases.length,
  knownSelectionCases: knownSelectionCases.length,
  wizardFixedLevelOneSpells: wizard.spellsKnownProgressionFixed?.[0],
}, null, 2));
