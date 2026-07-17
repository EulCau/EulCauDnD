import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_ROOT = path.join(ROOT, 'third_party/5etools-cn/data');
const OUT_DIR = path.join(ROOT, 'public/data');
const OUT_FILE = path.join(OUT_DIR, 'core.json');
const PUBLIC_OUT_DIR = path.join(ROOT, 'public/data');
const AUTO_BUILDER_OUT_FILE = path.join(PUBLIC_OUT_DIR, 'auto-builder-core.json');
const CORE_SPELL_SOURCES = ['PHB', 'XPHB'];
const OFFICIAL_EXTENSION_SPELL_SOURCES = [
  'AAG',
  'AI',
  'AitFR-AVT',
  'BMT',
  'EFA',
  'EGW',
  'FRHoF',
  'FTD',
  'GGR',
  'IDRotF',
  'LLK',
  'SatO',
  'SCC',
  'TCE',
  'XGE',
];
const AUTO_BUILDER_SPELL_SOURCES = [...CORE_SPELL_SOURCES, ...OFFICIAL_EXTENSION_SPELL_SOURCES];
const AUTO_BUILDER_SPELL_SOURCE_BY_LOWER = Object.fromEntries(
  AUTO_BUILDER_SPELL_SOURCES.map(source => [source.toLowerCase(), source]),
);
const AUTO_BUILDER_INVOCATION_SOURCES = ['PHB', 'XPHB', 'XGE', 'TCE'];
const AUTO_BUILDER_FIGHTING_STYLE_SOURCES = ['PHB', 'TCE'];
const AUTO_BUILDER_METAMAGIC_SOURCES = ['PHB', 'XPHB', 'TCE'];
const AUTO_BUILDER_MANEUVER_SOURCES = ['PHB', 'XPHB', 'TCE'];
const OFFICIAL_SUBCLASS_EXCLUDED_SOURCES = new Set(['UA', 'UAWGE']);
const AUTO_BUILDER_RACE_SOURCE_PRIORITY_5E = [
  'PHB',
  'MPMM',
  'AAG',
  'FTD',
  'TCE',
  'ERLW',
  'EFA',
  'EGW',
  'GGR',
  'MOT',
  'VRGR',
  'WBtW',
  'SCC',
  'DSotDQ',
  'AI',
  'EEPC',
  'MTF',
  'VGM',
  'SCAG',
  'PSA',
  'PSD',
  'PSI',
  'PSK',
  'PSX',
  'PSZ',
  'LFL',
  'RHW',
];
const AUTO_BUILDER_RACE_SOURCE_PRIORITY_5R = [
  'XPHB',
  ...AUTO_BUILDER_RACE_SOURCE_PRIORITY_5E,
];
const AUTO_BUILDER_RACE_SOURCES = new Set(AUTO_BUILDER_RACE_SOURCE_PRIORITY_5R);
const AUTO_BUILDER_FEAT_SOURCES = new Set([
  'ABH',
  'BGG',
  'BMT',
  'DSotDQ',
  'EFA',
  'ERLW',
  'FRHoF',
  'FTD',
  'LFL',
  'MTF',
  'PHB',
  'PSK',
  'PSX',
  'RHW',
  'SatO',
  'SCC',
  'TCE',
  'XGE',
  'XPHB',
]);

const readJson = relativePath => JSON.parse(fs.readFileSync(path.join(DATA_ROOT, relativePath), 'utf8'));

const pick = (obj, keys) => Object.fromEntries(keys.map(key => [key, obj?.[key]]).filter(([, value]) => value !== undefined));

