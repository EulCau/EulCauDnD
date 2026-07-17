# 自动构筑共享规则核心盘点与接口设计

## 1. 目标和当前结论

本文档固定 `EulCauDnD` commit `c456d1aa2a1f0ae1ed00ab0a1794a923fce2df54` 的自动构筑规则盘点, 并定义后续迁移到 `packages/rules-core` 的目标接口.

目标不是把现有文件原样搬入 npm package, 而是让浏览器前端和服务端能够对同一份输入执行同一套:

- 候选项计算.
- 结构化选择校验.
- 角色规则投影.
- 派生数值重算.
- 失败关闭判断.

盘点结论:

- `packages/rules-core` 目前只覆盖专长候选, 先决条件和基础专长属性投影, 尚不是完整自动构筑规则包.
- 规则主体位于 `utils/autoBuilderRules.ts`, 但角色结果还依赖 `utils/characterAdjustments.ts`, `utils/equipmentRules.ts`, `utils/dndCalculations.ts` 和 `components/AutoCharacterBuilder.tsx`.
- 当前 React 组件不仅渲染 UI, 还负责选择完整性判断, 默认值, 互斥关系和提交 payload 规范化. 这些判断必须迁入共享包, 否则服务端无法复核同一套规则.
- `buildLevelOneCharacter` 和 `buildLevelUpCharacter` 当前直接返回 EulCauDnD 的 `CharacterData`, 并在内部调用带时间和可撤销历史的调整解释器. 服务端不能直接安全复用这一边界.
- 完整迁移前, 不应继续在 Ao 中独立实现新的职业, 法术或复杂专长升级规则.

## 2. 盘点基线

当前主要文件规模:

| 文件 | 当前行数 | 当前职责 |
| --- | ---: | --- |
| `utils/autoBuilderRules.ts` | 6,030 | catalog 类型, 来源策略, options, 规则校验片段, 法术, 职业资源, 特性操作, 1 级建卡和升级 |
| `utils/characterAdjustments.ts` | 514 | 可撤销操作解释, previous 值捕获, 应用历史, 时间和 ID |
| `utils/equipmentRules.ts` | 1,631 | 武器, 熟练, 攻击, AC, 装备互斥, 自动刷新, 大量特性/专长派生规则 |
| `utils/dndCalculations.ts` | 57 | 调整值, 熟练加值, HP, 法术 DC 和攻击加值 |
| `components/AutoCharacterBuilder.tsx` | 2,756 | React state, options 编排, 默认选择, 完整性判断, payload 组装和渲染 |

运行时调用方:

- `App.tsx` 加载 catalog, 应用或移除调整, 刷新自动派生.
- `components/AutoCharacterBuilder.tsx` 调用几乎全部自动构筑 options 和 build API.
- `components/Equipment.tsx` 加载同一 catalog, 调用装备和调整 API.
- `scripts/audit-*.mjs` 直接导入现有函数做行为回归.

数据生成不属于运行时共享包:

- `scripts/extract-5etools-character-data.mjs` 负责生成 `public/data/auto-builder-core.json`.
- `public/data/auto-builder-core.json` 是 catalog artifact, 不是规则代码.
- 浏览器可以通过 `fetch` 加载该 artifact.
- 服务端必须从受控路径加载并先执行自己的许可证/来源白名单, 不能由共享包自行读取文件.

## 3. 完整规则域盘点

### 3.1 Catalog 模型和来源策略

现有位置:

- `AutoBuilderContent` 及职业, 子职, 种族, 背景, 专长, 法术, 武器, 护甲, 祈唤, 战斗风格, 超魔和战技类型.
- `RULE_SOURCE`, `FEAT_SOURCE_PRIORITY`, `RACE_SOURCE_PRIORITY`, `BACKGROUND_SOURCE_PRIORITY`, `SUBCLASS_SOURCE_PRIORITY` 和各类官方来源优先级.
- `getAutoBuilderClass`, `getAutoBuilderRaces`, `getAutoBuilderBackgrounds`, `getAutoBuilderSubraces`, `getAutoBuilderSubclasses`.
- 来源排序, 同名去重和实体引用规范化.

当前问题:

- 类型和规则实现位于同一个 6,000 行文件.
- 部分“官方来源”常量包含合作内容或战役内容, 不能直接作为 Ao 的授权策略.
- `loadAutoBuilderContent` 使用浏览器 `fetch` 和模块级 Promise cache.

迁移目标:

- Catalog DTO 进入共享包.
- Catalog 解析和 schema 校验进入共享包.
- 来源优先级算法进入共享包.
- 允许来源和允许实体 ID 必须由调用方传入, 共享包不得把上游“官方”列表等同于调用方授权.
- `fetch`, 文件读取, cache 和 catalog 完整性哈希保留在适配层.

### 3.2 种族, 亚种族, 背景和起源

现有规则:

- 种族, 亚种族, 背景候选和同名来源优先级.
- 5r 背景与起源解耦.
- 属性加值, 体型, 移动速度, 技能, 工具, 语言和武器熟练.
- 固定或选择型伤害抗性, 免疫, 易伤, 状态免疫和感官.
- 种族或背景赠予专长.
- `additionalSpells` 分支, 施法属性和法术选择.
- 部分来源特定特性选择, 例如巨人先祖.
- 种族资源, 固定 AC, 天生攻击和随等级刷新.

现有位置:

- `getRace*ChoiceOptions`, `getOrigin*ChoiceOptions`.
- `createOriginOperations`, `createRaceChoiceOperations`.
- `createOriginStructuredFeatureOperations`, `createOriginResourceOperations`.
- `createExistingOriginLevelUpOperations`.
- `equipmentRules.ts` 中的自然护甲和天生攻击派生.
- React 组件中的默认选项和完整性检查.

