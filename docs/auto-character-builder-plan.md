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

## 阶段 3l 记录

状态: 已完成.

范围: `Gift of the Metallic Dragon|FTD` 专长资源.

改动:

- `Gift of the Metallic Dragon|FTD` 会加入 `庇护之翼` 资源, 最大值等于熟练加值, 长休恢复.
- 已拥有 `Gift of the Metallic Dragon|FTD` 的角色升级时, `庇护之翼` 资源会按新总等级刷新.
- 扩展 `audit-feat-behavior`, 验证该专长会加入 prepared 的 `疗伤术` 专长法术 profile, 并验证 `庇护之翼` 从 4 级的 2 次刷新到 5 级的 3 次.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- 本阶段只结构化庇护之翼的使用次数. 反应触发, AC 加值是否使命中变未命中等判定仍保留在特性描述中.

## 阶段 3m 记录

状态: 已完成.

范围: `Ember of the Fire Giant|BGG` 专长结构化效果.

改动:

- `Ember of the Fire Giant|BGG` 会通过 `addTextEntry` 写入 `damageResistances: 火焰`.
- `Ember of the Fire Giant|BGG` 会加入 `炽热灼烧` 资源, 最大值等于熟练加值, 长休恢复.
- 已拥有 `Ember of the Fire Giant|BGG` 的角色升级时, `炽热灼烧` 资源会按新总等级刷新.
- 扩展 `audit-feat-behavior`, 验证火焰抗性, 4 级 2 次资源, 以及 5 级刷新到 3 次.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- 本阶段没有结构化 `炽热灼烧` 的 DC 公式, 目盲状态和伤害骰, 这些仍保留在专长描述中.

## 阶段 3n 记录

状态: 已完成.

范围: BGG 其他巨人后续专长的资源效果.

改动:

- `Fury of the Frost Giant|BGG` 会通过 `addTextEntry` 写入 `damageResistances: 寒冷`, 并加入 `霜寒回击` 资源, 最大值等于熟练加值, 长休恢复.
- `Guile of the Cloud Giant|BGG` 会加入 `迷云逃逸` 资源, 最大值等于熟练加值, 长休恢复.
- `Keenness of the Stone Giant|BGG` 会加入 `投掷石块` 资源, 最大值等于熟练加值, 长休恢复.
- `Soul of the Storm Giant|BGG` 会加入 `旋涡灵光` 资源, 最大值等于熟练加值, 长休恢复.
- 已拥有上述专长的角色升级时, 对应资源会按新总等级刷新.
- 扩展 `audit-feat-behavior`, 验证上述资源 4 级为 2 次, 5 级刷新到 3 次, 并验证霜巨人的寒冷抗性.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- 石巨人之敏锐的黑暗视觉有“若已有黑暗视觉则距离增加 60 尺”的叠加语义, 当前 `senses` 字符串列表无法可靠表达叠加, 暂时保留在描述中.
- 风暴巨人之灵魂的闪电/雷鸣抗性只在灵光激活期间生效, 不写入常驻 `damageResistances`.
- 本阶段没有结构化这些专长的 DC 公式, 伤害骰, 传送, 倒地或速度变化等触发效果.

## 阶段 3o 记录

状态: 已完成.

范围: `Chef|TCE` 与 `Chef|XPHB` 专长资源.

改动:

- `Chef|TCE` 会加入 `餐点` 资源, 最大值等于熟练加值, 长休恢复.
- `Chef|XPHB` 会加入 `应急零嘴` 资源, 最大值等于熟练加值, 长休恢复.
- 已拥有上述专长的角色升级时, 对应资源会按新总等级刷新.
- 扩展 `audit-feat-behavior`, 验证两个版本的大厨都会加入厨师工具熟练, 资源 4 级为 2 次, 5 级刷新到 3 次.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- 短休料理可服务 `4 + 熟练加值` 个生物, 但这不是角色自身的可消耗资源, 目前仍保留在专长描述中.
- XPHB 零嘴和 TCE 餐点做好后持续 8 小时, 该时效写入资源备注.

## 阶段 3p 记录

状态: 已完成.

范围: `Squire of Solamnia|DSotDQ` 专长资源.

改动:

- `Squire of Solamnia|DSotDQ` 会加入 `精准打击` 资源, 最大值等于熟练加值, 长休恢复.
- 资源备注说明该次数只在攻击命中时消耗.
- 已拥有该专长的角色升级时, `精准打击` 会按新总等级刷新.
- 扩展 `audit-feat-behavior`, 验证 4 级资源为 2 次, 5 级刷新到 3 次, 并验证资源备注包含命中消耗条件.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- 本阶段没有结构化优势开关和额外 `1d8` 伤害, 因为当前攻击条目还没有按资源消耗切换的战斗内状态接口.

## 阶段 3q 记录

状态: 已完成.

范围: `Cartomancer|BMT` 专长资源.

改动:

- `Cartomancer|BMT` 会加入 `隐藏王牌` 资源, 最大值 1, 长休恢复.
- 资源备注说明完成长休后可注入一张卡牌, 魔力持续 8 小时.
- 扩展 `audit-feat-behavior`, 验证 `隐藏王牌` 资源, 长休恢复, 8 小时备注, 以及 `魔法伎俩` 专长法术 profile.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- 本阶段没有实现从职业法术列表选择隐藏王牌法术的界面; 当前只把每日注入次数作为资源呈现, 具体选择仍保留在描述中.

## 阶段 3r 记录

状态: 已完成.

范围: `Planar Wanderer|SatO` 专长资源.

改动:

- `Planar Wanderer|SatO` 会加入 `传送门感知` 资源, 最大值 1, 长休恢复.
- 资源备注说明可用动作侦测 30 尺内传送门.
- 扩展 `audit-feat-behavior`, 验证 `传送门感知` 资源, 长休恢复和 30 尺备注.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- `位面适应` 是长休后选择临时抗性, 当前没有“临时可选抗性”接口, 暂不写入常驻 `damageResistances`.
- `传送门骇客` 只有检定失败后才锁定到长休, 不适合直接作为固定可消耗资源.

## 阶段 3s 记录

状态: 已完成.

范围: `Rune Shaper|BGG` 专长资源.

改动:

- `Rune Shaper|BGG` 会加入 `符文魔法` 资源, 最大值 1, 长休恢复.
- 资源备注说明可不消耗法术位且无需材料成分施展一个刻印符文关联法术.
- 扩展 `audit-feat-behavior`, 验证资源, 长休恢复, 备注, 以及 `通晓语言` 专长法术 profile.

已通过验证:

- `npm run audit:feat-behavior`
- `npm run audit:feat-spell-behavior`

说明:

- 本阶段不实现“已知符文数量等于熟练加值一半”和升级替换符文的选择 UI.
- 当前只结构化每日免费施法次数, 具体刻印符文和临时习得法术仍保留描述和现有专长法术 profile.

## 阶段 3t 记录

状态: 已完成.

范围: SatO 外层位面后续专长资源.

改动:

- `Agent of Order|SatO` 会加入 `凝滞打击` 资源, 最大值等于熟练加值, 长休恢复.
- `Baleful Scion|SatO` 会加入 `贪婪之攫` 资源, 最大值等于熟练加值, 长休恢复.
- `Righteous Heritor|SatO` 会加入 `舒缓伤痛` 资源, 最大值等于熟练加值, 长休恢复.
- 已拥有上述专长的角色升级时, 对应资源会按新总等级刷新.
- 扩展 `audit-feat-behavior`, 验证上述资源 4 级为 2 次, 5 级刷新到 3 次.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- 本阶段没有结构化凝滞打击的 DC 公式, 束缚状态, 贪婪之攫的伤害/治疗, 或舒缓伤痛的伤害减免公式; 这些仍保留在专长描述中.

## 阶段 3u 记录

状态: 已完成.

范围: `Outlands Envoy|SatO` 专长免费施法资源.

改动:

- `Outlands Envoy|SatO` 会加入 `交路使者: 迷踪步` 资源, 最大值 1, 长休恢复.
- `Outlands Envoy|SatO` 会加入 `交路使者: 巧言术` 资源, 最大值 1, 长休恢复.
- `巧言术` 资源备注说明不消耗法术位且无需材料成分.
- 扩展 `audit-feat-behavior`, 验证两个资源, 长休恢复, 备注, 以及 `迷踪步` 和 `巧言术` 专长法术 profile.

已通过验证:

- `npm run audit:feat-behavior`
- `npm run audit:feat-spell-behavior`

说明:

- 本阶段只结构化各一次的免费施法次数. 施法属性继承自 `Scion of the Outer Planes|SatO` 的选择, 当前仍由专长法术 profile 的选择参数承载.

## 阶段 3v 记录

状态: 已完成.

范围: DSotDQ 索拉尼亚后续专长资源.

改动:

- `Knight of the Crown|DSotDQ` 会加入 `号令集结` 资源, 最大值等于熟练加值, 长休恢复.
- `Knight of the Rose|DSotDQ` 会加入 `振奋集结` 资源, 最大值等于熟练加值, 长休恢复.
- `Knight of the Sword|DSotDQ` 会加入 `丧志打击` 资源, 最大值等于熟练加值, 长休恢复.
- 已拥有上述专长的角色升级时, 对应资源会按新总等级刷新.
- 扩展 `audit-feat-behavior`, 验证上述资源 4 级为 2 次, 5 级刷新到 3 次.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- 本阶段没有结构化皇冠骑士的友军反应攻击, 蔷薇骑士的临时生命公式, 或圣剑骑士的 DC 与恐慌/劣势效果; 这些仍保留在专长描述中.

