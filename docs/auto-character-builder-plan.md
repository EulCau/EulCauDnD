# 自动车卡阶段计划

本文档记录当前车卡工具与 `third_party/5etools-cn` 的对接现状, 已完成内容, 缺口, 以及后续阶段计划。当前阶段目标是审计和制定计划, 不要求一次性完成全部自动车卡功能。

## 代码与数据入口

- 主应用入口: `App.tsx`
- 自动车卡 UI: `components/AutoCharacterBuilder.tsx`
- 装备与背包 UI: `components/Equipment.tsx`
- 搜索 UI: `components/SearchPanel.tsx`
- 可撤销角色调整接口: `utils/characterAdjustments.ts`
- 自动车卡规则: `utils/autoBuilderRules.ts`
- 装备, AC, 攻击派生规则: `utils/equipmentRules.ts`
- 5etools 数据抽取脚本: `scripts/extract-5etools-character-data.mjs`
- 魔法物品抽取脚本: `scripts/extract-magic-items.mjs`
- 当前自动车卡数据: `public/data/auto-builder-core.json`
- 当前通用核心数据: `public/data/core.json`
- 当前魔法物品数据: `public/data/magic-items.json`
- 5etools 中文站源码与数据: `third_party/5etools-cn`

`third_party/5etools-cn` 是完整站点副本, 包含 `data/class`, `data/spells`, `data/races.json`, `data/backgrounds.json`, `data/items-base.json`, `data/items.json`, `data/bestiary` 等数据目录, 以及 `js/omnidexer.js`, `js/search.js` 等站内搜索相关代码。后续应优先复用这些 JSON 数据结构, 不应手写内容表。

## 当前数据覆盖

基于 `public/data/auto-builder-core.json` 当前统计:

- 职业: 24, 即 PHB 与 XPHB 的 12 职业各一套
- 子职: 302
- 种族: 139, 包含 PHB, XPHB, MPMM, AAG, ERLW, VGM 等官方扩展来源
- 亚种族: 92
- 背景: 36
- 专长: 276
- 法术: 936
- 武器: 75
- 护甲与盾牌: 26
- 魔契祈唤: 82
- 战斗风格: 13
- 超魔: 20
- 战技: 43

当前法术来源包含 PHB, XPHB, XGE, TCE, FTD, SCC 等官方扩展。当前子职也已包含大量扩展来源, 如 XGE, TCE, SCAG, FTD, EGW, FRHoF 等。当前种族也已包含 MPMM, AAG, ERLW, VGM, FTD, GGR 等扩展来源。

魔法物品数据 `public/data/magic-items.json` 当前统计:

- 生成时间: `2026-06-23T02:35:16.393Z`
- 总数: 1370
- 分类: weapon 285, armor 116, wondrous 668, scroll 95, potion 61, focus 17, other 128

## 已完成内容

### 1. 可撤销调整接口

`utils/characterAdjustments.ts` 已提供统一的 `applyCharacterAdjustments` 与 `removeCharacterAdjustments`。

已支持的操作类型:

- `set`: 设置数值或字符串路径, 如 `armorBase`, `hpCurrent`, `abilities.STR`
- `addNumber`: 对数值路径叠加, 可反向撤销
- `addTextEntry`: 对结构化字符串列表追加条目, 可反向撤销, 当前用于 `damageResistances`, `damageImmunities`, `damageVulnerabilities`, `conditionImmunities` 与 `senses`
- `setStringField`: 设置 race, subrace, background, bodyType
- `setClasses`: 设置多职业列表
- `setAutomation`: 设置自动化元数据
- `setSpellcasting`, `setSpellcastingProfiles`, `upsertSpellcastingProfile`
- `upsertResource`
- `addProficiency`, `removeProficiency`
- `addFeature`
- `addAttack`
- `addSpell`
- `addItem`

接口会在应用操作前记录 previous 值或 previous 对象。用同一个 `sourceId` 再次应用时会先移除旧调整, 因此适合装备, 专长, 职业特性, 法术档案等重复刷新场景。

### 2. 自动车卡主体流程

`components/AutoCharacterBuilder.tsx` 和 `utils/autoBuilderRules.ts` 已实现:

- 规则版本选择: `5e` 与 `5r`
- 1 级建卡与升级模式
- 种族, 亚种族, 背景, 职业, 子职选择
- 5r 背景与起源解耦选项
- 属性加值选择
- 技能, 工具, 语言选择
- ASI 与专长选择
- 专长带来的属性, 熟练, 专精, 法术, 战斗风格, 祈唤, 战技, 超魔处理
- 职业特性和子职特性加入 `featureEntries`
- 职业资源加入 `resources`, 如狂暴, 诗人激励, 引导神力, 荒野形态, 回气, 圣疗池, 术法点等
- 战斗风格, 魔契祈唤, 战技, 超魔的选择与加入
- 武器精通选择与加入
- 多职业升级时的职业列表, 熟练, 生命值, 生命骰更新
- 种族黑暗视觉和伤害抗性现在会写入结构化 `senses` 与 `damageResistances`, 同时保留特性描述
- 种族伤害免疫, 伤害易伤, 状态免疫, 特殊感官会写入结构化列表, 同时保留特性描述
- 种族固定武器熟练会去除 5etools 来源后缀后写入 `proficiencies`, 可被装备攻击熟练判断复用
- 种族和专长的选择型武器熟练会从 5etools `weaponProficiencies.choose` 生成选择项, 并通过 `addProficiency` 应用
- 明确常驻的种族 AC 规则会进入自动 AC 计算或 `armorBonus`

当前实现遵循“不可直接改散字段, 通过调整操作生成最终角色卡”的方向, 但还没有覆盖每个特性或专长的全部数值效果。

### 3. 施法逻辑

已实现的规则点:

- 区分 `preparedAll` 与 `knownSelection`
- `preparedSpellsChange === "restLong"` 且没有已知法术进度的职业被视为可随时准备全部法术的职业
- 可随时准备法术的职业升级时会把到可施法环阶的全部职业法术加入法表
- 已知法术职业会按进度要求用户选择新增法术
- 术士, 吟游诗人, 邪术师等已知法术职业支持升级时替换一个已知法术
- 法师使用 `spellsKnownProgressionFixed` 表示法术书学习, 不被当作 prepared-all
- 子职额外准备法术与扩展法表有数据路径
- 5r 吟游诗人 10 级后的 Magical Secrets 扩展法表已纳入法术池
- 5e 吟游诗人 Magical Secrets 有独立选择入口
- `SpellcastingProfile.preparationMode` 已能区分 `preparedAll`, `knownSelection`, `manual`
- `Spell.prepared` 已能表示是否自动准备
- `audit-spell-behavior` 已覆盖 5e/5r prepared-all 与 known-selection 的关键分类:
  - prepared-all: PHB/XPHB Cleric, PHB/XPHB Druid, PHB/XPHB Paladin, XPHB Ranger
  - known-selection: PHB/XPHB Bard, PHB/XPHB Sorcerer, PHB/XPHB Warlock, PHB Ranger
  - Wizard: PHB/XPHB 均按 spellbook 学法术处理, 不按全职业法表 prepared-all 处理
- `audit-spell-behavior` 已验证 Warlock pact slots 可正确推导可选法术环阶。
- `audit-spell-behavior` 已验证职业和子职额外准备法术会进入法表并标记 `prepared = true`。
- `audit:feat-spell-behavior` 已通过真实 1 级建卡路径验证专长赠法术会进入专长法术 profile 并标记 `prepared = true`。

需要继续验证和补齐的点:

- prepared-all 职业的 1 级建卡与多次升级后的法表已有脚本级不变量覆盖, 但仍需要 UI 实测。
- 法师升级学法术的 UI 已有选择机制, 但需要继续确认固定环阶组 UI 与 spellbook 行为是否足够明确。
- 完整 UI 流程仍需要继续测试 prepared 标记。

### 4. 装备与攻击

`utils/equipmentRules.ts` 已实现:

