# EulCau D&D 5e Auto Card

[中文说明 / Chinese README](README_zh.md)

A browser-based Dungeons & Dragons character sheet and semi-automatic character builder for D&D 5e and 5r. The app focuses on turning structured rule data into an editable character sheet: create a level-1 character, level up an existing character, track derived values, and search spells, features, and magic items.

## What this branch does

The `auto-character-builder` branch adds a rule-driven character creation and level-up workflow on top of the existing character sheet UI.

Core capabilities include:

- Character sheet editing with local persistence per user.
- D&D 5e and 5r rule-system selection.
- Level-1 character building from race, subrace, background, class, subclass, skills, tools, languages, feats, and spells.
- Level-up support for existing automated characters.
- Multiclass-aware class progression.
- Ability Score Improvement or feat selection at eligible levels.
- Spell selection, prepared/known spell handling, spell replacement for known-spell casters, and Bard Magical Secrets support.
- Warlock invocations, metamagic, maneuvers, fighting styles, expertise choices, and weapon mastery choices where the source data supports them.
- Automatic updates for class features, subclass features, proficiencies, resources, hit dice, hit points, spell slots, spellcasting profiles, armor class, and attacks.
- Search panel for spells, class/subclass features, and magic items.
- Magic item purchase/add-to-inventory flow from search results.
- Chinese and English UI localization, with Chinese as the default language in this branch.

## Data source

The branch uses structured data generated from the `5etools-cn` submodule:

```bash
git submodule update --init --recursive
```

Submodule path:

```text
third_party/5etools-cn
```

Generated runtime data is stored under:

```text
public/data/auto-builder-core.json
public/data/core.json
public/data/magic-items.json
```

The generated data files are used by the browser app at runtime. Regenerate them only when the upstream rule data or extraction logic changes.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

Data extraction and validation scripts:

```bash
npm run extract:5etools
npm run extract:magic-items
npm run audit:character-data
npm run audit:spell-behavior
```

## Local development

1. Clone the repository and initialize submodules:

   ```bash
   git clone --recurse-submodules https://github.com/EulCau/EulCauDnD.git
   cd EulCauDnD
   git checkout auto-character-builder
   ```

   If the repository was cloned without submodules:

   ```bash
   git submodule update --init --recursive
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the Vite development server:

   ```bash
   npm run dev
   ```

4. Open the URL printed by Vite in your browser.

## Character automation model

The app does not simply overwrite the character sheet with opaque generated text. It applies structured adjustment operations for features, proficiencies, resources, spells, items, hit points, classes, and automation metadata. This makes the automatically added content easier to inspect, refresh, and remove.

The main automation code lives in:

```text
components/AutoCharacterBuilder.tsx
utils/autoBuilderRules.ts
utils/characterAdjustments.ts
utils/equipmentRules.ts
utils/magicItems.ts
```

The extraction and audit scripts live in:

```text
scripts/extract-5etools-character-data.mjs
scripts/extract-magic-items.mjs
scripts/audit-character-data.mjs
scripts/audit-spell-behavior.mjs
```

## Notes and limitations

- This is a front-end application. Character data is stored in browser local storage.
- Rule automation depends on the quality and completeness of the generated `public/data` files.
- Some D&D rules still require manual judgment. The app is intended as a structured assistant, not a complete rules arbiter.
- Very complex edge cases, optional rules, homebrew rules, and source-specific exceptions should be checked manually.

## Tech stack

- React
- TypeScript
- Vite
- Tailwind CSS CDN setup
- 5etools-cn data extraction scripts

## License and source-data notice

This repository contains application code and generated/derived data for local character-sheet usage. Respect the licenses and terms of any upstream data sources and dependencies used with this project.
