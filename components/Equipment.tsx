import React, { useEffect, useMemo, useState } from 'react';
import { CharacterData, InventoryItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { AutoBuilderContent } from '../utils/autoBuilderRules';
import { applyCharacterAdjustments, removeCharacterAdjustments } from '../utils/characterAdjustments';
import {
    equipArmor,
    equipOffHandWeapon,
    equipShield,
    equipWeapon,
    getArmorOptions,
    getShieldOptions,
    getWeaponOptions,
    formatWeaponMasteryNames,
    formatWeaponPropertyNames,
    isArmorEquipped,
    isOffHandWeaponEquipped,
    isShieldEquipped,
    isWeaponEquipped,
    refreshCharacterAutomation,
    unequipArmor,
    unequipOffHandWeapon,
    unequipShield,
    unequipWeapon,
} from '../utils/equipmentRules';
import { loadAutoBuilderContent } from '../utils/autoBuilderRules';

interface EquipmentProps {
  data: CharacterData;
  onChange: (field: keyof CharacterData, value: any) => void;
  onUpdateCharacter: (character: CharacterData) => void;
  magicItems?: Array<{ id: string; name: string; source: string; bonusWeapon?: string; bonusAc?: string; requires?: any; namePrefix?: string; category: string; isWeapon?: boolean; isArmor?: boolean; }>;
  autoBuilderContent?: AutoBuilderContent | null;
}

export const Equipment: React.FC<EquipmentProps> = ({ data, onChange, onUpdateCharacter, magicItems = [], autoBuilderContent }) => {
    const { t } = useLanguage();
    const [content, setContent] = useState<AutoBuilderContent | null>(autoBuilderContent || null);
    const [weaponId, setWeaponId] = useState('');
    const [offHandWeaponId, setOffHandWeaponId] = useState('');
    const [armorId, setArmorId] = useState('');
    const [shieldId, setShieldId] = useState('');
    const [inventoryBaseChoices, setInventoryBaseChoices] = useState<Record<string, string>>({});
    const updateMoney = (key: keyof typeof data.currency, val: string) => {
        onChange('currency', { ...data.currency, [key]: val });
    };
    
    const updateStatus = (key: keyof typeof data.status, val: any) => {
        onChange('status', { ...data.status, [key]: val });
    };

    useEffect(() => {
        loadAutoBuilderContent().then(setContent).catch(() => setContent(null));
    }, []);

    const weaponOptions = useMemo(() => (
        content ? getWeaponOptions(content, data.automation.ruleSystem) : []
    ), [content, data.automation.ruleSystem]);
    const selectedWeapon = weaponOptions.find(weapon => weapon.id === weaponId) || weaponOptions[0];
    const weaponEquipped = selectedWeapon ? isWeaponEquipped(data, selectedWeapon) : false;

    const armorOptions = useMemo(() => (
        content ? getArmorOptions(content, data.automation.ruleSystem) : []
    ), [content, data.automation.ruleSystem]);
    const selectedArmor = armorOptions.find(armor => armor.id === armorId) || armorOptions[0];
    const armorEquipped = selectedArmor ? isArmorEquipped(data, selectedArmor) : false;

    const shieldOptions = useMemo(() => (
        content ? getShieldOptions(content, data.automation.ruleSystem) : []
    ), [content, data.automation.ruleSystem]);
    const selectedShield = shieldOptions.find(shield => shield.id === shieldId) || shieldOptions[0];
    const shieldEquipped = selectedShield ? isShieldEquipped(data, selectedShield) : false;

    const toggleWeapon = () => {
        if (!selectedWeapon || !content) return;
        onUpdateCharacter(refreshCharacterAutomation(weaponEquipped ? unequipWeapon(data, selectedWeapon) : equipWeapon(data, selectedWeapon), content));
    };

    const toggleArmor = () => {
        if (!selectedArmor || !content) return;
        onUpdateCharacter(refreshCharacterAutomation(armorEquipped ? unequipArmor(data, selectedArmor) : equipArmor(data, selectedArmor), content));
    };

    const toggleShield = () => {
        if (!selectedShield || !content) return;
        onUpdateCharacter(refreshCharacterAutomation(shieldEquipped ? unequipShield(data, selectedShield) : equipShield(data, selectedShield), content));
    };

    // Off-hand weapon
    const selectedOffHand = weaponOptions.find(w => w.id === offHandWeaponId) || weaponOptions[0];
    const offHandEquipped = selectedOffHand ? isOffHandWeaponEquipped(data, selectedOffHand) : false;
    const toggleOffHand = () => {
        if (!selectedOffHand || !content) return;
        onUpdateCharacter(refreshCharacterAutomation(
            offHandEquipped ? unequipOffHandWeapon(data, selectedOffHand) : equipOffHandWeapon(data, selectedOffHand, content),
            content
        ));
    };

    // Backpack/inventory
    const addItemToInventory = (itemName: string, itemSource: string) => {
        const existing = data.inventory.find(i => i.name === itemName && i.source === itemSource);
        if (existing) {
            onUpdateCharacter(applyCharacterAdjustments(data, {
                id: `inv-${itemName}|${itemSource}`,
                sourceId: `inv-${itemName}|${itemSource}`,
                sourceName: itemName,
                operations: [{ type: 'addItem', item: { ...existing, count: existing.count + 1 } }],
            }));
        } else {
            onUpdateCharacter(applyCharacterAdjustments(data, {
                id: `inv-${itemName}|${itemSource}`,
                sourceId: `inv-${itemName}|${itemSource}`,
                sourceName: itemName,
                operations: [{
                    type: 'addItem',
                    item: { id: `${itemName}|${itemSource}`, name: itemName, source: itemSource, count: 1 },
                }],
            }));
        }
    };

    const removeItemFromInventory = (item: InventoryItem) => {
        if (item.count <= 1) {
            onUpdateCharacter(removeCharacterAdjustments(data, `inv-${item.id}`));
        } else {
            onUpdateCharacter(applyCharacterAdjustments(data, {
                id: `inv-${item.id}`,
                sourceId: `inv-${item.id}`,
                sourceName: item.name,
                operations: [{ type: 'addItem', item: { ...item, count: item.count - 1 } }],
            }));
        }
    };

    // Get magic item details for an inventory item
    const getMagicItemDetail = (invItem: InventoryItem) => {
        return magicItems.find(m => m.name === invItem.name && m.source === invItem.source);
    };

    // Equip a magic item from backpack
    const equipFromInventory = (invItem: InventoryItem) => {
        if (!autoBuilderContent) return;
        const detail = getMagicItemDetail(invItem);
        if (!detail) return;

        // For weapon items: find matching base weapon from auto-builder data
        if (detail.isWeapon || detail.bonusWeapon) {
            const baseName = inventoryBaseChoices[invItem.id];
            const weaponData = autoBuilderContent.weapons.find(w => 
                baseName ? w.name === baseName : true
            ) || autoBuilderContent.weapons[0];
            if (weaponData) {
                // Create a modified weapon with magic bonus
                const modifiedWeapon = { ...weaponData, bonusWeapon: detail.bonusWeapon || '' };
                onUpdateCharacter(refreshCharacterAutomation(equipWeapon(data, modifiedWeapon), autoBuilderContent));
            }
        } else if (detail.isArmor || detail.bonusAc) {
            // For armor: find a matching armor or use first light armor
            const armorData = autoBuilderContent.armors.find(a => a.id?.includes('Leather') || a.id?.includes('皮甲'));
            if (armorData) {
                onUpdateCharacter(refreshCharacterAutomation(equipArmor(data, armorData), autoBuilderContent));
            }
        }
    };

  return (
    <div className="bg-white border border-gray-300 rounded p-2 flex flex-col gap-2">
        {/* Status Section */}
         <div className="flex flex-col gap-2 p-2 bg-gray-50 rounded border border-gray-100">
             <div className="flex items-center gap-2">
                <input 
                    type="checkbox" 
                    id="conc" 
                    checked={data.status.concentrating} 
                    onChange={(e) => updateStatus('concentrating', e.target.checked)}
                    className="w-4 h-4"
                />
                <label htmlFor="conc" className="font-bold text-gray-700 text-xs uppercase">{t('equipment.concentrating')}</label>
             </div>
             <div>
                 <label className="text-[9px] text-gray-500 uppercase font-bold block">{t('equipment.conditions')}</label>
                 <input
                    type="text"
                    className="w-full border-b border-gray-300 bg-transparent text-sm outline-none"
                    value={data.status.conditions}
                    onChange={(e) => updateStatus('conditions', e.target.value)}
                 />
             </div>
         </div>

         <div className="border border-gray-200 rounded p-2 bg-white">
            <h4 className="text-[10px] text-gray-500 uppercase font-bold text-center border-b pb-1 mb-2">{t('equipment.weapons')}</h4>
            <div className="flex gap-2">
                <select
                    className="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                    value={selectedWeapon?.id || ''}
                    onChange={(event) => setWeaponId(event.target.value)}
                    disabled={!weaponOptions.length}
                >
                    {weaponOptions.map(weapon => (
                        <option key={weapon.id} value={weapon.id}>{weapon.name}</option>
                    ))}
                </select>
                <button
                    onClick={toggleWeapon}
                    disabled={!selectedWeapon}
                    className="px-2 py-1 text-[10px] uppercase font-bold rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                >
                    {weaponEquipped ? t('equipment.unequip') : t('equipment.equip')}
                </button>
            </div>
            {selectedWeapon && (
                <div className="mt-1 text-[10px] text-gray-500 leading-relaxed">
                    {selectedWeapon.dmg1} {selectedWeapon.dmgType || ''} {formatWeaponPropertyNames(selectedWeapon) ? `| ${formatWeaponPropertyNames(selectedWeapon)}` : ''} {selectedWeapon.range ? `| ${selectedWeapon.range}` : ''} {formatWeaponMasteryNames(selectedWeapon) ? `| ${formatWeaponMasteryNames(selectedWeapon)}` : ''}
                </div>
            )}
            {/* Off-hand weapon slot */}
            <div className="flex gap-2 items-center mt-2 pt-2 border-t border-gray-200">
                <span className="text-[9px] text-gray-500 uppercase font-bold shrink-0">副手</span>
                <select
                    className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-[10px] bg-white"
                    value={selectedOffHand?.id || ''}
                    onChange={(e) => setOffHandWeaponId(e.target.value)}
                    disabled={!weaponOptions.length}
                >
                    {weaponOptions.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                </select>
                <button
                    onClick={toggleOffHand}
                    disabled={!selectedOffHand}
                    className="px-1.5 py-0.5 text-[9px] uppercase font-bold rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                >
                    {offHandEquipped ? t('equipment.unequip') : t('equipment.equip')}
                </button>
            </div>
            {selectedOffHand && offHandEquipped && (
                <div className="text-[10px] text-gray-500">副手: {selectedOffHand.dmg1} {selectedOffHand.dmgType || ''}</div>
            )}
         </div>

         <div className="border border-gray-200 rounded p-2 bg-white">
            <h4 className="text-[10px] text-gray-500 uppercase font-bold text-center border-b pb-1 mb-2">{t('equipment.armor')}</h4>
            <div className="flex gap-2">
                <select
                    className="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                    value={selectedArmor?.id || ''}
                    onChange={(event) => setArmorId(event.target.value)}
                    disabled={!armorOptions.length}
                >
                    {armorOptions.map(armor => (
                        <option key={armor.id} value={armor.id}>{armor.name}</option>
                    ))}
                </select>
                <button
                    onClick={toggleArmor}
                    disabled={!selectedArmor}
                    className="px-2 py-1 text-[10px] uppercase font-bold rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                >
                    {armorEquipped ? t('equipment.unequip') : t('equipment.equip')}
                </button>
            </div>
            {selectedArmor && (
                <div className="mt-1 text-[10px] text-gray-500 leading-relaxed">
                    AC {selectedArmor.ac} {selectedArmor.strength ? `| STR ${selectedArmor.strength}` : ''} {selectedArmor.stealth ? `| ${t('equipment.stealthDisadvantage')}` : ''}
                </div>
            )}
            <div className="flex gap-2 mt-2">
                <select
                    className="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                    value={selectedShield?.id || ''}
                    onChange={(event) => setShieldId(event.target.value)}
                    disabled={!shieldOptions.length}
                >
                    {shieldOptions.map(shield => (
                        <option key={shield.id} value={shield.id}>{shield.name}</option>
                    ))}
                </select>
                <button
                    onClick={toggleShield}
                    disabled={!selectedShield}
                    className="px-2 py-1 text-[10px] uppercase font-bold rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                >
                    {shieldEquipped ? t('equipment.unequip') : t('equipment.equip')}
                </button>
            </div>
            {selectedShield && (
                <div className="mt-1 text-[10px] text-gray-500 leading-relaxed">
                    +{selectedShield.ac || 2} AC
                </div>
            )}
         </div>

         {/* Money & Equipment Split */}
         <div className="flex gap-2">
             {/* Money Column */}
            <div className="flex flex-col gap-1 w-16 flex-shrink-0">
                 {['cp', 'sp', 'ep', 'gp', 'pp'].map(curr => (
                     <div key={curr} className="flex flex-col items-center bg-gray-100 rounded border border-gray-200 p-1">
                         <span className="text-[9px] font-bold text-gray-500 uppercase">{t(`equipment.${curr}` as any)}</span>
                         <input 
                            type="text" 
                            className="w-full text-center bg-transparent outline-none text-xs font-serif"
                            value={data.currency[curr as keyof typeof data.currency]}
                            onChange={(e) => updateMoney(curr as keyof typeof data.currency, e.target.value)}
                         />
                     </div>
                 ))}
            </div>
            
            {/* Backpack / Inventory */}
            <div className="border border-gray-200 rounded p-2 bg-white">
                <h4 className="text-[10px] text-gray-500 uppercase font-bold text-center border-b pb-1 mb-1">背包</h4>
                {data.inventory.length === 0 ? (
                    <p className="text-[10px] text-gray-400 text-center py-2">从右侧搜索面板购买魔法物品以添加到背包</p>
                ) : (
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                        {data.inventory.map(item => {
                            const detail = getMagicItemDetail(item);
                            const isEquippable = detail && (detail.isWeapon || detail.isArmor || detail.bonusWeapon || detail.bonusAc);
                            const hasRequires = detail?.requires && Array.isArray(detail.requires) && detail.requires.length > 0;
                            const baseWeaponOptions = autoBuilderContent?.weapons || [];
                            const chosenBase = inventoryBaseChoices[item.id] || baseWeaponOptions[0]?.name || '';

                            return (
                            <div key={item.id} className="w-full flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                                <span className="text-[10px] text-gray-800 truncate flex-1">{item.name}</span>
                                <span className="text-[9px] text-gray-400 shrink-0">×{item.count}</span>
                                {isEquippable && hasRequires && (
                                    <select
                                        value={chosenBase}
                                        onChange={(e) => setInventoryBaseChoices(prev => ({ ...prev, [item.id]: e.target.value }))}
                                        className="text-[9px] border border-gray-200 rounded bg-white max-w-[80px]"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {baseWeaponOptions.map(w => (
                                            <option key={w.id} value={w.name}>{w.name}</option>
                                        ))}
                                    </select>
                                )}
                                {isEquippable && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); equipFromInventory(item); }}
                                        className="text-[9px] uppercase font-bold px-1 py-0.5 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 shrink-0"
                                    >装备</button>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeItemFromInventory(item); }}
                                    className="text-gray-300 hover:text-red-500 text-xs leading-none shrink-0"
                                    title="Remove"
                                >&times;</button>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>
         </div>
    </div>
  );
};
