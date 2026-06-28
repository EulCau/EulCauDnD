import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, 'public/data/auto-builder-core.json');
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
  if (!cls.spellcastingAbility || !cls.casterProgression) return -1;
  let fixedMaxLevel = -1;
  for (const [classLevel, spellLevels] of Object.entries(cls.spellsKnownProgressionFixedByLevel || {})) {
    if (Number(classLevel) > level) continue;
    for (const [spellLevel, count] of Object.entries(spellLevels)) {
      if (Number(count) > 0) fixedMaxLevel = Math.max(fixedMaxLevel, Number(spellLevel) || -1);
    }
  }
  const slots = cls.spellSlotProgression?.[level - 1];
  if (slots?.length) {
    for (let index = slots.length - 1; index >= 0; index -= 1) {
      if (Number(slots[index]) > 0) return Math.max(index + 1, fixedMaxLevel);
    }
  }
  const pactSlots = cls.pactSlotProgression?.[level - 1];
  if (pactSlots?.level) return Math.max(pactSlots.level, fixedMaxLevel);
  if (cls.casterProgression === 'pact') return level >= 1 ? Math.max(1, fixedMaxLevel) : -1;
  if (cls.casterProgression === 'full') return level >= 1 ? Math.max(Math.min(9, Math.max(1, Math.ceil(level / 2))), fixedMaxLevel) : -1;
  if (cls.casterProgression === 'artificer') return level >= 1 ? Math.max(Math.min(5, Math.max(1, Math.ceil(level / 4))), fixedMaxLevel) : -1;
  if (cls.casterProgression === '1/2') return level >= 2 ? Math.max(Math.min(5, Math.max(1, Math.floor((level + 3) / 4))), fixedMaxLevel) : -1;
  return fixedMaxLevel;
};

const getClassSpellOptions = (cls, level) => {
  const maxSpellLevel = getMaxSpellLevel(cls, level);
  return content.spells.filter(spell => (
    spell.level <= maxSpellLevel
    && spell.classKeys?.includes(cls.key)
  ));
};

const uniqueSpells = spells => {
  const seen = new Set();
  const out = [];
  for (const spell of spells) {
    if (seen.has(spell.id)) continue;
    seen.add(spell.id);
    out.push(spell);
  }
  return out;
};

const isKnownCasterClass = cls => {
  if (cls.preparedSpellsChange === 'restLong') return false;
  return !!(
    cls.spellsKnownProgression?.length
    || cls.spellsKnownProgressionFixedByLevel
    || cls.spellsKnownProgressionFixedAllowLowerLevel
    || cls.preparedSpellsProgression?.length
  );
};

const buildAuditedProfileSpells = (cls, level, choices = { cantrips: [], leveled: [] }) => {
  const allOptions = getClassSpellOptions(cls, level);
  const cantripIds = new Set(choices.cantrips || []);
  const leveledIds = new Set(choices.leveled || []);
  const preparedAll = isPreparedAllClass(cls);
  const knownCaster = isKnownCasterClass(cls);
  const selected = preparedAll
    ? uniqueSpells([
      ...allOptions.filter(spell => spell.level === 0 && cantripIds.has(spell.id)),
      ...allOptions.filter(spell => spell.level > 0),
    ])
    : uniqueSpells(allOptions.filter(spell => cantripIds.has(spell.id) || leveledIds.has(spell.id)));
  return selected.map(spell => ({
    id: spell.id,
    name: spell.name,
    level: spell.level,
    prepared: knownCaster || spell.level === 0,
  }));
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
  ['Paladin', 'PHB', 5],
  ['Paladin', 'XPHB', 5],
  ['Ranger', 'XPHB', 5],
];

