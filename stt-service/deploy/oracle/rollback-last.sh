#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/english-with-jan-stt}"
SERVICE_NAME="${SERVICE_NAME:-stt-service}"
SERVICE_USER="${SERVICE_USER:-stt}"
SERVICE_GROUP="${SERVICE_GROUP:-stt}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8010/health}"
RELEASES_DIR="$APP_DIR/releases"
LOCK_FILE="${LOCK_FILE:-/tmp/english-with-jan-stt-deploy.lock}"
TMP_DIR=""

log() {
  printf '[stt-rollback] %s\n' "$*"
}

fail() {
  printf '[stt-rollback] ERROR: %s\n' "$*" >&2
  exit 1
}

cleanup() {
  if [ -n "${TMP_DIR:-}" ] && [ -d "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
  fi
}

health_check() {
  local attempts=20
  local body

  for _ in $(seq 1 "$attempts"); do
    if body="$(curl -fsS --max-time 3 "$HEALTH_URL" 2>/dev/null)"; then
      if BODY="$body" python3 - <<'PY'
import json
import os
import sys

try:
    data = json.loads(os.environ["BODY"])
except Exception:
    sys.exit(1)

if data.get("ok") is True and data.get("modelPathExists") is True and data.get("ffmpegAvailable") is True:
    sys.exit(0)

sys.exit(1)
PY
      then
        printf '%s\n' "$body"
        return 0
      fi
    fi
    sleep 1
  done

  return 1
}

main() {
  if [ "$(id -u)" -ne 0 ]; then
    fail "Run as root, for example: sudo $0"
  fi

  command -v rsync >/dev/null 2>&1 || fail "Missing command: rsync"
  command -v tar >/dev/null 2>&1 || fail "Missing command: tar"
  command -v curl >/dev/null 2>&1 || fail "Missing command: curl"
  command -v python3 >/dev/null 2>&1 || fail "Missing command: python3"

  exec 9>"$LOCK_FILE"
  flock -n 9 || fail "Another STT deployment is already running."

  local backup_path
  backup_path="$(find "$RELEASES_DIR" -maxdepth 1 -type f -name 'code-*.tar.gz' -printf '%T@ %p\n' | sort -rn | awk 'NR == 1 {print $2}')"
  [ -n "$backup_path" ] || fail "No backup found in $RELEASES_DIR"

  TMP_DIR="$(mktemp -d)"
  trap cleanup EXIT

  log "Restoring: $backup_path"
  mkdir -p "$TMP_DIR/rollback"
  tar -xzf "$backup_path" -C "$TMP_DIR/rollback"

  rsync -a --delete \
    --exclude='.env' \
    --exclude='.venv/' \
    --exclude='models/' \
    --exclude='releases/' \
    --exclude='.deploy/' \
    "$TMP_DIR/rollback/" "$APP_DIR/"

  chown -R "$SERVICE_USER:$SERVICE_GROUP" "$APP_DIR"
  if [ -f "$APP_DIR/.env" ]; then
    chown "$SERVICE_USER:$SERVICE_GROUP" "$APP_DIR/.env"
    chmod 600 "$APP_DIR/.env"
  fi

  systemctl restart "$SERVICE_NAME"
  health_check || fail "Rollback restored files, but health check failed. Check: journalctl -u $SERVICE_NAME -n 120 --no-pager"
  log "Rollback complete."
}

main "$@"