- 基础武器装备后向 `attacks` 添加自动攻击项
- 取消装备后通过 `removeCharacterAdjustments` 移除攻击项
- 副手武器支持单独攻击项
- 武器攻击加值包含属性调整值, 熟练加值, 魔法武器加值, 箭术加值
- 武器伤害包含属性调整值, 魔法武器加值, 部分战斗风格加值
- 攻击备注包含武器特性, 攻击属性, 攻击次数, 狂暴伤害, 偷袭, 神圣打击提示, 精通至圣斩, 战斗风格提示, 射程, 特殊条目, 武器精通
- 护甲, 盾牌装备后调整 AC, 并加入装备特性描述
- 未穿甲 AC, 无甲防御, 防御战斗风格, 武僧武艺徒手打击, 徒手战斗风格等会自动刷新
- 魔法武器, 魔法护甲, AC 加值, 施法攻击和豁免 DC 加值已在 `components/Equipment.tsx` 中通过调整接口接入
- 盾牌会与双手主手武器冲突, 装备盾牌时会卸下双手武器和副手武器
- 副手武器限制为轻型, 且已装备非轻型主手武器时不会装备副手
- 魔法武器攻击生成已迁入 `utils/equipmentRules.ts`, UI 不再手写攻击加值和伤害字符串
- 副手武器装备失败原因已由 `utils/equipmentRules.ts` 提供, UI 会禁用按钮并显示原因
- `audit:equipment-behavior` 已覆盖基础装备互斥, 攻击条目, 以及部分攻击数值公式回归检查
- `audit:equipment-behavior` 已覆盖普通武器在属性和战斗风格变化后的刷新重算
- `audit:equipment-behavior` 已覆盖投掷, 弹药, 装填, 触及, 两用和特殊武器条目备注
- `audit:equipment-behavior` 已覆盖副手攻击命中公式, 以及中文武器名熟练添加/撤销后的刷新重算

需要继续验证和补齐的点:

- 装备后的普通主手和副手攻击会因 `refreshCharacterAutomation` 重算, 魔法武器攻击已与普通主手武器和其他魔法武器互斥。
- 模板魔法武器和独立魔法武器都已能刷新重算。独立魔法武器通过攻击条目上的轻量武器快照恢复。
- 武器熟练 key 已支持英文键, 中文武器名, 中文/英文武器类别。后续若加入更多别名来源, 仍应继续走统一熟练判断 helper。

### 5. 5e 与 5r 区分

已实现:

- `RuleSystem = "5e" | "5r"`
- `5e` 主来源 PHB, `5r` 主来源 XPHB
- 自动化元数据保存 `ruleSystem` 与 `officialExtensionsEnabled`
- 法术, 专长, 祈唤, 超魔, 战技等有来源优先级
- `5r` 的同名法术优先 XPHB, 然后才回退 PHB 和扩展
- `5r` 的同名背景和同名子职优先 XPHB, 同时保留 5e 时期官方扩展选项
- `5r` 子职可使用 5e 时期扩展子职, 代码里对子职源没有只限制 XPHB

主要缺口:

- 5r 中 5e 和 5r 同名内容的优先规则已在法术, 专长, 种族, 背景, 子职选择上存在。
- 扩展种族已进入数据和选择列表, 但多数扩展种族的复杂特性还只是以描述加入 `featureEntries`, 后续需要继续把可数值化部分转成调整操作。

### 6. 搜索

`components/SearchPanel.tsx` 当前支持:

- 法术搜索
- 职业/子职特性搜索
- 魔法物品搜索
- 怪物图鉴轻量元数据搜索
- 按 tabs 切换 all, spells, features, items, monsters
- 同名特性的来源选择
- 从搜索结果购买物品加入背包
- 结构化筛选:
  - 全局来源
  - 法术环阶
  - 物品分类与稀有度
  - 怪物类型与 CR

主要缺口:

- 搜索结果没有复用 5etools 的 `search/index.json` 或 `omnidexer` 元数据, 当前是应用内数组过滤。
- 怪物详情已显示 statblock 摘要字段, 但未复用 5etools 原站的完整渲染器。
- 搜索筛选控件已按当前规则版本处理 5e/5r 来源优先级, 同名搜索结果已按来源优先级去重。
- 怪物索引已从应用启动加载改为 SearchPanel 按需加载。

## 当前验证状态

已执行:

- 读取并统计 `public/data/auto-builder-core.json`
- 读取并统计 `public/data/magic-items.json`
- 审计 `scripts/extract-5etools-character-data.mjs`
- 审计 `scripts/extract-magic-items.mjs`
- 审计 `utils/characterAdjustments.ts`, `utils/autoBuilderRules.ts`, `utils/equipmentRules.ts`, `components/AutoCharacterBuilder.tsx`, `components/Equipment.tsx`, `components/SearchPanel.tsx`

阶段 1 前的验证问题:

- `npm run audit:character-data` 当前失败, 因为脚本读取旧路径 `data/character-content/core.json` 和 `public/character-content/auto-builder-core.json`
- `npm run audit:spell-behavior` 当前失败, 因为脚本读取旧路径 `public/character-content/auto-builder-core.json`

这两个脚本已在阶段 1 修正, 见下方阶段记录。

## 阶段 1 记录

状态: 已完成。

改动:

- `scripts/audit-character-data.mjs` 改为读取 `public/data/core.json` 与 `public/data/auto-builder-core.json`。
- `scripts/audit-spell-behavior.mjs` 改为读取 `public/data/auto-builder-core.json`。
- `audit-character-data` 增加了基础 5e/5r 数据断言:
  - `5e` 主来源必须是 PHB。
  - `5r` 主来源必须是 XPHB。
  - `5r` 法术来源优先 XPHB, 但允许 PHB。
  - `5e` 法术来源优先 PHB, 且主来源不包含 XPHB。
  - PHB 职业数为 12, XPHB 职业数为 12。
  - PHB 与 XPHB 种族数据都存在。
- `audit-spell-behavior` 增加了同名 PHB/XPHB 法术优先级断言:
  - 5r 对同名法术优先 XPHB。
  - 5e 对同名法术优先 PHB。

已通过验证:

- `npm run audit:character-data`
- `npm run audit:spell-behavior`
- `npm run build`

构建备注:

- `npm run build` 通过。
- Vite 报告主 chunk 超过 500 kB, 这是体积警告, 不是构建失败。后续加入怪物图鉴前应优先考虑搜索数据懒加载或轻量索引。

## 阶段 2 记录

状态: 已完成。

改动:

- `scripts/extract-5etools-character-data.mjs` 新增官方玩家可选种族来源白名单。
- 自动车卡数据的种族来源从 PHB/XPHB 扩展到 MPMM, AAG, ERLW, VGM, FTD, GGR, MOT, VRGR, WBtW 等。
- `rules.5e.raceSources` 与 `rules.5r.raceSources` 写入 `auto-builder-core.json`, 作为前端来源优先级依据。
- `utils/autoBuilderRules.ts` 的 `getAutoBuilderRaces` 改为按来源优先级去重:
  - 5e 使用 PHB 与官方扩展, 不使用 XPHB。
  - 5r 优先 XPHB, 同时允许 PHB 与 5e 官方扩展。
  - 同名种族只显示最高优先级版本。
- 放宽 `AutoBuilderOrigin.source` 和 `raceSource` 类型, 支持扩展来源。
- `scripts/audit-character-data.mjs` 增加扩展种族和 `raceSources` 元数据断言。
- `scripts/extract-5etools-character-data.mjs` 的输出摘要加入种族和亚种族来源统计。

当前扩展结果:

- race: 139
- subrace: 92
- 5r 去重后的可选种族约 88 个。
- 示例: `阿斯莫|XPHB`, `龙裔|XPHB`, `精灵|XPHB`, `人类|XPHB`, `星界精灵|AAG`, `自动侏儒|AAG`, `熊地精|MPMM`, `幻身灵|MPMM`, `离梦人|ERLW`。

已通过验证:

- `npm run extract:5etools`
- `npm run audit:character-data`
- `npm run audit:spell-behavior`
- `npm run build`

构建备注:

- `npm run build` 通过。
- Vite 仍报告主 chunk 超过 500 kB。扩展种族后 `auto-builder-core.json` 约 3.96 MiB, 低于审计脚本 6 MiB 上限。

## 阶段 3a 记录

状态: 已完成。

范围: 种族结构化字段的可撤销应用。

改动:

- `utils/autoBuilderRules.ts` 新增种族/背景结构化特性操作生成。
- `speed` 支持 5etools 的对象形态, 如 `{walk: 30, fly: true}`。
- 步行速度通过 `set` 操作写入 `speed`, 因此可随自动车卡调整撤销。
- 飞行, 攀爬, 游泳, 掘穴等额外移动速度写入 `featureEntries` 的“移动速度”条目。
- `darkvision` 写入 `featureEntries` 的“黑暗视觉”条目。
- 固定 `resist` 字符串写入 `featureEntries` 的“伤害抗性”条目。
- `resist.choose` 仍走已有种族抗性选择 UI, 不自动猜测。
- `scripts/audit-character-data.mjs` 增加种族对象速度, 黑暗视觉, 固定抗性元数据断言。

说明:

- 当前角色卡没有独立的抗性/感官字段, 所以黑暗视觉和固定抗性先进入特性条目。这满足“没有数值调整的部分加入相应角色特性”的要求, 且来源仍由 `sourceId` 绑定, 可随调整撤销。
- 这一切片没有覆盖复杂文本规则, 例如特定条件下优势, 天生施法, 特殊休息资源等。

已通过验证:

- `npm run audit:character-data`
- `npm run audit:spell-behavior`
- `npm run build`

构建备注:

- `npm run build` 通过。
- Vite 仍报告主 chunk 超过 500 kB。

## 阶段 3b 记录

状态: 已完成。

范围: 低风险专长的升级缩放。

已有基础:

- `Tough`/`健壮` 初次取得时已经通过 `addNumber hpMaxBonus` 增加 `2 * 当前角色等级`。
- `Alert`/`警觉` 初次取得时已经通过 `addNumber initiativeBonus` 增加先攻加值。
- `Mobile`/`灵活移动` 与 `Speedy`/`飙速跑者` 初次取得时已经通过 `addNumber speedBonus` 增加 10 尺速度。

本次改动:

- `utils/autoBuilderRules.ts` 新增 `createExistingFeatLevelUpOperations`。
- 已有 `Tough` 的角色升级时, 自动通过 `addNumber hpMaxBonus` 追加每级 +2 HP。
- 已有 XPHB `Alert` 的角色升级时, 若熟练加值提高, 自动通过 `addNumber initiativeBonus` 追加差值。
- 新取得 `Tough` 或 `Alert` 的当级不重复计算, 仍由原有 `createFeatOperations` 处理完整初次加值。
- `scripts/audit-character-data.mjs` 增加相关专长数据存在性断言: PHB/XPHB Tough, PHB/XPHB Alert, PHB Mobile, XPHB Speedy。

已通过验证:

- `npm run audit:character-data`
- `npm run audit:spell-behavior`
- `npm run build`

说明:

- 当前仍使用已有数值字段 `hpMaxBonus`, `initiativeBonus`, `speedBonus`, 没有新增角色卡字段。
- 后续若要完整支持更多专长, 建议继续按“数据结构字段优先, 文本规则谨慎转写”的方式推进。

## 阶段 3c 记录

状态: 已完成.

范围: 专长选择型熟练的可撤销应用审计.

已有基础:

- 专长固定技能, 工具, 语言, 武器, 护甲熟练已通过 `createFixedProficiencyOperations` 写入 `addProficiency`.
- 专长选择型技能, 工具, 语言, 豁免, 专精已通过对应 choice operations 写入 `addProficiency`.

本次改动:

- 修正 `getFeatSavingThrowChoiceOptions`, 现在支持 5etools 直接 `savingThrowProficiencies: [{ choose: ... }]` 形态.
- 新增 `scripts/audit-feat-behavior.mjs`.
- 新增 `npm run audit:feat-behavior`.
- 审计脚本通过真实 `buildLevelUpCharacter` 路径验证:
  - XPHB `Lightly Armored` 会应用 +1 DEX, 轻甲熟练, 盾牌熟练.
  - XPHB `Resilient` 会暴露豁免选择组, 并应用 +1 CON 与所选 CON 豁免熟练.
  - XPHB `Skill Expert` 会应用 +1 DEX, 所选技能熟练, 以及对新选技能的专精.

已通过验证:

- `npm run audit:feat-behavior`
- `npm run audit:feat-spell-behavior`
- `npm run audit:character-data`
- `npm run build`

说明:

- 本阶段修复的是 UI 选择模型到建卡函数之间的明确数据形态缺口.
- 本阶段没有新增独立角色卡字段, 继续复用已有的能力值, 熟练集合和专精集合.

## 阶段 3d 记录

状态: 已完成.

范围: 种族感官和抗性的结构化可撤销字段.

改动:

- `CharacterData` 新增 `damageResistances` 与 `senses` 列表.
- `AdjustmentOperation` 新增 `addTextEntry`, 可对结构化字符串列表追加条目并按 `sourceId` 撤销.
- `utils/characterAdjustments.ts` 记录 `previousExists`, 避免撤销某来源时误删原本就存在的同名条目.
- `createOriginStructuredFeatureOperations` 现在会把种族/亚种族黑暗视觉写入 `senses`, 固定抗性写入 `damageResistances`.
- `createRaceChoiceOperations` 现在会把选择型抗性写入 `damageResistances`.
- `FeaturesBox` 显示结构化伤害抗性和感官.
- `utils/characterStorage.ts` 为旧角色补默认 `damageResistances` 与 `senses`.
- 新增 `scripts/audit-origin-structured-behavior.mjs`.
- 新增 `npm run audit:origin-structured-behavior`.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段仍保留原有 `featureEntries` 描述, 因为抗性和黑暗视觉的规则文字需要在角色特性区可读.
- 该阶段不新增免疫, 状态免疫, 条件优势等字段, 后续可以沿用同一操作模式扩展.

## 阶段 3e 记录

状态: 已完成.

范围: 种族固定熟练 key 规范化.

改动:

- `createFixedProficiencyOperations` 现在使用 `normalizeEntityRef`, 会去除 5etools 固定熟练 key 中的来源后缀, 如 `battleaxe|phb`.
- 种族, 亚种族, 背景, 专长的固定工具, 语言, 武器, 护甲熟练都会复用同一规范化路径.
- 扩展 `scripts/audit-origin-structured-behavior.mjs`, 通过 PHB 矮人 + PHB 法师真实 1 级建卡路径验证:
  - 矮人战斗训练写入 `weapon:battleaxe`.
  - 角色卡不保留 `weapon:battleaxe|phb`.
  - 装备 PHB 战斧后, 命中会获得熟练加值.

已通过验证:

- `npm run audit:origin-structured-behavior`
- `npm run audit:equipment-behavior`
- `npm run audit:character-data`
- `npm run build`

说明:

- 本阶段没有新增 UI 选择, 只修正已有固定熟练的规范化和数值联动.
- 选择型武器熟练, 如 PHB `Weapon Master`, 仍需后续单独接入可选武器列表.

## 阶段 3f 记录

状态: 已完成.

范围: 选择型武器熟练.

改动:

- 新增 `AutoBuilderWeaponChoiceSelection`, 用于保存按组选择的武器 id.
- 新增 `getOriginWeaponChoiceOptions` 与 `getFeatWeaponChoiceOptions`, 从 5etools `weaponProficiencies.choose` 生成可选武器.
- 当前支持 `choose.from` 和 `choose.fromFilter`; 对 `fromFilter` 中的军用/简易武器条件使用当前武器表解析.
- `fromFilter` 解析会按规则版本优先来源排序并按武器 key 去重, 5r 下同名武器优先 XPHB.
- `createRaceChoiceOperations`, `createChosenFeatOperations`, `createAbilityScoreImprovementOperations` 会把所选武器写入 `addProficiency`.
- `AutoCharacterBuilder` 在种族选择, 起源专长, 种族赠专长, 战斗风格赠专长, ASI 专长位置显示武器熟练选择.
- 扩展 `audit-origin-structured-behavior`, 验证 VGM 大地精可选择两项军用武器并应用所选熟练.
- 扩展 `audit-feat-behavior`, 验证 PHB `Weapon Master` 暴露四项武器选择, 应用所选战斧熟练, 影响装备攻击命中, 且 5r 武器选择列表优先 XPHB 同名武器.

已通过验证:

- `npm run audit:origin-structured-behavior`
- `npm run audit:feat-behavior`
- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- 本阶段选择值使用武器 id, 应用到角色卡时写为 `weapon:${weapon.key.toLowerCase()}`.
- `fromFilter` 解析当前只覆盖已出现的数据形态, 即军用/简易基础武器筛选; 更复杂的过滤语法后续再按真实数据扩展.

## 阶段 3g 记录

状态: 已完成.

范围: 种族免疫, 易伤和特殊感官结构化.

改动:

- `CharacterData` 新增 `damageImmunities`, `damageVulnerabilities`, `conditionImmunities`.
- `TextListAdjustmentPath` 扩展到伤害免疫, 伤害易伤, 状态免疫, 继续复用 `addTextEntry` 的可撤销逻辑.
- `scripts/extract-5etools-character-data.mjs` 现在从 5etools 种族/亚种族数据抽取 `immune`, `vulnerable`, `conditionImmune`, `blindsight`, `tremorsense`, `truesight`.
- `createOriginStructuredFeatureOperations` 会把固定免疫, 易伤, 状态免疫和特殊感官写入结构化字段, 并加入对应特性描述.
- `FeaturesBox` 显示伤害免疫, 伤害易伤和状态免疫.
- `characterStorage` 为旧角色补默认结构化列表.
- `public/data/auto-builder-core.json` 已重新抽取, 当前官方扩展数据中包含自动侏儒的疾病免疫, 纯血原体蛇人的毒素伤害免疫和中毒状态免疫.
- 扩展 `audit-origin-structured-behavior`, 验证自动侏儒状态免疫可撤销, 纯血原体蛇人伤害免疫和状态免疫会结构化写入.
- 扩展 `audit-character-data`, 验证抽取数据中存在种族伤害免疫和状态免疫元数据.