迁移要求:

- options, 默认值和完整性校验必须使用同一结构化 choice schema.
- 来源特定规则不能继续只靠 UI 隐式约束.
- 未识别的 `choose`, `fromFilter` 或 `additionalSpells` 形态必须返回 `unsupported_rule_shape`, 不能静默忽略.

### 3.3 职业, 子职和多职业

现有规则:

- 初始职业和提升已有职业.
- 新增多职业及多职业熟练.
- 子职触发等级和候选.
- 职业/子职特性写入.
- 生命骰, 固定平均 HP 和体质变化产生的既有等级 HP 修正.
- 职业资源随职业等级或熟练加值变化.
- 5e/5r 职业来源匹配.

现有位置:

- `isCharacterClassForDefinition`, `getClassLevel`.
- `createClassFeatureOperations`, `createSubclassFeatureOperations`.
- `createClassResourceOperations`.
- `createProficiencyOperations`, `createMulticlassProficiencyOperations`.
- `buildLevelOneCharacter`, `buildLevelUpCharacter`.

当前问题:

- 新多职业 ID 使用 `Date.now()`.
- build 函数把规则校验, effect 生成, effect 应用和派生刷新合在一次调用中.
- build 函数默认调用方已通过 UI 完成选择, 缺少统一的权威 validation result.

### 3.4 属性值提升和专长

现有规则:

- ASI 等级识别.
- `+2`, `+1/+1` 和专长替代.
- 专长先决条件和来源优先级.
- 属性, 技能, 工具, 武器, 护甲, 语言, 豁免, 专精和抗性选择.
- 专长法术, 法术替换, 战斗风格, 祈唤, 战技和超魔选择.
- 专长特性, 资源, 结构化字段和随等级刷新.
- 装备/攻击说明中的专长派生效果.

现有位置:

- `packages/rules-core/src/index.ts` 已覆盖候选, 支持的先决条件和基础专长属性投影.
- `autoBuilderRules.ts` 仍保留完整 choice state, effect 生成和大量来源/专长特判.
- `equipmentRules.ts` 仍通过特性名称或 `sourceId` 判断 Crusher, Sharpshooter, Great Weapon Master 等效果.
- React 组件仍负责复杂专长 choice group 是否完整.

迁移要求:

- 现有共享专长函数作为迁移起点, 不再在 Ao 中复制规则.
- 所有专长 choice group 必须拥有稳定 group ID, count, options 和 validation.
- 专长 effect 必须按结构化效果输出, 描述文本只能作为展示信息, 不能作为服务端判定的唯一依据.
- 重复专长默认拒绝. 若未来支持可重复专长, catalog 必须提供明确的 repeatable 元数据.

### 3.5 施法和法术选择

现有规则:

- `preparedAll`, `knownSelection`, spellbook 和 manual 模式.
- 职业法表, 子职扩展或额外准备法术.
- 戏法和已知法术进度.
- 固定环阶学习组.
- 升级新增和替换已知法术.
- 共享多职业法术位和契约法术位.
- Magical Secrets.
- 起源和专长法术.
- 已有专长随等级解锁或替换法术.

现有位置:

- `getClassSpellOptions`, `getSpellChoiceState`, `getLevelOneSpellChoiceState`.
- `getFeatSpellChoiceState`, `getOriginSpellChoiceState`.
- `getExistingFeatSpellLevelUpChoiceState`.
- `getMagicalSecretLevels`, `getMagicalSecretSpellOptions`.
- `createSpellcastingProfile`, `updateSpellcastingForLevel`.
- 多职业法术位和 spell profile helpers.
- React 组件中的替换 state, Magical Secrets state 和完整性判断.

迁移要求:

- 法术 options 和 validation 必须共享同一法术池构造函数.
- 服务端必须复核新增/替换法术是否属于当时可选集合.
- 共享包使用结构化 spell DTO, 不格式化 React 文本.
- 多职业法术位计算必须是单独纯函数并有表驱动测试.

### 3.6 战斗风格, 祈唤, 战技, 超魔, 专精和武器精通

现有规则:

- 触发等级和数量进度.
- 已选项去重.
- 祈唤等级, 已知祈唤, 法术和职业先决条件.
- 战斗风格可授予专长或戏法.
- 战技和超魔选项.
- 技能专精只能从满足条件的技能中选择.
- 武器精通按职业和武器类型过滤.

现有位置:

- `getInvocationChoiceState`, `getMetamagicChoiceState`, `getManeuverChoiceState`.
- `getWeaponMasteryChoiceState`, `getClassExpertiseChoiceOptions`.
- `getFightingStyle*ChoiceOptions`.
- 对应 `create*Operations`.
- React 组件中的 valid ID 过滤和 count 完整性判断.

迁移要求:

- `needed`, `options`, `selected` 和 prerequisites 统一为 choice group.
- 客户端可以展示先决条件摘要, 服务端只依赖结构化 prerequisite evaluation.
- 数量不足, 重复选择, 已知项重复或提交不在 options 中都必须产生稳定错误码.

### 3.7 角色 effect 和可撤销调整

现有规则:

- 18 类 `AdjustmentOperation`.
- 应用前记录 previous 值.
- 按 `sourceId` 撤销并重放.
- 写入属性, HP, AC, 速度, 熟练, 特性, 资源, 法术, 攻击和装备.

现有位置:

- 类型位于根 `types.ts`.
- 解释器位于 `utils/characterAdjustments.ts`.

当前非纯边界:

