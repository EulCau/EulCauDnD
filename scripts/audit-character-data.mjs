import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FILES = [
  'public/data/core.json',
  'public/data/auto-builder-core.json',
  'public/data/bestiary-index.json',
];
const MAX_PUBLIC_AUTO_BUILDER_BYTES = 6 * 1024 * 1024;

const readJson = relativePath => {
  const absolutePath = path.join(ROOT, relativePath);
  return {
    absolutePath,
    data: JSON.parse(fs.readFileSync(absolutePath, 'utf8')),
    size: fs.statSync(absolutePath).size,
  };
};

const countBy = (items, getKey) => {
  const counts = {};
  for (const item of items || []) {
    const key = getKey(item) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
};

const formatBytes = bytes => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const loaded = FILES.map(readJson);
const [core, autoBuilder, bestiary] = loaded;

assert(Array.isArray(core.data.spells), 'core.json is missing spells array');
assert(Array.isArray(autoBuilder.data.spells), 'auto-builder-core.json is missing spells array');
assert(Array.isArray(bestiary.data.monsters), 'bestiary-index.json is missing monsters array');
assert(autoBuilder.size <= MAX_PUBLIC_AUTO_BUILDER_BYTES, `auto-builder data is too large: ${formatBytes(autoBuilder.size)}`);
assert(bestiary.data.monsters.length > 1000, 'bestiary index has too few monsters');
assert(
  bestiary.data.monsters.some(monster => monster.source === 'MM')
    && bestiary.data.monsters.some(monster => monster.source === 'XMM'),
  'bestiary index should include both MM and XMM monsters',
);
assert(
  bestiary.data.monsters.every(monster => monster.id && monster.name && monster.source),
  'bestiary index has monsters missing id, name, or source',
);

const coreSpellSources = countBy(core.data.spells, spell => spell.source);
const autoBuilderSpellSources = countBy(autoBuilder.data.spells, spell => spell.source);
assert(
  JSON.stringify(coreSpellSources) === JSON.stringify(autoBuilderSpellSources),
  'core and auto-builder spell source distributions differ',
);

const autoBuilderRules = autoBuilder.data.rules || {};
for (const ruleSystem of ['5e', '5r']) {
  assert(autoBuilderRules[ruleSystem]?.officialExtensionsEnabled, `${ruleSystem} official extension metadata is not enabled`);
  assert(Array.isArray(autoBuilderRules[ruleSystem]?.spellSources), `${ruleSystem} spellSources metadata is missing`);
  assert(Array.isArray(autoBuilderRules[ruleSystem]?.invocationSources), `${ruleSystem} invocationSources metadata is missing`);
  assert(Array.isArray(autoBuilderRules[ruleSystem]?.fightingStyleSources), `${ruleSystem} fightingStyleSources metadata is missing`);
  assert(Array.isArray(autoBuilderRules[ruleSystem]?.metamagicSources), `${ruleSystem} metamagicSources metadata is missing`);
  assert(Array.isArray(autoBuilderRules[ruleSystem]?.maneuverSources), `${ruleSystem} maneuverSources metadata is missing`);
  assert(Array.isArray(autoBuilderRules[ruleSystem]?.raceSources), `${ruleSystem} raceSources metadata is missing`);
}

assert(
  autoBuilderRules['5e'].primarySources?.[0] === 'PHB',
  '5e primary source should be PHB',
);
assert(
  autoBuilderRules['5r'].primarySources?.[0] === 'XPHB',
  '5r primary source should be XPHB',
);
assert(
  autoBuilderRules['5r'].spellSources?.[0] === 'XPHB'
    && autoBuilderRules['5r'].spellSources?.includes('PHB'),
  '5r spell source priority should prefer XPHB while allowing PHB',
);
assert(
  autoBuilderRules['5e'].spellSources?.[0] === 'PHB'
    && !autoBuilderRules['5e'].primarySources?.includes('XPHB'),
  '5e should use PHB as its primary source and not XPHB',
);

const classSources = countBy(autoBuilder.data.classes || [], cls => cls.source);
assert(classSources.PHB === 12, `expected 12 PHB classes, got ${classSources.PHB || 0}`);
assert(classSources.XPHB === 12, `expected 12 XPHB classes, got ${classSources.XPHB || 0}`);

const raceSources = countBy(autoBuilder.data.races || [], race => race.source);
assert(raceSources.PHB > 0, 'PHB races are missing');
assert(raceSources.XPHB > 0, 'XPHB races are missing');
assert(raceSources.MPMM > 0, 'MPMM extension races are missing');
assert(raceSources.AAG > 0, 'AAG extension races are missing');
assert((autoBuilder.data.races || []).length > 30, 'official extension races were not added to auto-builder data');
assert(
  (autoBuilder.data.races || []).some(race => race.speed && typeof race.speed === 'object' && typeof race.speed.walk === 'number'),
  'race object walk speeds are missing',
);
assert(
  (autoBuilder.data.races || []).some(race => Number(race.darkvision) > 0),
  'race darkvision metadata is missing',
);
assert(
  (autoBuilder.data.races || []).some(race => (race.resist || []).some(entry => typeof entry === 'string')),
  'race fixed resistance metadata is missing',
);
assert(
  autoBuilderRules['5r'].raceSources?.[0] === 'XPHB'
    && autoBuilderRules['5r'].raceSources?.includes('MPMM'),
  '5r race source priority should prefer XPHB while allowing extension races',
);
assert(
  autoBuilderRules['5e'].raceSources?.[0] === 'PHB'
    && !autoBuilderRules['5e'].raceSources?.includes('XPHB')
    && autoBuilderRules['5e'].raceSources?.includes('MPMM'),
  '5e race source priority should prefer PHB, exclude XPHB, and allow extension races',
);

const hasFeat = (key, source) => (autoBuilder.data.feats || []).some(feat => feat.key === key && feat.source === source);
assert(hasFeat('Tough', 'PHB'), 'PHB Tough feat is missing');
assert(hasFeat('Tough', 'XPHB'), 'XPHB Tough feat is missing');
assert(hasFeat('Alert', 'PHB'), 'PHB Alert feat is missing');
assert(hasFeat('Alert', 'XPHB'), 'XPHB Alert feat is missing');
assert(hasFeat('Mobile', 'PHB'), 'PHB Mobile feat is missing');
assert(hasFeat('Speedy', 'XPHB'), 'XPHB Speedy feat is missing');

const hasWeaponProperty = property => (autoBuilder.data.weapons || []).some(weapon => (
  (weapon.property || []).some(entry => {
    const uid = typeof entry === 'string' ? entry : entry?.uid;
    return String(uid || '').split('|')[0] === property;
  })
));
assert(hasWeaponProperty('2H'), 'two-handed weapon data is missing');
assert(hasWeaponProperty('L'), 'light weapon data is missing');
assert(
  (autoBuilder.data.armors || []).some(armor => String(armor.type || '').split('|')[0] === 'S'),
  'shield armor data is missing',
);

const getClass = (key, source) => autoBuilder.data.classes.find(cls => cls.key === key && cls.source === source);
assert(
  getClass('Ranger', 'XPHB')?.favoredEnemyProgression?.length === 20,
  'XPHB Ranger favoredEnemyProgression is missing',
);
assert(
  getClass('Paladin', 'XPHB')?.channelDivinityProgression?.length === 20,
  'XPHB Paladin channelDivinityProgression is missing',
);
assert(
  getClass('Sorcerer', 'XPHB')?.sorceryPointProgression?.length === 20,
  'XPHB Sorcerer sorceryPointProgression is missing',
);

const classlessSpells = autoBuilder.data.spells.filter(spell => !spell.classKeys?.length);
const hasKnownClassMetadata = spell => {
  const meta = core.data.spellSources?.[`${spell.name}|${spell.source}`];
  if (!meta) return false;
  return (autoBuilder.data.classes || []).some(cls => (
    meta.class?.[cls.source]?.[cls.name]
    || meta.classVariant?.[cls.source]?.[cls.name]
  ));
};
const classlessSpellsWithKnownClassMetadata = classlessSpells.filter(hasKnownClassMetadata);
assert(
  classlessSpellsWithKnownClassMetadata.length === 0,
  `spells with class metadata are missing classKeys: ${classlessSpellsWithKnownClassMetadata
    .map(spell => `${spell.name}|${spell.source}`)
    .join(', ')}`,
);
const hasSameSourceSubclassMetadata = spell => {
  const meta = core.data.spellSources?.[`${spell.name}|${spell.source}`];
  if (!meta || spell.source === 'PHB' || spell.source === 'XPHB') return false;
  return (autoBuilder.data.subclasses || []).some(subclass => {
    if (subclass.source !== spell.source) return false;
    const sourceGroup = meta.subclass?.[subclass.classSource]?.[subclass.className]?.[subclass.source];
    return Boolean(
      sourceGroup?.[subclass.shortName]
      || sourceGroup?.[subclass.name]
      || sourceGroup?.[subclass.englishName],
    );
  });
};
const spellsWithSameSourceSubclassMetadata = autoBuilder.data.spells.filter(hasSameSourceSubclassMetadata);
const spellsMissingSubclassIds = spellsWithSameSourceSubclassMetadata.filter(spell => !spell.subclassIds?.length);
assert(
  spellsMissingSubclassIds.length === 0,
  `spells with same-source subclass metadata are missing subclassIds: ${spellsMissingSubclassIds
    .map(spell => `${spell.name}|${spell.source}`)
    .join(', ')}`,
);
const stats = {
  files: loaded.map(item => ({
    path: path.relative(ROOT, item.absolutePath),
    size: formatBytes(item.size),
  })),
  counts: {
    classes: autoBuilder.data.classes?.length || 0,
    subclasses: autoBuilder.data.subclasses?.length || 0,
    races: autoBuilder.data.races?.length || 0,
    backgrounds: autoBuilder.data.backgrounds?.length || 0,
    feats: autoBuilder.data.feats?.length || 0,
    invocations: autoBuilder.data.invocations?.length || 0,
    fightingStyles: autoBuilder.data.fightingStyles?.length || 0,
    metamagics: autoBuilder.data.metamagics?.length || 0,
    maneuvers: autoBuilder.data.maneuvers?.length || 0,
    weapons: autoBuilder.data.weapons?.length || 0,
    armors: autoBuilder.data.armors?.length || 0,
    spells: autoBuilder.data.spells.length,
    classlessSpells: classlessSpells.length,
    classlessSpellsWithKnownClassMetadata: classlessSpellsWithKnownClassMetadata.length,
    subclassLinkedSpells: spellsWithSameSourceSubclassMetadata.length,
    spellsMissingSubclassIds: spellsMissingSubclassIds.length,
    monsters: bestiary.data.monsters.length,
  },
  spellSources: autoBuilderSpellSources,
  classSources,
  raceSources,
  subclassSources: countBy(autoBuilder.data.subclasses || [], subclass => subclass.source),
  invocationSources: countBy(autoBuilder.data.invocations || [], invocation => invocation.source),
  fightingStyleSources: countBy(autoBuilder.data.fightingStyles || [], style => style.source),
  metamagicSources: countBy(autoBuilder.data.metamagics || [], metamagic => metamagic.source),
  maneuverSources: countBy(autoBuilder.data.maneuvers || [], maneuver => maneuver.source),
  ruleSpellSources: Object.fromEntries(
    Object.entries(autoBuilderRules).map(([ruleSystem, rule]) => [ruleSystem, rule.spellSources || []]),
  ),
  ruleInvocationSources: Object.fromEntries(
    Object.entries(autoBuilderRules).map(([ruleSystem, rule]) => [ruleSystem, rule.invocationSources || []]),
  ),
  ruleFightingStyleSources: Object.fromEntries(
    Object.entries(autoBuilderRules).map(([ruleSystem, rule]) => [ruleSystem, rule.fightingStyleSources || []]),
  ),
  ruleMetamagicSources: Object.fromEntries(
    Object.entries(autoBuilderRules).map(([ruleSystem, rule]) => [ruleSystem, rule.metamagicSources || []]),
  ),
  ruleManeuverSources: Object.fromEntries(
    Object.entries(autoBuilderRules).map(([ruleSystem, rule]) => [ruleSystem, rule.maneuverSources || []]),
  ),
  ruleRaceSources: Object.fromEntries(
    Object.entries(autoBuilderRules).map(([ruleSystem, rule]) => [ruleSystem, rule.raceSources || []]),
  ),
};

console.log(JSON.stringify(stats, null, 2));