const countBy = (items, getKey) => {
  const counts = {};
  for (const item of items || []) {
    const key = getKey(item) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
};

const normalizeSpellSources = () => {
  const lookup = readJson('generated/gendata-spell-source-lookup.json');
  const out = {};

  for (const canonicalSource of AUTO_BUILDER_SPELL_SOURCES) {
    const spells = lookup[canonicalSource.toLowerCase()] || {};
    for (const [spellName, meta] of Object.entries(spells)) {
      out[`${spellName}|${canonicalSource}`] = pick(meta, ['class', 'classVariant', 'subclass']);
    }
  }

  return out;
};

const normalizeSpellSourceCode = source => (
  AUTO_BUILDER_SPELL_SOURCE_BY_LOWER[String(source).toLowerCase()] || String(source)
);

const normalizeSpell = spell => ({
  name: spell.name,
  englishName: spell.ENG_name,
  source: spell.source,
  level: spell.level,
  school: spell.school,
  time: spell.time,
  range: spell.range,
  components: spell.components,
  duration: spell.duration,
  meta: spell.meta,
  entries: spell.entries,
  entriesHigherLevel: spell.entriesHigherLevel,
});

const normalizeWeapon = item => ({
  id: `${item.name}|${item.source}`,
  key: item.ENG_name || item.name,
  name: item.name,
  englishName: item.ENG_name,
  source: item.source,
  ruleSystem: item.source === 'XPHB' ? '5r' : '5e',
  type: item.type,
  weaponCategory: item.weaponCategory,
  property: item.property || [],
  mastery: item.mastery || [],
  range: item.range,
  dmg1: item.dmg1,
  dmg2: item.dmg2,
  dmgType: item.dmgType,
  bonusWeapon: item.bonusWeapon,
  entries: item.entries,
});

const normalizeWeaponMastery = mastery => ({
  id: `${mastery.name}|${mastery.source}`,
  key: mastery.ENG_name || mastery.name,
  name: mastery.name,
  englishName: mastery.ENG_name,
  source: mastery.source,
  description: summarizeEntries(mastery.entries || []),
});

const normalizeArmor = item => ({
  id: `${item.name}|${item.source}`,
  key: item.ENG_name || item.name,
  name: item.name,
  englishName: item.ENG_name,
  source: item.source,
  ruleSystem: item.source === 'XPHB' ? '5r' : '5e',
  type: item.type,
  ac: item.ac,
  strength: item.strength,
  stealth: item.stealth,
  entries: item.entries,
});

const normalizeInvocation = invocation => ({
  id: `${invocation.name}|${invocation.source}`,
  key: invocation.ENG_name || invocation.name,
  name: invocation.name,
  englishName: invocation.ENG_name,
  source: invocation.source,
  prerequisite: invocation.prerequisite,
  description: summarizeEntries([{ name: invocation.name, ENG_name: invocation.ENG_name, entries: invocation.entries || [] }]),
});

const normalizeFightingStyle = feature => ({
  id: `${feature.name}|${feature.source}`,
  key: feature.ENG_name || feature.name,
  name: feature.name,
  englishName: feature.ENG_name,
  source: feature.source,
  featureTypes: feature.featureType || [],
  description: summarizeEntries([{ name: feature.name, ENG_name: feature.ENG_name, entries: feature.entries || [] }]),
});

const normalizeMetamagic = feature => ({
  id: `${feature.name}|${feature.source}`,
  key: feature.ENG_name || feature.name,
  name: feature.name,
  englishName: feature.ENG_name,
  source: feature.source,
  description: summarizeEntries([{ name: feature.name, ENG_name: feature.ENG_name, entries: feature.entries || [] }]),
});

const normalizeManeuver = feature => ({
  id: `${feature.name}|${feature.source}`,
  key: feature.ENG_name || feature.name,
  name: feature.name,
  englishName: feature.ENG_name,
  source: feature.source,
  description: summarizeEntries([{ name: feature.name, ENG_name: feature.ENG_name, entries: feature.entries || [] }]),
});

const stripTags = value => {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\{@(?:filter|spell|item|class|skill|action|variantrule|book|language|5etools|dc|dice|damage|i|b) ([^}|]+)(?:\|[^}]*)?}/g, '$1')
    .replace(/\{@(?:hit|d20|chance|recharge) ([^}]+)}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
};

const summarizeEntries = entries => {
  if (!Array.isArray(entries)) return '';
  const lines = [];
  const visit = entry => {
    if (typeof entry === 'string') {
      lines.push(stripTags(entry));
      return;
    }
    if (!entry || typeof entry !== 'object') return;
    if (entry.name && Array.isArray(entry.entries)) lines.push(`${entry.name}: ${summarizeEntries(entry.entries)}`);
    else if (entry.name && typeof entry.entry === 'string') lines.push(`${entry.name}: ${stripTags(entry.entry)}`);
    else if (Array.isArray(entry.entries)) lines.push(summarizeEntries(entry.entries));
    else if (Array.isArray(entry.items)) entry.items.slice(0, 6).forEach(visit);
  };
  entries.slice(0, 4).forEach(visit);
  return lines.filter(Boolean).join('\n');
};

const normalizeFeatureEntries = entries => {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter(entry => entry && typeof entry === 'object' && entry.name)
    .map(entry => ({
      name: entry.name,
      englishName: entry.ENG_name,
      description: summarizeEntries([entry]),
    }))
    .filter(entry => entry.description);
};

const getSenseDistance = (entity, key) => {
  if (typeof entity[key] === 'number') return entity[key];
  const senseEntry = Array.isArray(entity.senses)
    ? entity.senses.find(entry => entry && typeof entry === 'object' && typeof entry[key] === 'number')
    : null;
  return senseEntry?.[key];
};