已通过验证:

- `npm run extract:5etools`
- `npm run audit:origin-structured-behavior`
- `npm run audit:character-data`
- `npm run build`

说明:

- 当前官方白名单内没有伤害易伤或特殊感官样例, 但运行时和抽取字段已接入; 后续若来源白名单加入对应数据, 会自动进入结构化路径.
- 本阶段只处理固定字符串条目, 不自动解析复杂 choose 或条件性免疫文本.

## 阶段 3h 记录

状态: 已完成.

范围: 常驻种族 AC 规则.

改动:

- `utils/equipmentRules.ts` 的自动 AC 刷新现在会把常驻自然护甲与未穿甲/无甲防御一起比较, 取最高可用基础 AC.
- 已接入的自然护甲:
  - 自动侏儒 `装甲外壳`: 13 + 敏捷调整值.
  - 蜥蜴人 `天生护甲`: 13 + 敏捷调整值.
  - 螳螂人 `变色甲壳`: 13 + 敏捷调整值.
  - 象族 `天生护甲`: 12 + 体质调整值.
  - 龟人 `天生护甲`: 17.
  - PSZ 地精 `坚毅`: 11 + 敏捷调整值.
- 战俑 `集成防护` 通过 `addNumber armorBonus +1` 接入, 可随自动车卡调整撤销.
- 扩展 `audit-origin-structured-behavior`, 验证自动侏儒, 象族, 龟人和战俑的 AC 结果.

已通过验证:

- `npm run audit:origin-structured-behavior`
- `npm run audit:equipment-behavior`
- `npm run audit:character-data`
- `npm run build`

说明:

- 本阶段只处理常驻 AC 规则.
- 化兽者化形, 兽皮化形, 龟壳防御等临时或主动状态没有自动常驻应用, 后续需要状态/资源开关后再接.

## 阶段 3i 记录

状态: 已完成.

范围: 专长资源型数值效果.

改动:

- 新增专长资源调整 helper, 复用 `upsertResource`, 让专长也能写入可撤销资源.
- `Lucky|PHB` 会加入 `幸运点` 资源, 最大值 3, 长休恢复.
- `Lucky|XPHB` 会加入 `幸运点` 资源, 最大值等于角色总等级对应的熟练加值, 长休恢复.
- 角色升级时, 已拥有 `Lucky|XPHB` 的角色会按新总等级刷新幸运点最大值.
- 扩展 `audit-feat-behavior`, 验证 PHB Lucky 固定资源, XPHB Lucky 初次获得和 5 级熟练加值刷新.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- 本阶段只处理 Lucky 的明确资源数值. 其他专长中的临时优势, 反应触发, 伤害减免等仍只保留描述, 等有状态/触发接口后再结构化.

## 阶段 3j 记录

状态: 已完成.

范围: 专长授予战技/超魔的资源型数值效果.

改动:

- `Martial Adept|PHB` 会加入 `卓越骰` 资源, 最大值 1, 短休恢复, 备注说明 d6 且短休或长休后恢复.
- `Metamagic Adept|TCE` 会加入 `专长术法点` 资源, 最大值 2, 长休恢复, 备注说明只能用于超魔法.
- 扩展 `audit-feat-behavior`, 验证 `Martial Adept` 暴露并应用 2 个战技, 且写入卓越骰资源.
- 扩展 `audit-feat-behavior`, 验证 `Metamagic Adept` 暴露并应用 2 个超魔, 且写入专长术法点资源.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- 术法点目前作为专长独立资源显示, 不与术士职业术法点合并. 这样可以保留“只能用于超魔法”的限制说明, 也避免和职业资源撤销路径互相污染.

## 阶段 3k 记录

状态: 已完成.

范围: 按熟练加值或固定次数的专长资源.

改动:

- 集中新增 `getFeatResourceOperations`, 初次获得专长和升级刷新复用同一套资源定义.
- `Gift of the Chromatic Dragon|FTD` 会加入 `繁彩注魔` 资源, 最大值 1, 长休恢复.
- `Gift of the Chromatic Dragon|FTD` 会加入 `反应抗性` 资源, 最大值等于熟练加值, 长休恢复, 升级时刷新.
- `Gift of the Gem Dragon|FTD` 会加入 `念力报复` 资源, 最大值等于熟练加值, 长休恢复, 升级时刷新.
- `Mage Slayer|XPHB` 会加入 `审慎护心` 资源, 最大值 1, 以 `shortRest` 表示短休或长休后恢复, 并在备注中说明.
- 扩展 `audit-feat-behavior`, 验证上述资源的初次获得和熟练加值刷新.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- 本阶段只处理使用次数资源. 这些专长的反应触发, 伤害类型选择, DC 公式等仍保留在特性描述中, 后续若加入状态/触发接口再结构化.

## 阶段 4a 记录

状态: 已完成。

范围: 装备冲突规则。

改动:

- `utils/equipmentRules.ts` 新增主手武器查询 helper。
- 装备盾牌时, 如果主手已装备双手武器, 会先通过 `removeCharacterAdjustments` 卸下该武器。
- 装备盾牌时继续卸下副手武器, 因为盾牌占用副手。
- 装备副手武器时, 若副手武器不是轻型, 不应用装备调整。
- 装备副手武器时, 若已装备主手武器且主手不是轻型, 不应用副手装备调整。
- 装备副手武器时, 若已装备盾牌, 会先卸下盾牌。
- `components/Equipment.tsx` 调用 `equipShield` 时传入 `content`, 使盾牌逻辑可以检查主手武器属性。
- `scripts/audit-character-data.mjs` 增加装备规则依赖数据断言: 双手武器, 轻型武器, 盾牌数据必须存在。

已通过验证:

- `npm run build`
- `npm run audit:character-data`
- `npm run audit:spell-behavior`

说明:

- 该阶段只处理基础冲突规则, 仍未合并魔法武器装备流程。
- 目前非轻型副手请求会被忽略, UI 暂无错误提示。后续可以在装备面板显示禁用状态或提示原因。

## 阶段 4b 记录

状态: 已完成。

范围: 魔法武器攻击生成模块化。

改动:

- `utils/equipmentRules.ts` 新增通用 `createWeaponAttack` helper, 普通武器和魔法武器共用攻击加值, 伤害, 类型和备注生成逻辑。
- `utils/equipmentRules.ts` 新增 `equipMagicWeapon`, 统一通过 `applyCharacterAdjustments` 写入 `addAttack` 调整。
- `components/Equipment.tsx` 不再手写魔法武器攻击加值, 伤害字符串和攻击条目。
- 模板魔法武器会先选择基础武器, 再把 `bonusWeapon` 烘进传给规则模块的 weapon 数据。
- 装备魔法武器时会移除已有主手普通武器和其他 `equip-magic-*` 魔法武器攻击, 避免主手攻击残留。
- 魔法武器仍保留现有施法攻击和豁免 DC 加值叠加逻辑。

已通过验证:

- `npm run build`

说明:

- 本阶段只把魔法武器攻击生成迁移到装备规则模块, 没有改魔法护甲或施法焦点的调整路径。
- 后续建议补一个装备行为测试脚本, 直接构造角色数据验证普通武器, 魔法武器, 盾牌, 副手的互斥和攻击条目。

## 阶段 4c 记录

状态: 已完成。

范围: 副手武器装备失败提示。

改动:

- `utils/equipmentRules.ts` 新增 `getOffHandWeaponEquipBlockReason`, 统一返回副手武器无法装备的原因。
- `equipOffHandWeapon` 改为复用该规则函数, 避免 UI 与规则判断分叉。
- `components/Equipment.tsx` 在副手武器不满足规则时禁用装备按钮, 并显示原因。
- 当前提示覆盖:
  - 所选副手武器不是轻型武器。
  - 已装备非轻型主手武器。
  - 已装备魔法主手武器, 因当前魔法武器路径尚不能可靠判断其是否轻型。

已通过验证:

- `npm run build`

说明:

- 本阶段没有改变已经装备副手武器的卸下流程。
- 后续若魔法武器记录能保存基础武器 ID, 可以把“魔法主手武器”规则细化为按基础武器轻型属性判断。

## 阶段 4d 记录

状态: 已完成。

