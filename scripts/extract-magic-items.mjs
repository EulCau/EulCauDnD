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
const OUT_DIR = path.join(ROOT, 'public/data');
const OUT_FILE = path.join(OUT_DIR, 'magic-items.json');

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
	  // Items with weapon bonus but no type code are still weapons (e.g. generic +X weapon descriptions)
	  if (item.bonusWeapon && (!type || type === 'M' || type === '')) return 'weapon';
	  if (item.bonusAc && (!type || type === '')) return 'armor';
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

// Deduplicate source magic items by name (keep first occurrence, preferring DMG over XDMG)
const seenSource = new Set();
const uniqueMagicItems = [];
const sourcePriority = ['DMG', 'XDMG', 'PHB', 'XPHB'];
const getSourceRank = (s) => sourcePriority.indexOf(s) >= 0 ? sourcePriority.indexOf(s) : 99;

for (const item of rawItems.filter(item => {
  const r = item.rarity || 'none';
  return r !== 'none' && r !== 'unknown';
})) {
  const key = item.name;
  if (!seenSource.has(key)) {
    seenSource.add(key);
    uniqueMagicItems.push(item);
  } else {
    // If we already have this item, keep the one with higher-priority source
    const existingIdx = uniqueMagicItems.findIndex(i => i.name === key);
    if (existingIdx >= 0 && getSourceRank(item.source) < getSourceRank(uniqueMagicItems[existingIdx].source)) {
      uniqueMagicItems[existingIdx] = item;
    }
  }
}

const magicItems = uniqueMagicItems
  .map(normalizeItem)
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));

console.log(`Magic items extracted (deduplicated): ${magicItems.length}`);

// --- Generate generic +X templates (Weapon +1, Armor +1, etc.) ---
const GENERIC_PLUS_X_TEMPLATES = [
  { name: '+1 武器', englishName: '+1 Weapon', rarity: 'uncommon', category: 'weapon', typeLabel: '+1 武器', bonus: 1, bonusField: 'bonusWeapon' },
  { name: '+2 武器', englishName: '+2 Weapon', rarity: 'rare', category: 'weapon', typeLabel: '+2 武器', bonus: 2, bonusField: 'bonusWeapon' },
  { name: '+3 武器', englishName: '+3 Weapon', rarity: 'very rare', category: 'weapon', typeLabel: '+3 武器', bonus: 3, bonusField: 'bonusWeapon' },
  { name: '+1 护甲', englishName: '+1 Armor', rarity: 'rare', category: 'armor', typeLabel: '+1 护甲', bonus: 1, bonusField: 'bonusAc' },
  { name: '+2 护甲', englishName: '+2 Armor', rarity: 'very rare', category: 'armor', typeLabel: '+2 护甲', bonus: 2, bonusField: 'bonusAc' },
  { name: '+3 护甲', englishName: '+3 Armor', rarity: 'legendary', category: 'armor', typeLabel: '+3 护甲', bonus: 3, bonusField: 'bonusAc' },
  { name: '+1 盾牌', englishName: '+1 Shield', rarity: 'uncommon', category: 'armor', typeLabel: '+1 盾牌', bonus: 1, bonusField: 'bonusAc' },
  { name: '+2 盾牌', englishName: '+2 Shield', rarity: 'rare', category: 'armor', typeLabel: '+2 盾牌', bonus: 2, bonusField: 'bonusAc' },
  { name: '+3 盾牌', englishName: '+3 Shield', rarity: 'very rare', category: 'armor', typeLabel: '+3 盾牌', bonus: 3, bonusField: 'bonusAc' },
  { name: '+1 弹药', englishName: '+1 Ammunition', rarity: 'uncommon', category: 'weapon', typeLabel: '+1 弹药', bonus: 1, bonusField: 'bonusWeapon' },
  { name: '+2 弹药', englishName: '+2 Ammunition', rarity: 'rare', category: 'weapon', typeLabel: '+2 弹药', bonus: 2, bonusField: 'bonusWeapon' },
  { name: '+3 弹药', englishName: '+3 Ammunition', rarity: 'very rare', category: 'weapon', typeLabel: '+3 弹药', bonus: 3, bonusField: 'bonusWeapon' },
];

let generatedCount = 0;
for (const tmpl of GENERIC_PLUS_X_TEMPLATES) {
  if (magicItems.some(m => m.name === tmpl.name)) continue;
  const bonusStr = `+${tmpl.bonus}`;
  const item = {
    id: `${tmpl.name}|DMG`,
    name: tmpl.name,
    englishName: tmpl.englishName,
    source: 'DMG',
    type: '',
    typeLabel: tmpl.typeLabel,
    rarity: tmpl.rarity,
    tier: undefined,
    attunement: null,
    isWeapon: tmpl.category === 'weapon',
    isArmor: tmpl.category === 'armor',
    isFocus: false, isPotion: false, isRing: false, isWondrous: false, isScroll: false,
    weaponCategory: undefined, dmg1: undefined, dmg2: undefined, dmgType: undefined,
    property: undefined, range: undefined, ac: undefined, armor: undefined,
    stealth: undefined, strength: undefined,
    bonusWeapon: tmpl.bonusField === 'bonusWeapon' ? bonusStr : undefined,
    bonusAc: tmpl.bonusField === 'bonusAc' ? bonusStr : undefined,
    bonusSpellAttack: undefined, bonusSpellSaveDc: undefined,
    weight: undefined, value: undefined,
    description: `此${tmpl.typeLabel.includes('武器') || tmpl.typeLabel.includes('弹药') ? '武器' : '防具'}在攻击和伤害掷骰${tmpl.category === 'weapon' ? '' : '(或AC)'}上获得 ${bonusStr} 加值。`,
    category: tmpl.category,
  };
  magicItems.push(item);
  generatedCount++;
}

