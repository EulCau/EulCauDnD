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
- evaluate supported feat prerequisites and return structured failure reasons;
- filter Ability Score Improvement feat candidates through a caller-supplied
  authorization policy and source priority;
- expose structured ability choices for a selected feat.
- validate basic feat advancement, including eligibility, unresolved structured
  choices, selected ability, and the ability score cap.

The complete inventory, target API, ownership boundary, and staged extraction
plan are documented in
[`docs/rules-core-extraction-plan.md`](../../docs/rules-core-extraction-plan.md).
The current package scope is intentionally only the first migrated rule slice;
it is not yet the complete auto-builder engine.

The package deliberately does not load catalog files, access browser storage,
render React, or mutate a character. Callers must provide an already reviewed
catalog and their own authorization policy. Unknown prerequisite fields fail
closed as `unsupported`.

`utils/autoBuilderRules.ts` consumes this package as well. Server integrations
must call the same pure queries, then apply persistence, revision, audit, and
authorization checks in their own transaction boundary.