- 默认 adjustment ID 使用 `Date.now()`.
- 默认 `appliedAt` 使用当前时间.
- `CharacterData` 使用 `Set`, 不是 JSON-safe DTO.
- operation 同时包含规则意图和 EulCauDnD UI 存储的 previous 状态.

迁移目标:

- 共享包输出不含 previous 值, 时间或随机 ID 的 `RuleEffect[]`.
- effect ID 必须由规则语义稳定派生, 如规则实体 ID, 目标等级和 choice group ID.
- 共享包提供针对 canonical JSON snapshot 的纯 `applyRuleEffects`.
- EulCauDnD adapter 将 `RuleEffect` 转换为现有 `AdjustmentOperation`, 并继续维护 UI 所需的撤销历史.
- Ao adapter 将同一 `RuleEffect` 映射到自己的角色 payload 和数据库审计记录.

### 3.8 装备, 攻击, AC 和其他派生值

现有规则:

- 武器属性, 熟练, 攻击属性, 命中和伤害.
- 主手, 副手, 双手武器和盾牌互斥.
- 普通和魔法武器.
- 护甲, 盾牌, 无甲防御, 自然护甲和战斗风格 AC.
- 天生攻击, 徒手攻击, 武僧武艺.
- 专长, 职业特性和战斗风格产生的攻击备注或数值.
- 自动装备刷新.

当前问题:

- 大量判定通过中文/英文 feature name 或 EulCauDnD `sourceId` 完成.
- 规则计算和展示文案混合在 `formatWeaponNotes`.
- equip 函数直接修改角色调整历史.

迁移要求:

- 规则身份必须使用结构化 entity ID, 不能以翻译后的显示名称作为权威 key.
- 命中, 伤害, AC, 攻击次数和装备互斥进入共享纯函数.
- 展示备注由 adapter 使用结构化 explanation code 本地化.
- 装备变更可继续作为独立 command, 但验证和 projection 必须共享.

### 3.9 UI 编排

必须从 React 组件迁出的逻辑:

- choice group 是否出现.
- 默认选项.
- count 和互斥完整性.
- 当前选择是否仍在 options 中.
- ASI 三种模式的结构校验.
- 法术新增/替换, Magical Secrets 和已有专长升级选择校验.
- 提交前过滤祈唤, 战技, 超魔和武器精通 ID.

仍保留在 React 组件中的内容:

- `useState`, `useEffect`, dialog 开关和表单交互.
- 翻译和可访问性文本.
- loading/error 展示.
- 调用 `get*Options`, 显示 `RuleIssue`, 提交结构化 choice.

## 4. 共享包边界

### 4.1 必须满足的不变量

`packages/rules-core` 必须:

- 不依赖 React.
- 不调用 `fetch`, Node `fs`, 数据库或浏览器 storage.
- 不读取环境变量.
- 不使用 `Date.now`, `new Date`, `Math.random` 或隐式 UUID.
- 只接收和返回 JSON-safe 数据, 不暴露 `Set`, class instance 或 cyclic object.
- 不修改调用方传入对象.
- 不信任调用方提交的 option label, count 或派生数值.
- 对未知规则形态失败关闭.
- 不内置 Ao 的许可证授权结论.
- 不把完整 catalog 或规则正文放入返回给 Ao Web 的 options.

### 4.2 调用方责任

浏览器 adapter:

- 通过 `fetch` 加载 catalog.
- 保存 React state 和本地角色数据.
- 把 canonical effect 转为现有可撤销调整.
- 本地化 label 和 issue.

Ao 服务端 adapter:

- 从固定 commit 和受控路径加载 catalog.
- 验证 catalog 哈希并执行默认拒绝白名单.
- 把 Ao 角色 payload 转为 canonical snapshot.
- 在数据库事务内应用 effect 和写入审计.
- 只向 Web 返回授权实体的最小 option summary.

共享包:

- 解析调用方已经提供的 catalog.
- 根据调用方 authorization policy 再次过滤.
- 生成 options.
- 校验 choice.
- 生成确定性 effect plan 和 canonical projection.

## 5. 目标目录

```text
packages/rules-core/
  src/
    catalog/
      model.ts
      parse.ts
      identity.ts
    model/
      character.ts
      choice.ts
      effect.ts
      issue.ts
    policy/
      authorization.ts
      source-priority.ts
    options/
      origins.ts
      classes.ts
      feats.ts
      spells.ts
      class-features.ts
      equipment.ts
    validation/
      common.ts
      level-one.ts
      level-up.ts
      equipment.ts
    projection/
      origins.ts
      classes.ts
      feats.ts
      spells.ts
      resources.ts
      level-one.ts
      level-up.ts
      equipment.ts
    derived/
      abilities.ts
      hp.ts
      spell-slots.ts
      attacks.ts
      armor-class.ts
    index.ts
  test/
    fixtures/
    *.test.ts
```

目录按规则域拆分, 不按“前端/后端”拆分. `index.ts` 只导出稳定公共接口, 内部 helper 不再全部暴露.

## 6. Canonical DTO

### 6.1 规则上下文

```ts
export interface RuleContext {
  ruleSystem: '5e' | '5r';
  catalog: RuleCatalog;
  authorization: RuleAuthorizationPolicy;
}

export interface RuleAuthorizationPolicy {
  allowedSources: Partial<Record<RuleEntityKind, readonly string[]>>;
  allowedEntityIds?: Partial<Record<RuleEntityKind, readonly string[]>>;
  sourcePriority: Partial<Record<RuleEntityKind, readonly string[]>>;
}
```

调用方应优先传入已经过滤的 catalog. `authorization` 是共享包内部的第二道防线, 不能代替 Ao 的 catalog 哈希和许可证审查.

