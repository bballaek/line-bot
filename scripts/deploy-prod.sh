#!/usr/bin/env bash
set -euo pipefail

# Deploy homework-bot to Vercel production (project: song-yang)
# Usage:
#   1) npx vercel login
#   2) ./scripts/deploy-prod.sh
# Or with token:
#   VERCEL_TOKEN=xxx ./scripts/deploy-prod.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export VERCEL_ORG_ID="${VERCEL_ORG_ID:-team_sIqW9hTYZJtDzl28vXdA60G8f}"
export VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-prj_IQSFko8D6JyEIQy8nCcuAXZCkAYA}"

TOKEN_ARG=()
if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  TOKEN_ARG=(--token "$VERCEL_TOKEN")
fi

echo "Deploying to Vercel production (song-yang)..."
npx vercel deploy --prod --yes "${TOKEN_ARG[@]}"
echo "Done. Check: https://song-yang.vercel.app/schedule/timetable"
