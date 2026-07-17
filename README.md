# EulCau D&D 5e Auto Card

[中文说明 / Chinese README](README_zh.md)

A browser-based Dungeons & Dragons character sheet with a semi-automatic builder for D&D 5e and 5r. It can create a level-1 character, apply level-up changes, refresh derived values, and search spells, class features, subclass features, and magic items.

## About this branch

The `auto-character-builder` branch adds a rule-data-driven build flow to the character sheet.

Main features:

- Editable character sheet with per-user local storage.
- D&D 5e and 5r rule-system selection.
- Level-1 character creation from race, subrace, background, class, subclass, skills, tools, languages, feats, and spells.
- Level-up flow for characters created or managed by the automation system.
- Multiclass-aware class progression.
- Ability Score Improvement and feat selection at eligible levels.
- Spell selection, prepared/known spell handling, spell replacement for known-spell casters, and Bard Magical Secrets.
- Warlock invocations, metamagic, maneuvers, fighting styles, expertise choices, and weapon mastery choices where available in the source data.
- Automatic updates for class features, subclass features, proficiencies, resources, hit dice, hit points, spell slots, spellcasting profiles, armor class, and attacks.
- Search panel for spells, class/subclass features, and magic items.
- Add-to-inventory flow for magic items from search results.
- Floating d20 roller anchored to the panel's bottom-right corner, with command results displayed from oldest to newest.
- Chinese and English UI localization. Chinese is the default language on this branch.

## Data source

Rule data is generated from the `5etools-cn` submodule:

```bash
git submodule update --init --recursive
```

Submodule path:

```text
third_party/5etools-cn
```

Generated runtime data:

```text
public/data/auto-builder-core.json
public/data/core.json
public/data/magic-items.json
```

These files are loaded by the browser app. Regenerate them after updating the submodule or changing the extraction scripts.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

Data extraction and checks:

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

4. Open the local URL printed by Vite.

## Automation model

The builder writes structured adjustments to the character sheet. These adjustments cover features, proficiencies, resources, spells, items, hit points, classes, and automation metadata. Keeping these changes as structured records makes generated content easier to inspect, refresh, and remove later.

Main automation files:

```text
components/AutoCharacterBuilder.tsx
utils/autoBuilderRules.ts
utils/characterAdjustments.ts
utils/equipmentRules.ts
utils/magicItems.ts
```

Extraction and audit scripts:

```text
scripts/extract-5etools-character-data.mjs
scripts/extract-magic-items.mjs
scripts/audit-character-data.mjs
scripts/audit-spell-behavior.mjs
```

## Notes

- This is a front-end app. Character data is stored in browser local storage.
- Rule automation depends on the generated files under `public/data`.
- Some D&D rules still need manual review, especially optional rules, homebrew content, and source-specific exceptions.
- Complex character options should be checked against the original rule text.

## Tech stack

- React
- TypeScript
- Vite
- Tailwind CSS CDN setup
- 5etools-cn data extraction scripts

## License and source data

This repository contains application code and generated or derived data for character-sheet use. Check the licenses and terms of the upstream data sources and dependencies used with this project.