## 阶段 3w 记录

状态: 已完成.

范围: XPHB 固定专长资源.

改动:

- `Telepathic|XPHB` 会加入 `侦测思想` 资源, 最大值 1, 长休恢复.
- `侦测思想` 资源备注说明不消耗法术位且无需法术成分.
- `Boon of Recovery|XPHB` 会加入 `背水一战` 资源, 最大值 1, 长休恢复.
- `Boon of Recovery|XPHB` 会加入 `重获生机` 资源, 最大值 10, 长休恢复, 备注说明治疗池为 10 枚 d10.
- 扩展 `audit-feat-behavior`, 验证上述资源和 `Telepathic|XPHB` 的 `侦测思想` 专长法术 profile.

已通过验证:

- `npm run audit:feat-behavior`
- `npm run audit:feat-spell-behavior`

说明:

- 本阶段没有结构化心灵感应的 60 尺沟通能力, 也没有将 `重获生机` 的每枚 d10 拆成单独骰池 UI; 当前用资源最大值 10 表示治疗池余量.

## 阶段 3x 记录

状态: 已完成.

范围: XPHB 史诗恩惠和仪式专长资源.

改动:

- `Boon of Fate|XPHB` 会加入 `时来运转` 资源, 最大值 1.
- `时来运转` 资源以 `shortRest` 表示短休/长休恢复, 并在备注中说明投掷先攻也会恢复.
- `Ritual Caster|XPHB` 会加入 `快速仪式` 资源, 最大值 1, 长休恢复.
- `快速仪式` 资源备注说明可用通常施法时间施展仪式法术且不消耗法术位.
- 扩展 `audit-feat-behavior`, 验证上述资源, reset 和备注.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- 当前资源 reset 枚举没有“投掷先攻恢复”, 因此 `Boon of Fate|XPHB` 使用 `shortRest` 并在备注保留先攻恢复条件.
- 本阶段不实现 `Ritual Caster|XPHB` 的仪式法术选择和熟练加值提升时新增仪式法术 UI.

## 阶段 3y 记录

状态: 已完成.

范围: 精类/影界触碰固定免费施法资源.

改动:

- `Fey Touched|TCE` 与 `Fey-Touched|XPHB` 会加入 `迷踪步` 资源, 最大值 1, 长休恢复.
- `Shadow Touched|TCE` 与 `Shadow-Touched|XPHB` 会加入 `隐形术` 资源, 最大值 1, 长休恢复.
- 资源备注说明对应固定法术可不消耗法术位施展.
- 扩展 `audit-feat-behavior`, 验证 TCE 和 XPHB 两个版本的资源, 长休恢复, 备注, 以及固定法术已进入专长法术 profile 并准备.

已通过验证:

- `npm run audit:feat-behavior`
- `npm run audit:feat-spell-behavior`

说明:

- 本阶段只结构化固定法术 `迷踪步` 与 `隐形术` 的免费施法次数. 另外一道需选择的一环法术及其免费施法次数仍由现有专长法术选择流程承载, 暂不自动生成未知名称的资源.

## 阶段 3z 记录

状态: 已完成.

范围: XGE 固定免费施法专长资源.

改动:

- `Drow High Magic|XGE` 会加入 `浮空术` 资源, 最大值 1, 长休恢复.
- `Drow High Magic|XGE` 会加入 `解除魔法` 资源, 最大值 1, 长休恢复.
- `Fey Teleportation|XGE` 会加入 `迷踪步` 资源, 最大值 1, 短休恢复.
- 扩展 `audit-feat-behavior`, 验证上述资源, reset, 备注, 以及对应专长法术 profile.

已通过验证:

- `npm run audit:feat-behavior`
- `npm run audit:feat-spell-behavior`

说明:

- `Drow High Magic|XGE` 的 `侦测魔法` 是随意施展, 本阶段只把它保留在专长法术 profile, 不创建可消耗资源.
- `Fey Teleportation|XGE` 的短休或长休恢复用现有 `shortRest` 表示.

## 阶段 3aa 记录

状态: 已完成.

范围: `Poisoner|TCE` 与 `Poisoner|XPHB` 专长资源.

改动:

- `Poisoner|TCE` 会加入 `酿毒` 资源, 最大值等于熟练加值, 手动恢复.
- `Poisoner|XPHB` 会加入 `酿毒` 资源, 最大值等于熟练加值, 手动恢复.
- 资源备注说明剂数需要花费时间和材料制作.
- 已拥有上述专长的角色升级时, 对应资源会按新总等级刷新.
- 扩展 `audit-feat-behavior`, 验证两个版本的毒药工具熟练, 资源 4 级为 2 次, 5 级刷新到 3 次, reset 为 `manual`.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- 酿毒并非休息自动恢复的能力, 当前用 `manual` 表示玩家需要在实际完成制作后手动调整剂数.
- 本阶段没有结构化毒药 DC, 2d8 毒素伤害, 中毒状态, 或“毒素伤害无视抗性”的攻击规则.

## 阶段 3ab 记录

状态: 已完成.

范围: XPHB 固定史诗恩惠数值效果.

改动:

- `Boon of Fortitude|XPHB` 会通过 `addNumber` 写入 `hpMaxBonus +40`.
- `Boon of Speed|XPHB` 会通过 `addNumber` 写入 `speedBonus +30`.
- `Boon of Truesight|XPHB` 会通过 `addTextEntry` 写入 `senses: 真实视觉 60 尺`.
- 扩展 `audit-feat-behavior`, 验证上述固定数值和结构化感官字段.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- 本阶段没有结构化 `Boon of Fortitude|XPHB` 的治疗额外恢复, `Boon of Speed|XPHB` 的附赠动作撤离/解除受擒, 或真实视觉的更细粒度规则说明; 这些仍保留在专长描述中.

## 阶段 3ac 记录

状态: 已完成.

范围: 固定速度和全技能熟练审计.

改动:

- `Squat Nimbleness|XGE` 会通过 `addNumber` 写入 `speedBonus +5`.
- 扩展 `audit-feat-behavior`, 验证 `Squat Nimbleness|XGE` 的速度加值和所选技能熟练.
- 扩展 `audit-feat-behavior`, 验证 `Boon of Skill|XPHB` 已通过通用固定熟练逻辑加入全部 18 项技能熟练.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- 本阶段没有结构化 `Squat Nimbleness|XGE` 脱离受擒检定优势; 该触发型优势仍保留在专长描述中.
- `Boon of Skill|XPHB` 的专精选项仍走现有选择型专精流程, 本阶段只验证固定全技能熟练.

## 阶段 3ad 记录

状态: 已完成.

范围: 护甲和武器固定熟练专长审计.

改动:

- `Tavern Brawler|PHB` 会通过 `addProficiency` 写入 `weapon:improvised`, 补齐源数据缺失的临时武器熟练.
- 扩展 `audit-feat-behavior`, 验证 `Heavily Armored|PHB/XPHB`, `Moderately Armored|PHB/XPHB`, `Martial Weapon Training|XPHB`, `Tavern Brawler|PHB/XPHB`, `Gunner|TCE` 的能力值和固定熟练调整.
- 这些调整均复用现有 `addNumber` 与 `addProficiency`, 可随 sourceId 撤销.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- 本阶段不结构化防御式决斗, 重甲大师减伤, 枪手装填忽略等战斗触发规则; 这些仍保留在专长描述中.

## 阶段 3ae 记录

状态: 已完成.

范围: 选择型语言专长审计.

改动:

- 扩展 `audit-feat-behavior`, 验证 `Linguist|PHB` 会暴露 3 门语言选择.
- 验证通过 ASI 专长选择 `Linguist|PHB` 时, `INT +1` 和所选 `language:draconic`, `language:infernal`, `language:sylvan` 均写入 `proficiencies`.
- 语言选择继续复用现有 `addProficiency` 调整接口, 可随 sourceId 撤销.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- 本阶段不结构化密码学文字规则; 该部分仍保留在专长描述中.

## 阶段 3af 记录

状态: 已完成.

范围: XPHB 观察力技能选择规则.

改动:

- `createChosenFeatOperations` 中的专长技能选择改为调用专门 helper, 普通专长仍沿用原有 `addProficiency` 行为.
- `Observant|XPHB` 选择一个已经熟练的技能时, 会通过 `addProficiency` 加 `expertise: true` 写入专精.
- 扩展 `audit-feat-behavior`, 验证 `Observant|XPHB` 选择已熟练的 `Perception` 后保留熟练并新增专精.

已通过验证:

- `npm run audit:feat-behavior`

说明:

- 本阶段不结构化 `Observant|PHB` 的被动察觉/调查 +5, 因为角色卡当前没有被动技能调整字段.
- 本阶段不结构化 `Observant|XPHB` 的附赠动作搜索, 该动作经济提示仍保留在专长描述中.

## 阶段 3ag 记录

状态: 已完成.

范围: XPHB 矮人刚毅生命值上限规则.

改动:

- `Dwarf|XPHB` 建卡时会通过 `addNumber` 写入 `hpMaxBonus`, 数值等于当前角色总等级.
- 新增已有种族升级 helper, 检测 `auto-race-Dwarf-XPHB` 后在总等级提升时追加 `hpMaxBonus + levelDelta`.
- 扩展 `audit-origin-structured-behavior`, 验证 XPHB 矮人 1 级建卡获得 `hpMaxBonus +1`, 移除自动车卡调整后撤销该加值, 升到 2 级后变为 `hpMaxBonus +2`.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只结构化常驻生命值上限加值. XPHB 矮人的震颤感知短时开启仍保留在种族描述中, 等有状态/资源开关后再结构化.

