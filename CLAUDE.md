# Claude Code instructions — Éclat Atelier Studio

These instructions are mandatory for work in this repository.

## 1. Primary objective

Continue the visual and frontend redesign of **Éclat Atelier Studio** as an elegant, personal and timeless interior-design brand.

The experience should feel related to **Éclat Wine Tour** through restraint, editorial composition, typography, warmth and premium detail, but it must not be a clone of the Wine Tour site.

Before changing UI, read `docs/DESIGN_CONTEXT.md` and use the files under `references/` as evidence. Do not invent brand facts that are not present in the repository or explicitly supplied by the user.

## 2. GRAPHIFY-FIRST IS MANDATORY

Graphify is the default repository-understanding mechanism. Use it before broad file exploration.

### At the beginning of a new session

1. Check whether `graphify-out/graph.json` exists and is current enough for the task.
2. If there is no graph, run `/graphify .`.
3. If the repository changed since the graph was generated, run `/graphify . --update`.
4. Query/traverse the graph to identify the relevant components, files, imports, routes, styles and dependencies.
5. Only then read the small set of source files required for the task.

### During implementation

Use Graphify to answer structural questions such as:

- Which component owns this section?
- Where is this component rendered?
- Which styles/tokens affect this element?
- What imports or callers will be impacted by a change?
- Which components reuse this primitive?
- What is the shortest dependency path between two modules?

Prefer graph traversal and targeted reads over repository-wide grep/glob/read operations.

### After architecture-affecting changes

Run `/graphify . --update` so the graph remains useful for the next task/session.

## 3. Token-efficiency rules

The goal is to preserve implementation quality while avoiding repeated codebase ingestion.

DO:

- query Graphify before opening files;
- read only files/slices identified as relevant;
- inspect diffs rather than rereading unchanged files;
- reuse existing components and design tokens when possible;
- keep plans short and implementation-oriented;
- perform targeted tests/builds after changes;
- update Graphify incrementally.

DO NOT:

- recursively read the entire repository at the start of each task;
- `cat` large files merely to regain context;
- run broad `grep -R`, `find` or large `Glob` searches before consulting Graphify;
- reopen unchanged files repeatedly in the same task;
- rewrite large working areas when a localized change is sufficient;
- infer architecture from filenames when Graphify can provide actual relationships.

If Graphify cannot answer a question, state the gap briefly, then perform the smallest targeted search/read needed to resolve it.

## 4. Design quality bar

The site should feel custom-designed, editorial and premium rather than template-driven.

Priorities:

- strong art direction and image composition;
- refined typography and generous negative space;
- warm off-white / ivory foundations with restrained dark neutrals and muted gold accents where appropriate;
- subtle layered image-to-background transitions where they improve continuity;
- deliberate asymmetry and editorial rhythm instead of repetitive card grids;
- tasteful motion: reveal, parallax/slow drift, hover treatment and transitions that support hierarchy rather than distract;
- excellent mobile composition, not merely stacked desktop blocks;
- accessible navigation, keyboard use, focus states and reasonable contrast;
- optimized images and no unnecessary layout shift.

Avoid generic SaaS aesthetics, excessive rounded cards, loud gradients, neon effects, over-animation, stock-luxury clichés and decorative elements that compete with the interiors.

## 5. Brand and content constraints

Never invent any of the following:

- projects or completed references;
- customer names;
- awards;
- certifications or professional credentials;
- services that have not been supplied;
- prices;
- legal/company information;
- addresses, phone numbers or email addresses;
- testimonials or performance claims.

When information is missing, use an explicit placeholder, for example:

`[PLACEHOLDER: approved project description]`

Do not quietly turn a placeholder into a factual claim.

A Charles Eames quotation was previously requested as a possible editorial element. Treat wording/attribution as content that must be verified/approved before publication; do not silently rewrite or extend it as a factual quotation.

## 6. Working with the Wine Tour reference

`references/eclat-wine-tour/` is a brand-family reference, not a codebase to copy.

Extract transferable principles such as:

- visual warmth;
- premium editorial pacing;
- personal storytelling;
- restrained, elegant detailing;
- photography-led composition.

Do not reproduce WordPress/Divi implementation patterns unless specifically required.

## 7. Implementation principles

When a frontend implementation exists in the repository:

- preserve semantic HTML;
- keep components cohesive and reasonably small;
- centralize recurring colors, spacing, typography and motion as design tokens;
- prefer CSS for visual effects when JavaScript is unnecessary;
- preserve reduced-motion behaviour;
- keep assets local and paths stable;
- do not introduce a dependency for a trivial effect;
- avoid broad refactors during a focused visual task unless the current structure blocks a robust solution.

## 8. Standard task workflow

For each redesign task:

1. Restate the visual/functional target in 1–3 short bullets internally.
2. Use Graphify to locate the owning components/styles and downstream impact.
3. Read only the identified files.
4. Implement the smallest coherent change that achieves the design target.
5. Run the relevant build/lint/test or a targeted browser check.
6. Fix regressions.
7. Run `/graphify . --update` if structure/dependencies changed materially.
8. Summarize changed files, visual result and any remaining placeholders/risks.

## 9. If Graphify is not installed

Do not pretend it ran. Report that Graphify is unavailable and provide the exact setup command:

```bash
uv tool install graphifyy
graphify install --project
```

Then build the initial graph inside Claude Code with:

```text
/graphify .
```

Graphify remains the preferred workflow once available.
