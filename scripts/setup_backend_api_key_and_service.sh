#!/usr/bin/env bash
set -euo pipefail

# One-key setup: set API key for backend and (optionally) create/start a systemd gunicorn service on :3001

SERVICE_NAME="jbig-backend"
BACKEND_DIR="/home/ubuntu/volume/jbig_backend"
VENV_DIR="$BACKEND_DIR/.venv"
BIND_ADDR="127.0.0.1:3001"

usage() {
  cat <<EOF
Usage: sudo bash $0 -k <API_KEY> [--no-service]

Options:
  -k, --key           Vendor API key value (required)
      --no-service    Only set key; do not install/start systemd service

This script:
  1) Stores the API key in the backend service env (VENDOR_API_KEY)
  2) Creates a Python venv and installs requirements + gunicorn (if service enabled)
  3) Creates/updates a systemd service '$SERVICE_NAME' binding to $BIND_ADDR (if service enabled)
  4) Reloads and restarts the service
EOF
}

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Please run as root (use sudo)." >&2
  exit 1
fi

API_KEY=""
NO_SERVICE="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -k|--key)
      API_KEY="$2"; shift 2;;
    --no-service)
      NO_SERVICE="true"; shift;;
    -h|--help)
      usage; exit 0;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1;;
  esac
done

if [[ -z "$API_KEY" ]]; then
  echo "-k/--key is required" >&2
  usage; exit 1
fi

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "Backend directory not found: $BACKEND_DIR" >&2
  exit 1
fi

echo "[1/4] Writing systemd drop-in env for $SERVICE_NAME ..."
mkdir -p "/etc/systemd/system/${SERVICE_NAME}.service.d"
cat > "/etc/systemd/system/${SERVICE_NAME}.service.d/override.conf" <<EOF
[Service]
Environment=VENDOR_API_KEY=${API_KEY}
Environment=DJANGO_SETTINGS_MODULE=jbig_backend.settings
EOF

if [[ "$NO_SERVICE" == "true" ]]; then
  systemctl daemon-reload || true
  echo "Done: API key stored for service $SERVICE_NAME."
  exit 0
fi

echo "[2/4] Ensuring Python venv and dependencies ..."
if [[ ! -d "$VENV_DIR" ]]; then
  python3 -m venv "$VENV_DIR"
fi
"$VENV_DIR/bin/pip" install --upgrade pip >/dev/null
"$VENV_DIR/bin/pip" install -r "$BACKEND_DIR/requirements.txt" >/dev/null
"$VENV_DIR/bin/pip" install gunicorn >/dev/null

echo "[3/4] Installing systemd service $SERVICE_NAME ..."
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<'EOF'
[Unit]
Description=JBIG Django Backend (gunicorn)
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/volume/jbig_backend
ExecStart=/home/ubuntu/volume/jbig_backend/.venv/bin/gunicorn jbig_backend.wsgi:application --bind 127.0.0.1:3001 --workers 3
Restart=always
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

echo "[4/4] Reloading and restarting service ..."
systemctl daemon-reload
systemctl enable "$SERVICE_NAME" >/dev/null || true

# If port busy, stop the process
if ss -lntp 2>/dev/null | grep -q "${BIND_ADDR}"; then
  echo "Port ${BIND_ADDR} already in use. Attempting to free by restarting $SERVICE_NAME ..."
  systemctl stop "$SERVICE_NAME" || true
fi

systemctl restart "$SERVICE_NAME"
sleep 1
systemctl --no-pager --full status "$SERVICE_NAME" | sed -n '1,120p'

echo "\nHealth check:"
set +e
code=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/schema/)
echo "  GET /api/schema/ -> HTTP ${code}"
set -e

echo "Done. Backend should be reachable at 127.0.0.1:3001 via Nginx /api proxy."



