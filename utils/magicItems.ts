export interface MagicItemData {
  id: string;
  name: string;
  englishName?: string;
  source: string;
  type: string;
  typeLabel: string;
  rarity: string;
  tier?: string;
  attunement?: { required: boolean; condition?: string };
  isWeapon: boolean;
  isArmor: boolean;
  isFocus: boolean;
  isPotion: boolean;
  isRing: boolean;
  isWondrous: boolean;
  isScroll: boolean;
  weaponCategory?: string;
  dmg1?: string;
  dmg2?: string;
  dmgType?: string;
  property?: string[];
  range?: string;
  ac?: number;
  armor?: string;
  stealth?: boolean;
  strength?: string;
  bonusWeapon?: string;
  bonusAc?: string;
  bonusSpellAttack?: string;
  bonusSpellSaveDc?: string;
  weight?: string;
  value?: string;
  description: string;
  category: string;
}

export interface MagicItemsContent {
  generatedAt: string;
  total: number;
  items: MagicItemData[];
}

let cachePromise: Promise<MagicItemsContent> | null = null;

export const loadMagicItems = async (): Promise<MagicItemsContent> => {
  if (cachePromise) return cachePromise;
  cachePromise = (async () => {
    const response = await fetch('./character-content/magic-items.json');
    if (!response.ok) throw new Error(`Failed to load magic items: ${response.status}`);
    return response.json();
  })();
  return cachePromise;
};
