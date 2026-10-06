#!/usr/bin/env bash
# Point "current" back at the previous release (or a named one) and restart the relay.
# Run as root on the VPS: bash server-rollback.sh [YYYYmmdd-HHMMSS]
set -euo pipefail
BASE=/srv/rscene
[[ $EUID -eq 0 ]] || { echo "Run as root." >&2; exit 1; }

CURRENT="$(readlink -f "$BASE/current" 2>/dev/null || true)"
if [[ -n "${1:-}" ]]; then
  TARGET="$BASE/releases/$1"
else
  TARGET="$(ls -1dt "$BASE"/releases/*/ | sed 's:/$::' | grep -vx "$CURRENT" | head -n 1 || true)"
fi
[[ -n "$TARGET" && -d "$TARGET" ]] || { echo "No release to roll back to. Releases: $(ls -1 "$BASE/releases" | tr '\n' ' ')" >&2; exit 1; }

ln -sfn "$TARGET" "$BASE/current.next"
mv -Tf "$BASE/current.next" "$BASE/current"
systemctl restart rscene-api
sleep 2
curl -fsS -m 3 http://127.0.0.1:8010/healthz && echo
echo "current -> $(basename "$TARGET") (was $(basename "${CURRENT:-none}"))"
