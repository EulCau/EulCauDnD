import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BESTIARY_DIR = path.join(ROOT, 'third_party/5etools-cn/data/bestiary');
const OUT_FILE = path.join(ROOT, 'public/data/bestiary-index.json');

const SIZE_LABELS = {
  T: '超小',
  S: '小型',
  M: '中型',
  L: '大型',
  H: '巨型',
  G: '超巨型',
};

const ALIGNMENT_LABELS = {
  L: '守序',
  N: '中立',
  C: '混乱',
  G: '善良',
  E: '邪恶',
  U: '无阵营',
  A: '任意阵营',
};

const TYPE_LABELS = {
  aberration: '异怪',
  beast: '野兽',
  celestial: '天界生物',
  construct: '构装生物',
  dragon: '龙',
  elemental: '元素生物',
  fey: '精类',
  fiend: '邪魔',
  giant: '巨人',
  humanoid: '类人生物',
  monstrosity: '怪兽',
  ooze: '泥怪',
  plant: '植物',
  undead: '不死生物',
};

const readJson = file => JSON.parse(fs.readFileSync(path.join(BESTIARY_DIR, file), 'utf8'));

const stripTags = value => {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\{@(?:creature|spell|item|condition|damage|dice|filter|skill|action|sense|book|quickref|5etools) ([^}|]+)(?:\|[^}]*)?}/g, '$1')
    .replace(/\{@(?:hit|dc|chance|recharge) ([^}]+)}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
};

const formatType = type => {
  if (typeof type === 'string') return TYPE_LABELS[type] || type;
  if (!type || typeof type !== 'object') return '';
  const base = TYPE_LABELS[type.type] || type.type || '';
  const tags = (type.tags || []).map(tag => (typeof tag === 'string' ? tag : tag?.tag)).filter(Boolean);
  return [base, tags.length ? `(${tags.join(', ')})` : ''].filter(Boolean).join(' ');
};

const formatAlignment = alignment => {
  if (!Array.isArray(alignment)) return '';
  return alignment
    .map(entry => {
      if (typeof entry === 'string') return ALIGNMENT_LABELS[entry] || entry;
      if (entry?.alignment) return formatAlignment(entry.alignment);
      return '';
    })
    .filter(Boolean)
    .join(' ');
};

const getAcValue = ac => {
  const first = Array.isArray(ac) ? ac[0] : ac;
  if (typeof first === 'number') return first;
  if (first && typeof first === 'object' && typeof first.ac === 'number') return first.ac;
  return null;
};

const formatAc = ac => {
  const first = Array.isArray(ac) ? ac[0] : ac;
  if (typeof first === 'number') return String(first);
  if (first && typeof first === 'object') {
    const from = Array.isArray(first.from) ? ` (${first.from.map(stripTags).join(', ')})` : '';
    return first.ac ? `${first.ac}${from}` : '';
  }
  return '';
};

const formatSpeed = speed => {
  if (!speed || typeof speed !== 'object') return '';
  return Object.entries(speed)
    .map(([mode, value]) => {
      if (typeof value === 'number') return `${mode} ${value}`;
      if (value === true) return mode;
      return '';
    })
    .filter(Boolean)
    .join(', ');
};

const formatCr = cr => {
  if (typeof cr === 'string') return cr;
  if (typeof cr === 'number') return String(cr);
  if (cr && typeof cr === 'object') return String(cr.cr || cr.lair || cr.coven || '');
  return '';
};

const files = fs.readdirSync(BESTIARY_DIR)
  .filter(file => /^bestiary-.*\.json$/.test(file))
  .sort();

const monsters = files.flatMap(file => {
  const data = readJson(file);
  return (data.monster || []).map(monster => {
    const cr = formatCr(monster.cr);
    const acValue = getAcValue(monster.ac);
    return {
      id: `${monster.name}|${monster.source}`,
      name: monster.name,
      englishName: monster.ENG_name,
      source: monster.source,
      size: (monster.size || []).map(size => SIZE_LABELS[size] || size).join('/'),
      type: formatType(monster.type),
      alignment: formatAlignment(monster.alignment),
      cr,
      crNumber: cr === '0' ? 0 : Number(cr) || (cr === '1/8' ? 0.125 : cr === '1/4' ? 0.25 : cr === '1/2' ? 0.5 : null),
      ac: formatAc(monster.ac),
      acValue,
      hp: monster.hp?.average ?? null,
      hpFormula: monster.hp?.formula || '',
      speed: formatSpeed(monster.speed),
      environment: monster.environment || [],
      tags: [
        ...(monster.traitTags || []),
        ...(monster.senseTags || []),
        ...(monster.languageTags || []),
        ...(monster.miscTags || []),
      ],
    };
  });
});

const out = {
  generatedAt: new Date().toISOString(),
  total: monsters.length,
  sources: Object.fromEntries(Object.entries(monsters.reduce((counts, monster) => {
    counts[monster.source] = (counts[monster.source] || 0) + 1;
    return counts;
  }, {})).sort(([a], [b]) => a.localeCompare(b))),
  monsters: monsters.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN') || a.source.localeCompare(b.source)),
};

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${path.relative(ROOT, OUT_FILE)}`);
console.log(JSON.stringify({
  total: out.total,
  sources: Object.keys(out.sources).length,
  topSources: Object.entries(out.sources).sort((a, b) => b[1] - a[1]).slice(0, 10),
}, null, 2));