const normalizeFeatForAutoBuilder = feat => ({
  key: feat.ENG_name || feat.name,
  name: feat.name,
  englishName: feat.ENG_name,
  source: feat.source,
  category: feat.category,
  prerequisite: feat.prerequisite,
  ability: feat.ability,
  skillProficiencies: feat.skillProficiencies,
  toolProficiencies: feat.toolProficiencies,
  languageProficiencies: feat.languageProficiencies,
  savingThrowProficiencies: feat.savingThrowProficiencies,
  weaponProficiencies: feat.weaponProficiencies,
  armorProficiencies: feat.armorProficiencies,
  expertise: feat.expertise,
  darkvision: getSenseDistance(feat, 'darkvision'),
  blindsight: getSenseDistance(feat, 'blindsight'),
  tremorsense: getSenseDistance(feat, 'tremorsense'),
  truesight: getSenseDistance(feat, 'truesight'),
  resist: feat.resist,
  immune: feat.immune,
  vulnerable: feat.vulnerable,
  conditionImmune: feat.conditionImmune,
  additionalSpells: feat.additionalSpells,
  fightingStyleCount: getOptionalFeatureWildcardCount(feat, 'FS:F'),
  invocationCount: getOptionalFeatureWildcardCount(feat, 'EI'),
  maneuverCount: getOptionalFeatureWildcardCount(feat, 'MV:B'),
  metamagicCount: getOptionalFeatureWildcardCount(feat, 'MM'),
  features: normalizeFeatureEntries([{ name: feat.name, ENG_name: feat.ENG_name, entries: feat.entries || [] }]),
});

const normalizeEntityForAutoBuilder = entity => ({
  key: entity.ENG_name || entity.name,
  name: entity.name,
  englishName: entity.ENG_name,
  source: entity.source,
  ruleSystem: entity.source === 'XPHB' ? '5r' : '5e',
  edition: entity.edition,
  ability: entity.ability,
  speed: entity.speed,
  size: entity.size,
  darkvision: entity.darkvision,
  blindsight: entity.blindsight,
  tremorsense: entity.tremorsense,
  truesight: entity.truesight,
  resist: entity.resist,
  immune: entity.immune,
  vulnerable: entity.vulnerable,
  conditionImmune: entity.conditionImmune,
  skillProficiencies: entity.skillProficiencies,
  toolProficiencies: entity.toolProficiencies,
  languageProficiencies: entity.languageProficiencies,
  weaponProficiencies: entity.weaponProficiencies,
  armorProficiencies: entity.armorProficiencies,
  feats: entity.feats,
  additionalSpells: entity.additionalSpells,
  features: normalizeFeatureEntries(entity.entries),
});

const normalizeClassFile = fileName => {
  const data = readJson(`class/${fileName}`);
  return {
    classes: (data.class || []).map(cls => pick(cls, [
      'name',
      'ENG_name',
      'source',
      'edition',
      'hd',
      'proficiency',
      'spellcastingAbility',
      'casterProgression',
      'preparedSpells',
      'preparedSpellsChange',
      'cantripProgression',
      'spellsKnownProgression',
      'startingProficiencies',
      'startingEquipment',
      'multiclassing',
      'classFeatures',
    ])),
    subclasses: (data.subclass || []).map(subclass => pick(subclass, [
      'name',
      'ENG_name',
      'shortName',
      'source',
      'edition',
      'className',
      'classSource',
      'subclassFeatures',
      'additionalSpells',
    ])),
    classFeatures: (data.classFeature || []).map(feature => pick(feature, [
      'name',
      'ENG_name',
      'source',
      'className',
      'classSource',
      'level',
      'entries',
    ])),
    subclassFeatures: (data.subclassFeature || []).map(feature => pick(feature, [
      'name',
      'ENG_name',
      'source',
      'className',
      'classSource',
      'subclassShortName',
      'subclassSource',
      'level',
      'entries',
    ])),
  };
};

const parseSpellLevel = value => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const explicit = value.match(/level=(\d+)/);
  if (explicit) return Number(explicit[1]) || 0;
  const ordinal = value.match(/\b(\d)(?:st|nd|rd|th)\b/);
  return ordinal ? Number(ordinal[1]) || 0 : 0;
};

const normalizeSpellSlotProgression = cls => {
  const table = (cls.classTableGroups || []).find(group => Array.isArray(group.rowsSpellProgression));
  return table?.rowsSpellProgression || [];
};

const normalizePactSlotProgression = cls => {
  const table = (cls.classTableGroups || []).find(group => (
    Array.isArray(group.colLabels)
    && group.colLabels.includes('法术位')
    && group.colLabels.includes('法术位环阶')
    && Array.isArray(group.rows)
  ));
  if (!table) return [];
  const slotIndex = table.colLabels.indexOf('法术位');
  const levelIndex = table.colLabels.indexOf('法术位环阶');
  return table.rows.map(row => ({
    slots: Number(row[slotIndex]) || 0,
    level: parseSpellLevel(row[levelIndex]),
  }));
};

