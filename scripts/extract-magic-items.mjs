/**
 * Extract magic items from 5etools-cn data.
 *
 * Processes third_party/5etools-cn/data/items.json and outputs
 * normalized magic items to data/character-content/magic-items.json.
 *
 * Usage: node scripts/extract-magic-items.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_ROOT = path.join(ROOT, 'third_party/5etools-cn/data');
const OUT_DIR = path.join(ROOT, 'data/character-content');
const OUT_FILE = path.join(OUT_DIR, 'magic-items.json');
const PUBLIC_DIR = path.join(ROOT, 'public/character-content');
const PUBLIC_OUT_FILE = path.join(PUBLIC_DIR, 'magic-items.json');

// Types that represent weapons (WD = Weapon, $A = Ammunition, etc.)
const WEAPON_TYPES = new Set([
  'WD|DMG', 'WD|XDMG',
  '$A|DMG', '$A|XDMG',
  'M', 'M|XPHB',
  'R', 'R|XPHB',
]);
// Types that represent armor (HA = Heavy Armor, MA = Medium Armor, LA = Light Armor, S = Shield, A = Armor)
const ARMOR_TYPES = new Set([
  'HA', 'HA|XPHB',
  'MA', 'MA|XPHB',
  'LA', 'LA|XPHB',
  'S', 'S|XPHB',
  'A', 'A|XPHB',
]);
// Types that represent spellcasting foci
const FOCUS_TYPES = new Set([
  'SCF', 'SCF|XPHB',
  'WD|DMG', 'WD|XDMG', // wands
  'RD|DMG', 'RD|XDMG', // rods
  'SC|DMG', 'SC|XPHB',  // scrolls
]);
// Types that represent potions
const POTION_TYPES = new Set([
  'P', 'P|XPHB',
]);
// Types that represent rings
const RING_TYPES = new Set([
  'R', 'R|XPHB',
]);
// Types that represent wondrous items
const WONDROUS_TYPES = new Set([
  'G', 'G|XPHB',  // gear / wondrous
  'TG', 'TG|XDMG',  // treasure
]);

const readJson = relativePath =>
  JSON.parse(fs.readFileSync(path.join(DATA_ROOT, relativePath), 'utf8'));

const stripTags = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\{@(?:i?tag|condition|damage|dice|skill|spell|item|creature|book|filter|note|5etools|table)\s*[^}]*\}/g, '')
    .replace(/\{@(?:atk|dc|chance|damage [^}]+)\}/g, '')
    .replace(/\{@hit ([^}]+)\}/g, '$1')
    .replace(/\{@dice ([^}]+)\}/g, '$1')
    .replace(/\{@scaledice ([^}]+)\}/g, '$1')
    .replace(/\{@(?:damage|attack|heal) ([^}]+)\}/g, '$1')
    .replace(/\{@recharge([^}]*)\}/g, '（充能$1）')
    .replace(/\|([^|}]+)\}/g, '』')  // close link
    .replace(/\{@(?:link|i?tag|5etools)\s+([^|}]+)/g, '『$1')
    .replace(/\{@/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const summarizeEntries = (entries, depth = 0) => {
  if (!Array.isArray(entries)) return '';
  if (depth > 5) return '';
  const lines = [];
  for (const entry of entries) {
    if (typeof entry === 'string') {
      lines.push(stripTags(entry));
    } else if (entry && typeof entry === 'object') {
      if (entry.name && Array.isArray(entry.entries)) {
        lines.push(`\n${stripTags(entry.name)}: ${summarizeEntries(entry.entries, depth + 1)}`);
      } else if (entry.name && typeof entry.entry === 'string') {
        lines.push(`\n${stripTags(entry.name)}: ${stripTags(entry.entry)}`);
      } else if (Array.isArray(entry.entries)) {
        lines.push(summarizeEntries(entry.entries, depth + 1));
      } else if (Array.isArray(entry.items)) {
        for (const item of entry.items.slice(0, 6)) {
          if (typeof item === 'string') lines.push(stripTags(item));
        }
      } else if (entry.type === 'list' && Array.isArray(entry.items)) {
        for (const item of entry.items) {
          if (typeof item === 'string') lines.push(`- ${stripTags(item)}`);
          else if (item.type === 'item' && typeof item.name === 'string') {
            lines.push(`- ${stripTags(item.name)}`);
          }
        }
      } else if (entry.type === 'table' && entry.caption) {
        lines.push(`\n[${stripTags(entry.caption)}]`);
      }
    }
  }
  return lines.filter(Boolean).join('\n').trim();
};

const TYPE_LABELS = {
  'WD|DMG': '武器', 'WD|XDMG': '武器',
  '$A|DMG': '弹药', '$A|XDMG': '弹药',
  'M': '近战武器', 'M|XPHB': '近战武器',
  'R': '远程武器', 'R|XPHB': '远程武器',
  'HA': '重甲', 'HA|XPHB': '重甲',
  'MA': '中甲', 'MA|XPHB': '中甲',
  'LA': '轻甲', 'LA|XPHB': '轻甲',
  'A': '护甲', 'A|XPHB': '护甲',
  'S': '盾牌', 'S|XPHB': '盾牌',
  'SCF': '法器', 'SCF|XPHB': '法器',
  'RD|DMG': '权杖', 'RD|XDMG': '权杖',
  'WD|DMG': '魔杖', 'WD|XDMG': '魔杖',
  'SC|DMG': '卷轴', 'SC|XPHB': '卷轴',
  'P': '药水', 'P|XPHB': '药水',
  'R': '戒指', 'R|XPHB': '戒指',
  'G': '奇物', 'G|XPHB': '奇物',
  'TG': '宝藏', 'TG|XDMG': '宝藏',
  'FD': '食物', 'FD|XPHB': '食物',
  'INS': '乐器', 'INS|XPHB': '乐器',
  'MNT': '坐骑', 'MNT|XPHB': '坐骑',
  'TAH': '工具', 'TAH|XPHB': '工具',
  'T': '法器', 'T|XPHB': '法器',
  'OTH': '其他', 'EXP|DMG': '爆炸物', 'EXP|XDMG': '爆炸物',
  'VEH': '载具', 'VEH|XPHB': '载具',
  'SHP': '船只', 'SHP|XPHB': '船只',
  'GS': '赌博套装', 'GS|XPHB': '赌博套装',
};

const getTypeLabel = (type) => TYPE_LABELS[type] || type || '奇物';

const parseAttunement = (item) => {
  if (!item.reqAttune) return null;
  const tags = item.reqAttuneTags;
  let condition = '';
  if (Array.isArray(tags) && tags.length > 0) {
    condition = tags
      .map(tag => {
        if (typeof tag === 'string') return tag;
        if (tag.class) return tag.class.split('|')[0];
        if (tag.race) return tag.race.split('|')[0];
        if (tag.background) return tag.background.split('|')[0];
        if (tag.alignment) return tag.alignment;
        return '';
      })
      .filter(Boolean)
      .join(', ');
  }
  if (!condition && typeof item.reqAttune === 'string' && item.reqAttune !== 'true') {
    condition = item.reqAttune;
  }
  return {
    required: true,
    ...(condition ? { condition } : {}),
  };
};

const normalizeItem = (item) => {
  const typeCode = item.type || '';
  const armorMatch = typeCode.match(/^(HA|MA|LA|A)(?:\|XPHB)?$/);
  
  return {
    id: `${item.name}|${item.source}`,
    name: item.name,
    englishName: item.ENG_name || undefined,
    source: item.source,
    type: typeCode,
    typeLabel: getTypeLabel(typeCode),
    rarity: item.rarity || 'none',
    tier: item.tier || undefined,
    
    // Attunement
    attunement: parseAttunement(item),
    
    // Type-specific categories
    isWeapon: WEAPON_TYPES.has(typeCode),
    isArmor: ARMOR_TYPES.has(typeCode),
    isFocus: FOCUS_TYPES.has(typeCode),
    isPotion: POTION_TYPES.has(typeCode),
    isRing: RING_TYPES.has(typeCode),
    isWondrous: WONDROUS_TYPES.has(typeCode),
    isScroll: typeCode.startsWith('SC'),
    
    // Weapon-specific fields
    weaponCategory: item.weaponCategory || undefined,
    dmg1: item.dmg1 || undefined,
    dmg2: item.dmg2 || undefined,
    dmgType: item.dmgType || undefined,
    property: item.property || undefined,
    range: item.range || undefined,
    
    // Armor-specific fields
    ac: item.ac || undefined,
    armor: item.armor || undefined,
    stealth: item.stealth || undefined,
    strength: item.strength || undefined,
    
    // Bonuses
    bonusWeapon: item.bonusWeapon || undefined,
    bonusAc: item.bonusAc || undefined,
    bonusSpellAttack: item.bonusSpellAttack || undefined,
    bonusSpellSaveDc: item.bonusSpellSaveDc || undefined,
    
    // Capacity
    weight: item.weight || undefined,
    value: item.value || undefined,
    
    // Description
    description: summarizeEntries(item.entries || []),
    
    // Categorized for quick filtering
    category: getItemCategory(typeCode, item),
  };
};

const getItemCategory = (type, item) => {
	  if (WEAPON_TYPES.has(type)) return 'weapon';
	  if (ARMOR_TYPES.has(type)) return 'armor';
	  if (type.startsWith('SC')) return 'scroll';
	  if (POTION_TYPES.has(type)) return 'potion';
	  if (RING_TYPES.has(type)) return 'ring';
	  if (FOCUS_TYPES.has(type) && !WEAPON_TYPES.has(type)) return 'focus';
	  if (item.wondrous) return 'wondrous';
	  if (WONDROUS_TYPES.has(type)) return 'wondrous';
	  if (type === 'FD' || type === 'FD|XPHB') return 'food';
	  if (type === 'INS' || type === 'INS|XPHB') return 'instrument';
	  if (type === 'TAH' || type === 'TAH|XPHB') return 'tool';
	  if (!type) return 'wondrous';
	  return 'other';
	};

// --- Main ---
const items = readJson('items.json');
const rawItems = items.item || [];

console.log(`Total items in source: ${rawItems.length}`);

const magicItems = rawItems
  .filter(item => {
    // Keep items that have a defined rarity
    const r = item.rarity || 'none';
    return r !== 'none' && r !== 'unknown';
  })
  .map(normalizeItem)
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));

console.log(`Magic items extracted: ${magicItems.length}`);

// Stats
const byRarity = {};
const bySource = {};
const byCategory = {};
for (const item of magicItems) {
  byRarity[item.rarity] = (byRarity[item.rarity] || 0) + 1;
  bySource[item.source] = (bySource[item.source] || 0) + 1;
  byCategory[item.category] = (byCategory[item.category] || 0) + 1;
}
console.log('\nBy rarity:', JSON.stringify(byRarity, null, 2));
console.log('\nBy category:', JSON.stringify(byCategory, null, 2));
console.log('\nBy source (top 15):', Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 15));

const output = {
  generatedAt: new Date().toISOString(),
  total: magicItems.length,
  items: magicItems,
};

// Write full data
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf8');

// Write public version (compressed)
fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.writeFileSync(PUBLIC_OUT_FILE, JSON.stringify(output), 'utf8');

console.log(`\nWritten to ${OUT_FILE}`);
console.log(`Public version at ${PUBLIC_OUT_FILE}`);
