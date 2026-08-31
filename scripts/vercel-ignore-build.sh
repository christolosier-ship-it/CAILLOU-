#!/bin/sh
set -eu

# Vercel treats exit 0 as "ignore this build" and exit 1 as "build it".
# First deployment after configuring the rule must build because no baseline exists yet.
if [ -z "${VERCEL_GIT_PREVIOUS_SHA:-}" ]; then
  exit 1
fi

changed_files="$(git diff --name-only "$VERCEL_GIT_PREVIOUS_SHA" HEAD)"

# Generated Supabase types are contracts only and do not change the runtime by themselves.
runtime_files="$(printf '%s\n' "$changed_files" | grep -v '^src/lib/supabase/database.types.ts$' || true)"

if printf '%s\n' "$runtime_files" | grep -Eq '^(src/|public/|index\.html$|package(-lock)?\.json$|vite\.config\.(ts|js)$|tsconfig.*\.json$|vercel\.json$|scripts/vercel-ignore-build\.sh$)'; then
  exit 1
fi

exit 0