### 6.2 角色快照

```ts
export interface CanonicalRuleCharacterSnapshot {
  schemaVersion: 1;
  ruleSystem: '5e' | '5r';
  classes: readonly RuleClassState[];
  abilities: Readonly<Record<RuleAbilityName, number>>;
  species?: RuleEntityRef;
  subrace?: RuleEntityRef;
  background?: RuleEntityRef;
  proficiencies: readonly string[];
  expertises: readonly string[];
  feats: readonly RuleEntityRef[];
  features: readonly RuleEntityRef[];
  resources: readonly RuleResourceState[];
  spellcastingProfiles: readonly RuleSpellcastingProfile[];
  equipment: readonly RuleEquipmentState[];
  combat: RuleCombatSnapshot;
  choices: readonly RuleChoiceRecord[];
}
```

要求:

- 数组按稳定 key 去重.
- 所有实体使用 `{id, key, source}` 或稳定 ID, display name 不是身份.
- 数值, dtype 和上限明确.
- adapter 必须显式完成 EulCauDnD `Set` 与数组之间的转换.

### 6.3 Choice group 和 choice

```ts
export interface RuleChoiceGroup<TOption = RuleOptionSummary> {
  id: string;
  kind: RuleChoiceKind;
  required: boolean;
  min: number;
  max: number;
  options: readonly TOption[];
  dependsOn?: readonly RuleChoiceDependency[];
}

export interface RuleChoiceSubmission {
  groupId: string;
  selectedIds: readonly string[];
  value?: string | number | boolean;
}
```

所有技能, 工具, 语言, 武器, 抗性, 属性, 专长, 法术, 祈唤, 战技, 超魔, 战斗风格, 武器精通和子职选择都使用稳定 group ID. 复杂分支通过 `dependsOn` 表达, 不允许 UI 自行发明隐藏状态.

### 6.4 Effect plan

```ts
export type RuleEffect =
  | { type: 'ability.add'; ability: RuleAbilityName; value: number; sourceId: string }
  | { type: 'proficiency.add'; proficiency: string; expertise?: boolean; sourceId: string }
  | { type: 'feature.add'; feature: RuleFeatureState; sourceId: string }
  | { type: 'resource.upsert'; resource: RuleResourceState; sourceId: string }
  | { type: 'spell.profile.upsert'; profile: RuleSpellcastingProfile; sourceId: string }
  | { type: 'spell.add'; profileId: string; spell: RuleSpellState; sourceId: string }
  | { type: 'spell.remove'; profileId: string; spellId: string; sourceId: string }
  | { type: 'class.upsert'; classState: RuleClassState; sourceId: string }
  | { type: 'combat.patch'; patch: RuleCombatPatch; sourceId: string }
  | { type: 'equipment.patch'; patch: RuleEquipmentPatch; sourceId: string };
```

Effect 不包含:

- previous 值.
- 应用时间.
- 随机 ID.
- React label.
- 数据库字段名.

## 7. 公共接口

### 7.1 Options

```ts
export function getLevelOneOptions(
  context: RuleContext,
  draft: CanonicalRuleCharacterSnapshot,
  partialChoice: LevelOneChoiceDraft,
): RuleResult<LevelOneOptions>;

export function getLevelUpOptions(
  context: RuleContext,
  character: CanonicalRuleCharacterSnapshot,
  target: LevelUpTarget,
  partialChoice: LevelUpChoiceDraft,
): RuleResult<LevelUpOptions>;

export function getEquipmentOptions(
  context: RuleContext,
  character: CanonicalRuleCharacterSnapshot,
): RuleResult<EquipmentOptions>;
```

Options 必须只包含:

- 稳定 ID.
- 最小展示名称和来源.
- choice count 和依赖.
- 结构化 prerequisite summary code.

不得返回未授权条目或整段规则正文.

### 7.2 Validation

```ts
export function validateLevelOneChoice(
  context: RuleContext,
  draft: CanonicalRuleCharacterSnapshot,
  choice: LevelOneChoice,
): RuleValidationResult<NormalizedLevelOneChoice>;

export function validateLevelUpChoice(
  context: RuleContext,
  character: CanonicalRuleCharacterSnapshot,
  target: LevelUpTarget,
  choice: LevelUpChoice,
): RuleValidationResult<NormalizedLevelUpChoice>;

export function validateEquipmentChoice(
  context: RuleContext,
  character: CanonicalRuleCharacterSnapshot,
  choice: EquipmentChoice,
): RuleValidationResult<NormalizedEquipmentChoice>;
```

Validation 必须重新生成可选集合, 不能相信客户端回传的 option 对象.

### 7.3 Projection

```ts
export function projectLevelOneCharacter(
  context: RuleContext,
  draft: CanonicalRuleCharacterSnapshot,
  choice: NormalizedLevelOneChoice,
): RuleProjectionResult;

export function projectLevelUpCharacter(
  context: RuleContext,
  character: CanonicalRuleCharacterSnapshot,
  target: LevelUpTarget,
  choice: NormalizedLevelUpChoice,
): RuleProjectionResult;

export function projectEquipmentChange(
  context: RuleContext,
  character: CanonicalRuleCharacterSnapshot,
  choice: NormalizedEquipmentChoice,
): RuleProjectionResult;

export interface RuleProjectionResult {
  character: CanonicalRuleCharacterSnapshot;
  effects: readonly RuleEffect[];
  choices: readonly RuleChoiceRecord[];
  explanations: readonly RuleExplanation[];
}
```

