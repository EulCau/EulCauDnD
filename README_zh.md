# EulCau D&D 5e 自动角色卡

[English README](README.md)

这是一个基于浏览器的 Dungeons & Dragons 角色卡与半自动车卡工具，面向 D&D 5e 与 5r。项目的核心目标不是简单生成一段角色描述，而是把结构化规则数据转化为可编辑、可追踪、可继续升级的角色卡：支持创建 1 级角色、为已有角色升级、自动刷新派生数值，并提供法术、职业/子职业特性、魔法物品搜索功能。

## 这个分支的作用

`auto-character-builder` 分支在原有角色卡界面之上，加入了基于规则数据的自动车卡与升级流程。

主要能力包括：

- 角色卡编辑，并按用户保存在浏览器本地存储中。
- 支持 D&D 5e 与 5r 规则系统切换。
- 支持从种族、亚种、背景、职业、子职业、技能、工具、语言、专长、法术等选项创建 1 级角色。
- 支持对已启用自动化的角色进行升级。
- 支持兼职场景下的职业等级推进。
- 在符合条件的等级处理属性值提升或专长选择。
- 支持法术选择、准备法术/已知法术处理、已知法术职业升级时替换法术，以及吟游诗人的魔法奥秘。
- 支持魔契师祈唤、超魔、战技、战斗风格、专精选择、武器掌握等规则数据中可识别的职业/专长选项。
- 自动更新职业特性、子职业特性、熟练项、资源、生命骰、生命值、法术位、施法配置、防御等级与攻击项。
- 提供法术、职业/子职业特性、魔法物品搜索面板。
- 支持从搜索结果中“购买”魔法物品并加入角色库存。
- 支持中文和英文界面；本分支默认语言为中文。

## 数据来源

本分支使用从 `5etools-cn` 子模块中抽取出的结构化数据：

```bash
git submodule update --init --recursive
```

子模块路径为：

```text
third_party/5etools-cn
```

浏览器运行时使用的数据文件位于：

```text
public/data/auto-builder-core.json
public/data/core.json
public/data/magic-items.json
```

这些文件是运行时数据。通常只有在上游规则数据或抽取逻辑发生变化时，才需要重新生成。

## 常用脚本

```bash
npm install
npm run dev
npm run build
npm run preview
```

数据抽取与检查脚本：

```bash
npm run extract:5etools
npm run extract:magic-items
npm run audit:character-data
npm run audit:spell-behavior
```

## 本地开发

1. 克隆仓库并初始化子模块：

   ```bash
   git clone --recurse-submodules https://github.com/EulCau/EulCauDnD.git
   cd EulCauDnD
   git checkout auto-character-builder
   ```

   如果克隆时没有带上子模块，则运行：

   ```bash
   git submodule update --init --recursive
   ```

2. 安装依赖：

   ```bash
   npm install
   ```

3. 启动 Vite 开发服务器：

   ```bash
   npm run dev
   ```

4. 在浏览器中打开 Vite 输出的本地地址。

## 自动化角色构建模型

项目并不是把角色卡粗暴覆盖成一段生成结果，而是通过结构化的调整操作记录自动添加的内容。属性、熟练项、职业特性、资源、法术、物品、生命值、职业等级和自动化元数据都会以规则化操作的形式写入角色卡。

这种设计有两个好处：

- 自动添加的内容更容易检查和追踪来源。
- 后续更容易刷新派生数据，或移除某个自动化来源带来的修改。

核心自动化代码位于：

```text
components/AutoCharacterBuilder.tsx
utils/autoBuilderRules.ts
utils/characterAdjustments.ts
utils/equipmentRules.ts
utils/magicItems.ts
```

数据抽取与检查脚本位于：

```text
scripts/extract-5etools-character-data.mjs
scripts/extract-magic-items.mjs
scripts/audit-character-data.mjs
scripts/audit-spell-behavior.mjs
```

## 注意事项与限制

- 这是一个前端应用，角色数据保存在浏览器本地存储中，不依赖后端数据库。
- 自动化规则依赖 `public/data` 中生成数据的质量与完整性。
- D&D 存在大量例外规则、可选规则和表裁空间，本项目更适合作为结构化辅助工具，而不是完整规则裁判。
- 复杂边界情况、扩展源例外、房规和自定义内容仍建议人工核对。

## 技术栈

- React
- TypeScript
- Vite
- Tailwind CSS CDN 配置
- 5etools-cn 数据抽取脚本

## 许可与数据来源说明

本仓库包含应用代码，以及为本地角色卡使用而生成/派生的数据。使用本项目时，请遵守相关上游数据源和依赖项的许可与使用条款。