## 阶段 3ah 记录

状态: 已完成.

范围: 兽人激昂冲锋种族资源.

改动:

- 新增种族资源 helper, 通过 `upsertResource` 写入种族特性使用次数.
- `Orc|XPHB` 会写入 `激昂冲锋` 资源, 次数等于熟练加值, 短休或长休恢复.
- `Orc|MPMM` 会写入 `激昂冲锋` 资源, 次数等于熟练加值, 长休恢复.
- 已有种族升级 helper 会在升级后刷新上述资源的最大值.
- 扩展 `audit-origin-structured-behavior`, 验证 XPHB 兽人资源可撤销, 5 级时刷新到熟练加值 3, MPMM 兽人使用长休恢复.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只结构化使用次数和恢复节奏. 临时生命值的实际获得仍保留在资源备注中, 等角色卡有临时生命值事件接口后再接入.
- 坚韧不屈仍未结构化为资源, 后续可以按同一 helper 增加 1/长休资源.

## 阶段 3ai 记录

状态: 已完成.

范围: 坚韧不屈种族资源.

改动:

- 种族资源 helper 会识别 `Relentless Endurance`/`坚韧不屈` 特性, 并通过 `upsertResource` 写入 1 次长休资源.
- 该规则覆盖 PHB 半兽人, XPHB 兽人, MPMM 兽人以及其他数据中带有同名特性的种族来源.
- 扩展 `audit-origin-structured-behavior`, 验证 XPHB 兽人和 PHB 半兽人的 `坚韧不屈` 资源, 并验证 XPHB 兽人撤销自动车卡调整后资源被移除.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只记录使用次数. 将生命值从 0 改为 1 的实际战斗事件仍需后续事件接口支持.

## 阶段 3aj 记录

状态: 已完成.

范围: 阿斯莫治愈之手种族资源.

改动:

- 种族资源 helper 会识别 `Healing Hands`/`治愈之手` 特性, 并通过 `upsertResource` 写入 1 次长休资源.
- 该规则覆盖 MPMM, VGM, XPHB 阿斯莫来源.
- 扩展 `audit-origin-structured-behavior`, 验证 MPMM 阿斯莫的 `治愈之手` 资源, 并验证撤销自动车卡调整后资源被移除.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只记录使用次数和恢复节奏. 实际治疗骰或按等级治疗仍保留在资源备注中, 等后续有治疗动作接口再结构化.

## 阶段 3ak 记录

状态: 已完成.

范围: 歌利亚石之坚韧种族资源.

改动:

- 种族资源 helper 会识别 `Stone's Endurance`/`石之坚韧` 特性, 并通过 `upsertResource` 写入使用次数资源.
- `Goliath|MPMM` 会写入熟练加值次数, 长休恢复, 并在升级后按熟练加值刷新.
- `Goliath|VGM` 会写入 1 次, 短休恢复.
- 扩展 `audit-origin-structured-behavior`, 验证 MPMM 歌利亚 1 级资源, 5 级刷新到熟练加值 3, 以及 VGM 歌利亚短休资源.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段不默认应用 XPHB 歌利亚的巨人先祖选项, 因为该来源需要用户选择巨人祖先. 后续应先补种族特性选择 UI, 再按所选选项写入资源.

## 阶段 3al 记录

状态: 已完成.

范围: 龙裔吐息和 5 级龙裔资源.

改动:

- 种族资源 helper 会识别 `Breath Weapon`/`吐息武器` 特性, 并通过 `upsertResource` 写入吐息武器资源.
- `Dragonborn|PHB` 会写入 1 次, 短休恢复.
- `Dragonborn|XPHB` 和 FTD 龙裔会写入熟练加值次数, 长休恢复, 并在升级后按熟练加值刷新.
- `Dragonborn|XPHB` 到 5 级后会写入 `龙族飞翼` 资源, 1 次, 长休恢复.
- FTD 色彩, 宝石, 金属龙裔到 5 级后分别会写入 `色彩守护`, `宝石之翼`, `金属吐息武器` 资源, 1 次, 长休恢复.
- 扩展 `audit-origin-structured-behavior`, 验证 PHB 龙裔吐息资源可撤销, XPHB 龙裔 5 级吐息次数刷新和飞翼资源, FTD 色彩龙裔 5 级吐息次数刷新和色彩守护资源.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只记录使用次数和恢复节奏. 吐息范围, 伤害类型, 伤害骰和豁免 DC 仍保留在种族特性描述中, 等攻击/动作接口支持范围和豁免动作后再结构化.

## 阶段 3am 记录

状态: 已完成.

范围: 常见种族传送, 隐形, 变身和特殊攻击资源.

改动:

- `Aasimar|MPMM` 和 `Aasimar|XPHB` 到 3 级后会写入 `天界启示` 资源, 1 次, 长休恢复.
- `Astral Elf|AAG` 会写入 `星光步` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- `Eladrin|MPMM` 会写入 `妖精步伐` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- `Firbolg|MPMM` 会写入 `神隐步` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- `Firbolg|VGM` 会写入 `神隐步` 资源, 1 次, 短休恢复.
- `Lizardfolk|MPMM` 会写入 `饥渴之喉` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- `Lizardfolk|VGM` 会写入 `饥渴之喉` 资源, 1 次, 短休恢复.
- 扩展 `audit-origin-structured-behavior`, 覆盖上述资源的初始写入, 等级门槛和升级刷新.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只记录使用次数和恢复节奏. 传送位置, 隐形结束条件, 变身选项, 临时生命值和特殊啃咬攻击仍保留在种族特性描述中, 等后续有动作/状态/临时生命值接口后再结构化.

## 阶段 3an 记录

状态: 已完成.

范围: 地精和大地精检定/伤害加成资源.

改动:

- `Goblin|MPMM` 会写入 `小个子的怒火` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- `Goblin|VGM` 会写入 `小个子的怒火` 资源, 1 次, 短休恢复.
- `Hobgoblin|MPMM` 会写入 `集众之运` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- `Hobgoblin|VGM` 会写入 `挽回颜面` 资源, 1 次, 短休恢复.
- 扩展 `audit-origin-structured-behavior`, 覆盖上述资源的初始写入和熟练加值刷新.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只记录使用次数和恢复节奏. 具体加值计算, 目标体型限制和盟友数量上限仍保留在种族特性描述中, 等后续有检定/伤害事件接口后再结构化.

## 阶段 3ao 记录

状态: 已完成.

范围: 化兽者化形资源.

改动:

- `Shifter|EFA` 会写入 `化形` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- `Shifter|MPMM` 会写入 `化形` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- `Shifter|ERLW` 会写入 `化形` 资源, 1 次, 短休恢复.
- 扩展 `audit-origin-structured-behavior`, 覆盖上述资源的初始写入和熟练加值刷新.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只记录使用次数和恢复节奏. 临时生命值, AC 加值, 速度加值, 长牙攻击和狩猎感知优势仍保留在种族特性描述中, 等后续有状态开关和临时生命值接口后再结构化.

## 阶段 3ap 记录

状态: 已完成.

范围: 兔人先攻和兔子跳跃资源.

改动:

- `Harengon|MPMM` 和 `Harengon|WBtW` 会写入 `兔子跳跃` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- `Harengon|MPMM` 和 `Harengon|WBtW` 的 `野兔敏锐` 会通过 `initiativeBonus` 加入熟练加值.
- 已有兔人升级时, `野兔敏锐` 会按新旧熟练加值差值刷新先攻加值.
- 扩展 `audit-origin-structured-behavior`, 覆盖 MPMM/WBtW 兔人的初始资源, 初始先攻加值, 5 级资源刷新和 5 级先攻加值刷新.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只结构化固定数值和使用次数. `幸运步法` 的反应 d4 加值没有次数限制, 仍保留在种族特性描述中, 等后续有检定事件接口后再结构化.

## 阶段 3aq 记录

状态: 已完成.

范围: 回想, 鼓舞, 传送和豁免改写类种族资源.

改动:

- `Kender|DSotDQ` 会写入 `无畏` 资源, 1 次, 长休恢复.
- `Kenku|MPMM` 会写入 `天狗回想` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- `Kobold|MPMM` 会写入 `龙吼` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- `Kobold|VGM` 会写入 `摇尾乞怜` 资源, 1 次, 短休恢复.
- `Reborn|RHW` 和 `Reborn|VRGR` 会写入 `往昔学识` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- `Shadar-Kai|MPMM` 会写入 `鸦后祝福` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- 扩展 `audit-origin-structured-behavior`, 覆盖上述资源的初始写入和熟练加值刷新.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只记录使用次数和恢复节奏. 优势, 加骰, 攻击优势光环, 传送位置和 3 级后的临时全伤害抗性仍保留在种族特性描述中, 等后续有检定/状态/传送动作接口后再结构化.

## 阶段 3ar 记录

状态: 已完成.

范围: 种族天然武器自动攻击条目.

改动:

- `refreshAutomaticStyleAttacks` 现在会清理并重算 `auto-race-attack-*` 自动攻击, 与职业/战斗风格自动攻击使用同一可撤销调整路径.
- `Aarakocra|EEPC`, `Aarakocra|MPMM`, `Centaur|GGR`, `Centaur|MPMM`, `Lizardfolk|MPMM`, `Lizardfolk|VGM`, `Minotaur|GGR`, `Minotaur|MPMM`, `Tabaxi|MPMM`, `Tabaxi|VGM`, `Tortle|MPMM` 的天然武器特性会生成攻击栏条目.
- 攻击条目使用力量调整值和熟练加值计算命中, 伤害按来源写入对应骰和伤害类型, 类型标记为 `徒手打击`, 备注保留天然武器和相关触发提示.
- 扩展 `audit-origin-structured-behavior`, 覆盖 MPMM 鸟羽人, 人马, 牛头人, 蜥蜴人和龟人的天然武器攻击条目.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段不处理 `Dhampir` 吸血啃咬, 因为该攻击使用体质并带有次数和命中后增益分支, 后续应单独作为特殊攻击动作建模.
- 本阶段只处理来源明确的种族特性. 长牙化兽者等需要状态开关才出现的攻击仍保留在描述中.

## 阶段 3as 记录

状态: 已完成.

范围: 半血裔吸血啃咬资源和 CON 攻击条目.

改动:

- `Dhampir|RHW` 会写入 `吸血啃咬增幅` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- `Dhampir|VRGR` 会写入 `吸血啃咬强化` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- `refreshAutomaticStyleAttacks` 的天然武器定义支持指定属性, 吸血啃咬使用体质调整值计算命中和伤害.
- 吸血啃咬攻击条目会写入攻击栏, 类型为 `徒手打击`, 伤害为 `1d4 + CON` 穿刺, 备注保留生命值半血优势和命中后治疗/检定加值分支.
- 扩展 `audit-origin-structured-behavior`, 覆盖 RHW/VRGR 半血裔的资源, 攻击, CON 加值和 5 级熟练加值刷新.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段不实现“当前生命值不高于一半”作为动态优势开关, 也不自动结算命中后的治疗或下一次检定加值. 这些仍需要后续战斗事件/状态接口.

## 阶段 3at 记录

状态: 已完成.

范围: 地底侏儒斯涅布力伪装资源.

改动:

- `Deep Gnome|MPMM` 会写入 `斯涅布力伪装` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- 资源备注保留“敏捷(隐匿)检定优势”的用途说明.
- 扩展 `audit-origin-structured-behavior`, 覆盖初始资源, 备注文本和 5 级熟练加值刷新.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段不处理 `Gift of the Svirfneblin` 的 3/5 级赠法术, 因为它还需要施法属性选择和法术 profile 接入.

## 阶段 3au 记录

状态: 已完成.

范围: 自动侏儒铸订成功资源.

改动:

- `Autognome|AAG` 会写入 `铸订成功` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- 资源备注保留看到 d20 后为攻击检定, 属性检定或豁免检定追加 `1d4` 的用途说明.
- 扩展 `audit-origin-structured-behavior`, 覆盖初始资源, 备注文本, 撤销行为和 5 级熟练加值刷新.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只记录使用次数和恢复节奏. 实际向一次 d20 检定追加 `1d4` 仍需要后续检定事件接口.

## 阶段 3av 记录

状态: 已完成.

范围: 哈多兹闪避资源.

改动:

- `Hadozee|AAG` 会写入 `哈多兹闪避` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- 资源备注保留以反应降低 `1d6 + 熟练加值` 伤害的用途说明.
- 扩展 `audit-origin-structured-behavior`, 覆盖初始资源, 备注文本和 5 级熟练加值刷新.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只记录使用次数和恢复节奏. 实际伤害减免需要后续伤害事件接口.

## 阶段 3aw 记录

状态: 已完成.

范围: 诘弗人星界火花资源.

改动:

- `Giff|AAG` 会写入 `星界火花` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- 资源备注保留每回合一次, 简易或军用武器命中时额外造成等同熟练加值力场伤害的用途说明.
- 扩展 `audit-origin-structured-behavior`, 覆盖初始资源, 备注文本和 5 级熟练加值刷新.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只记录使用次数和恢复节奏. 实际命中后加伤害需要后续攻击命中事件接口.

## 阶段 3ax 记录

状态: 已完成.

范围: 大地精精类赠礼资源.

改动:

- `Hobgoblin|MPMM` 会写入 `精类赠礼` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- 资源备注保留附赠动作执行协助动作, 以及 3 级后可附加好客, 通行或恶意效果的用途说明.
- 扩展 `audit-origin-structured-behavior`, 覆盖初始资源, 备注文本和 5 级熟练加值刷新.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只记录使用次数和恢复节奏. 临时生命值, 速度加值和攻击劣势效果需要后续事件或状态接口.

## 阶段 3ay 记录

状态: 已完成.

范围: 坎德人嘲讽资源.

改动:

- `Kender|DSotDQ` 会写入 `嘲讽` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- 资源备注保留附赠动作使用方式和豁免 DC 公式, 即 `DC = 8 + 熟练加值 + 智力, 感知或魅力调整值`.
- 扩展 `audit-origin-structured-behavior`, 覆盖初始资源, 备注文本和 5 级熟练加值刷新.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只记录使用次数, 恢复节奏和 DC 说明. 目标攻击检定劣势需要后续状态或战斗事件接口.

## 阶段 3az 记录

状态: 已完成.

范围: XPHB 矮人石中精妙资源.

改动:

- `Dwarf|XPHB` 会写入 `石中精妙` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- 资源备注保留附赠动作获得 60 尺震颤感知, 持续 10 分钟, 且需位于或触碰岩石表面的限制.
- 扩展 `audit-origin-structured-behavior`, 覆盖初始资源, 备注文本, 撤销和 5 级熟练加值刷新.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只记录使用次数, 恢复节奏和震颤感知说明. 临时感官开启与失效需要后续状态接口.

## 阶段 3ba 记录

状态: 已完成.

范围: 狮族畏惧咆哮资源.

改动:

- `Leonin|MOT` 会写入 `畏惧咆哮` 资源, 1 次, 短休或长休恢复.
- 资源备注保留附赠动作使用方式, 10 尺范围, 豁免 DC 公式和失败后陷入恐慌直到你的下回合结束.
- 扩展 `audit-origin-structured-behavior`, 覆盖初始资源, 备注文本和撤销.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只记录使用次数, 恢复节奏和效果说明. 目标恐慌状态需要后续状态或战斗事件接口.

## 阶段 3bb 记录

状态: 已完成.

范围: 人狼裔尖啸资源.

改动:

- `Lupin|RHW` 会写入 `尖啸` 资源, 次数等于熟练加值, 长休恢复, 并在升级后按熟练加值刷新.
- 资源备注保留附赠动作使用方式, 15 尺范围, 豁免 DC 公式和失败后攻击检定与豁免检定劣势的说明.
- 扩展 `audit-origin-structured-behavior`, 覆盖初始资源, 备注文本和 5 级熟练加值刷新.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只记录使用次数, 恢复节奏和效果说明. 目标劣势状态需要后续状态或战斗事件接口.

## 阶段 3bc 记录

状态: 已完成.

范围: 科拉瓦怠惰恢复力资源.

改动:

- `Khoravar|EFA` 会写入 `怠惰恢复力` 资源, 1 次, 手动恢复.
- 资源备注保留避免或结束昏迷状态豁免失败时改为成功, 以及使用后需要完成 `1d4` 次长休才可再次使用的恢复规则.
- 扩展 `audit-origin-structured-behavior`, 覆盖初始资源, 备注文本和撤销.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段使用 `manual` 恢复类型, 避免把 `1d4` 次长休误标为普通长休恢复.

## 阶段 3bd 记录

状态: 已完成.

范围: 维多肯临时两栖资源.

改动:

- `Vedalken|GGR` 会写入 `临时两栖` 资源, 1 次, 长休恢复.
- 资源备注保留水下呼吸最多 1 小时, 达到时限后直到完成长休前不能再次使用.
- 扩展 `audit-origin-structured-behavior`, 覆盖初始资源, 备注文本和撤销.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只记录使用次数, 恢复节奏和效果说明. 计时与水下呼吸状态需要后续状态接口.

## 阶段 3be 记录

状态: 已完成.

范围: XPHB 人类适应力激励.

改动:

- `AdjustmentOperation` 新增 `setBooleanField`, 当前只允许写入 `inspiration`.
- `setBooleanField` 会记录应用前的布尔值, 撤销时恢复原值, 避免覆盖用户已有激励状态.
- `Human|XPHB` 的 `Resourceful|适应力` 会在自动建卡时把 `inspiration` 置为 `true`.
- 扩展 `audit-origin-structured-behavior`, 覆盖初始激励写入, 撤销为默认 `false`, 以及撤销时保留建卡前已有 `true`.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段按自动建卡时已经完成长休处理, 暂不实现长休事件自动重新勾选. 后续若加入休息事件接口, 可复用同一布尔调整操作.

## 阶段 3bf 记录

状态: 已完成.

范围: XPHB 歌利亚大型形态资源.

改动:

- `Goliath|XPHB` 的 `Large Form|大型形态` 会在角色总等级达到 5 级后写入资源.
- 该资源为 1 次, 长休恢复, 备注保留附赠动作变为大型, 持续 10 分钟, 力量检定优势和速度 +10 尺.
- 后续升级刷新会通过现有 `upsertResource` 路径写入, 并可随对应升级调整撤销.
- 扩展 `audit-origin-structured-behavior`, 覆盖 1 级不添加, 5 级添加, 备注文本和撤销.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只记录使用次数, 恢复节奏和效果说明. 大型体型, 速度加值和力量检定优势是持续状态效果, 需要后续状态接口才能在 10 分钟持续期内临时套用和取消.

