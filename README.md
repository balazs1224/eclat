# Éclat Atelier Studio — redesign workspace

This repository is the working source of truth for the Éclat Atelier Studio website redesign.

## Project goal

Create an elegant, personal and timeless interior-design brand experience for **Éclat Atelier Studio**. The site should have a clear visual family relationship with **Éclat Wine Tour**, while remaining its own brand rather than a copy.

## Current repository state

The initial repository contains the reference material currently available for the redesign:

- screenshots from the Éclat Atelier Studio Instagram presence;
- a saved HTML snapshot of the existing Éclat Wine Tour site used only as a brand-family reference;
- design and content constraints;
- Claude Code operating instructions with a mandatory Graphify-first workflow.

The previous generated frontend implementation is not present in the current workspace, so it is intentionally **not reconstructed from memory**. Continue from the references and from new source files committed to this repository.

## Claude Code

Read `CLAUDE.md` before any implementation work.

The central rule is: **Graphify first, targeted file reads second.** Do not repeatedly scan or read the whole repository to rebuild context.

Recommended one-time setup on the development machine:

```bash
uv tool install graphifyy
graphify install --project
```

Then in Claude Code:

```text
/graphify .
```

For subsequent iterations use the incremental graph update rather than rebuilding context manually:

```text
/graphify . --update
```

See `docs/GRAPHIFY_WORKFLOW.md` for the required workflow.

## Reference material

- `references/eclat-wine-tour/` — existing Wine Tour brand/site reference.
- `references/atelier-instagram/` — Atelier visual/content reference screenshots.
- `docs/DESIGN_CONTEXT.md` — design direction, constraints and non-negotiables.
- `docs/CURRENT_STATE.md` — what is and is not currently available.

## Content safety

Do not invent projects, customers, references, awards, services, prices, legal statements, credentials, addresses or contact details. When required information is missing, use an explicit placeholder such as `[PLACEHOLDER: final contact email]`.
