#!/usr/bin/env bash
# Local staging environment for church (admin-ui + backend + postgres) on Colima.
# Fully local. Never touches production infrastructure or credentials.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.staging"
COMPOSE="docker compose -f docker-compose.staging.yaml --env-file $ENV_FILE"

usage() {
  cat <<EOF
Usage: scripts/staging.sh <command>

Commands:
  up        Build and start the staging stack (postgres, backend, admin-ui)
  down      Stop the staging stack (keeps the postgres volume)
  reset     Stop the staging stack and delete its postgres volume (destructive, asks to confirm)
  seed      Run database migrations then load backend/database/seed.sql
  logs      Tail logs for all staging services
  status    Show staging container status
EOF
}

require_colima() {
  if ! colima status >/dev/null 2>&1; then
    echo "Colima is not running. Start it with: colima start" >&2
    exit 1
  fi
}

require_env_file() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "$ENV_FILE not found. Copy .env.staging.example to $ENV_FILE first." >&2
    exit 1
  fi
}

cmd_up() {
  require_colima
  require_env_file
  $COMPOSE up -d --build
  echo "Staging stack starting."
  echo "  admin-ui: http://localhost:$(grep -E '^ADMIN_PORT=' "$ENV_FILE" | cut -d= -f2 || echo 3010)"
  echo "  backend:  http://localhost:$(grep -E '^API_PORT=' "$ENV_FILE" | cut -d= -f2 || echo 3011)/api"
  echo "Run 'scripts/staging.sh seed' once the backend is healthy to load synthetic seed data."
}

cmd_down() {
  require_env_file
  $COMPOSE down
}

cmd_reset() {
  require_env_file
  read -r -p "This deletes the staging postgres volume and all its data. Continue? [y/N] " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Aborted."
    exit 1
  fi
  $COMPOSE down -v
}

cmd_seed() {
  require_env_file
  $COMPOSE exec -T backend npm run migration:run:prod
  $COMPOSE exec -T postgres psql -U "$(grep -E '^DB_USERNAME=' "$ENV_FILE" | cut -d= -f2)" -d "$(grep -E '^DB_NAME=' "$ENV_FILE" | cut -d= -f2)" < backend/database/seed.sql
  echo "Staging database seeded with synthetic data."
}

cmd_logs() {
  require_env_file
  $COMPOSE logs -f
}

cmd_status() {
  require_env_file
  $COMPOSE ps
}

case "${1:-}" in
  up) cmd_up ;;
  down) cmd_down ;;
  reset) cmd_reset ;;
  seed) cmd_seed ;;
  logs) cmd_logs ;;
  status) cmd_status ;;
  *) usage; exit 1 ;;
esac
