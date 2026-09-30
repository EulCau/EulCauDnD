import type { RuleSubclass, RuleSpell } from '../catalog/model.js';
import type { RuleContext } from '../model/context.js';
import type { RuleIssue } from '../model/issue.js';
import type { RuleChoiceGroup } from '../model/choice.js';
import { getSpellOptionsForFilter, resolveSpellRef } from './additional-spells.js';
import { isRuleEntityAuthorized } from '../policy/authorization.js';

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function getRuleSubclassSpellBlocks(subclass: RuleSubclass | undefined): { id: string; name: string }[] {
  return (subclass?.additionalSpells ?? []).flatMap((block, index) => record(block) && (block.name || block.ENG_name)
    ? [{ id: String(index), name: String(block.name || block.ENG_name) }] : []);
}

/** Preserve named alternatives and distinguish granted spells from expanded class lists. */
export function getRuleSubclassSpells(
  context: RuleContext, subclass: RuleSubclass | undefined, classLevel: number,
  maxSpellLevel: number, existingIds: readonly string[] = [],
): { automatic: RuleSpell[]; expanded: RuleSpell[]; choices: RuleChoiceGroup<RuleSpell>[]; issues: RuleIssue[] } {
  const result = { automatic: [] as RuleSpell[], expanded: [] as RuleSpell[], choices: [] as RuleChoiceGroup<RuleSpell>[], issues: [] as RuleIssue[] };
  if (!subclass) return result;
  const blocks = getRuleSubclassSpellBlocks(subclass);
  const selected = subclass.selectedSpellBlock ?? blocks[0]?.id;
  const unique = (spells: RuleSpell[]) => [...new Map(spells.map(spell => [spell.id, spell])).values()];
  const resolve = (ref: string) => {
    const spell = resolveSpellRef(context.catalog, ref, context.ruleSystem);
    if (!spell) result.issues.push({ code: 'unsupported_rule_shape', path: ['subclass', subclass.id, 'additionalSpells', ref], detail: { reason: 'additional_spell_not_found' } });
    return spell && isRuleEntityAuthorized('spell', spell, context.authorization) ? [spell] : [];
  };
  (subclass.additionalSpells ?? []).forEach((block, blockIndex) => {
    if (!record(block)) return;
    if ((block.name || block.ENG_name) && String(blockIndex) !== selected) return;
    // Lore bard's additional secrets are represented by the dedicated secrets groups.
    if (subclass.key === 'College of Lore' && block.ENG_name === 'Additional Magical Secrets') return;
    const visit = (value: unknown, mode: 'automatic' | 'expanded', path: string): void => {
      if (typeof value === 'string') { result[mode].push(...resolve(value)); return; }
      if (Array.isArray(value)) { value.forEach((entry, i) => visit(entry, mode, `${path}-${i}`)); return; }
      if (!record(value)) return;
      if (typeof value.all === 'string') {
        const options = getSpellOptionsForFilter(context.catalog, context.ruleSystem, value.all);
        if (options.ok) result[mode].push(...options.value);
        else result.issues.push(...options.issues);
        return;
      }
      if ('choose' in value) {
        const parsed = typeof value.choose === 'string'
          ? getSpellOptionsForFilter(context.catalog, context.ruleSystem, value.choose)
          : null;
        const raw = record(value.choose) ? value.choose : undefined;
        if (parsed && !parsed.ok) result.issues.push(...parsed.issues);
        const options = unique(parsed?.ok ? parsed.value : Array.isArray(raw?.from)
          ? raw.from.flatMap(ref => typeof ref === 'string' ? resolve(ref) : []) : []);
        const count = Number(raw?.count ?? value.count ?? 1);
        if (mode === 'expanded') { result.expanded.push(...options); return; }
        const alreadyKnown = options.filter(spell => existingIds.includes(spell.id)).length;
        if (alreadyKnown >= count) return;
        const remaining = count - alreadyKnown;
        result.choices.push({ id: `subclass-spells-${subclass.id}-${path}`, kind: 'spell',
          min: remaining, max: remaining, required: true,
          options: options.filter(spell => !existingIds.includes(spell.id)),
        });
        return;
      }
      for (const [key, child] of Object.entries(value)) {
        if (/^s\d+$/.test(key) && Number(key.slice(1)) > maxSpellLevel) continue;
        if (/^\d+$/.test(key) && Number(key) > classLevel) continue;
        visit(child, mode, `${path}-${key}`);
      }
    };
    for (const key of ['known', 'prepared', 'innate', 'expanded']) {
      if (block[key] !== undefined) visit(block[key], key === 'expanded' ? 'expanded' : 'automatic', `${blockIndex}-${key}`);
    }
  });
  result.automatic = unique(result.automatic);
  result.expanded = unique(result.expanded).filter(spell => spell.level <= maxSpellLevel);
  return result;
}