const normalizeInvocationProgression = cls => {
  const table = (cls.classTableGroups || []).find(group => (
    Array.isArray(group.colLabels)
    && group.colLabels.some(label => String(label).includes('祈唤'))
    && Array.isArray(group.rows)
  ));
  if (!table) return [];
  const index = table.colLabels.findIndex(label => String(label).includes('祈唤'));
  return table.rows.map(row => Number(row[index]) || 0);
};

const normalizeWeaponMasteryProgression = cls => {
  const table = (cls.classTableGroups || []).find(group => (
    Array.isArray(group.colLabels)
    && group.colLabels.some(label => String(label).includes('武器精通'))
    && Array.isArray(group.rows)
  ));
  if (!table) return [];
  const index = table.colLabels.findIndex(label => String(label).includes('武器精通'));
  return table.rows.map(row => Number(row[index]) || 0);
};

const normalizeClassTableProgression = (cls, labelText) => {
  const table = (cls.classTableGroups || []).find(group => (
    Array.isArray(group.colLabels)
    && group.colLabels.some(label => String(label).includes(labelText))
    && Array.isArray(group.rows)
  ));
  if (!table) return [];
  const index = table.colLabels.findIndex(label => String(label).includes(labelText));
  return table.rows.map(row => Number(row[index]) || 0);
};

const normalizeOptionalFeatureProgression = (cls, featureType) => {
  const progression = (cls.optionalfeatureProgression || [])
    .find(entry => entry.featureType?.includes(featureType))
    ?.progression;
  if (!progression) return [];
  const out = [];
  for (const [level, count] of Object.entries(progression)) {
    out[Number(level) - 1] = Number(count) || 0;
  }
  return out;
};

const getOptionalFeatureWildcardCount = (entity, featureType) => {
  const value = (entity.optionalfeatureProgression || [])
    .find(entry => entry.featureType?.includes(featureType))
    ?.progression?.['*'];
  return Number(value) || 0;
};

const parseSpellRef = ref => {
  if (typeof ref !== 'string') return null;
  const [rawName, rawSource = 'PHB'] = ref.split('|');
  const name = rawName.split('#')[0];
  const source = rawSource.split('#')[0];
  if (!name) return null;
  return {
    name,
    source: normalizeSpellSourceCode(source),
  };
};

const normalizeAdditionalPreparedSpells = (entity, options = {}) => {
  const out = [];
  const preferredSource = options.preferredSource || entity.classSource || entity.source || 'PHB';
  const resolveParsedSource = parsed => (
    parsed.source === 'PHB'
      ? resolveReferencedSpellSource(parsed.name, preferredSource)
      : parsed.source
  );
  for (const block of entity.additionalSpells || []) {
    if (options.skipNamedBlocks && (block.name || block.ENG_name)) continue;
    for (const [level, refs] of Object.entries(block.prepared || {})) {
      const classLevel = Number(level);
      if (!Number.isFinite(classLevel) || !Array.isArray(refs)) continue;
      for (const ref of refs) {
        const parsed = parseSpellRef(ref);
        if (parsed) out.push({ mode: 'prepared', level: classLevel, name: parsed.name, source: resolveParsedSource(parsed) });
      }
    }
    for (const [spellLevelKey, refs] of Object.entries(block.expanded || {})) {
      const spellLevel = Number(String(spellLevelKey).replace(/^s/, ''));
      if (!Number.isFinite(spellLevel) || !Array.isArray(refs)) continue;
      const classLevel = Math.max(1, spellLevel * 2 - 1);
      for (const ref of refs) {
        const parsed = parseSpellRef(ref);
        if (!parsed) continue;
        out.push({
          mode: 'expanded',
          level: classLevel,
          name: parsed.name,
          source: resolveParsedSource(parsed),
        });
      }
    }
  }
  return out;
};

const parseClassFeatureLevel = featureRef => {
  const ref = typeof featureRef === 'string' ? featureRef : featureRef?.classFeature;
  if (!ref) return 0;
  const level = [...String(ref).split('|')].reverse().find(part => /^\d+$/.test(part));
  return Number(level) || 0;
};

