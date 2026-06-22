#!/usr/bin/env bash
set -Eeuo pipefail

REPO_URL="${REPO_URL:-https://github.com/phamkimkhuong/english-with-jan.git}"
BRANCH="${BRANCH:-main}"
SRC_DIR="${SRC_DIR:-/opt/english-with-jan-src}"
APP_DIR="${APP_DIR:-/opt/english-with-jan-stt}"
SERVICE_NAME="${SERVICE_NAME:-stt-service}"
SERVICE_USER="${SERVICE_USER:-stt}"
SERVICE_GROUP="${SERVICE_GROUP:-stt}"
DEPLOY_USER="${DEPLOY_USER:-${SUDO_USER:-ubuntu}}"
KEEP_BACKUPS="${KEEP_BACKUPS:-5}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8010/health}"
LOCK_FILE="${LOCK_FILE:-/tmp/english-with-jan-stt-deploy.lock}"
DEPLOY_ID="$(date -u +%Y%m%d%H%M%S)"
RELEASES_DIR="$APP_DIR/releases"
DEPLOY_STATE_DIR="$APP_DIR/.deploy"
BACKUP_PATH="$RELEASES_DIR/code-$DEPLOY_ID.tar.gz"
TMP_DIR=""
PREVIOUS_REQ_HASH=""

log() {
  printf '[stt-git-deploy] %s\n' "$*"
}

fail() {
  printf '[stt-git-deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    fail "Run as root, for example: sudo $0"
  fi
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"
}

run_git_as_deploy_user() {
  sudo -u "$DEPLOY_USER" git "$@"
}