Projection 只接受 validation 返回的 normalized choice. TypeScript 类型不能替代运行时检查, 所以公共 projection 仍应验证 normalized token 或提供单一 `validateAndProject*` 入口供普通调用方使用.

推荐的权威入口:

```ts
export function validateAndProjectLevelUp(
  context: RuleContext,
  character: CanonicalRuleCharacterSnapshot,
  target: LevelUpTarget,
  choice: LevelUpChoice,
): RuleResult<RuleProjectionResult>;
```

Ao 和 EulCauDnD 应调用该组合入口. 独立 options 和 validation 接口主要用于 UI 渐进展示和测试.

## 8. 错误模型

```ts
export interface RuleIssue {
  code:
    | 'entity_not_authorized'
    | 'entity_not_found'
    | 'entity_already_selected'
    | 'prerequisite_not_met'
    | 'choice_required'
    | 'choice_count_invalid'
    | 'choice_not_available'
    | 'choice_conflict'
    | 'ability_cap_exceeded'
    | 'level_cap_exceeded'
    | 'rule_system_mismatch'
    | 'unsupported_rule_shape'
    | 'catalog_invalid';
  path: readonly (string | number)[];
  entityId?: string;
  groupId?: string;
  detail?: Readonly<Record<string, string | number | boolean>>;
}

export type RuleResult<T> =
  | { ok: true; value: T; warnings: readonly RuleIssue[] }
  | { ok: false; issues: readonly RuleIssue[] };
```

要求:

- code 稳定且与中文/英文文案解耦.
- path 指向结构化提交字段.
- detail 不能包含整段受授权规则正文.
- 多个独立错误可以一次返回.
- 未支持的数据形态使用 `unsupported_rule_shape`, 不能被当作没有额外选择.

## 9. 迁移映射

| 现有区域 | 第一目标模块 | 迁移后原文件责任 |
| --- | --- | --- |
| Catalog 类型和实体 ID | `catalog/model.ts`, `catalog/identity.ts` | 重新导出兼容类型, 最终删除 |
| 来源优先级和去重 | `policy/source-priority.ts` | 调用共享函数 |
| 专长先决条件 | `options/feats.ts`, `validation/common.ts` | 已开始委托, 继续删除重复实现 |
| 起源 options | `options/origins.ts` | UI adapter |
| 职业/子职 options | `options/classes.ts` | UI adapter |
| 法术池和 choice state | `options/spells.ts`, `derived/spell-slots.ts` | UI adapter |
| 祈唤/战技/超魔等 | `options/class-features.ts` | UI adapter |
| `create*Operations` | `projection/*` | effect 到 AdjustmentOperation adapter |
| `buildLevelOneCharacter` | `validation/level-one.ts`, `projection/level-one.ts` | 兼容 façade |
| `buildLevelUpCharacter` | `validation/level-up.ts`, `projection/level-up.ts` | 兼容 façade |
| 调整解释器纯部分 | `model/effect.ts`, `projection/apply.ts` | 时间和 previous history adapter |
| 攻击/AC/装备规则 | `derived/attacks.ts`, `derived/armor-class.ts`, `projection/equipment.ts` | 本地化和 UI command adapter |
| React 完整性判断 | 对应 `validation/*` | 只渲染 issues 和 disabled 状态 |

## 10. 迁移阶段和提交边界

每个阶段必须先修改本文档的状态, 再提交代码. 每个阶段使用独立 Conventional Commit.

### R0. 盘点和接口冻结

状态: 已完成.

- 固定盘点基线.
- 冻结第一版 canonical DTO, issue 和公共 API 方向.
- 不改运行时行为.

提交:

```text
docs(rules): design shared auto-builder core
```

### R1. Catalog 和 canonical model

状态: 已完成.

- 拆出 catalog DTO, entity identity, character snapshot, choice, effect 和 issue.
- 增加 runtime parser 和 JSON round-trip 测试.
- 保持现有 `autoBuilderRules.ts` 类型兼容 façade.

完成记录:

- 新增 `catalog/model.ts`, `catalog/identity.ts` 和 `catalog/parse.ts`.
- 新增 `model/character.ts`, `model/choice.ts`, `model/effect.ts`, `model/issue.ts` 和 JSON-safe clone 边界.
- `parseRuleCatalog` 会复制输入, 拒绝循环引用, 非普通对象, 非有限数字, 危险对象 key, 无效实体身份和重复实体身份.
- `parseCanonicalRuleCharacter` 会验证版本, 规则系统, 职业等级, 属性, 实体引用, 熟练, 资源, 法术档案, 装备, 战斗数据和选择记录.
- `autoBuilderRules.ts` 已删除重复 catalog 类型定义, 通过共享类型别名保持原导出名称兼容, catalog loader 在返回前调用共享 parser.
- 测试覆盖真实完整 catalog, JSON round-trip, 输入不可变, 稳定实体 ID, 非 JSON 输入, 重复身份和 canonical character clone.

提交:

```text
refactor(rules): extract catalog and canonical models
```

### R2. 授权策略, 来源优先级和基础 options

状态: 已完成.

- 迁移 source priority, source filter 和同名去重.
- 迁移职业, 子职, 种族和背景基础候选.
- EulCauDnD 前端切换到共享函数.
- 保留调用方授权 policy.

完成记录:

