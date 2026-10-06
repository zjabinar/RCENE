#!/usr/bin/env bash
# Activate a release: extract it next to the others, switch the "current" symlink
# atomically, restart the relay, check health; switch back on any failure.
# Run as root: bash server-activate.sh <rscene-YYYYmmdd-HHMMSS.tgz> [domain]
set -euo pipefail

TARBALL="${1:?usage: server-activate.sh <tarball> [domain]}"
DOMAIN="${2:-rscene.nxtdev.cloud}"
BASE=/srv/rscene
RUN_USER=deploy
RUN_GROUP=www-data
KEEP=5

[[ $EUID -eq 0 ]] || { echo "Run as root." >&2; exit 1; }
[[ -f "$BASE/.env" ]] || { echo "$BASE/.env is missing: run the setup first (npm run deploy -- --setup)." >&2; exit 1; }
systemctl cat rscene-api >/dev/null 2>&1 || { echo "rscene-api.service is missing: run the setup first." >&2; exit 1; }

NAME="$(basename "$TARBALL" .tgz)"
STAMP="${NAME#rscene-}"
DEST="$BASE/releases/$STAMP"
PREV="$(readlink -f "$BASE/current" 2>/dev/null || true)"

echo "== Extract $STAMP"
rm -rf "$DEST"
mkdir -p "$DEST"
tar -xzf "$TARBALL" -C "$DEST"
[[ -f "$DEST/dist/index.html" && -f "$DEST/server/api.mjs" ]] || { rm -rf "$DEST"; echo "Release is incomplete (dist/index.html, server/api.mjs)." >&2; exit 1; }
chown -R "$RUN_USER:$RUN_GROUP" "$DEST"
find "$DEST" -type d -exec chmod 755 {} +
find "$DEST" -type f -exec chmod 644 {} +

switch_to() {
  ln -sfn "$1" "$BASE/current.next"
  mv -Tf "$BASE/current.next" "$BASE/current"
}

healthy() {
  for _ in $(seq 1 15); do
    if curl -fsS -m 3 http://127.0.0.1:8010/healthz >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}

# The app shell through nginx: HTTPS once the certificate exists, else plain HTTP via loopback.
site_ok() {
  local code
  if [[ -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
    code="$(curl -s -o /dev/null -w '%{http_code}' -m 10 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/console")"
  else
    code="$(curl -s -o /dev/null -w '%{http_code}' -m 10 -H "Host: $DOMAIN" "http://127.0.0.1/console")"
  fi
  [[ "$code" == 200 ]] || { echo "site answered HTTP $code" >&2; return 1; }
}

rollback() {
  echo "!! $1: rolling back" >&2
  journalctl -u rscene-api -n 30 --no-pager >&2 || true
  if [[ -n "$PREV" && -d "$PREV" ]]; then
    switch_to "$PREV"
    systemctl restart rscene-api || true
    echo "back on $(basename "$PREV")" >&2
  fi
  exit 1
}

echo "== Switch current -> $STAMP"
switch_to "$DEST"
systemctl restart rscene-api
healthy || rollback "the relay did not become healthy"
curl -fsS -m 5 http://127.0.0.1:8010/api/ai/status >/dev/null || rollback "the relay status failed"
site_ok || rollback "the site did not answer 200"

echo "== Healthy: $(curl -fsS -m 3 http://127.0.0.1:8010/healthz)"
cat "$DEST/RELEASE" 2>/dev/null || true

echo "== Keep the last $KEEP releases"
CURRENT="$(readlink -f "$BASE/current")"
ls -1dt "$BASE"/releases/*/ 2>/dev/null | sed 's:/$::' | tail -n +$((KEEP + 1)) | while read -r old; do
  [[ "$old" == "$CURRENT" ]] || rm -rf "$old"
done
ls -1t "$BASE/releases"