范围: 装备行为回归审计。

改动:

- 新增 `scripts/audit-equipment-behavior.mjs`。
- 新增 `npm run audit:equipment-behavior`。
- 审计脚本通过 Vite 临时打包测试入口, 调用真实 `utils/equipmentRules.ts` 函数, 避免在脚本里重写一套镜像装备规则。
- 当前覆盖:
  - 非轻型主手阻止副手武器。
  - 非轻型副手给出轻型需求原因。
  - 轻型副手会添加副手攻击。
  - 装备非轻型主手会移除已有副手。
  - 盾牌会移除双手主手武器。
  - 魔法武器会替换普通主手武器。
  - 魔法主手武器会阻止副手武器。
  - 第二把魔法武器会替换第一把魔法武器。

已通过验证:

- `npm run audit:equipment-behavior`

说明:

- 该脚本优先覆盖装备互斥和攻击条目是否存在, 暂未逐项断言所有攻击数值公式。
- 后续可以继续扩展到熟练, 属性变化, 战斗风格变化后的攻击重算。

## 阶段 4e 记录

状态: 已完成。

范围: 装备攻击数值审计。

改动:

- 扩展 `scripts/audit-equipment-behavior.mjs`, 在已有装备互斥检查基础上增加攻击数值断言。
- 当前新增覆盖:
  - 普通近战武器命中 = 属性调整值 + 熟练加值。
  - 普通近战武器伤害包含属性调整值。
  - 箭术战斗风格给远程武器命中 +2, 且备注显示该加值。
  - 对决战斗风格给单手近战武器伤害 +2, 且备注显示该加值。
  - +1 魔法武器同时把 +1 加入命中和伤害。

已通过验证:

- `npm run audit:equipment-behavior`

说明:

- 该阶段仍使用真实 `utils/equipmentRules.ts` 函数, 没有在脚本里复制攻击生成逻辑。
- 后续可以继续增加属性变化, 熟练变化后 `refreshCharacterAutomation` 的重算检查。

## 阶段 4f 记录

状态: 已完成。

范围: 装备攻击刷新重算审计。

改动:

- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖 `refreshCharacterAutomation` 对已装备普通武器的重算行为。
- 当前新增覆盖:
  - 主手普通武器在 STR 从 16 提升到 18 后, 命中和伤害会刷新。
  - 远程武器在新增箭术战斗风格后, 命中和备注会刷新。
  - 副手轻型武器在新增双武器战斗风格后, 伤害会刷新并加入属性调整值。

已通过验证:

- `npm run audit:equipment-behavior`

说明:

- 当前审计覆盖普通主手和副手武器刷新。
- 模板魔法武器刷新已在阶段 4g 纳入。独立魔法武器仍缺少完整基础武器快照, 暂未做恢复式刷新。

## 阶段 4g 记录

状态: 已完成.

范围: 模板魔法武器刷新重算.

改动:

- `Attack` 新增可选魔法武器元数据: `magicBaseWeaponId`, `magicBonus`, `magicDetailName`, `magicTemplate`.
- `equipMagicWeapon` 对模板魔法武器保存基础武器 ID 和魔法加值.
- `components/Equipment.tsx` 装备模板魔法武器时传入基础武器 ID.
- `utils/equipmentRules.ts` 新增 `refreshEquippedMagicWeapons`.
- `refreshCharacterAutomation` 现在会重建带 `magicBaseWeaponId` 的魔法武器攻击.
- `scripts/audit-equipment-behavior.mjs` 新增断言: +1 模板魔法近战武器在 STR 从 16 提升到 18 后, 命中从 +7 刷新到 +8, 伤害从 +4 刷新到 +5, 且保留基础武器元数据.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run audit:character-data`
- `npm run build`

说明:

- 本阶段只覆盖以基础武器作为模板的魔法武器, 例如 “+1 Weapon -> Longsword” 这类路径.
- 独立魔法武器如果只有物品自身的 `dmg1` 数据, 当前攻击条目仍可生成, 但刷新时还没有保存完整武器快照来重建.

## 阶段 4h 记录

状态: 已完成.

范围: 模板魔法武器与副手武器冲突细化.

改动:

- `getOffHandWeaponEquipBlockReason` 现在会读取已装备模板魔法主手攻击上的 `magicBaseWeaponId`.
- 若模板魔法主手的基础武器具有轻型属性, 允许装备轻型副手武器.
- 若模板魔法主手的基础武器不具有轻型属性, 阻止装备副手武器并显示对应原因.
- 若魔法主手没有基础武器元数据, 继续保守阻止副手武器.
- `equipMagicWeapon` 现在装备非轻型模板魔法主手时会移除已有副手武器.
- `scripts/audit-equipment-behavior.mjs` 新增轻型模板魔法主手允许副手, 非轻型模板魔法主手移除并阻止副手的断言.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run audit:character-data`
- `npm run build`

说明:

- 本阶段不改变独立魔法武器路径, 因为该路径还没有完整基础武器快照.
- 当前双武器规则仍按 5e/5r 的轻型主手约束处理, 未扩展到更复杂的专长或武器属性例外.

## 阶段 4i 记录

状态: 已完成.

范围: 武器特性备注和特殊条目摘要.

改动:

- 触及武器的攻击备注从 `触及` 改为 `触及 10 尺`, 明确攻击距离含义.
- `summarizeWeaponEntries` 现在可以递归提取 5etools `entries` 对象, 不再只处理纯字符串.
- 特殊武器如捕网的 `entries` 正文会进入攻击备注.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 通过真实武器夹具验证:
  - 投掷武器备注包含投掷射程.
  - 弹药/装填武器备注包含弹药, 装填和射程.
  - 触及武器备注包含 10 尺触及.
  - 两用武器伤害显示双手伤害选项.
  - 特殊武器备注包含特殊条目摘要.

已通过验证:

- `npm run audit:equipment-behavior`

说明:

- 本阶段不改变攻击数值公式, 只补齐攻击栏中的武器特性可读性和回归覆盖.

## 阶段 4j 记录

状态: 已完成.

范围: 独立魔法武器刷新重算.

改动:

- `Attack` 新增 `magicWeaponSnapshot`, 用于保存独立魔法武器的轻量武器数据.
- `equipMagicWeapon` 对非模板魔法武器写入 `magicWeaponSnapshot`.
- `refreshEquippedMagicWeapons` 现在可以通过 `magicWeaponSnapshot` 重建独立魔法武器攻击.
- 副手冲突判断可读取独立魔法武器快照, 不再一律因为缺少基础武器 ID 而保守阻止.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖:
  - 独立魔法武器保存快照.
  - 独立魔法武器随 STR 变化刷新命中和伤害.
  - 轻型独立魔法主手允许轻型副手.
  - 非轻型独立魔法主手移除并阻止副手.

已通过验证:

- `npm run audit:equipment-behavior`

说明:

- 模板魔法武器继续使用 `magicBaseWeaponId`.
- 独立魔法武器使用快照路径, 避免依赖背包物品 ID 回查基础武器.

## 阶段 4k 记录

状态: 已完成.

范围: 重型武器规则提示.

改动:

- `utils/equipmentRules.ts` 新增重型武器规则备注.
- PHB/5e 重型武器会提示小型或更小体型生物攻击检定具有劣势; 当前角色体型为小型时, 攻击备注会明确显示当前体型触发劣势.
- XPHB/5r 重型武器按武器类型区分属性门槛: 近战需力量 13, 远程需敏捷 13.
- 当 XPHB/5r 重型武器对应属性低于 13 时, 攻击备注会明确显示当前属性触发劣势.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 使用真实 PHB 重型近战武器和 XPHB 重型远程武器验证备注.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run audit:character-data`
- `npm run build`

说明:

- 本阶段只在攻击备注中提示劣势条件, 不改命中加值公式.
- 如果后续角色卡加入优势/劣势结构化字段, 可把当前备注逻辑迁移为可计算状态.

## 阶段 4l 记录

状态: 已完成.

范围: 副手命中公式与武器熟练刷新.

改动:

- 修正副手攻击命中公式: 命中检定现在始终包含攻击属性调整值, 只有副手伤害在没有双武器战斗风格时不加属性调整值.
- `isWeaponProficient` 现在会识别中文武器名熟练 key, 如 `weapon:鞭子`.
- `isWeaponProficient` 对英文 key 做大小写兼容, 避免 `weapon:Whip` 与 `weapon:whip` 分叉.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 验证副手攻击命中包含属性调整值和熟练加值.
- 扩展同一审计脚本, 通过 `applyCharacterAdjustments`/`removeCharacterAdjustments` 添加和撤销中文武器名熟练, 验证 `refreshCharacterAutomation` 会重算主手命中.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run audit:character-data`
- `npm run build`

