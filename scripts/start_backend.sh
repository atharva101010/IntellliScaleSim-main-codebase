#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../backend"

if [[ ! -d ".venv" ]]; then
  echo "Error: backend/.venv not found. Create it first with: python -m venv .venv"
  exit 1
fi

source .venv/bin/activate

export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-8001}"

echo "Starting backend on ${HOST}:${PORT} (Prometheus/Grafana compatible)"
exec uvicorn app.main:app --reload --host "${HOST}" --port "${PORT}"
