#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend/dist"
VENV_DIR="$BACKEND_DIR/.venv"

PYTHON_BIN="${PYTHON_BIN:-python3.12}"
FRONTEND_PORT="${FRONTEND_PORT:-89}"
BACKEND_PORT="${BACKEND_PORT:-7997}"
BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
FRONTEND_HOST="${FRONTEND_HOST:-0.0.0.0}"

BACKEND_PID_FILE="$BACKEND_DIR/backend.pid"
FRONTEND_PID_FILE="$ROOT_DIR/frontend/frontend.pid"
BACKEND_LOG="$BACKEND_DIR/backend.log"
FRONTEND_LOG="$ROOT_DIR/frontend/frontend.log"

ACTION="${1:-start}"

load_env_file() {
  if [ -f "$ROOT_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$ROOT_DIR/.env"
    set +a
  fi
}

ensure_python() {
  if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
    echo "ERROR: $PYTHON_BIN is required. Set PYTHON_BIN=/path/to/python3.12 if needed." >&2
    exit 1
  fi

  "$PYTHON_BIN" - <<'PY'
import sys
if sys.version_info[:2] != (3, 12):
    raise SystemExit(f"ERROR: Python 3.12 is required, got {sys.version.split()[0]}")
PY
}

ensure_venv() {
  ensure_python
  if [ -d "$VENV_DIR" ] && [ ! -f "$VENV_DIR/bin/activate" ]; then
    echo "WARN: Existing backend/.venv is not a Linux virtualenv. Recreating it." >&2
    rm -rf "$VENV_DIR"
  fi
  if [ ! -d "$VENV_DIR" ]; then
    "$PYTHON_BIN" -m venv "$VENV_DIR"
  fi
  if [ ! -f "$VENV_DIR/bin/activate" ]; then
    echo "ERROR: Failed to create $VENV_DIR/bin/activate. Install Python venv support, for example: yum install -y python3.12 python3.12-venv" >&2
    exit 1
  fi
  # shellcheck disable=SC1091
  source "$VENV_DIR/bin/activate"
  python -m pip install --upgrade pip >/dev/null
  python -m pip install -r "$BACKEND_DIR/requirements.txt"
}

check_db_env() {
  : "${DB_HOST:=10.28.238.190}"
  : "${DB_PORT:=3306}"
  : "${DB_NAME:=capitalos}"
  export DB_HOST DB_PORT DB_NAME

  if [ -z "${DB_USER:-}" ] || [ -z "${DB_PASSWORD:-}" ]; then
    echo "WARN: DB_USER or DB_PASSWORD is not set. Backend starts, but DB-backed APIs will reject DB calls." >&2
  fi
}

port_warning() {
  if [ "$FRONTEND_PORT" -lt 1024 ] && [ "$(id -u)" -ne 0 ]; then
    echo "WARN: FRONTEND_PORT=$FRONTEND_PORT is privileged on Linux. Run with sudo or grant bind permission." >&2
  fi
}

stop_pid_file() {
  local pid_file="$1"
  local name="$2"
  if [ -f "$pid_file" ]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid"
      echo "Stopped $name pid=$pid"
    fi
    rm -f "$pid_file"
  fi
}

start_backend() {
  ensure_venv
  check_db_env
  if [ -f "$BACKEND_PID_FILE" ] && kill -0 "$(cat "$BACKEND_PID_FILE")" >/dev/null 2>&1; then
    echo "Backend already running pid=$(cat "$BACKEND_PID_FILE")"
    return
  fi
  (
    cd "$BACKEND_DIR"
    nohup "$VENV_DIR/bin/python" -m uvicorn app:app --host "$BACKEND_HOST" --port "$BACKEND_PORT" >"$BACKEND_LOG" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"
  )
  echo "Backend started: http://$BACKEND_HOST:$BACKEND_PORT pid=$(cat "$BACKEND_PID_FILE")"
}

start_frontend() {
  ensure_venv
  port_warning
  if [ -f "$FRONTEND_PID_FILE" ] && kill -0 "$(cat "$FRONTEND_PID_FILE")" >/dev/null 2>&1; then
    echo "Frontend already running pid=$(cat "$FRONTEND_PID_FILE")"
    return
  fi
  nohup "$VENV_DIR/bin/python" -m http.server "$FRONTEND_PORT" --bind "$FRONTEND_HOST" --directory "$FRONTEND_DIR" >"$FRONTEND_LOG" 2>&1 &
  echo $! > "$FRONTEND_PID_FILE"
  echo "Frontend started: http://$FRONTEND_HOST:$FRONTEND_PORT/#/login pid=$(cat "$FRONTEND_PID_FILE")"
}

status_one() {
  local pid_file="$1"
  local name="$2"
  if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" >/dev/null 2>&1; then
    echo "$name running pid=$(cat "$pid_file")"
  else
    echo "$name stopped"
  fi
}

# 生产化后由 systemd 托管(自动重启 + 开机自启)。若单元存在则统一走 systemctl,
# 避免 nohup 与 systemd 争抢 7997/8089 端口。旧的 nohup 逻辑仅在无 systemd 时兜底。
SYSTEMD_UNITS="investplatform-backend investplatform-frontend"
have_systemd_units() {
  systemctl --user list-unit-files investplatform-backend.service >/dev/null 2>&1 \
    && systemctl --user cat investplatform-backend.service >/dev/null 2>&1
}

if have_systemd_units; then
  case "$ACTION" in
    start)   systemctl --user start $SYSTEMD_UNITS ;;
    stop)    systemctl --user stop $SYSTEMD_UNITS ;;
    restart) systemctl --user restart $SYSTEMD_UNITS ;;
    status)  systemctl --user --no-pager status $SYSTEMD_UNITS ;;
    *) echo "Usage: $0 {start|stop|restart|status} (systemd 托管)" >&2; exit 1 ;;
  esac
  systemctl --user is-active $SYSTEMD_UNITS
  exit 0
fi

case "$ACTION" in
  start)
    load_env_file
    start_backend
    start_frontend
    ;;
  stop)
    stop_pid_file "$FRONTEND_PID_FILE" "frontend"
    stop_pid_file "$BACKEND_PID_FILE" "backend"
    ;;
  restart)
    load_env_file
    "$0" stop
    "$0" start
    ;;
  status)
    status_one "$BACKEND_PID_FILE" "backend"
    status_one "$FRONTEND_PID_FILE" "frontend"
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}" >&2
    exit 1
    ;;
esac