const normalizeSubclassFeatureEntries = (
  features,
  subclass,
) => {
  const direct = features.filter(feature => (
    feature.className === subclass.className
    && feature.classSource === subclass.classSource
    && feature.subclassShortName === subclass.shortName
    && feature.subclassSource === subclass.source
    && feature.entries
  ));
  const fallback = subclass.classSource === 'XPHB' && direct.length === 0
    ? features
      .filter(feature => (
        feature.className === subclass.className
        && feature.classSource === 'PHB'
        && feature.subclassShortName === subclass.shortName
        && feature.subclassSource === subclass.source
        && feature.entries
      ))
      .map(feature => ({
        ...feature,
        classSource: 'XPHB',
        level: feature.level === 1 ? 3 : feature.level,
      }))
    : [];
  return [...direct, ...fallback]
    .map(feature => ({
    name: feature.name,
    englishName: feature.ENG_name,
    source: feature.source,
    level: feature.level,
    description: summarizeEntries(feature.entries),
  }))
    .filter(feature => feature.description);
};

const classIndex = readJson('class/index.json');
const classes = Object.values(classIndex)
  .filter(fileName => fileName.startsWith('class-') && !fileName.includes('mystic') && !fileName.includes('sidekick'))
  .map(normalizeClassFile);

const races = readJson('races.json');
const backgrounds = readJson('backgrounds.json');
const itemsBase = readJson('items-base.json');
const items = readJson('items.json');
const feats = readJson('feats.json');
const optionalFeatures = readJson('optionalfeatures.json');
const spellIndex = readJson('spells/index.json');
const autoBuilderSpellFiles = AUTO_BUILDER_SPELL_SOURCES
  .map(source => readJson(`spells/${spellIndex[source]}`).spell || []);
const autoBuilderSpellList = autoBuilderSpellFiles.flat();
const spellByNameAndSource = new Map(autoBuilderSpellList.map(spell => [`${spell.name}|${spell.source}`, spell]));

const resolveReferencedSpellSource = (name, preferredSource = 'PHB') => {
  if (preferredSource === 'XPHB' && spellByNameAndSource.has(`${name}|XPHB`)) return 'XPHB';
  if (spellByNameAndSource.has(`${name}|PHB`)) return 'PHB';
  for (const source of OFFICIAL_EXTENSION_SPELL_SOURCES) {
    if (spellByNameAndSource.has(`${name}|${source}`)) return source;
  }
  return preferredSource;
};

const coreData = {
  generatedAt: new Date().toISOString(),
  rules: {
    '5e': {
      primarySources: ['PHB'],
      spellSources: ['PHB', ...OFFICIAL_EXTENSION_SPELL_SOURCES],
      invocationSources: ['PHB', 'XGE', 'TCE'],
      fightingStyleSources: ['PHB', 'TCE'],
      metamagicSources: ['PHB', 'TCE'],
      maneuverSources: ['PHB', 'TCE'],
      raceSources: AUTO_BUILDER_RACE_SOURCE_PRIORITY_5E,
      officialExtensionsEnabled: true,
    },
    '5r': {
      primarySources: ['XPHB'],
      spellSources: ['XPHB', 'PHB', ...OFFICIAL_EXTENSION_SPELL_SOURCES],
      invocationSources: ['XPHB', 'PHB', 'XGE', 'TCE'],
      fightingStyleSources: ['XPHB', 'PHB', 'TCE'],
      metamagicSources: ['XPHB', 'PHB', 'TCE'],
      maneuverSources: ['XPHB', 'PHB', 'TCE'],
      raceSources: AUTO_BUILDER_RACE_SOURCE_PRIORITY_5R,
      officialExtensionsEnabled: true,
    },
  },
  classes,
  races: {
    race: (races.race || []).map(race => pick(race, [
      'name',
      'ENG_name',
      'source',
      'edition',
      'size',
      'speed',
      'ability',
      'traitTags',
      'additionalSpells',
      'languageProficiencies',
      'entries',
    ])),
    subrace: (races.subrace || []).map(subrace => pick(subrace, [
      'name',
      'ENG_name',
      'source',
      'raceName',
      'raceSource',
      'edition',
      'ability',
      'additionalSpells',
      'entries',
    ])),
  },
  backgrounds: (backgrounds.background || []).map(background => pick(background, [
    'name',
    'ENG_name',
    'source',
    'edition',
    'ability',
    'feats',
    'skillProficiencies',
    'toolProficiencies',
    'languageProficiencies',
    'additionalSpells',
    'startingEquipment',
    'entries',
  ])),
  feats: (feats.feat || []).map(feat => pick(feat, [
    'name',
    'ENG_name',
    'source',
    'category',
    'prerequisite',
    'ability',
    'skillProficiencies',
    'toolProficiencies',
    'languageProficiencies',
    'weaponProficiencies',
    'armorProficiencies',
    'expertise',
    'additionalSpells',
    'entries',
  ])),
  items: {
    baseitem: (itemsBase.baseitem || []).map(item => pick(item, [
      'name',
      'ENG_name',
      'source',
      'type',
      'rarity',
      'weight',
      'value',
      'dmg1',
      'dmg2',
      'dmgType',
      'property',
      'range',
      'ac',
      'armor',
      'stealth',
      'strength',
      'entries',
      'additionalEntries',
    ])),
    item: (items.item || []).map(item => pick(item, [
      'name',
      'ENG_name',
      'source',
      'type',
      'rarity',
      'reqAttune',
      'weight',
      'value',
      'dmg1',
      'dmg2',
      'dmgType',
      'property',
      'range',
      'ac',
      'bonusWeapon',
      'bonusAc',
      'entries',
    ])),
    itemProperty: itemsBase.itemProperty || [],
    itemType: itemsBase.itemType || [],
    itemMastery: itemsBase.itemMastery || [],
  },
  spells: autoBuilderSpellList.map(normalizeSpell),
  spellSources: normalizeSpellSources(),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, `${JSON.stringify(coreData, null, 2)}\n`);