cleanup() {
  if [ -n "${TMP_DIR:-}" ] && [ -d "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
  fi
}

prepare_source_checkout() {
  mkdir -p "$(dirname "$SRC_DIR")"

  if [ ! -d "$SRC_DIR/.git" ]; then
    log "Cloning $REPO_URL#$BRANCH into $SRC_DIR as $DEPLOY_USER"
    rm -rf "$SRC_DIR"
    mkdir -p "$SRC_DIR"
    chown "$DEPLOY_USER:$DEPLOY_USER" "$SRC_DIR"
    run_git_as_deploy_user clone --branch "$BRANCH" --single-branch "$REPO_URL" "$SRC_DIR"
  else
    log "Updating existing checkout: $SRC_DIR"
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$SRC_DIR"
    run_git_as_deploy_user -C "$SRC_DIR" fetch origin "$BRANCH"
    run_git_as_deploy_user -C "$SRC_DIR" reset --hard "origin/$BRANCH"
    run_git_as_deploy_user -C "$SRC_DIR" clean -fd
  fi

  [ -f "$SRC_DIR/stt-service/requirements.txt" ] || fail "Checkout is missing stt-service/requirements.txt"
  [ -f "$SRC_DIR/stt-service/app/main.py" ] || fail "Checkout is missing stt-service/app/main.py"
}

remember_previous_requirements_hash() {
  if [ -f "$DEPLOY_STATE_DIR/requirements.sha256" ]; then
    PREVIOUS_REQ_HASH="$(cat "$DEPLOY_STATE_DIR/requirements.sha256" || true)"
  fi
}

current_requirements_hash() {
  sha256sum "$APP_DIR/requirements.txt" | awk '{print $1}'
}

backup_current_code() {
  mkdir -p "$RELEASES_DIR" "$DEPLOY_STATE_DIR"

  if [ ! -f "$APP_DIR/requirements.txt" ] && [ ! -d "$APP_DIR/app" ]; then
    log "No existing code found, skipping backup."
    return
  fi

  log "Creating backup: $BACKUP_PATH"
  tar \
    --exclude='./.env' \
    --exclude='./.venv' \
    --exclude='./models' \
    --exclude='./releases' \
    --exclude='./.deploy' \
    -czf "$BACKUP_PATH" \
    -C "$APP_DIR" .
}

sync_release() {
  local release_dir="$1"

  log "Syncing $release_dir into $APP_DIR"
  rsync -a --delete \
    --exclude='.env' \
    --exclude='.venv/' \
    --exclude='models/' \
    --exclude='releases/' \
    --exclude='.deploy/' \
    "$release_dir/" "$APP_DIR/"

  chown -R "$SERVICE_USER:$SERVICE_GROUP" "$APP_DIR"

  if [ -f "$APP_DIR/.env" ]; then
    chown "$SERVICE_USER:$SERVICE_GROUP" "$APP_DIR/.env"
    chmod 600 "$APP_DIR/.env"
  fi
}

ensure_venv_and_dependencies() {
  local next_hash
  next_hash="$(current_requirements_hash)"

  if [ ! -x "$APP_DIR/.venv/bin/python" ]; then
    log "Creating Python venv."
    sudo -u "$SERVICE_USER" python3 -m venv "$APP_DIR/.venv"
  fi

  if [ ! -f "$DEPLOY_STATE_DIR/requirements.sha256" ] || [ "$(cat "$DEPLOY_STATE_DIR/requirements.sha256")" != "$next_hash" ]; then
    log "Installing Python dependencies because requirements changed."
    sudo -u "$SERVICE_USER" "$APP_DIR/.venv/bin/python" -m pip install --upgrade pip
    sudo -u "$SERVICE_USER" "$APP_DIR/.venv/bin/python" -m pip install -r "$APP_DIR/requirements.txt"
    printf '%s\n' "$next_hash" > "$DEPLOY_STATE_DIR/requirements.sha256"
    chown "$SERVICE_USER:$SERVICE_GROUP" "$DEPLOY_STATE_DIR/requirements.sha256"
  else
    log "requirements.txt unchanged; skipping pip install."
  fi

  log "Ensuring Whisper model is cached..."
  sudo -u "$SERVICE_USER" "$APP_DIR/.venv/bin/python" -c "from faster_whisper import WhisperModel; WhisperModel('base.en', device='cpu', compute_type='int8', download_root='$APP_DIR/models')"
}

install_systemd_unit() {
  if ! cmp -s "$APP_DIR/deploy/oracle/stt-service.service" "/etc/systemd/system/$SERVICE_NAME.service"; then
    log "Updating systemd unit."
    cp "$APP_DIR/deploy/oracle/stt-service.service" "/etc/systemd/system/$SERVICE_NAME.service"
    systemctl daemon-reload
  fi
}

install_convenience_commands() {
  if [ -f "$APP_DIR/deploy/oracle/update-from-git.sh" ]; then
    chmod +x "$APP_DIR/deploy/oracle/update-from-git.sh"
    ln -sfn "$APP_DIR/deploy/oracle/update-from-git.sh" /usr/local/bin/update-english-with-jan-stt-git
  fi

  if [ -f "$APP_DIR/deploy/oracle/update-from-zip.sh" ]; then
    chmod +x "$APP_DIR/deploy/oracle/update-from-zip.sh"
    ln -sfn "$APP_DIR/deploy/oracle/update-from-zip.sh" /usr/local/bin/update-english-with-jan-stt
  fi

  if [ -f "$APP_DIR/deploy/oracle/rollback-last.sh" ]; then
    chmod +x "$APP_DIR/deploy/oracle/rollback-last.sh"
    ln -sfn "$APP_DIR/deploy/oracle/rollback-last.sh" /usr/local/bin/rollback-english-with-jan-stt
  fi
}

health_check() {
  local attempts=20
  local delay=1
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

    sleep "$delay"
  done

  return 1
}

restart_and_check() {
  log "Restarting $SERVICE_NAME."
  systemctl restart "$SERVICE_NAME"

  log "Waiting for health check: $HEALTH_URL"
  health_check
}

restore_backup() {
  if [ ! -f "$BACKUP_PATH" ]; then
    log "No backup available for automatic rollback."
    return 1
  fi

  log "Rolling back from $BACKUP_PATH"
  local rollback_dir="$TMP_DIR/rollback"
  mkdir -p "$rollback_dir"
  tar -xzf "$BACKUP_PATH" -C "$rollback_dir"
  sync_release "$rollback_dir"

  if [ -n "$PREVIOUS_REQ_HASH" ]; then
    printf '%s\n' "$PREVIOUS_REQ_HASH" > "$DEPLOY_STATE_DIR/requirements.sha256"
    chown "$SERVICE_USER:$SERVICE_GROUP" "$DEPLOY_STATE_DIR/requirements.sha256"
  else
    rm -f "$DEPLOY_STATE_DIR/requirements.sha256"
  fi

  systemctl restart "$SERVICE_NAME" || true
  health_check || true
}

prune_old_backups() {
  if [ ! -d "$RELEASES_DIR" ]; then
    return
  fi

  find "$RELEASES_DIR" -maxdepth 1 -type f -name 'code-*.tar.gz' -printf '%T@ %p\n' \
    | sort -rn \
    | awk -v keep="$KEEP_BACKUPS" 'NR > keep {print $2}' \
    | xargs -r rm -f
}

main() {
  require_root
  require_command git
  require_command rsync
  require_command tar
  require_command sha256sum
  require_command awk
  require_command curl
  require_command python3
  require_command systemctl
  require_command sudo
  require_command flock
  require_command cmp

  exec 9>"$LOCK_FILE"
  flock -n 9 || fail "Another STT deployment is already running."

  TMP_DIR="$(mktemp -d)"
  trap cleanup EXIT

  log "Deploy id: $DEPLOY_ID"
  prepare_source_checkout
  remember_previous_requirements_hash
  backup_current_code
  sync_release "$SRC_DIR/stt-service"
  ensure_venv_and_dependencies
  install_systemd_unit
  install_convenience_commands

  if restart_and_check; then
    prune_old_backups
    log "Deploy complete."
    exit 0
  fi

  log "Health check failed after deploy."
  restore_backup || true
  fail "Deploy failed. Previous code was restored if a backup was available. Check: journalctl -u $SERVICE_NAME -n 120 --no-pager"
}

main "$@"