## 阶段 3bg 记录

状态: 已完成.

范围: PSZ 吸血鬼嗜血攻击条目.

改动:

- `Vampire|PSZ` 的 `Blood Thirst|嗜血` 会生成自动攻击栏条目.
- 天然攻击定义支持固定伤害字符串, 避免把嗜血的 `1 穿刺 + 1d6 暗蚀` 误处理为带属性调整值的普通伤害.
- 嗜血攻击类型标记为 `种族攻击`, 备注保留目标条件, 最大生命值降低和自我治疗.
- 扩展 `audit-origin-structured-behavior`, 覆盖命中加值, 固定伤害, 类型, 备注和 5 级熟练加值刷新.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只加入攻击栏显示. 最大生命值降低和治疗仍需实战结算接口处理.

## 阶段 3bh 记录

状态: 已完成.

范围: 巫咒之子神秘信物资源.

改动:

- `Hexblood|RHW` 和 `Hexblood|VRGR` 的 `Eerie Token|神秘信物` 会写入资源.
- 该资源为 1 次, 长休恢复, 备注保留远程传信和遥远视野两种用途.
- 扩展 `audit-origin-structured-behavior`, 覆盖 RHW/VRGR 两个来源的资源写入, 备注文本和撤销.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段暂不处理 `Hex Magic|巫咒魔法`, 因为它需要在建卡时选择智力, 感知或魅力作为施法属性, 应并入后续种族赠法术选择流程.

## 阶段 3bi 记录

状态: 已完成.

范围: 牛头人角击攻击备注.

改动:

- `Minotaur|GGR` 和 `Minotaur|MPMM` 的自动角击攻击备注补充 `Hammering Horns|角锤`.
- 备注包含命中后附赠动作推离 10 尺, 以及 DC = 8 + 熟练加值 + 力量调整值.
- 扩展 `audit-origin-structured-behavior`, 覆盖 MPMM 牛头人角击备注包含角锤和 DC 公式.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只补攻击栏规则文字. 推离效果和豁免结算仍需要战斗流程或状态接口处理.

## 阶段 3bj 记录

状态: 已完成.

范围: 纳迦天生武器攻击条目.

改动:

- `Naga|PSA` 的 `Natural Weapons|天生武器` 会生成 `咬击` 和 `紧束` 两个自动攻击栏条目.
- `咬击` 备注保留体质豁免 DC 和失败额外 `1d4` 毒素伤害.
- `紧束` 备注保留受擒, 束缚, 逃脱 DC 和同一时间只能紧束一个目标.
- 扩展 `audit-origin-structured-behavior`, 覆盖两个攻击条目的命中加值, 伤害, 备注和刷新不重复.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只加入攻击栏显示. 毒素豁免, 受擒, 束缚和逃脱仍需战斗流程或状态接口处理.

## 阶段 3bk 记录

状态: 已完成.

范围: XPHB 歌利亚巨人先祖资源.

改动:

- `Goliath|XPHB` 的 `Giant Ancestry|巨人先祖` 会写入熟练加值次数, 长休恢复的资源.
- 备注保留使用所选巨人先祖恩惠, 包括传送, 额外伤害, 减速, 击倒, 减伤或反击雷鸣伤害.
- 后续升级刷新会随熟练加值更新最大次数.
- 扩展 `audit-origin-structured-behavior`, 覆盖初始次数, 备注文本和 5 级熟练加值刷新.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只记录统一使用次数. 具体巨人先祖分支仍需要后续选择 UI, 再把选定分支的规则文字或数值效果细化.

## 阶段 3bl 记录

状态: 已完成.

范围: 佛丹人 5 级体型变化.

改动:

- `Verdan|AI` 建卡时会按体型特性写入 `小型`, 避免数据中的 `V` 直接显示为未解释的体型代码.
- 当角色总等级从 5 级以下升到 5 级或以上时, `Verdan|AI` 会通过 `setStringField` 把 `bodyType` 改为 `中型`.
- 该升级调整可随对应 5 级自动升级调整撤销, 恢复为 1 级建卡时的小型.
- 扩展 `audit-origin-structured-behavior`, 覆盖 1 级小型, 5 级中型和撤销 5 级调整恢复小型.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只处理佛丹人明确的等级体型变化. 其他来源中可选择或可变体型仍由已有体型选择流程处理.

## 阶段 3bm 记录

状态: 已完成.

范围: 萨提尔攻城槌天然武器攻击条目.

改动:

- `Satyr|MOT` 的 `Ram|攻城槌` 会生成攻击栏条目, 伤害为 `1d4 钝击`.
- `Satyr|MPMM` 的 `Ram|攻城槌` 会生成攻击栏条目, 伤害为 `1d6 穿刺`.
- 两者都复用 `auto-race-attack-*` 自动攻击刷新路径, 随力量调整值和熟练加值重算, 且刷新时不会重复生成.
- 扩展 `audit-origin-structured-behavior`, 覆盖 `Satyr|MPMM` 攻城槌攻击条目.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只处理固定天然武器攻击. `Mirthful Leaps|欢喜之跃` 等非攻击骰池仍保留在特性描述中.

## 阶段 3bn 记录

状态: 已完成.

范围: 斑猫人猫之迅捷资源.

改动:

- `Tabaxi|MPMM` 和 `Tabaxi|VGM` 的 `Feline Agility|猫之迅捷` 会写入 1 次手动恢复资源.
- 资源备注保留速度翻倍持续到回合结束, 以及需要在自己的一个回合移动 0 尺才可再次使用的恢复条件.
- 该资源通过 `upsertResource` 写入, 可随自动建卡调整撤销.
- 扩展 `audit-origin-structured-behavior`, 覆盖 MPMM 和 VGM 两个来源的资源, 备注和撤销行为.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只结构化可跟踪的使用次数和恢复条件. 回合内速度翻倍仍是临时战斗状态, 需要后续状态接口才能自动套用和取消.

## 阶段 3bo 记录

状态: 已完成.

范围: 旧版熊地精突袭攻击资源.

改动:

- `Bugbear|ERLW` 和 `Bugbear|VGM` 的 `Surprise Attack|突袭攻击` 会写入 1 次手动恢复资源.
- 资源备注保留每场战斗一次, 第一回合命中被突袭生物时额外 `2d6` 伤害.
- 该资源通过 `upsertResource` 写入, 可随自动建卡调整撤销.
- `Bugbear|MPMM` 的新版 `Surprise Attack|突袭攻击` 没有每场战斗一次限制, 不生成该资源, 仍保留为特性描述.
- 扩展 `audit-origin-structured-behavior`, 覆盖 ERLW/VGM 资源, 备注, 撤销行为, 以及 MPMM 不生成旧版资源.

已通过验证:

- `npm run audit:origin-structured-behavior`

说明:

- 本阶段只结构化旧版“一战一次”的使用次数. MPMM 版本是条件性额外伤害, 当前攻击栏还没有按战斗先手状态自动切换额外伤害的接口.

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

## 阶段 4n 记录

状态: 已完成.

范围: 中甲大师护甲计算回归审计.

改动:

- `utils/equipmentRules.ts` 已有中甲大师规则: 装备中甲时, 普通角色的敏捷调整值上限为 +2, 拥有 `中甲大师`/`Medium Armor Master` 后上限提高到 +3.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 使用 DEX 16 的角色分别验证无专长和有中甲大师时的 `armorBase` 结果.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- 本阶段没有修改运行时代码, 只为既有装备规则补回归覆盖.

## 阶段 4o 记录

状态: 已完成.

范围: 熊地精长肢攻击备注.

改动:

- `Bugbear` 的 `Long-Limbed|长肢` 会在近战武器攻击备注中显示 "你的回合内近战攻击触及 +5 尺".
- 该备注由 `formatWeaponNotes` 统一生成, 装备刷新时随攻击条目重算.
- 远程武器攻击不会添加该备注.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖近战武器添加长肢备注, 以及远程武器不添加该备注.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- 本阶段只显示攻击触及提示, 不改变武器基础 `range` 字段. 长肢只在你的回合近战攻击时生效, 不适合改写武器静态射程.

## 阶段 4p 记录

状态: 已完成.

范围: 半兽人凶蛮攻击备注.

改动:

- `Savage Attacks|凶蛮攻击` 会在近战武器攻击备注中显示重击时额外一颗武器伤害骰.
- 该备注由 `formatWeaponNotes` 统一生成, 装备刷新时随攻击条目重算.
- 远程武器攻击不会添加该备注.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖近战武器添加凶蛮攻击备注, 以及远程武器不添加该备注.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- 本阶段只显示重击规则提示, 不改变武器基础伤害公式. 凶蛮攻击只在近战武器攻击重击时触发, 不适合并入常驻伤害字符串.

## 阶段 4q 记录

状态: 已完成.

范围: 凶蛮打手专长攻击备注.

改动:

- PHB `Savage Attacker|凶蛮打手` 会在近战武器攻击备注中显示每回合一次重掷近战武器伤害骰并择优.
- XPHB `Savage Attacker|凶蛮打手` 会在所有武器攻击备注中显示每回合一次武器命中时伤害骰掷两次择优.
- 该规则按 `auto-feat-Savage Attacker-PHB` 和 `auto-feat-Savage Attacker-XPHB` 的 `sourceId` 区分, 避免同名 5e/5r 专长混用.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖 PHB 近战可用, PHB 远程不适用, 以及 XPHB 远程武器可用.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- 本阶段只显示伤害骰择优规则提示, 不改变武器基础伤害公式. 该专长是每回合一次的命中或伤害事件, 不适合并入常驻伤害字符串.

## 阶段 4r 记录

状态: 已完成.

范围: 粉碎者, 穿刺者, 劈砍者专长攻击备注.

改动:

- `Crusher|粉碎者` 会在钝击武器攻击备注中显示每回合一次移动目标 5 尺, 以及钝击重击后攻击目标具有优势.
- `Piercer|穿刺者` 会在穿刺武器攻击备注中显示每回合一次重骰一颗穿刺伤害骰, 以及穿刺重击额外一颗伤害骰.
- `Slasher|劈砍者` 会在挥砍武器攻击备注中显示每回合一次使目标速度 -10 尺, 以及挥砍重击后目标攻击具有劣势.
- 这些备注按武器 `dmgType` 生成, 装备刷新时随攻击条目重算.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖钝击, 穿刺, 挥砍三类武器的专长备注.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- 本阶段只显示按伤害类型触发的事件规则提示, 不改变武器基础伤害公式. 这些效果都依赖命中, 重击或目标状态, 不适合并入常驻数值.

## 阶段 4s 记录

状态: 已完成.

范围: 神射手专长攻击备注.

改动:

- PHB `Sharpshooter|神射手` 会在远程武器攻击备注中显示长射程不劣势, 无视半身/四分之三掩护, 以及熟练远程武器可选 -5 命中 +10 伤害.
- XPHB `Sharpshooter|神射手` 会在远程武器攻击备注中显示远程武器攻击无视掩护, 近距和长射程不具有劣势.
- 该规则按 `auto-feat-Sharpshooter-PHB` 和 `auto-feat-Sharpshooter-XPHB` 的 `sourceId` 区分, 避免同名 5e/5r 专长混用.
- 近战武器攻击不会添加神射手备注.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖 PHB 远程武器备注, PHB 近战排除, 以及 XPHB 远程武器备注不包含 PHB 的 -5/+10.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- 本阶段只显示远程攻击规则提示, 不改变命中或伤害公式. PHB 的 -5/+10 是攻击前选择, XPHB 则没有该数值选项.

## 阶段 4t 记录

状态: 已完成.

范围: 巨武器大师专长攻击备注.

改动:

- PHB `Great Weapon Master|巨武器大师` 会在重型近战武器攻击备注中显示可选 -5 命中 +10 伤害, 以及近战重击或击杀后可附赠动作攻击.
- XPHB `Great Weapon Master|巨武器大师` 会在重型武器攻击备注中显示攻击动作中命中可额外造成等同熟练加值的伤害.
- XPHB `Great Weapon Master|巨武器大师` 也会在近战武器攻击备注中显示近战重击或击杀后可附赠动作攻击.
- 该规则按 `auto-feat-Great Weapon Master-PHB` 和 `auto-feat-Great Weapon Master-XPHB` 的 `sourceId` 区分, 避免同名 5e/5r 专长混用.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖 PHB 重型近战武器备注, PHB 远程武器排除, XPHB 重型远程武器熟练加值伤害备注, 以及 XPHB 非重型近战武器只显示附赠攻击备注.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- 本阶段只显示攻击前选择或命中事件提示, 不改变命中或伤害公式. PHB 的 -5/+10 需要玩家攻击前选择, XPHB 的额外伤害只限攻击动作中的重型武器命中.

## 阶段 4u 记录

状态: 已完成.

范围: 强弩专家专长攻击备注.

改动:

- PHB `Crossbow Expert|强弩专家` 会在所有远程武器攻击备注中显示 5 尺内远程攻击不具有劣势.
- PHB `Crossbow Expert|强弩专家` 会在弩武器攻击备注中额外显示忽略装填属性, 并在手弩攻击备注中显示攻击动作使用单手武器后可附赠动作手弩攻击.
- XPHB `Crossbow Expert|强弩专家` 会在弩武器攻击备注中显示弩攻击 5 尺内不具有劣势, 忽略装填属性.
- XPHB `Crossbow Expert|强弩专家` 会在轻型弩攻击备注中额外显示轻型弩额外攻击可加入属性调整值.
- 该规则按 `auto-feat-Crossbow Expert-PHB` 和 `auto-feat-Crossbow Expert-XPHB` 的 `sourceId` 区分, 避免同名 5e/5r 专长混用.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖 PHB 非弩远程武器只显示近距备注, PHB 手弩显示装填和附赠动作备注, XPHB 手弩显示轻型弩额外攻击备注, 以及 XPHB 非弩远程武器不显示强弩专家备注.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- 本阶段只显示攻击限制和额外攻击规则提示, 不直接生成额外攻击条目. PHB 手弩和 XPHB 轻型弩的额外攻击都依赖攻击动作与当前持握状态, 需要后续动作/装备状态建模后再结构化为单独攻击.

## 阶段 4v 记录

状态: 已完成.

范围: 长柄武器大师专长攻击备注.

改动:

- PHB `Polearm Master|长柄武器大师` 会在长柄刀, 长戟, 长棍, 长矛, 矛的攻击备注中显示攻击动作后可附赠动作尾击 1d4 钝击, 以及生物进入触及范围时可借机攻击.
- XPHB `Polearm Master|长柄武器大师` 会在长棍, 矛, 以及同时具有重型和触及词条的武器攻击备注中显示攻击动作后可附赠动作尾击 1d4 钝击, 以及生物进入触及范围时可反应攻击.
- 该规则按 `auto-feat-Polearm Master-PHB` 和 `auto-feat-Polearm Master-XPHB` 的 `sourceId` 区分, 避免同名 5e/5r 专长混用.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖 PHB 长柄刀, PHB 长棍, XPHB 重型触及武器, 以及 XPHB 非重型触及武器排除.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- 本阶段只显示附赠动作尾击和反应/借机攻击规则提示, 不直接生成额外攻击条目. 这些攻击都依赖攻击动作或触发时机, 需要后续动作接口再结构化为单独攻击.

## 阶段 4w 记录

状态: 已完成.

范围: 冲锋手专长攻击备注.

改动:

- PHB `Charger|冲锋手` 会在近战武器攻击备注中显示疾走后可附赠动作近战攻击, 以及直线移动 10 尺后命中 +5 伤害或推离 10 尺.
- XPHB `Charger|冲锋手` 会在近战武器攻击备注中显示攻击前直线移动 10+ 尺后, 每回合一次 +1d8 伤害或推离 10 尺.
- 该规则按 `auto-feat-Charger-PHB` 和 `auto-feat-Charger-XPHB` 的 `sourceId` 区分, 避免同名 5e/5r 专长混用.
- 远程武器攻击不会添加冲锋手备注.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖 PHB 近战武器备注, PHB 远程武器排除, 以及 XPHB 近战武器备注.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- 本阶段只显示移动触发的攻击规则提示, 不改变常驻命中或伤害公式. 冲锋手需要本回合移动路径和动作条件, 不适合并入静态攻击数值.

## 阶段 4x 记录

状态: 已完成.

范围: 哨兵专长攻击备注.

改动:

- PHB `Sentinel|哨兵` 会在近战武器攻击备注中显示借机攻击命中使速度变为 0, 撤离仍触发借机攻击, 以及 5 尺内敌人攻击他人后可反应近战攻击.
- XPHB `Sentinel|哨兵` 会在近战武器攻击备注中显示借机攻击命中使速度变为 0, 以及 5 尺内敌人撤离或攻击他人后可借机攻击.
- 该规则按 `auto-feat-Sentinel-PHB` 和 `auto-feat-Sentinel-XPHB` 的 `sourceId` 区分, 避免同名 5e/5r 专长混用.
- 远程武器攻击不会添加哨兵备注.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖 PHB 近战武器备注, PHB 远程武器排除, 以及 XPHB 近战武器备注.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- 本阶段只显示反应和借机攻击触发规则提示, 不生成额外攻击条目. 哨兵效果依赖敌人移动和攻击触发时机, 需要后续动作/反应接口再结构化.

## 阶段 4y 记录

状态: 已完成.

范围: 防御式决斗专长攻击备注.

改动:

- PHB `Defensive Duelist|防御式决斗` 会在熟练的灵巧武器攻击备注中显示反应使本次近战攻击 AC 增加熟练加值.
- XPHB `Defensive Duelist|防御式决斗` 会在灵巧武器攻击备注中显示反应使近战攻击 AC 增加熟练加值, 并持续到下回合开始.
- 该规则按 `auto-feat-Defensive Duelist-PHB` 和 `auto-feat-Defensive Duelist-XPHB` 的 `sourceId` 区分, 避免同名 5e/5r 专长混用.
- 非灵巧武器不会添加防御式决斗备注. PHB 版本还会检查角色是否对该武器熟练.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖 PHB 熟练灵巧武器备注, PHB 不熟练排除, XPHB 灵巧武器备注, 以及 XPHB 非灵巧武器排除.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- 本阶段只显示受近战攻击命中时的反应 AC 加值提示, 不改变常驻 AC. 该效果需要战斗内触发时机, 不适合写入静态 `armorBonus`.

## 阶段 4z 记录

状态: 已完成.

范围: 盾牌大师专长攻击备注和盾牌装备刷新.