console.log(`Wrote ${path.relative(ROOT, OUT_FILE)}`);

const spellSources = normalizeSpellSources();
const sourceForRule = ruleSystem => ruleSystem === '5r' ? 'XPHB' : 'PHB';
const spellLevelLimit = level => Math.max(0, Math.min(9, Math.ceil(level / 2)));
const isSpellForClass = (spell, cls) => {
  const meta = spellSources[`${spell.name}|${spell.source}`];
  if (!meta) return false;
  const source = cls.classSource || cls.source;
  return Boolean(
    meta.class?.[source]?.[cls.name]
    || meta.classVariant?.[source]?.[cls.name]
    || meta.class?.[cls.source]?.[cls.name]
    || meta.classVariant?.[cls.source]?.[cls.name],
  );
};

const isSpellForSubclass = (spell, subclass) => {
  const meta = spellSources[`${spell.name}|${spell.source}`];
  if (!meta || CORE_SPELL_SOURCES.includes(spell.source) || spell.source !== subclass.source) return false;
  const subclassGroup = meta.subclass?.[subclass.classSource]?.[subclass.className];
  if (!subclassGroup) return false;
  const sourceGroup = subclassGroup[subclass.source];
  if (!sourceGroup) return false;
  return Boolean(
    sourceGroup[subclass.shortName]
    || sourceGroup[subclass.name]
    || sourceGroup[subclass.ENG_name],
  );
};

const autoBuilderClasses = Object.values(classIndex)
  .filter(fileName => fileName.startsWith('class-') && !fileName.includes('mystic') && !fileName.includes('sidekick') && !fileName.includes('artificer'))
  .flatMap(fileName => {
    const data = readJson(`class/${fileName}`);
    return (data.class || [])
      .filter(cls => cls.source === 'PHB' || cls.source === 'XPHB')
      .map(cls => {
        const levelFeatures = (data.classFeature || [])
          .filter(feature => feature.className === cls.name && feature.classSource === cls.source && feature.level === 1 && feature.source === cls.source)
          .map(feature => ({
            name: feature.name,
            englishName: feature.ENG_name,
            source: feature.source,
            level: feature.level,
            description: summarizeEntries(feature.entries),
          }));
        const allLevelFeatures = (data.classFeature || [])
          .filter(feature => feature.className === cls.name && feature.classSource === cls.source && feature.source === cls.source)
          .map(feature => ({
            name: feature.name,
            englishName: feature.ENG_name,
            source: feature.source,
            level: feature.level,
            description: summarizeEntries(feature.entries),
          }));

        return {
          key: cls.ENG_name,
          name: cls.name,
          englishName: cls.ENG_name,
          source: cls.source,
          ruleSystem: cls.source === 'XPHB' ? '5r' : '5e',
          edition: cls.edition,
          hitDie: cls.hd?.faces,
          savingThrows: cls.proficiency || [],
          spellcastingAbility: cls.spellcastingAbility,
          casterProgression: cls.casterProgression,
          preparedSpells: cls.preparedSpells,
          preparedSpellsChange: cls.preparedSpellsChange,
          preparedSpellsProgression: cls.preparedSpellsProgression,
          cantripProgression: cls.cantripProgression,
          spellsKnownProgression: cls.spellsKnownProgression,
          spellsKnownProgressionFixed: cls.spellsKnownProgressionFixed,
          spellsKnownProgressionFixedByLevel: cls.spellsKnownProgressionFixedByLevel,
          spellsKnownProgressionFixedAllowLowerLevel: cls.spellsKnownProgressionFixedAllowLowerLevel,
          spellSlotProgression: normalizeSpellSlotProgression(cls),
          pactSlotProgression: normalizePactSlotProgression(cls),
          invocationProgression: normalizeInvocationProgression(cls),
          metamagicProgression: normalizeOptionalFeatureProgression(cls, 'MM'),
          weaponMasteryProgression: normalizeWeaponMasteryProgression(cls),
          channelDivinityProgression: normalizeClassTableProgression(cls, '引导神力'),
          favoredEnemyProgression: normalizeClassTableProgression(cls, '宿敌'),
          sorceryPointProgression: normalizeClassTableProgression(cls, '术法点'),
          additionalPreparedSpells: normalizeAdditionalPreparedSpells(cls),
          multiclassProficiencies: cls.multiclassing?.proficienciesGained,
          subclassLevels: (cls.classFeatures || [])
            .filter(feature => typeof feature === 'object' && feature.gainSubclassFeature)
            .map(parseClassFeatureLevel)
            .filter(Boolean),
          startingProficiencies: cls.startingProficiencies,
          levelOneFeatures: levelFeatures,
          levelFeatures: allLevelFeatures,
        };
      });
  });