说明:

- 本阶段没有改变副手伤害规则; 默认副手伤害仍不加属性调整值, 有双武器战斗风格时才加入.
- 熟练判断仍以角色的 `proficiencies` 集合为权威来源, 没有新增角色字段.

## 阶段 4m 记录

状态: 已完成.

范围: PHB `Dual Wielder` 装备派生规则.

改动:

- `utils/equipmentRules.ts` 现在识别 PHB `Dual Wielder` 专长的特性来源.
- 拥有 PHB `Dual Wielder` 时, 副手可以装备非轻型的单手近战武器.
- 拥有 PHB `Dual Wielder` 时, 主手和副手各持一把单手近战武器会通过独立的 `auto-dual-wielder-armor-bonus` 调整加入 `armorBonus +1`.
- 卸下主手, 卸下副手, 装备盾牌或刷新自动化时, 该 AC 加值会自动撤销或重算.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 验证无专长时仍阻止非轻型副手, 有 PHB `Dual Wielder` 时允许非轻型单手近战副手, 且 AC +1 可撤销.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- 本阶段只实现 PHB/5e 版本的 `Dual Wielder` AC 和非轻型双持规则. XPHB/5r 版本没有常驻 AC +1, 其附赠动作攻击条件仍保留为描述和当前双武器装备逻辑.

## 阶段 5a 记录

状态: 已完成。

范围: 施法职业分类与 prepared 标记审计。

改动:

- `scripts/audit-spell-behavior.mjs` 对齐运行时代码的 `getMaxSpellLevel` 规则, 覆盖 spell slots, pact slots, fixed spellbook choices, full caster, half caster, artificer-style progression。
- prepared-all 审计从 5 个案例扩展到 7 个案例:
  - PHB Cleric, XPHB Cleric
  - PHB Druid, XPHB Druid
  - PHB Paladin, XPHB Paladin
  - XPHB Ranger
- known-selection 审计从 6 个案例扩展到 7 个案例:
  - PHB Bard, XPHB Bard
  - PHB Sorcerer, XPHB Sorcerer
  - PHB Warlock, XPHB Warlock
  - PHB Ranger
- 审计脚本现在验证 prepared-all 职业会把所有可用环阶法术加入 profile, 且普通环阶法术不默认 prepared。
- 审计脚本现在验证 known-selection 职业只加入已选择法术, 且已知法术默认 prepared。
- PHB/XPHB Wizard 均明确验证为 spellbook 学法术, 不按全职业法表 prepared-all 处理。

已通过验证:

- `npm run audit:spell-behavior`
- `npm run audit:character-data`
- `npm run build`

说明:

- 本阶段没有修改运行时施法逻辑, 只补强回归审计。
- 子职自动准备法术, 专长法术, 以及完整 UI 流程仍需要后续继续验证。

## 阶段 5b 记录

状态: 已完成。

范围: 额外准备法术 prepared 标记审计。

改动:

- 扩展 `scripts/audit-spell-behavior.mjs`, 使审计中的 profile 构造包含职业和子职 `additionalPreparedSpells`。
- 修正 prepared-all 审计断言: 普通环阶法术不自动 prepared, 但额外准备法术必须自动 prepared。
- 新增 3 个额外准备法术案例:
  - XPHB Ranger 1 级职业额外准备法术 `猎人印记|XPHB`。
  - PHB Cleric 生命领域 1 级领域法术 `祝福术|PHB`。
  - XPHB Bard 魅心学院 3 级子职法术 `魅惑类人|XPHB`。

已通过验证:

- `npm run audit:spell-behavior`

说明:

- 本阶段没有修改运行时施法逻辑, 因为现有 `createSpellcastingProfile` 已通过 `additionalIds.has(spell.id)` 标记额外准备法术。
- 专长法术和完整 UI 流程仍需要后续测试。

## 阶段 5c 记录

状态: 已完成。

范围: 专长赠法术 prepared 标记审计。

改动:

- 新增 `scripts/audit-feat-spell-behavior.mjs`。
- 新增 `npm run audit:feat-spell-behavior`。
- 审计脚本通过 Vite 临时打包测试入口, 调用真实 `buildLevelOneCharacter` 和 `getFeatSpellChoiceState`。
- 当前覆盖 XPHB `Magic Initiate` / `魔法学徒`:
  - 选择 `牧师法术` block。
  - 选择 1 个 1 环法术和 2 个戏法。
  - 断言生成专长法术 profile。
  - 断言 profile 使用所选施法属性。
  - 断言所有专长赠法术均 `prepared = true`。

已通过验证:

- `npm run audit:feat-spell-behavior`

说明:

- 本阶段没有修改运行时施法逻辑, 因为真实建卡路径已经满足 prepared 标记要求。
- 后续仍应补 UI 层手动流程测试, 但核心建卡函数路径已有审计覆盖。

## 阶段 6a 记录

状态: 已完成。

范围: 搜索加入怪物图鉴轻量索引。

改动:

- 新增 `scripts/extract-bestiary-metadata.mjs`, 从 `third_party/5etools-cn/data/bestiary/bestiary-*.json` 抽取怪物元数据。
- 新增 `public/data/bestiary-index.json`。
- 新增 `utils/bestiary.ts` 加载器。
- `App.tsx` 加载怪物索引并传入 `SearchPanel`。
- `components/SearchPanel.tsx` 新增怪物搜索类型和 `monsters` tab。
- 怪物详情显示 CR, 体型, 类型, AC, HP, 速度, 环境和标签摘要。
- `constants/translations.ts` 补充搜索怪物相关中英文文案。
- `package.json` 新增 `npm run extract:bestiary`。
- `scripts/audit-character-data.mjs` 将 `bestiary-index.json` 纳入审计。

当前怪物索引:

- 总数: 4528
- 来源数: 106
- 阶段 6a 体积: 约 2.22 MiB
- 包含 `MM` 与 `XMM`, 可用于 5e/5r 资料检索。

已通过验证:

- `npm run extract:bestiary`
- `npm run audit:character-data`
- `npm run audit:spell-behavior`
- `npm run build`

说明:

- 当前只加载轻量元数据, 不加载完整 statblock 正文。
- 当前搜索是关键词过滤, 还没有结构化筛选控件。
- 加入怪物索引后主 chunk 仍超过 500 kB。后续若继续扩展搜索, 应考虑按 tab 懒加载索引数据。

## 阶段 6b 记录

状态: 已完成。

范围: 搜索加入结构化筛选。

改动:

- `components/SearchPanel.tsx` 新增全局来源筛选。
- 法术结果支持按环阶筛选。
- 魔法物品结果支持按分类和稀有度筛选。
- 怪物结果支持按类型和 CR 筛选。
- all tab 会同时应用对应类型筛选, 例如选择物品稀有度只影响物品结果, 选择怪物 CR 只影响怪物结果。
- 同名特性的来源筛选仍保留, 全局来源筛选会对特性的 `sourceName` 做文本匹配。
- `constants/translations.ts` 补充筛选控件中英文文案。

已通过验证:

- `npm run audit:character-data`
- `npm run audit:spell-behavior`
- `npm run build`

构建备注:

- `npm run build` 通过。
- Vite 仍报告主 chunk 超过 500 kB。这是既有体积警告, 不是本阶段引入的构建失败。

## 阶段 7a 记录

状态: 已完成。

范围: 背景和子职来源优先级。

改动:

- `utils/autoBuilderRules.ts` 新增背景来源优先级:
  - 5e: PHB。
  - 5r: XPHB, PHB。
- `utils/autoBuilderRules.ts` 新增子职来源优先级:
  - 5e: PHB 和 5e 时期官方扩展, 排除 XPHB。
  - 5r: XPHB 优先, 然后 PHB 和 5e 时期官方扩展。
- 新增通用同名去重 helper, 对背景和子职选择列表按来源优先级保留最高优先版本。
- `getAutoBuilderBackgrounds` 现在 5r 会保留 PHB-only 背景, 同名背景以 XPHB 为准。
- `getAutoBuilderSubclasses` 现在会去除同名重复子职, 5r 同名子职以 XPHB 为准, 同时保留 XGE, TCE 等扩展子职。
- 新增 `scripts/audit-source-priority.mjs`。
- 新增 `npm run audit:source-priority`。

已通过验证:

- `npm run audit:source-priority`

验证结果:

- 5e backgrounds: 20
- 5r backgrounds: 27
- 5e Fighter subclasses: 10
- 5r Fighter subclasses: 11
- 5r Battle Master 来源为 XPHB。

说明:

- 本阶段只修选择列表层面的来源优先级和去重, 不改原始抽取数据。
- 搜索面板按当前规则版本过滤或排序来源已在阶段 7b 纳入。

## 阶段 7b 记录

状态: 已完成.

范围: 搜索结果按当前规则版本处理来源.

改动:

- `App.tsx` 将当前角色的 `automation.ruleSystem` 传入 `SearchPanel`.
- 新增 `utils/searchSourceRules.ts`, 集中维护搜索来源优先级.
- 5e 搜索默认排除 2024 来源: XPHB, XDMG, XMM.
- 5r 搜索允许 5e 时期来源, 并优先排序 XPHB, XDMG, XMM.
- 明确选择来源筛选时, 搜索会尊重用户选择, 即使当前规则版本默认不显示该来源.
- 特性搜索可以从 `sourceId`/`sourceName` 解析来源, 用于过滤和同名来源排序.
- 新增 `scripts/audit-search-source-behavior.mjs`.
- 新增 `npm run audit:search-source-behavior`.

已通过验证:

- `npm run audit:search-source-behavior`
- `npm run audit:character-data`
- `npm run audit:source-priority`
- `npm run build`

说明:

- 本阶段只做来源过滤和排序, 没有做同名结果自动去重.
- 搜索仍使用应用内数组过滤, 还没有接入 5etools 的 `search/index.json` 或 `omnidexer`.

## 阶段 7c 记录

状态: 已完成.

范围: 搜索同名结果按来源优先级去重.

改动:

- `utils/searchSourceRules.ts` 新增 `dedupeSearchResultsByNameAndSource`.
- `SearchPanel` 的法术, 特性, 魔法物品, 怪物结果都会在来源过滤后按名称去重.
- 5r 同名搜索结果保留更高优先级的 XPHB, XDMG, XMM 版本.
- 5e 搜索默认已排除 2024 来源, 同名结果保留 PHB/DMG/MM 或 5e 时期扩展版本.
- `scripts/audit-search-source-behavior.mjs` 新增同名去重断言:
  - 真实 PHB/XPHB 同名法术夹具.
  - 真实 MM/XMM 同名怪物夹具.
  - 魔法物品使用真实夹具优先, 无 DMG/XDMG 同名夹具时使用合成最小样例验证通用去重函数.

已通过验证:

- `npm run audit:search-source-behavior`
- `npm run audit:character-data`
- `npm run audit:source-priority`
- `npm run build`

说明:

- 本阶段只去重结果列表, 不删除详情中的来源选择能力.
- 搜索仍未接入 5etools 的 `search/index.json` 或 `omnidexer`.

## 阶段 6c 记录

状态: 已完成.

范围: 怪物图鉴详情加入 statblock 摘要.

改动:

- `scripts/extract-bestiary-metadata.mjs` 从 5etools 怪物数据中抽取能力值, 豁免, 技能, 感官, 被动察觉, 语言.
- 同一脚本抽取特性, 施法, 动作, 附赠动作, 反应, 传奇动作, 并将 5etools tag 转为纯文本.
- `public/data/bestiary-index.json` 已重新生成, 每个怪物可携带 `statblock` 摘要.
- `utils/bestiary.ts` 与 `components/SearchPanel.tsx` 同步新增 statblock 类型.
- 怪物详情现在显示属性表, 豁免/技能/感官/语言, 以及特性和动作分节.
- 怪物搜索现在会匹配 statblock 中的条目名称和正文.
- `scripts/audit-character-data.mjs` 新增 statblock 能力值, 动作, 特性/施法字段断言.

当前怪物索引:

- 总数: 4528
- 来源数: 106
- 体积: 约 9.46 MiB
- 包含 `MM` 与 `XMM`, 并包含动作/特性文本用于详情展示和搜索匹配.

已通过验证:

- `npm run extract:bestiary`
- `npm run audit:character-data`
- `npm run audit:search-source-behavior`
- `npm run build`

说明:

- 本阶段仍使用现有 `bestiary-index.json`, 没有新增独立懒加载详情文件.
- 为控制索引体积, 单个 trait/action 条目会截断到固定长度.
- 这不是 5etools 原站完整渲染器, 但已经让搜索详情从轻量摘要提升到可读 statblock 摘要.
- 索引体积显著增加, 后续搜索阶段应优先考虑怪物详情按需加载或拆分索引.

## 阶段 6d 记录

状态: 已完成.

范围: 怪物索引按需加载.

改动:

- `App.tsx` 不再在应用启动时调用 `loadBestiaryIndex`.
- `SearchPanel` 内部维护怪物索引加载状态.
- 当用户打开 monsters tab, 或在 all tab 执行搜索/筛选时, 才首次加载 `bestiary-index.json`.
- 同一个 `SearchPanel` 生命周期内只请求一次怪物索引.
- 加入怪物索引加载中的提示文案.
- 新增 `scripts/audit-search-lazy-loading.mjs`.
- 新增 `npm run audit:search-lazy-loading`.

已通过验证:

- `npm run audit:search-lazy-loading`
- `npm run build`

说明:

- 本阶段降低首屏网络负担, 但 `bestiary-index.json` 本身仍是单个大文件.
- 后续若要继续压缩搜索成本, 应拆分轻量怪物索引和按需详情文件.

## 后续阶段计划

### 阶段 1: 稳定数据与验证入口

目标: 让后续开发有可靠回归检查。

状态: 已完成。

任务:

1. 已修正两个审计脚本的数据路径, 改为读取 `public/data/core.json` 与 `public/data/auto-builder-core.json`。
2. 已给审计脚本补充 5e/5r 主来源, 职业来源, 种族存在性, 法术来源优先级检查。
3. 已执行 `npm run build`, `npm run audit:character-data`, `npm run audit:spell-behavior`, 全部通过。
4. 未改 UI 行为。

### 阶段 2: 扩展种族和来源优先级

目标: 满足“默认官方扩展全开”和“5r 同名以 5r 为准”。

状态: 已完成。

任务:

1. 已在抽取脚本中定义官方种族来源白名单, 类似专长和法术来源白名单。
2. 已将扩展种族与亚种族加入 `auto-builder-core.json`。
3. 已实现种族列表去重规则: `5r` 优先 XPHB 且允许 5e 官方扩展; `5e` 不使用 XPHB。
4. 已更新 `getAutoBuilderRaces`。`getAutoBuilderSubraces` 继续按所选父种族的 `raceName/raceSource` 过滤。
5. 未完成: 为扩展种族特性创建更多数值操作, 如速度, 黑暗视觉, 抗性, 熟练, 语言, 专长选择等。该项归入阶段 3。

### 阶段 3: 调整接口扩展与规则覆盖

目标: 每个特性, 专长, 武器, 物品尽量通过统一接口调整角色卡, 且可撤销。

状态: 进行中。阶段 3a 已完成种族结构化字段的基础覆盖, 阶段 3b 已完成低风险专长升级缩放, 阶段 3c 已完成专长选择型熟练审计与豁免选择修复, 阶段 3d 已完成种族感官和抗性的结构化可撤销字段, 阶段 3e 已完成种族固定熟练 key 规范化, 阶段 3f 已完成选择型武器熟练, 阶段 3g 已完成种族免疫, 易伤和特殊感官结构化, 阶段 3h 已完成常驻种族 AC 规则, 阶段 3i 已完成 Lucky 专长资源, 阶段 3j 已完成战技专家和超魔导师资源, 阶段 3k 已完成龙类赠礼和 XPHB 巫师杀手资源.

任务:

1. 扩展 `AdjustmentPath` 或新增操作类型, 支持抗性, 免疫, 感官, 尺寸, 状态优势提示, 法术 DC/攻击来源等结构化字段。
2. 把当前只能写描述的特性分为两类: 可数值化, 仅描述。
3. 为常见职业特性补数值操作, 优先覆盖低等级高频内容。
4. 为专长补更多规则操作, 优先覆盖 ASI, 熟练, 速度, AC, HP, 先攻, 法术。
5. 建立 `sourceId` 命名规范, 保证拆装装备, 切换专长, 升级刷新不会残留旧调整。

阶段 3a 已完成的部分:

- 种族步行速度写入 `speed`。
- 种族额外移动模式, 黑暗视觉, 固定抗性写入特性条目。
- 相关数据结构由审计脚本覆盖。

阶段 3b 已完成的部分:

- `Tough` 后续升级每级 +2 HP。
- XPHB `Alert` 后续升级时随熟练加值提高补先攻增量。
- 专长数据存在性由审计脚本覆盖。

阶段 3c 已完成的部分:

- `Resilient` 等直接 `choose` 形态的专长豁免熟练选择可以在 UI 选择模型中暴露。
- XPHB `Lightly Armored`, `Resilient`, `Skill Expert` 的能力值, 护甲, 盾牌, 豁免, 技能, 专精调整已由真实升级路径审计覆盖。
- 新增 `npm run audit:feat-behavior`。

阶段 3d 已完成的部分:

- `CharacterData` 新增 `damageResistances`, `damageImmunities`, `damageVulnerabilities`, `conditionImmunities` 与 `senses` 结构化列表。
- `AdjustmentOperation` 新增 `addTextEntry`, 通过 previousExists 保护已有同名条目, 并支持随 `sourceId` 撤销。
- 种族/亚种族固定黑暗视觉写入 `senses`, 固定抗性写入 `damageResistances`。
- 种族/亚种族固定伤害免疫, 伤害易伤, 状态免疫和特殊感官写入对应结构化列表。
- 种族选择型抗性也写入 `damageResistances`。
- 固定熟练 key 会去掉 5etools 来源后缀, 如 `battleaxe|phb` 写入为 `weapon:battleaxe`。
- 选择型武器熟练会显示武器选择 UI, 并通过 `addProficiency` 写入所选武器熟练。
- 常驻种族 AC 规则会进入自动 AC 计算, 战俑集成防护会写入 `armorBonus`.
- Lucky 专长会通过 `upsertResource` 写入幸运点, XPHB 版本会随角色总等级熟练加值刷新.
- 战技专家和超魔导师会通过 `upsertResource` 写入卓越骰和专长术法点, 并由选择型特性路径写入所选战技/超魔描述.
- 色彩龙赋礼, 宝石龙赋礼, XPHB 巫师杀手会通过 `upsertResource` 写入对应使用次数资源, 熟练加值型资源会随升级刷新.
- 黑暗视觉和抗性仍保留 `featureEntries` 描述, 避免丢失规则文字。
- `FeaturesBox` 显示结构化抗性和感官。
- 新增 `npm run audit:origin-structured-behavior`, 通过真实建卡路径验证 MPMM `Aasimar`, PHB `Dragonborn`, PHB `Dwarf` 的结构化字段, 固定武器熟练与撤销行为。

阶段 3 后续建议:

- 下一步可以继续把更多现有特性描述中的可结构化内容迁移到字段, 例如免疫, 状态抗性/免疫, 特殊感官, 条件优势提示等。
- 若保持当前 UI, 建议继续覆盖低风险专长规则, 如护甲熟练类, 豁免熟练类, 技能专家类和可明确映射到现有字段的专长。

### 阶段 4: 装备和攻击完善

目标: 装备后攻击栏稳定显示正确数值和特性。

状态: 进行中。阶段 4a 已完成基础装备冲突规则, 阶段 4b 已完成魔法武器攻击生成模块化, 阶段 4c 已完成副手装备失败提示, 阶段 4d 已完成装备行为回归审计, 阶段 4e 已完成攻击数值审计增强, 阶段 4f 已完成普通武器刷新重算审计, 阶段 4g 已完成模板魔法武器刷新重算, 阶段 4h 已完成模板魔法武器副手冲突细化, 阶段 4i 已完成武器特性备注和特殊条目摘要, 阶段 4j 已完成独立魔法武器刷新重算, 阶段 4k 已完成重型武器规则提示, 阶段 4l 已完成副手命中公式和武器熟练刷新审计, 阶段 4m 已完成 PHB Dual Wielder 装备派生规则。

任务:

1. 已补主手, 副手, 盾牌, 双手武器冲突检查。
2. 已按基础规则限制副手武器为轻型, 且 UI 会显示无法装备的原因; PHB `Dual Wielder` 会放宽为非双手的单手近战武器。
3. 已将魔法武器攻击生成合并到 `equipmentRules.ts`, 避免 UI 层手写攻击计算。
4. 已补充投掷, 弹药, 装填, 触及, 两用, 特殊武器, 重型武器的显示和备注审计。
5. 已添加装备行为审计样例, 覆盖基础互斥, 攻击条目, 熟练加值, 属性加值, 箭术, 对决, 魔法武器加值, 普通武器刷新, 模板魔法武器随属性变化刷新, 独立魔法武器随属性变化刷新, 魔法武器与副手的轻型冲突, 常见武器特性备注, 副手命中公式, 武器熟练添加/撤销后的刷新重算, 以及 PHB `Dual Wielder` 的副手限制放宽和 AC 加值撤销。

### 阶段 5: 施法职业逐职业核对

目标: prepared-all 和 known-selection 行为符合 5e/5r。

状态: 进行中。阶段 5a 已完成分类和 prepared 标记的脚本级审计增强, 阶段 5b 已完成职业和子职额外准备法术审计, 阶段 5c 已完成专长赠法术 prepared 标记审计。

任务:

1. 已明确并审计主要职业在 5e/5r 下的 `preparationMode`: Cleric, Druid, Paladin, Wizard, Bard, Ranger, Sorcerer, Warlock。
2. 已对 Cleric, Druid, Paladin, XPHB Ranger 等 prepared-all 验证所有可用环阶法术自动加入法表, 但普通环阶法术不全自动 prepared。
3. 已对职业, 子职额外准备法术, 以及专长赠法术验证 `prepared = true`。未完成: 完整 UI 流程。
4. 已对 Bard, Sorcerer, Warlock, PHB Ranger 等 known-selection 验证选择法术会默认 prepared。
5. 已对 PHB/XPHB Wizard 验证法术书学习数量和 prepared-all 排除规则。
6. 已补强法术行为审计脚本。未完成: 覆盖完整 UI 弹窗流程和多次升级节点。

### 阶段 6: 搜索和怪物图鉴

目标: 搜索从当前应用内搜索扩展为轻量资料检索。

状态: 进行中。阶段 6a 已完成怪物图鉴轻量索引和搜索 tab, 阶段 6b 已完成结构化筛选, 阶段 6c 已完成怪物 statblock 摘要详情, 阶段 6d 已完成怪物索引按需加载, 阶段 7b 已完成搜索来源规则版本过滤和排序, 阶段 7c 已完成搜索同名结果去重。

任务:

1. 已新增 `scripts/extract-bestiary-metadata.mjs`, 从 `third_party/5etools-cn/data/bestiary/*.json` 抽取怪物元数据。
2. 已输出 `public/data/bestiary-index.json`, 字段包括 id, name, englishName, source, cr, type, size, alignment, environment, ac, hp, speed, tags。
3. 已在 `SearchPanel` 新增 monsters tab。
4. 已加入结构化筛选: 来源, 法术环阶, 物品分类, 物品稀有度, 怪物类型, 怪物 CR。
5. 已让怪物详情显示 statblock 摘要, 包含属性, 豁免/技能, 感官/语言, 特性, 施法, 动作等分节。
6. 已按当前 5e/5r 规则版本过滤或排序来源, 并按来源优先级去重同名结果。
7. 已将怪物索引改为搜索面板按需加载。未完成: 拆分轻量索引/详情文件和 5etools 原站级完整怪物渲染。

### 阶段 7: 来源优先级和同名去重

目标: 5r 对同名 5e/5r 内容优先使用 5r, 同时保留可用的 5e 官方扩展内容。

状态: 进行中。阶段 7a 已完成背景和子职选择列表的来源优先级审计与修正, 阶段 7b 已完成搜索来源过滤和排序, 阶段 7c 已完成搜索同名结果去重。

任务:

1. 已为背景选择实现来源优先级去重:
   - 5e 只使用 PHB 背景。
   - 5r 优先 XPHB, 同时保留 PHB-only 背景。
2. 已为子职选择实现来源优先级去重:
   - 5e 排除 XPHB 子职。
   - 5r 同名子职优先 XPHB, 同时保留 5e 时期官方扩展子职。
3. 新增 `npm run audit:source-priority`, 调用真实选择函数验证背景和子职无同名重复。
4. 已为搜索结果按当前规则版本做来源过滤或排序:
   - 5e 默认排除 XPHB, XDMG, XMM.
   - 5r 优先 XPHB, XDMG, XMM, 同时保留 5e 时期来源.
   - 显式来源筛选仍可选择具体来源.
5. 已为搜索结果同名内容自动去重, 按当前规则版本保留最高优先级来源。

## 推荐下一步

建议下一阶段进入“阶段 3: 调整接口扩展与规则覆盖”。理由:

- 扩展种族已经进入选择列表, 但复杂种族特性多数仍是描述, 需要继续把可数值化效果落到可撤销调整接口。
- 该阶段直接推进“每个特性, 专长, 武器等调用相应数值更改接口”的核心目标。
- 装备和搜索可以并行推进, 但规则覆盖优先级更高。
