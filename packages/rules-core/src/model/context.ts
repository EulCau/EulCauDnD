import type { RuleCatalog, RuleSystem } from '../catalog/model.js';
import type { RuleAuthorizationPolicy } from '../policy/authorization.js';

export interface RuleContext {
  ruleSystem: RuleSystem;
  catalog: RuleCatalog;
  authorization: RuleAuthorizationPolicy;
}
