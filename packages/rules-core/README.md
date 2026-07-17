# D&D rules core

This private leaf package contains deterministic, JSON-safe rule queries shared by
the EulCauDnD browser application and trusted server integrations.

Current scope:

- evaluate supported feat prerequisites and return structured failure reasons;
- filter Ability Score Improvement feat candidates through a caller-supplied
  authorization policy and source priority;
- expose structured ability choices for a selected feat.

The package deliberately does not load catalog files, access browser storage,
render React, or mutate a character. Callers must provide an already reviewed
catalog and their own authorization policy. Unknown prerequisite fields fail
closed as `unsupported`.

`utils/autoBuilderRules.ts` consumes this package as well. Server integrations
must call the same pure queries, then apply persistence, revision, audit, and
authorization checks in their own transaction boundary.