magicItems.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
console.log(`Generic +X variants generated: ${generatedCount}`);

// --- Generate generic magic item templates (Vicious, Dragon's Wrath, etc.) ---
const GENERIC_TEMPLATES = [
  {
    name: '恶毒武器',
    englishName: 'Vicious Weapon',
    rarity: 'common',
    category: 'weapon',
    typeLabel: '武器（恶毒）',
    bonusWeapon: null,
    bonusAc: null,
    description: '当你用一个该魔法武器命中目标时，目标额外受到 2d6 伤害。',
    source: 'DMG',
  },
  {
    name: '沉睡龙怒武器',
    englishName: "Slumbering Dragon's Wrath Weapon",
    rarity: 'uncommon',
    category: 'weapon',
    typeLabel: '武器（龙怒·沉睡）',
    bonusWeapon: '+1',
    bonusAc: null,
    description: '此魔法武器在攻击和伤害掷骰上获得 +1 加值。当你用此武器命中一条龙时，龙额外受到 1d6 力场伤害。用此武器攻击时，你可以在 60 英尺范围内说龙语。',
    source: 'FTD',
  },
  {
    name: '激活龙怒武器',
    englishName: "Stirring Dragon's Wrath Weapon",
    rarity: 'rare',
    category: 'weapon',
    typeLabel: '武器（龙怒·激活）',
    bonusWeapon: '+2',
    bonusAc: null,
    description: '此魔法武器在攻击和伤害掷骰上获得 +2 加值。当你用此武器命中一条龙时，龙额外受到 2d6 力场伤害。用此武器攻击时，你可以用动作喷出 30 英尺锥形的能量（DC 15 敏捷豁免，半伤），造成 6d6 你选择的龙息伤害类型（酸、冰、火、闪电、毒）。使用后直到第二天黎明才能再次使用。',
    source: 'FTD',
  },
  {
    name: '觉醒龙怒武器',
    englishName: "Wakened Dragon's Wrath Weapon",
    rarity: 'very rare',
    category: 'weapon',
    typeLabel: '武器（龙怒·觉醒）',
    bonusWeapon: '+2',
    bonusAc: null,
    description: '此魔法武器在攻击和伤害掷骰上获得 +2 加值。当你用此武器命中一条龙时，龙额外受到 4d6 力场伤害。用此武器攻击时，你可以用动作喷出 60 英尺锥形的能量（DC 17 敏捷豁免，半伤），造成 10d6 你选择的龙息伤害类型。使用后直到第二天黎明才能再次使用。你在进行豁免检定时获得等同于你魅力调整值的加值。',
    source: 'FTD',
  },
  {
    name: '神化龙怒武器',
    englishName: "Ascendant Dragon's Wrath Weapon",
    rarity: 'legendary',
    category: 'weapon',
    typeLabel: '武器（龙怒·神化）',
    bonusWeapon: '+3',
    bonusAc: null,
    description: '此魔法武器在攻击和伤害掷骰上获得 +3 加值。当你用此武器命中一条龙时，龙额外受到 4d6 力场伤害。用此武器攻击时，你可以用动作喷出 90 英尺锥形的能量（DC 21 敏捷豁免，半伤），造成 12d6 你选择的龙息伤害类型。使用后直到第二天黎明才能再次使用。你获得 60 英尺盲视，免疫麻痹和恐慌状态。',
    source: 'FTD',
  },
];

let templateCount = 0;
for (const tmpl of GENERIC_TEMPLATES) {
  // Skip if an item with the same name already exists
  if (magicItems.some(m => m.name === tmpl.name)) continue;
  magicItems.push({
    id: `${tmpl.name}|${tmpl.source}`,
    name: tmpl.name,
    englishName: tmpl.englishName,
    source: tmpl.source,
    type: '',
    typeLabel: tmpl.typeLabel,
    rarity: tmpl.rarity,
    tier: undefined,
    attunement: null,
    isWeapon: true,
    isArmor: false,
    isFocus: false,
    isPotion: false,
    isRing: false,
    isWondrous: false,
    isScroll: false,
    weaponCategory: undefined,
    dmg1: undefined,
    dmg2: undefined,
    dmgType: undefined,
    property: undefined,
    range: undefined,
    ac: undefined,
    armor: undefined,
    stealth: undefined,
    strength: undefined,
    bonusWeapon: tmpl.bonusWeapon,
    bonusAc: tmpl.bonusAc,
    bonusSpellAttack: undefined,
    bonusSpellSaveDc: undefined,
    weight: undefined,
    value: undefined,
    description: tmpl.description,
    category: tmpl.category,
  });
  templateCount++;
}

magicItems.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
console.log(`Generic templates added: ${templateCount}`);
console.log(`Total magic items: ${magicItems.length}`);

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

	// Write minified JSON (used by the frontend)
	fs.mkdirSync(OUT_DIR, { recursive: true });
	fs.writeFileSync(OUT_FILE, JSON.stringify(output), 'utf8');
	
	console.log(`\nWritten to ${OUT_FILE}`);