- 新增 `RuleContext` 和默认拒绝的 `RuleAuthorizationPolicy`, 支持按实体类型授权来源或稳定实体 ID.
- 新增统一来源优先级排名和规范化名称去重, 相同名称只保留授权范围内优先级最高的条目.
- 新增职业, 子职, 种族, 亚种族和背景候选函数. 子职和亚种族必须同时匹配已授权父实体.
- `createDefaultRuleAuthorizationPolicy` 从 catalog 的规则配置和已盘点的官方扩展优先级构造 EulCauDnD 默认策略, 调用方仍可传入更窄的白名单.
- `AutoCharacterBuilder` 不再直接过滤职业数组; 原 `getAutoBuilder*` 入口作为兼容层调用共享候选函数.
- 测试覆盖 5e/5r 来源隔离, 同名去重, XPHB 优先级, 父实体作用域, 默认拒绝和单实体 ID 授权.

提交:

```text
refactor(rules): share catalog option policies
```

### R3. 通用 choice group 和 validation

状态: 已完成.

- 迁移属性, 技能, 工具, 语言, 武器, 熟练, 专精, 抗性等通用 choice parser.
- 把 React 完整性判断改为共享 validation.
- 未知数据形态失败关闭.

完成记录:

- 新增 `RuleStringChoiceGroup`, 在 canonical `RuleChoiceGroup` 上提供原车卡迁移期需要的 `label`, `from` 和 `count` 兼容字段.
- 新增属性, 职业技能, 通用技能, 工具, 语言, 武器, 豁免熟练, 专精和文本/抗性 choice parser.
- parser 统一生成稳定 group ID, 精确 min/max, 去重 option 和结构化 option 身份; 武器过滤保留 5e/5r 来源优先级.
- 新增共享 validation, 拒绝缺少必选项, 数量错误, 重复选择, 不在 options 中的选择和已失效 group.
- `autoBuilderRules.ts` 的通用 parser 已改为共享包兼容 façade. React 的通用完整性判断调用共享 validation, 不再仅比较数组长度.
- 未识别的 entry, 非数组 `from`, 非法 count, 无法满足的 group 和未知固定值均失败关闭.
- 测试覆盖真实 catalog 中的属性, 技能, 工具, 语言, 武器, 豁免, 专精和抗性数据, 以及数量、重复项、越权 option、失效 group 和未知结构.

提交:

```text
refactor(rules): share structured choice validation
```

### R4. 起源规则

状态: 已完成.

- 迁移种族, 亚种族, 背景, 起源解耦, 起源专长和起源法术.
- 迁移结构化感官, 抗性, 免疫, 体型, 速度, 资源和升级刷新.
- 原前端通过 adapter 应用 effects.

实施拆分:

#### R4.1 起源 options 和 validation

- 状态: 已完成.
- 组合 R3 的通用 group, 增加体型和来源特定特性.
- 统一种族, 亚种族和背景默认值, group 依赖及完整性校验.
- 未识别的 `choose` 返回 `unsupported_rule_shape`.

完成记录:

- 新增 `createRuleOriginChoiceGroups`, 一次组合属性, 技能, 工具, 语言, 武器, 抗性, 体型和来源特定特性 choice group.
- 体型和来源特定特性获得稳定 group ID, 精确 count 和结构化 option. XPHB Goliath 的 Giant Ancestry 不再由 React 单独构造.
- EulCauDnD adapter 将共享 group 映射到现有车卡 state, React 的种族选择完整性统一调用共享 validation.
- 种族, 亚种族和背景的工具及语言选项由同一共享入口生成. 未支持的起源选择结构继续失败关闭.
- 共享组合器显式识别 5e 背景的 `weighted` 属性结构, 并保留现有 `+2/+1` 或 `+1/+1/+1` 专用 adapter, 防止背景选择阻断其他起源 group.
- 测试覆盖 XPHB Human 的体型/技能, XPHB Dragonborn 的抗性, XPHB Goliath 的 Giant Ancestry, 完整提交和非法结构.
- 起源专长和 `additionalSpells` 依赖专长/法术池及等级刷新, 按生命周期归入 R4.3.

提交:

```text
refactor(rules): share origin choice options
```

#### R4.2 起源基础 effects 和 adapter

- 状态: 已完成.
- 迁移固定/选择属性, 熟练, 速度, 体型, 感官, 抗性, 免疫, 易伤和状态免疫.
- 增加 canonical snapshot 的纯 effect 应用器.
- EulCauDnD adapter 将共享 effects 转为现有 `AdjustmentOperation`.

完成记录:

- 新增 `createRuleOriginBaseEffects`, 在严格模式下先复核所有起源 choice, 再输出结构化 `RuleEffect`.
- 固定和选择属性保留 catalog 中的实际加值, 包括 `amount: 2` 和背景 `weighted` 的 `+2/+1`、`+1/+1/+1` 变体.
- 固定及选择技能、工具、语言和武器熟练统一投影为 `proficiency.add`; 武器选择通过 catalog ID 解析, 不信任调用方提交的显示文本.
- 步行速度、体型、四类感官、固定/选择抗性、免疫、易伤和状态免疫统一投影为类型化 combat effects.
- 新增 `applyRuleEffects`, 先克隆并验证 canonical snapshot, 再纯应用属性、熟练、特性、资源、法术、职业、战斗和装备 effects. 原 snapshot 保持不变.
- EulCauDnD 建卡路径通过 adapter 将共享起源 effects 转为现有可撤销 `AdjustmentOperation`; 旧实现只保留特性说明、来源特定资源及 R4.3 范围.
- adapter 的兼容模式允许旧的直接构筑调用省略选择, 但共享 API 默认严格拒绝缺项、失效 group 和越权 option.
- 共享测试覆盖实际 `amount: 2` 起源、背景 weighted 属性、结构化投影、非法选择和纯应用不修改输入. 完整起源行为审计验证现有可撤销结果保持一致.

提交:

```text
refactor(rules): share origin effect projection
```

#### R4.3 起源资源, 法术和升级刷新