const autoBuilderSubclasses = Object.values(classIndex)
  .filter(fileName => fileName.startsWith('class-') && !fileName.includes('mystic') && !fileName.includes('sidekick') && !fileName.includes('artificer'))
  .flatMap(fileName => {
    const data = readJson(`class/${fileName}`);
    return (data.subclass || [])
      .filter(subclass => (
        (subclass.classSource === 'PHB' || subclass.classSource === 'XPHB')
        && subclass.source
        && !OFFICIAL_SUBCLASS_EXCLUDED_SOURCES.has(subclass.source)
        && !String(subclass.source).startsWith('UA')
      ))
      .map(subclass => {
        const directAdditionalSpells = normalizeAdditionalPreparedSpells(subclass, {
          skipNamedBlocks: true,
          preferredSource: subclass.classSource,
        });
        const fallbackSubclass = subclass.classSource === 'XPHB' && directAdditionalSpells.length === 0
          ? (data.subclass || []).find(candidate => (
            candidate.className === subclass.className
            && candidate.classSource === 'PHB'
            && candidate.shortName === subclass.shortName
            && candidate.source === subclass.source
          ))
          : null;

        return {
          id: `${subclass.className}|${subclass.classSource}|${subclass.shortName}|${subclass.source}`,
          key: subclass.ENG_name || subclass.shortName || subclass.name,
          name: subclass.name,
          englishName: subclass.ENG_name,
          shortName: subclass.shortName,
          source: subclass.source,
          ruleSystem: subclass.classSource === 'XPHB' ? '5r' : '5e',
          className: subclass.className,
          classSource: subclass.classSource,
          features: normalizeSubclassFeatureEntries(data.subclassFeature || [], subclass),
          maneuverProgression: normalizeOptionalFeatureProgression(fallbackSubclass || subclass, 'MV:B'),
          additionalPreparedSpells: fallbackSubclass
            ? normalizeAdditionalPreparedSpells(fallbackSubclass, { skipNamedBlocks: true, preferredSource: subclass.classSource })
            : directAdditionalSpells,
        };
      })
      .filter(subclass => subclass.features.length);
  });

const SPELL_CLASS_KEY_BY_NAME = {
  吟游诗人: 'Bard',
  牧师: 'Cleric',
  德鲁伊: 'Druid',
  武僧: 'Monk',
  圣武士: 'Paladin',
  游侠: 'Ranger',
  术士: 'Sorcerer',
  魔契师: 'Warlock',
  法师: 'Wizard',
  奇械师: 'Artificer',
};

const getSpellClassKeys = spell => {
  const meta = spellSources[`${spell.name}|${spell.source}`] || {};
  const metadataNames = ['class', 'classVariant'].flatMap(kind => (
    Object.values(meta[kind] || {}).flatMap(source => Object.keys(source || {}))
  ));
  return Array.from(new Set([
    ...autoBuilderClasses
      .filter(cls => isSpellForClass(spell, cls))
      .map(cls => cls.key),
    ...metadataNames.map(name => SPELL_CLASS_KEY_BY_NAME[name] || name),
  ]));
};

const autoBuilderSpells = autoBuilderSpellList
  .map(spell => ({
    id: `${spell.name}|${spell.source}`,
    name: spell.name,
    englishName: spell.ENG_name,
    source: spell.source,
    ruleSystem: spell.source === 'XPHB' ? '5r' : '5e',
    level: spell.level,
    school: spell.school,
    time: spell.time,
    range: spell.range,
    components: spell.components,
    duration: spell.duration,
    meta: spell.meta,
    damageInflict: spell.damageInflict,
    spellAttack: spell.spellAttack,
    classKeys: getSpellClassKeys(spell),
	    subclassIds: Array.from(new Set(autoBuilderSubclasses
	      .filter(subclass => isSpellForSubclass(spell, subclass))
	      .map(subclass => subclass.id))),
	    description: summarizeEntries(spell.entries || []),
	  }));

