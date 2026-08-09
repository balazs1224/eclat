# Graphify-first workflow

Use Graphify as the primary repository-navigation layer for Claude Code.

## Setup

```bash
uv tool install graphifyy
graphify install --project
```

Inside Claude Code, build the graph:

```text
/graphify .
```

For later iterations, update changed files incrementally:

```text
/graphify . --update
```

Use deeper analysis only when needed:

```text
/graphify . --mode deep
```

## Required workflow

Before broad repository searches or reads:

1. Ensure the Graphify graph exists.
2. Update it if the repository changed materially.
3. Query the graph for the feature, component or concept in question.
4. Identify the relevant files, imports, callers and dependencies.
5. Open only the files required for the task.
6. Implement and validate the change.
7. Update Graphify incrementally if structure or dependencies changed.

## Token-saving hierarchy

Prefer this order:

1. Graphify query/traversal.
2. Small targeted file read.
3. Targeted symbol or text search if the graph cannot answer.
4. Broad search only as a last resort.

Avoid recursively reading the repository, broad grep/find operations at the start of a task, and repeated rereading of unchanged files.

The repository source remains the source of truth. Graphify is used to find the right source efficiently; verify the target file before editing it.