- 状态: 已完成.
- 迁移来源特定资源, 固定 AC, 天生攻击, 起源专长和起源法术 options/effects.
- 未识别的 `fromFilter` 或 `additionalSpells` 返回 `unsupported_rule_shape`.
- 迁移熟练加值/等级阈值刷新, Verdan 体型变化和 Dwarf HP 增量.
- 以完整起源行为审计验证接入, 删除旧的重复规则分支.

实施拆分:

##### R4.3a 来源特定资源和刷新

- 状态: 已完成.
- 新增 `createRuleOriginResourceEffects`, 统一输出来源特定资源和 `Resourceful` inspiration effect.
- resource effect 保留稳定 ID、名称、来源、次数、恢复周期、说明和规则版本元数据.
- 熟练加值次数、3/5 级阈值、来源不同的短休/长休差异和 Giant Ancestry 选择说明均由共享规则计算.
- `applyRuleEffects` 刷新已有资源时保留已消耗次数, 并将当前次数限制在新上限内.
- 初始建卡和已有角色升级刷新均改用共享资源 effects; EulCauDnD adapter 只负责转换为可撤销 `AdjustmentOperation`.
- 测试覆盖 Orc 熟练加值刷新、Aasimar/Goliath 等级阈值、Giant Ancestry 说明、Resourceful 和已消耗次数保留.

提交:

```text
refactor(rules): share origin resource refresh
```

##### R4.3b 起源法术 options 和 effects

- 状态: 已完成.
- 新增 `createRuleAdditionalSpellChoiceState`, 解析固定法术、等级门槛、分支、固定/可选施法属性和法表筛选.
- catalog 中 77 个带 `additionalSpells` 的种族、亚种族和背景均在 1、3、5、20 级通过结构枚举测试.
- 多职业法表筛选按每个职业分别解析, 并使用 catalog 的规则版本法术来源优先级去重.
- 新增 `createRuleOriginSpellEffects`, 严格复核分支 ID、施法属性、选择数量和法术 ID 后输出 spell profile effect.
- EulCauDnD 起源法术界面和初始建卡均调用共享 options/effects. 未知 block key、container key、filter key 和无法解析的法术引用失败关闭.

提交:

```text
refactor(rules): share origin spell rules
```

##### R4.3c 起源专长、战斗特征和升级刷新

- 状态: 已完成.
- 迁移起源专长、固定 AC、天生攻击、Dwarf HP、Verdan 体型、Harengon 先攻和起源法术升级刷新.
- 删除已经由共享资源、法术和基础 effects 取代的旧分支, 完成 R4 全量审计.

实施拆分:

###### R4.3c-1 数值和体型升级刷新

- 状态: 已完成.
- 新增 `createRuleOriginAdvancementEffects`, 统一投影 Warforged AC、XPHB Dwarf HP、Verdan 体型和 Harengon 先攻.
- canonical combat model 新增可选数值 modifiers, `combat.number.add` effect 支持不可变应用和 EulCauDnD adapter 转换.
- 初始建卡和已有角色升级均调用共享规则, 并删除对应的本地数值和等级阈值分支.
- 测试覆盖初始数值、跨熟练加值阈值、Verdan 5 级体型变化、effect 应用和输入不可变性.

提交:

```text
refactor(rules): share origin numeric advancement
```

###### R4.3c-2 固定 AC 和天生攻击

- 状态: 已完成.
- 新增来源精确匹配的共享固定 AC 公式和天生攻击定义, 同一物种不同来源的伤害骰、伤害类型和说明保持独立.
- 固定 AC 覆盖 Autognome、Thri-kreen、Lizardfolk、Loxodon、Tortle 和 PSZ Goblin; adapter 继续与职业无甲防御比较并选择最高可用公式.
- 天生攻击覆盖原有 19 条定义, 包含 CON 攻击、固定伤害和 Naga 双攻击; adapter 只计算属性调整值、熟练加值和其他专长附加说明.
- EulCauDnD 从已应用的精确 `race key + source + feature` 识别共享规则, 删除本地固定 AC 特判和 `NATURAL_ATTACKS` 重复表.
- 测试覆盖来源隔离、多攻击、固定公式和返回值防御性复制; 完整起源审计验证最终 AC 与攻击条目没有行为回归.

提交:

```text
refactor(rules): share origin combat traits
```

###### R4.3c-3 起源专长和起源法术升级刷新

实施拆分:

####### R4.3c-3a 起源专长授予

- 状态: 已完成.
- 新增 `createRuleOriginFeatChoiceState`, 严格解析背景固定专长、`any`、`anyFromCategory` 和 2024 起源解耦后的 Origin category 选择.
- 新增 `feat.add` effect 和 `createRuleOriginFeatEffects`, 复核数量、重复项和候选范围后投影 canonical feat reference.
- EulCauDnD 的背景固定专长、种族赠专长和解耦起源专长均调用共享 options/effects; 专长内部复杂子选择继续按计划归入 R5.
- 测试枚举 catalog 中全部 19 个带专长授予的种族、亚种族和背景, 并覆盖异常结构、越权选择和不可变 effect 应用.

提交:

```text
refactor(rules): share origin feat grants
```

####### R4.3c-3b 起源法术升级刷新