const autoBuilderData = {
  generatedAt: coreData.generatedAt,
  classes: autoBuilderClasses,
  subclasses: autoBuilderSubclasses,
  races: (races.race || [])
    .filter(race => AUTO_BUILDER_RACE_SOURCES.has(race.source))
    .map(normalizeEntityForAutoBuilder),
  subraces: (races.subrace || [])
    .filter(subrace => AUTO_BUILDER_RACE_SOURCES.has(subrace.source) && subrace.ENG_name && subrace.name)
    .map(subrace => ({
      ...normalizeEntityForAutoBuilder(subrace),
      raceName: subrace.raceName,
      raceSource: subrace.raceSource,
    })),
  backgrounds: (backgrounds.background || [])
    .filter(background => background.source === 'PHB' || background.source === 'XPHB')
    .map(normalizeEntityForAutoBuilder),
  feats: (feats.feat || [])
    .filter(feat => AUTO_BUILDER_FEAT_SOURCES.has(feat.source))
    .map(normalizeFeatForAutoBuilder),
  invocations: (optionalFeatures.optionalfeature || [])
    .filter(feature => feature.featureType?.includes('EI') && AUTO_BUILDER_INVOCATION_SOURCES.includes(feature.source))
    .map(normalizeInvocation)
    .filter(invocation => invocation.description)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
  fightingStyles: (optionalFeatures.optionalfeature || [])
    .filter(feature => feature.featureType?.some(type => ['FS:F', 'FS:P', 'FS:R'].includes(type)))
    .filter(feature => AUTO_BUILDER_FIGHTING_STYLE_SOURCES.includes(feature.source))
    .map(normalizeFightingStyle)
    .filter(style => style.description)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
  metamagics: (optionalFeatures.optionalfeature || [])
    .filter(feature => feature.featureType?.includes('MM') && AUTO_BUILDER_METAMAGIC_SOURCES.includes(feature.source))
    .map(normalizeMetamagic)
    .filter(metamagic => metamagic.description)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
  maneuvers: (optionalFeatures.optionalfeature || [])
    .filter(feature => feature.featureType?.includes('MV:B') && AUTO_BUILDER_MANEUVER_SOURCES.includes(feature.source))
    .map(normalizeManeuver)
    .filter(maneuver => maneuver.description)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
  weapons: (itemsBase.baseitem || [])
    .filter(item => item.weapon && (item.source === 'PHB' || item.source === 'XPHB'))
    .map(normalizeWeapon)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
  weaponMasteries: (itemsBase.itemMastery || [])
    .filter(mastery => mastery.source === 'XPHB')
    .map(normalizeWeaponMastery)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
  armors: (itemsBase.baseitem || [])
    .filter(item => (item.armor || item.type?.split('|')[0] === 'S') && (item.source === 'PHB' || item.source === 'XPHB'))
    .map(normalizeArmor)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
  spells: autoBuilderSpells,
  rules: coreData.rules,
};

fs.mkdirSync(PUBLIC_OUT_DIR, { recursive: true });
fs.writeFileSync(AUTO_BUILDER_OUT_FILE, `${JSON.stringify(autoBuilderData, null, 2)}\n`);
console.log(`Wrote ${path.relative(ROOT, AUTO_BUILDER_OUT_FILE)}`);
console.log(JSON.stringify({
  autoBuilder: {
    classes: autoBuilderData.classes.length,
    subclasses: autoBuilderData.subclasses.length,
    races: autoBuilderData.races.length,
    subraces: autoBuilderData.subraces.length,
    raceSources: countBy(autoBuilderData.races, race => race.source),
    subraceSources: countBy(autoBuilderData.subraces, subrace => subrace.source),
    feats: autoBuilderData.feats.length,
    invocations: autoBuilderData.invocations.length,
    invocationSources: countBy(autoBuilderData.invocations, invocation => invocation.source),
    fightingStyles: autoBuilderData.fightingStyles.length,
    fightingStyleSources: countBy(autoBuilderData.fightingStyles, style => style.source),
    metamagics: autoBuilderData.metamagics.length,
    metamagicSources: countBy(autoBuilderData.metamagics, metamagic => metamagic.source),
    maneuvers: autoBuilderData.maneuvers.length,
    maneuverSources: countBy(autoBuilderData.maneuvers, maneuver => maneuver.source),
    weapons: autoBuilderData.weapons.length,
    armors: autoBuilderData.armors.length,
    spells: autoBuilderData.spells.length,
    spellSources: countBy(autoBuilderData.spells, spell => spell.source),
  },
}, null, 2));
