# D&D rules core

This private leaf package contains deterministic, JSON-safe rule queries shared by
the EulCauDnD browser application and trusted server integrations.

Current scope:

- define and parse the JSON-safe auto-builder catalog;
- define canonical character, choice, effect, and issue DTOs;
- derive stable rule entity identities without time or random values;
- enforce caller-owned source and entity authorization policies;
- deduplicate authorized catalog entries by source priority;
- select base class, subclass, race, subrace, and background options;
- parse common ability, proficiency, expertise, resistance, and weapon choices;
- compose race, subrace, and background choices, including size and
  source-specific origin features;
- validate choice counts, uniqueness, option membership, and stale groups;
- project origin abilities, proficiencies, movement, size, senses, resistances,
  immunities, and vulnerabilities into structured effects;
- project source-specific origin resources and proficiency/level refreshes;
- parse and validate origin spell branches, abilities, level gates, filters, and
  selections, then project them into spell profile effects;
- project class spellcasting profiles, strict replacements, automatic spells,
  Magical Secrets, class/pact slots, and shared multiclass slots;
- validate and project level-one and level-up class state, subclass thresholds,
  ability increases, expertise, hit points, class features, and optional
  spellcasting choices;
- generate deterministic semantic class instance identifiers;
- apply structured effects to a cloned canonical character snapshot;
- evaluate supported feat prerequisites and return structured failure reasons;
- filter Ability Score Improvement feat candidates through a caller-supplied
  authorization policy and source priority;
- expose structured ability choices for a selected feat.
- validate basic feat advancement, including eligibility, unresolved structured
  choices, selected ability, and the ability score cap.

The complete inventory, target API, ownership boundary, and staged extraction
plan are documented in
[`docs/rules-core-extraction-plan.md`](../../docs/rules-core-extraction-plan.md).
Equipment and attack-derived combat rules remain in the browser adapter until
the deferred R9 migration. They are not required by the authoritative
level-one and level-up projection boundary.

The package deliberately does not load catalog files, access browser storage,
render React, or mutate a character. Callers must provide an already reviewed
catalog and their own authorization policy. Unknown prerequisite fields fail
closed as `unsupported`.

`utils/autoBuilderRules.ts` consumes this package as well. Server integrations
must call the same pure queries, then apply persistence, revision, audit, and
authorization checks in their own transaction boundary.