- 状态: 已完成.
- 新增 `createRuleOriginSpellLevelUpChoiceState`, 以旧/新角色等级计算固定法术和选择数量差分, 全量枚举 77 个含 `additionalSpells` 的起源实体.
- 新增分支推断和 `createRuleOriginSpellLevelUpEffects`: 已有 profile 根据原法术推断分支并沿用施法属性; 无法唯一推断时要求用户选择, 不静默采用第一项.
- 等级门槛首次出现法术且没有旧 profile 时, 升级界面要求选择分支/施法属性并创建 profile; 已有 profile 使用 `spell.add` 追加且不覆盖原法术.
- EulCauDnD 升级界面显示每个已应用种族、亚种族或背景的新起源法术选择, 并把选择纳入升级完成度校验.
- 完整构筑审计覆盖 XPHB High Elf 在 3/5 级沿既有分支解锁法术, 以及 MPMM Aarakocra 在 3 级首次创建 WIS 法术 profile.

提交:

```text
refactor(rules): share origin spell advancement
```

R4.3c 最终清理提交:

```text
refactor(rules): share origin advancement rules
```

最终清理:

- 删除已无调用的 `createOriginResourceOperations`, `makeOriginResource` 和本地 Giant Ancestry 资源说明生成器, 避免共享资源规则与旧分支继续双重维护.
- 搜索确认本地 `NATURAL_ATTACKS`、固定种族 AC 特判、Dwarf/Verdan/Harengon 数值升级分支和旧起源资源入口均已移除.
- rules-core 42 项测试、Ao 全 workspace TypeScript 检查、EulCauDnD 生产构建、完整起源行为审计、专长审计和法术升级审计通过.

R4 仅在 R4.1-R4.3 全部完成后标记完成. 原单一提交边界由以上三个可独立回归的提交替代.

### R5. 完整专长规则

- 在现有 feat core 上增加全部 choice group, validation, effects 和等级刷新.
- 迁移专长相关来源特判.
- 装备规则改用结构化 feat identity.

提交:

```text
refactor(rules): share complete feat rules
```

### R6. 职业特有选择

- 迁移子职, 专精, 战斗风格, 祈唤, 战技, 超魔和武器精通.
- 迁移先决条件和 progression.

提交:

```text
refactor(rules): share class feature choices
```

### R7. 法术规则

- 迁移职业法术池, prepared/known/spellbook, 替换, Magical Secrets 和额外法术.
- 迁移共享多职业法术位和契约法术位.

提交:

```text
refactor(rules): share spellcasting advancement
```

### R8. 1 级建卡和升级 projection

- 实现权威 `validateAndProjectLevelOne`.
- 实现权威 `validateAndProjectLevelUp`.
- 移除 `Date.now` 产生的职业 ID, 改用稳定语义 ID 或调用方明确提供的 command ID.
- 现有 build 函数退化为 adapter façade.

提交:

```text
refactor(rules): share character build projections
```

### R9. 装备和战斗派生

- 迁移攻击, AC, 武器熟练, 装备互斥和自动刷新纯规则.
- 从显示名称判断迁移到实体 ID.
- 文案本地化保留在前端.

提交:

```text
refactor(rules): share equipment projections
```

### R10. 清理和消费者接入

- 删除已无调用方的重复实现.
- 确认 EulCauDnD 所有原审计调用共享入口.
- 再更新 Ao 子模块, 由 Ao adapter 接入剩余 Phase 8.

提交:

```text
refactor(rules): remove legacy builder rules
```

Ao 接入应在每个共享规则域完成并通过上游 parity 后单独提交, 但不得在 Ao 重新实现缺失规则.

## 11. 每阶段完成标准

每个迁移阶段必须同时满足:

- 共享包单元测试覆盖成功和失败路径.
- 输入经过 JSON stringify/parse 后行为不变.
- 输入对象在调用前后 deep-equal, 证明没有原地修改.
- 同一 fixture 在 EulCauDnD façade 和共享入口得到等价结果.
- 5e 和 5r 各至少一个行为样例.
- 未授权来源或 ID 不出现在 options.
- 提交伪造 ID, 重复 ID, 数量错误和未知字段会失败.
- `npm run build` 通过.
- 与该规则域有关的现有 `audit:*` 全部通过.
- 文档记录已迁移函数和仍保留的兼容 façade.

## 12. 测试矩阵

| 规则域 | 最低 parity 覆盖 |
| --- | --- |
| 来源策略 | 5e PHB 优先, 5r XPHB 优先, 扩展回退, 未授权来源拒绝 |
| 起源 | 固定/选择属性, 熟练, 感官, 抗性, 起源专长, 起源法术 |
| 职业 | 1 级 HP, 熟练, 子职触发, 多职业, 职业资源 |
| ASI/专长 | `+2`, `+1/+1`, 复杂专长, 重复专长, 属性上限 |
| 法术 | prepared-all, known caster, spellbook, pact slots, multiclass slots, 替换 |
| 职业选择 | 专精, 风格, 祈唤, 战技, 超魔, 武器精通 |
| 装备 | 命中, 伤害, 主副手, 盾牌冲突, AC, 魔法武器 |
| 投影 | effect 稳定排序, stable ID, 幂等, 不修改输入 |

## 13. 明确不在共享核心中的内容

- React 组件和 CSS.
- 登录, localStorage 和角色文件保存.
- `fetch` 或服务器文件读取.
- Ao 数据库事务, 房主权限和升级资格.
- 许可证决定和白名单审查流程.
- AI DM 行为.
- 翻译后的完整规则正文展示.
- 当前时间, command ID 和审计 actor.

## 14. 下一步

下一项工作严格从 R1 开始:

1. 拆出 catalog 和 canonical model.
2. 为 parser, JSON round-trip, immutability 和稳定 entity ID 添加测试.
3. 让 `autoBuilderRules.ts` 通过兼容导出使用新类型.
4. 更新本文档 R1 状态并提交.

在 R1-R8 完成前, 不把 Ao 新增职业, 法术或复杂专长规则作为主线任务.
