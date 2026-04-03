#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT_DIR/.env.vps}"
COMPOSE_FILE="$ROOT_DIR/docker-compose.vps.yml"

required_commands=(docker)
for cmd in "${required_commands[@]}"; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: Required command '$cmd' is not installed." >&2
    exit 1
  fi
done

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "ERROR: Missing compose file: $COMPOSE_FILE" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: Missing env file: $ENV_FILE" >&2
  echo "Create it first, for example:" >&2
  echo "  cp .env.vps.example .env.vps" >&2
  exit 1
fi

required_vars=(
  DOMAIN
  ACME_EMAIL
  POSTGRES_USER
  POSTGRES_PASSWORD
  POSTGRES_DB
  JWT_SECRET
  GRAFANA_ADMIN_USER
  GRAFANA_ADMIN_PASSWORD
)

missing=()
for var in "${required_vars[@]}"; do
  if ! grep -Eq "^${var}=.+" "$ENV_FILE"; then
    missing+=("$var")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "ERROR: Missing required env vars in $ENV_FILE:" >&2
  printf ' - %s\n' "${missing[@]}" >&2
  exit 1
fi

domain="$(grep -E '^DOMAIN=' "$ENV_FILE" | tail -n1 | cut -d= -f2-)"
if [[ -z "$domain" || "$domain" == "your-domain.com" ]]; then
  echo "ERROR: Set DOMAIN to your real public DNS name in $ENV_FILE" >&2
  exit 1
fi

compose=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

echo "[1/5] Pulling images"
"${compose[@]}" pull

echo "[2/5] Building application images"
"${compose[@]}" build --pull backend frontend

echo "[3/5] Starting services"
"${compose[@]}" up -d --remove-orphans

echo "[4/5] Waiting for backend health"
healthy=0
for attempt in $(seq 1 30); do
  if "${compose[@]}" exec -T backend curl -fsS http://127.0.0.1:8001/healthz >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 2
done

if [[ "$healthy" -ne 1 ]]; then
  echo "ERROR: Backend did not become healthy in time." >&2
  "${compose[@]}" logs --tail=100 backend caddy >&2 || true
  exit 1
fi

echo "[5/5] Deployment status"
"${compose[@]}" ps

echo

echo "Deployment completed successfully."
echo "App URL: https://${domain}"
echo "API docs: https://${domain}/docs"
echo "Grafana: https://${domain}/grafana"
