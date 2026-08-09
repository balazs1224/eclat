# Current state

## Available now

The repository is being initialized from the project material that is available in the current ChatGPT workspace.

Available reference assets:

- five Éclat Atelier Studio Instagram screenshots;
- one saved HTML snapshot of the Éclat Wine Tour homepage;
- project design direction and prior feedback;
- Claude Code instructions and Graphify-first workflow.

## Not available in the current workspace

The previously generated working frontend/project bundle from earlier redesign iterations is not present as a local source tree in this session.

Therefore it must not be reconstructed by guessing. When the previous implementation is recovered, commit it as source and let Graphify index it. Until then, Claude should treat the references and design context as the approved starting point for a fresh implementation/redesign.

## Recommended next implementation step

Once Claude Code is opened on this repository:

1. install/register Graphify if needed;
2. run `/graphify .`;
3. inspect `CLAUDE.md` and `docs/DESIGN_CONTEXT.md`;
4. review the visual references;
5. create the frontend architecture and first homepage implementation;
6. after the first code structure exists, run `/graphify . --update` and use the graph for all subsequent redesign iterations.

## Source-of-truth rule

Repository files and explicitly supplied user feedback are authoritative. Missing facts remain placeholders rather than assumptions.
