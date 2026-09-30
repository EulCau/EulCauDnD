import type {
  RuleClass,
  RuleOrigin,
  RuleSubclass,
} from '../catalog/model.js';
import type { RuleContext } from '../model/context.js';
import { isRuleEntityAuthorized } from '../policy/authorization.js';
import { dedupeRuleEntitiesByNameAndSourcePriority, getRuleSourceRank } from '../policy/source-priority.js';

export function getRuleClassOptions(context: RuleContext): RuleClass[] {
  return authorizedAndDeduped(
    'class',
    context.catalog.classes.filter(({ ruleSystem }) => ruleSystem === context.ruleSystem),
    context,
  );
}

export function findRuleClassOption(
  context: RuleContext,
  classKey: string,
): RuleClass | undefined {
  return getRuleClassOptions(context).find(({ key }) => key === classKey);
}

export function getRuleRaceOptions(context: RuleContext): RuleOrigin[] {
  return authorizedAndDeduped('race', context.catalog.races, context);
}

export function getRuleBackgroundOptions(context: RuleContext): RuleOrigin[] {
  return authorizedAndDeduped('background', context.catalog.backgrounds, context);
}

export function getRuleSubraceOptions(
  context: RuleContext,
  race: RuleOrigin | undefined,
): RuleOrigin[] {
  if (race === undefined || !isRuleEntityAuthorized('race', race, context.authorization)) {
    return [];
  }
  return authorizedAndDeduped(
    'subrace',
    context.catalog.subraces.filter((subrace) => (
      subrace.raceName === race.name && subrace.raceSource === race.source
    )),
    context,
  );
}

export function getRuleSubclassOptions(
  context: RuleContext,
  ruleClass: RuleClass | undefined,
): RuleSubclass[] {
  if (
    ruleClass === undefined
    || ruleClass.ruleSystem !== context.ruleSystem
    || !isRuleEntityAuthorized('class', ruleClass, context.authorization)
  ) {
    return [];
  }
  return authorizedAndDeduped(
    'subclass',
    context.catalog.subclasses.filter((subclass) => (
      subclass.className === ruleClass.name
      && subclass.classSource === ruleClass.source
    )),
    context,
  );
}

export function findRuleOriginOption(
  origins: readonly RuleOrigin[],
  key: string,
): RuleOrigin | undefined {
  return origins.find((origin) => `${origin.key}|${origin.source}` === key) ?? origins.find((origin) => origin.key === key) ?? origins[0];
}

function authorizedAndDeduped<T extends {
  id?: string;
  key: string;
  name: string;
  englishName?: string;
  source: string;
}>(
  kind: 'background' | 'class' | 'race' | 'subclass' | 'subrace',
  entities: readonly T[],
  context: RuleContext,
): T[] {
  const authorized = entities.filter(entity => isRuleEntityAuthorized(kind, entity, context.authorization));
  if (kind === 'class') return dedupeRuleEntitiesByNameAndSourcePriority(kind, authorized, context.authorization);
  return [...authorized].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN') || getRuleSourceRank(kind, a.source, context.authorization) - getRuleSourceRank(kind, b.source, context.authorization) || a.source.localeCompare(b.source));
}
