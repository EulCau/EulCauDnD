# EulCau D&D 5e 自动角色卡

[English README](README.md)

这是一个运行在浏览器中的 Dungeons & Dragons 角色卡工具，带有面向 D&D 5e 和 5r 的半自动车卡功能。它可以创建 1 级角色、处理升级、刷新派生数值，并提供法术、职业特性、子职业特性和魔法物品搜索。

## 关于这个分支

`auto-character-builder` 分支在原有角色卡界面上加入了基于规则数据的车卡流程。

主要功能：

- 编辑角色卡，并按用户保存在浏览器本地存储中。
- 切换 D&D 5e 与 5r 规则系统。
- 根据种族、亚种、背景、职业、子职业、技能、工具、语言、专长和法术创建 1 级角色。
- 为已启用自动化的角色执行升级流程。
- 处理兼职场景下的职业等级推进。
- 在符合条件的等级选择属性值提升或专长。
- 处理法术选择、准备法术/已知法术、已知法术职业的升级换法术，以及吟游诗人的魔法奥秘。
- 支持规则数据中可识别的魔契师祈唤、超魔、战技、战斗风格、专精选择和武器掌握。
- 自动更新职业特性、子职业特性、熟练项、资源、生命骰、生命值、法术位、施法配置、防御等级和攻击项。
- 搜索法术、职业/子职业特性和魔法物品。
- 从搜索结果中把魔法物品加入角色库存。
- 浮动 d20 投掷器以面板右下角为展开和收起锚点, 命令结果按从旧到新的顺序向下显示, 新结果溢出时结果区自动滚动到底部.
- 支持中文和英文界面。本分支默认显示中文。

## 数据来源

规则数据由 `5etools-cn` 子模块生成：

```bash
git submodule update --init --recursive
```

子模块路径：

```text
third_party/5etools-cn
```

运行时数据文件：

```text
public/data/auto-builder-core.json
public/data/core.json
public/data/magic-items.json
```

浏览器应用会直接读取这些文件。更新子模块或修改抽取脚本后，需要重新生成数据。

## 常用脚本

```bash
npm install
npm run dev
npm run build
npm run preview
```

数据抽取与检查：

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

   如果克隆时没有拉取子模块：

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

## 自动化模型

车卡器会把规则结果写成结构化调整项，覆盖职业特性、熟练项、资源、法术、物品、生命值、职业等级和自动化元数据等内容。这样可以在角色卡中保留来源信息，也方便之后刷新或移除相关内容。

主要自动化文件：

```text
components/AutoCharacterBuilder.tsx
utils/autoBuilderRules.ts
utils/characterAdjustments.ts
utils/equipmentRules.ts
utils/magicItems.ts
```

数据抽取与检查脚本：

```text
scripts/extract-5etools-character-data.mjs
scripts/extract-magic-items.mjs
scripts/audit-character-data.mjs
scripts/audit-spell-behavior.mjs
```

## 注意事项

- 这是前端应用，角色数据保存在浏览器本地存储中。
- 自动化结果依赖 `public/data` 下生成数据的质量。
- 可选规则、房规和不同来源之间的例外仍需要人工核对。
- 复杂角色构筑建议对照原规则文本检查一遍。

## 技术栈

- React
- TypeScript
- Vite
- Tailwind CSS CDN 配置
- 5etools-cn 数据抽取脚本

## 许可与数据来源

本仓库包含应用代码，以及用于角色卡功能的生成/派生数据。使用项目时请留意上游数据源和依赖项的许可与使用条款。
