#!/usr/bin/env bash
set -euo pipefail

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required. Install uv first, then rerun this script." >&2
  exit 1
fi

if ! command -v graphify >/dev/null 2>&1; then
  uv tool install graphifyy
fi

graphify install --project

echo
echo "Graphify is registered for this project."
echo "Open Claude Code in the repository and run: /graphify ."
echo "For later changes use: /graphify . --update"