改动:

- PHB `Shield Master|盾牌大师` 会在已装备盾牌且使用近战武器时显示攻击动作后可附赠动作以盾牌推撞 5 尺内目标.
- XPHB `Shield Master|盾牌大师` 会在已装备盾牌且使用近战武器时显示每回合一次近战命中后盾击, 并给出力量豁免 DC = 8 + 力量调整值 + 熟练加值.
- 该规则按 `auto-feat-Shield Master-PHB` 和 `auto-feat-Shield Master-XPHB` 的 `sourceId` 区分, 避免同名 5e/5r 专长混用.
- 装备盾牌后会刷新已装备的普通和魔法主手武器攻击, 使盾牌大师备注能在“先装备武器, 后装备盾牌”的顺序下出现.
- 未装备盾牌时不会添加盾牌大师备注. 远程武器攻击不会添加盾牌大师备注.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖 PHB 无盾排除, PHB 装盾后刷新已有攻击备注, XPHB 盾击 DC 备注, 以及 XPHB 远程武器排除.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- 本阶段只显示盾击和推撞触发提示, 不生成额外攻击条目. 盾牌大师的敏捷豁免和反应减伤效果依赖具体触发事件, 暂时仍保留在专长描述中.

## 阶段 4aa 记录

状态: 已完成.

范围: 擒抱者专长攻击备注.

改动:

- PHB `Grappler|擒抱者` 会在武器攻击备注中显示攻击被你擒抱的生物具有优势.
- PHB `Grappler|擒抱者` 会在徒手打击和种族天然攻击备注中额外显示可用动作尝试压制被你擒抱的生物.
- XPHB `Grappler|擒抱者` 会在武器攻击备注中显示攻击被你擒抱的生物具有优势.
- XPHB `Grappler|擒抱者` 会在徒手打击和种族天然攻击备注中额外显示每回合一次徒手打击命中可同时造成伤害并擒抱, 以及拖行同体型或更小目标不额外消耗移动.
- 该规则按 `auto-feat-Grappler-PHB` 和 `auto-feat-Grappler-XPHB` 的 `sourceId` 区分, 避免同名 5e/5r 专长混用.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖 PHB 武器攻击优势备注, PHB 徒手压制备注, XPHB 武器攻击优势备注, 以及 XPHB 徒手连擒带打和高速拖行备注.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- 本阶段只显示擒抱相关触发提示, 不创建擒抱状态或额外攻击条目. 是否受擒, 是否同体型或更小, 以及压制动作结果需要战斗内状态接口后再结构化.

## 阶段 4ab 记录

状态: 已完成.

范围: 巫师杀手专长攻击备注.

改动:

- PHB `Mage Slayer|巫师杀手` 会在近战武器攻击备注中显示 5 尺内生物施法后可反应近战武器攻击.
- PHB `Mage Slayer|巫师杀手` 会在武器攻击, 徒手打击和种族天然攻击备注中显示对专注目标造成伤害后, 其维持专注豁免具有劣势.
- XPHB `Mage Slayer|巫师杀手` 会在武器攻击, 徒手打击和种族天然攻击备注中显示对专注目标造成伤害后, 其维持专注豁免具有劣势.
- 该规则按 `auto-feat-Mage Slayer-PHB` 和 `auto-feat-Mage Slayer-XPHB` 的 `sourceId` 区分, 避免同名 5e/5r 专长混用.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖 PHB 近战武器反应和专注备注, PHB 远程武器仅专注备注, 以及 XPHB 徒手打击仅专注备注.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- XPHB `Mage Slayer` 的 `审慎护心` 使用次数已在专长资源阶段结构化为可恢复资源. 本阶段只补攻击栏里的专注中断提示.

## 阶段 4ac 记录

状态: 已完成.

范围: 酒馆斗殴者徒手攻击.

改动:

- PHB `Tavern Brawler|酒馆斗殴者` 会在没有徒手战斗风格或武僧武艺自动攻击时, 生成一个专长来源的 `徒手打击` 攻击条目, 命中使用力量调整值和熟练加值, 伤害为 `1d4 + 力量调整值` 钝击.
- PHB `Tavern Brawler|酒馆斗殴者` 的徒手攻击备注会显示徒手伤害骰为 d4, 以及徒手打击或临时武器命中后可附赠动作擒抱.
- XPHB `Tavern Brawler|酒馆斗殴者` 会在没有徒手战斗风格或武僧武艺自动攻击时, 生成一个专长来源的 `徒手打击` 攻击条目, 命中使用力量调整值和熟练加值, 伤害为 `1d4 + 力量调整值` 钝击.
- XPHB `Tavern Brawler|酒馆斗殴者` 的徒手攻击备注会显示徒手打击可造成 `1d4 + 力量调整值` 钝击, 且徒手伤害骰掷出 1 可重掷.
- 若角色已有徒手战斗风格或武僧武艺生成的徒手攻击, 不重复生成酒馆斗殴者攻击条目, 只把酒馆斗殴者备注追加到既有徒手攻击.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖 PHB 自动徒手攻击, XPHB 自动徒手攻击, 以及 XPHB 与徒手战斗风格共存时不重复生成攻击条目.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- 本阶段不实现临时武器作为独立装备类型, 只补角色卡攻击栏中的徒手打击规则. 临时武器的完整物品/攻击建模需要后续装备接口支持.

## 阶段 4ad 记录

状态: 已完成.

范围: 隐伏者专长攻击备注.

改动:

- PHB `Skulker|隐伏者` 会在远程武器攻击备注中显示躲藏状态下远程武器攻击未命中不会暴露位置.
- PHB `Skulker|隐伏者` 不会在近战武器, 徒手打击或种族天然攻击备注中添加该提示.
- XPHB `Skulker|隐伏者` 会在武器攻击, 徒手打击和种族天然攻击备注中显示躲藏状态下攻击检定未命中不会暴露位置.
- 该规则按 `auto-feat-Skulker-PHB` 和 `auto-feat-Skulker-XPHB` 的 `sourceId` 区分, 避免同名 5e/5r 专长混用.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖 PHB 远程武器备注, PHB 近战武器排除, 以及 XPHB 徒手打击备注.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- XPHB `Skulker` 的 10 尺盲视属于感官结构化缺口, 本阶段没有处理. 后续应通过专长结构化字段把它写入 `senses`.

## 阶段 4ae 记录

状态: 已完成.

范围: 灵活移动专长攻击备注.

改动:

- PHB `Mobile|灵活移动` 会在近战武器攻击备注中显示对目标发动近战攻击后, 本回合不引发该目标的借机攻击.
- PHB `Mobile|灵活移动` 会在徒手打击和种族天然攻击备注中显示同样的近战攻击后不引发目标借机攻击提示.
- PHB `Mobile|灵活移动` 不会在远程武器攻击备注中添加该提示.
- 该规则按 `auto-feat-Mobile-PHB` 的 `sourceId` 区分, 避免和 XPHB `Speedy|飙速跑者` 混用.
- 扩展 `scripts/audit-equipment-behavior.mjs`, 覆盖 PHB 近战武器备注, PHB 远程武器排除, 以及 PHB 徒手打击备注.

已通过验证:

- `npm run audit:equipment-behavior`
- `npm run build`

说明:

- XPHB `Speedy|飙速跑者` 的借机攻击劣势是防御性常驻提示, 当前保留在专长描述中, 本阶段不写入攻击条目.

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

## 阶段 5d 记录

状态: 已完成.

范围: 真实升级路径的施法审计.

改动:

- 新增 `scripts/audit-spell-levelup-behavior.mjs`.
- 新增 `npm run audit:spell-levelup-behavior`.
- 审计脚本通过 Vite 临时打包测试入口, 直接调用真实 `buildLevelOneCharacter`, `buildLevelUpCharacter`, `getSpellChoiceState`.
- 当前覆盖:
  - PHB Wizard 从 1 级到 3 级的 spellbook 学法术路径, 验证 6, 2, 2 的新增学法术数量, 且 3 级可以选择 2 环法术.
  - PHB Sorcerer 从 1 级到 2 级的 known-selection 路径, 验证升级需要并加入 1 个新的已知环阶法术, 且已知法术默认 prepared.
  - PHB Cleric 从 1 级到 2 级的 prepared-all 路径, 验证升级不要求环阶法术选择, 并避免重复加入法术.

已通过验证:

- `npm run audit:spell-levelup-behavior`

说明:

- PHB Wizard 当前使用 spellbook 数量选择, 而不是固定环阶组 UI. 审计明确验证真实选择数量和 3 级 2 环法术可选.
- 本阶段仍是函数级真实路径审计, 不替代后续浏览器 UI 手动流程测试.

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