const knownSelectionCases = [
  ['Bard', 'PHB', 2],
  ['Bard', 'XPHB', 2],
  ['Ranger', 'PHB', 3],
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
  const firstCantrip = getClassSpellOptions(cls, level).find(spell => spell.level === 0);
  const profileSpells = buildAuditedProfileSpells(cls, level, {
    cantrips: firstCantrip ? [firstCantrip.id] : [],
    leveled: [],
  });
  const profileIds = new Set(profileSpells.map(spell => spell.id));
  assert(
    leveledOptions.every(spell => profileIds.has(spell.id)),
    `${key}|${source} level ${level} should add every accessible leveled spell to prepared-all profile`,
  );
  assert(
    profileSpells.filter(spell => spell.level > 0).every(spell => spell.prepared === false),
    `${key}|${source} ordinary prepared-all leveled spells should not be auto-prepared`,
  );
  if (firstCantrip) {
    const selectedCantrip = profileSpells.find(spell => spell.id === firstCantrip.id);
    assert(selectedCantrip?.prepared === true, `${key}|${source} selected cantrips should be prepared`);
  }
}

const getHighestPrioritySpell = (name, ruleSystem) => {
  const priority = content.rules?.[ruleSystem]?.spellSources || [];
  return priority
    .map(source => content.spells.find(spell => spell.name === name && spell.source === source))
    .find(Boolean);
};

const xphbSpellName = content.spells.find(spell => (
  spell.source === 'XPHB'
  && content.spells.some(other => other.name === spell.name && other.source === 'PHB')
))?.name;
assert(xphbSpellName, 'no shared PHB/XPHB spell name found for source priority audit');
assert(
  getHighestPrioritySpell(xphbSpellName, '5r')?.source === 'XPHB',
  `5r should prefer XPHB for shared spell ${xphbSpellName}`,
);
assert(
  getHighestPrioritySpell(xphbSpellName, '5e')?.source === 'PHB',
  `5e should prefer PHB for shared spell ${xphbSpellName}`,
);

for (const [key, source, level] of knownSelectionCases) {
  const cls = getClass(key, source);
  assert(!isPreparedAllClass(cls), `${key}|${source} should require spell choices`);
  const currentLimit = getKnownSpellLimit(cls, level);
  const previousLimit = getKnownSpellLimit(cls, level - 1);
  assert(currentLimit > previousLimit, `${key}|${source} level ${level} should gain selectable spells`);
  assert(isKnownCasterClass(cls), `${key}|${source} should be treated as a known-selection caster`);
  const options = getClassSpellOptions(cls, level);
  const firstCantrip = options.find(spell => spell.level === 0);
  const selectedLeveled = options.filter(spell => spell.level > 0).slice(0, 2);
  assert(selectedLeveled.length > 0, `${key}|${source} has no selectable leveled spell options`);
  const profileSpells = buildAuditedProfileSpells(cls, level, {
    cantrips: firstCantrip ? [firstCantrip.id] : [],
    leveled: selectedLeveled.map(spell => spell.id),
  });
  const profileIds = new Set(profileSpells.map(spell => spell.id));
  assert(
    selectedLeveled.every(spell => profileIds.has(spell.id)),
    `${key}|${source} selected leveled spells should be added to known-selection profile`,
  );
  assert(
    profileSpells.filter(spell => spell.level > 0).every(spell => spell.prepared === true),
    `${key}|${source} selected known spells should be auto-prepared`,
  );
  const unselectedLeveled = options.find(spell => spell.level > 0 && !profileIds.has(spell.id));
  assert(unselectedLeveled, `${key}|${source} audit needs at least one unselected leveled option`);
}

const wizard = getClass('Wizard', 'PHB');
assert(!isPreparedAllClass(wizard), 'PHB Wizard should use fixed spell-learning choices');
assert(wizard.spellsKnownProgressionFixed?.[0] === 6, 'PHB Wizard should learn six 1st-level spells at level 1');
const xphbWizard = getClass('Wizard', 'XPHB');
assert(!isPreparedAllClass(xphbWizard), 'XPHB Wizard should use spellbook choices, not full prepared-all class list');
assert(xphbWizard.spellsKnownProgressionFixed?.[0] === 6, 'XPHB Wizard should learn six 1st-level spells at level 1');

console.log(JSON.stringify({
  preparedAllCases: preparedAllCases.length,
  knownSelectionCases: knownSelectionCases.length,
  sharedSpellPriorityCase: xphbSpellName,
  wizardFixedLevelOneSpells: wizard.spellsKnownProgressionFixed?.[0],
  xphbWizardFixedLevelOneSpells: xphbWizard.spellsKnownProgressionFixed?.[0],
}, null, 2));
