#!/usr/bin/env bash
# Read-only status of rscene on the VPS: relay, release, env keys (names only), nginx,
# certificate, public HTTPS. Run on the server: bash server-check.sh
set -uo pipefail
DOMAIN=rscene.nxtdev.cloud
BASE=/srv/rscene

echo "relay      : $(systemctl is-active rscene-api 2>/dev/null) / $(curl -fsS -m 3 http://127.0.0.1:8010/healthz 2>/dev/null || echo 'no answer')"
echo "release    : $(basename "$(readlink -f "$BASE/current" 2>/dev/null || echo none)") ($(ls -1 "$BASE/releases" 2>/dev/null | wc -l) kept)"
echo "env keys   : $(grep -E '^[A-Z0-9_]+=' "$BASE/.env" 2>/dev/null | sed -E 's/=.+$/=<set>/; s/=$/=<empty>/' | tr '\n' ' ')"
echo "ai status  : $(curl -fsS -m 3 http://127.0.0.1:8010/api/ai/status 2>/dev/null | head -c 200 || echo 'no answer')"
echo "nginx -t   : $(nginx -t 2>&1 | tail -n 1)"
if [[ -f "/etc/letsencrypt/live/$DOMAIN/cert.pem" ]]; then
  echo "certificate: $(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/cert.pem")"
else
  echo "certificate: none yet"
fi
echo "https      : $(curl -s -o /dev/null -w '%{http_code}' -m 10 "https://$DOMAIN/" 2>/dev/null || echo 'unreachable')"
echo "disk /srv  : $(df -h /srv | awk 'NR==2{print $4" free of "$2}')"
