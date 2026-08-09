# Claude Code — suggested first prompt

Use this when starting the next redesign session in Claude Code.

```text
Continue the Éclat Atelier Studio website redesign from this repository.

Mandatory working method:
1. Read CLAUDE.md first.
2. Use Graphify before broad repository exploration. If no graph exists, run /graphify .; if it is stale, run /graphify . --update.
3. Use the graph to understand the project structure and identify only the files needed for the task. Do not recursively read or grep the whole repository to rebuild context.
4. Read docs/DESIGN_CONTEXT.md and the reference notes/assets before making visual decisions.
5. Preserve the Éclat brand-family relationship with Éclat Wine Tour, but make Atelier a distinct, elegant, personal and timeless interior-design brand.
6. Do not invent projects, clients, references, awards, services, pricing, credentials or legal/contact information. Use explicit placeholders for missing content.
7. Build a polished responsive experience with strong editorial composition, image-led storytelling, refined typography, subtle image-to-background blending and tasteful premium motion. Avoid generic template/SaaS aesthetics.
8. Work in focused diffs, validate the implementation, and update Graphify incrementally after structural changes.

Before coding, give me a concise assessment of the current repository based primarily on Graphify: architecture/current state, what is missing, and the smallest sensible plan for the next redesign iteration. Then execute that plan.
```

For later tasks, keep the same rules and replace only the final task-specific paragraph. Do not repeat a full repository discovery if Graphify already contains the needed structure.