状态: 进行中. 阶段 3a 已完成种族结构化字段的基础覆盖, 阶段 3b 已完成低风险专长升级缩放, 阶段 3c 已完成专长选择型熟练审计与豁免选择修复, 阶段 3d 已完成种族感官和抗性的结构化可撤销字段, 阶段 3e 已完成种族固定熟练 key 规范化, 阶段 3f 已完成选择型武器熟练, 阶段 3g 已完成种族免疫, 易伤和特殊感官结构化, 阶段 3h 已完成常驻种族 AC 规则, 阶段 3i 已完成 Lucky 专长资源, 阶段 3j 已完成战技专家和超魔导师资源, 阶段 3k 已完成龙类赠礼和 XPHB 巫师杀手资源, 阶段 3l 已完成金属龙赋礼资源, 阶段 3m 已完成火巨人之余烬结构化效果, 阶段 3n 已完成 BGG 巨人后续专长资源, 阶段 3o 已完成大厨资源, 阶段 3p 已完成索拉尼亚侍从资源, 阶段 3q 已完成卡牌占卜师资源, 阶段 3r 已完成位面漫游者资源, 阶段 3s 已完成符文塑形者资源, 阶段 3t 已完成 SatO 外层位面后续专长资源, 阶段 3u 已完成外域使节免费施法资源, 阶段 3v 已完成索拉尼亚后续专长资源, 阶段 3w 已完成 XPHB 固定专长资源, 阶段 3x 已完成 XPHB 恩惠和仪式资源, 阶段 3y 已完成精类/影界触碰固定免费施法资源, 阶段 3z 已完成 XGE 固定免费施法资源, 阶段 3aa 已完成毒师酿毒资源, 阶段 3ab 已完成 XPHB 固定史诗恩惠数值效果, 阶段 3ac 已完成低身机敏速度和博学多才熟练审计, 阶段 3ad 已完成护甲和武器固定熟练专长审计, 阶段 3ae 已完成选择型语言专长审计, 阶段 3af 已完成 XPHB 观察力已熟练技能转专精规则, 阶段 3ag 已完成 XPHB 矮人刚毅生命值上限规则, 阶段 3ah 已完成兽人激昂冲锋种族资源, 阶段 3ai 已完成坚韧不屈种族资源, 阶段 3aj 已完成阿斯莫治愈之手种族资源, 阶段 3ak 已完成歌利亚石之坚韧种族资源, 阶段 3al 已完成龙裔吐息和 5 级龙裔资源, 阶段 3am 已完成常见种族传送, 隐形, 变身和特殊攻击资源, 阶段 3an 已完成地精和大地精检定/伤害加成资源, 阶段 3ao 已完成化兽者化形资源, 阶段 3ap 已完成兔人先攻和兔子跳跃资源, 阶段 3aq 已完成回想, 鼓舞, 传送和豁免改写类种族资源, 阶段 3ar 已完成种族天然武器自动攻击条目, 阶段 3as 已完成半血裔吸血啃咬资源和 CON 攻击条目, 阶段 3at 已完成地底侏儒斯涅布力伪装资源, 阶段 3au 已完成自动侏儒铸订成功资源, 阶段 3av 已完成哈多兹闪避资源, 阶段 3aw 已完成诘弗人星界火花资源, 阶段 3ax 已完成大地精精类赠礼资源, 阶段 3ay 已完成坎德人嘲讽资源, 阶段 3az 已完成 XPHB 矮人石中精妙资源, 阶段 3ba 已完成狮族畏惧咆哮资源, 阶段 3bb 已完成人狼裔尖啸资源, 阶段 3bc 已完成科拉瓦怠惰恢复力资源, 阶段 3bd 已完成维多肯临时两栖资源, 阶段 3be 已完成 XPHB 人类适应力激励, 阶段 3bf 已完成 XPHB 歌利亚大型形态资源, 阶段 3bg 已完成 PSZ 吸血鬼嗜血攻击条目, 阶段 3bh 已完成巫咒之子神秘信物资源, 阶段 3bi 已完成牛头人角击攻击备注, 阶段 3bj 已完成纳迦天生武器攻击条目, 阶段 3bk 已完成 XPHB 歌利亚巨人先祖资源, 阶段 3bl 已完成佛丹人 5 级体型变化, 阶段 3bm 已完成萨提尔攻城槌攻击条目, 阶段 3bn 已完成斑猫人猫之迅捷资源, 阶段 3bo 已完成旧版熊地精突袭攻击资源.

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
- 大厨, 索拉尼亚侍从, 卡牌占卜师, 位面漫游者, 色彩龙赋礼, 宝石龙赋礼, 金属龙赋礼, 火巨人之余烬, 霜巨人之狂怒, 云巨人之诡诈, 石巨人之敏锐, 风暴巨人之灵魂, XPHB 巫师杀手会通过 `upsertResource` 写入对应使用次数资源, 熟练加值型资源会随升级刷新.
- 火巨人之余烬会通过 `addTextEntry` 写入火焰抗性, 霜巨人之狂怒会通过 `addTextEntry` 写入寒冷抗性.
- 黑暗视觉和抗性仍保留 `featureEntries` 描述, 避免丢失规则文字。
- `FeaturesBox` 显示结构化抗性和感官。
- 新增 `npm run audit:origin-structured-behavior`, 通过真实建卡路径验证 MPMM `Aasimar`, PHB `Dragonborn`, PHB `Dwarf` 的结构化字段, 固定武器熟练与撤销行为。

阶段 3 后续建议:

- 下一步可以继续把更多现有特性描述中的可结构化内容迁移到字段, 例如免疫, 状态抗性/免疫, 特殊感官, 条件优势提示等。
- 若保持当前 UI, 建议继续覆盖低风险专长规则, 如护甲熟练类, 豁免熟练类, 技能专家类和可明确映射到现有字段的专长。

### 阶段 4: 装备和攻击完善

目标: 装备后攻击栏稳定显示正确数值和特性。

状态: 进行中. 阶段 4a 已完成基础装备冲突规则, 阶段 4b 已完成魔法武器攻击生成模块化, 阶段 4c 已完成副手装备失败提示, 阶段 4d 已完成装备行为回归审计, 阶段 4e 已完成攻击数值审计增强, 阶段 4f 已完成普通武器刷新重算审计, 阶段 4g 已完成模板魔法武器刷新重算, 阶段 4h 已完成模板魔法武器副手冲突细化, 阶段 4i 已完成武器特性备注和特殊条目摘要, 阶段 4j 已完成独立魔法武器刷新重算, 阶段 4k 已完成重型武器规则提示, 阶段 4l 已完成副手命中公式和武器熟练刷新审计, 阶段 4m 已完成 PHB Dual Wielder 装备派生规则, 阶段 4n 已完成中甲大师护甲计算回归审计, 阶段 4o 已完成熊地精长肢攻击备注, 阶段 4p 已完成半兽人凶蛮攻击备注, 阶段 4q 已完成凶蛮打手专长攻击备注, 阶段 4r 已完成粉碎者, 穿刺者, 劈砍者攻击备注, 阶段 4s 已完成神射手专长攻击备注, 阶段 4t 已完成巨武器大师专长攻击备注, 阶段 4u 已完成强弩专家专长攻击备注, 阶段 4v 已完成长柄武器大师专长攻击备注, 阶段 4w 已完成冲锋手专长攻击备注, 阶段 4x 已完成哨兵专长攻击备注, 阶段 4y 已完成防御式决斗专长攻击备注, 阶段 4z 已完成盾牌大师专长攻击备注和盾牌装备刷新, 阶段 4aa 已完成擒抱者专长攻击备注, 阶段 4ab 已完成巫师杀手专长攻击备注, 阶段 4ac 已完成酒馆斗殴者徒手攻击, 阶段 4ad 已完成隐伏者专长攻击备注, 阶段 4ae 已完成灵活移动专长攻击备注.

任务:

1. 已补主手, 副手, 盾牌, 双手武器冲突检查。
2. 已按基础规则限制副手武器为轻型, 且 UI 会显示无法装备的原因; PHB `Dual Wielder` 会放宽为非双手的单手近战武器。
3. 已将魔法武器攻击生成合并到 `equipmentRules.ts`, 避免 UI 层手写攻击计算。
4. 已补充投掷, 弹药, 装填, 触及, 两用, 特殊武器, 重型武器的显示和备注审计。
5. 已添加装备行为审计样例, 覆盖基础互斥, 攻击条目, 熟练加值, 属性加值, 箭术, 对决, 魔法武器加值, 普通武器刷新, 模板魔法武器随属性变化刷新, 独立魔法武器随属性变化刷新, 魔法武器与副手的轻型冲突, 常见武器特性备注, 副手命中公式, 武器熟练添加/撤销后的刷新重算, PHB `Dual Wielder` 的副手限制放宽和 AC 加值撤销, 以及中甲大师的中甲敏捷上限提升。

### 阶段 5: 施法职业逐职业核对

目标: prepared-all 和 known-selection 行为符合 5e/5r。

状态: 进行中。阶段 5a 已完成分类和 prepared 标记的脚本级审计增强, 阶段 5b 已完成职业和子职额外准备法术审计, 阶段 5c 已完成专长赠法术 prepared 标记审计, 阶段 5d 已完成真实升级路径施法审计。

任务:

1. 已明确并审计主要职业在 5e/5r 下的 `preparationMode`: Cleric, Druid, Paladin, Wizard, Bard, Ranger, Sorcerer, Warlock。
2. 已对 Cleric, Druid, Paladin, XPHB Ranger 等 prepared-all 验证所有可用环阶法术自动加入法表, 但普通环阶法术不全自动 prepared。
3. 已对职业, 子职额外准备法术, 以及专长赠法术验证 `prepared = true`。未完成: 完整 UI 流程。
4. 已对 Bard, Sorcerer, Warlock, PHB Ranger 等 known-selection 验证选择法术会默认 prepared。
5. 已对 PHB/XPHB Wizard 验证法术书学习数量和 prepared-all 排除规则, 并通过真实升级路径验证 PHB Wizard 1 到 3 级 spellbook 选择数量.
6. 已补强法术行为审计脚本。未完成: 覆盖完整浏览器 UI 弹窗流程。

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
