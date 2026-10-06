#!/usr/bin/env bash
# One-time (idempotent) server setup for rscene.nxtdev.cloud on the shared VPS.
# Run as root: bash server-setup.sh <dir with the uploaded deploy files> [certbot email]
# Touches only rscene's own files: /srv/rscene, rscene-api.service and the rscene site
# file. Other sites are checked before and after and must be unchanged.
set -euo pipefail

SRC="${1:?usage: server-setup.sh <upload dir> [certbot email]}"
EMAIL="${2:-}"
APP=rscene
DOMAIN=rscene.nxtdev.cloud
BASE=/srv/rscene
PORT=8010
RUN_USER=deploy
RUN_GROUP=www-data
SITE=/etc/nginx/sites-available/$DOMAIN
UNIT=/etc/systemd/system/rscene-api.service
BACKUPS=/srv/backups
TS="$(date +%Y%m%d-%H%M%S)"

[[ $EUID -eq 0 ]] || { echo "Run as root." >&2; exit 1; }
say() { printf '\n== %s\n' "$*"; }
fail() { echo "FAILED: $*" >&2; exit 1; }

# Other sites' state, to compare at the end (the rule on this shared box).
snapshot() { systemctl list-units --type=service --state=running --no-legend --plain | awk '{print $1}' | { grep -v '^rscene-api' || true; } | sort; }
BEFORE="$(snapshot)"

say "Prerequisites"
command -v nginx >/dev/null || fail "nginx is not installed"
id "$RUN_USER" >/dev/null 2>&1 || fail "user '$RUN_USER' does not exist (the other apps run as it; check the VPS)"
getent group "$RUN_GROUP" >/dev/null || fail "group '$RUN_GROUP' does not exist"
if ! command -v node >/dev/null; then
  fail "Node.js is not installed. Install Node 22 LTS (NodeSource: curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs), then rerun"
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[[ "$NODE_MAJOR" -ge 18 ]] || fail "Node $(node -v) is too old: 18 or newer is needed"
echo "node $(node -v), nginx $(nginx -v 2>&1 | sed 's/.*\///')"

if ss -ltnp 2>/dev/null | grep -q ":$PORT "; then
  if ss -ltnp 2>/dev/null | grep ":$PORT " | grep -qv 'node'; then fail "port $PORT is used by another program: $(ss -ltnp | grep ":$PORT ")"; fi
  echo "port $PORT: in use by node (rscene-api, presumably)"
else
  echo "port $PORT: free"
fi

say "Folders"
mkdir -p "$BASE/releases" "$BACKUPS"
chown "$RUN_USER:$RUN_GROUP" "$BASE" "$BASE/releases"
chmod 755 "$BASE" "$BASE/releases"
echo "$BASE ready"

say "Env file"
if [[ -f "$BASE/.env" ]]; then
  echo "$BASE/.env exists: kept (keys: $(grep -E '^[A-Z0-9_]+=' "$BASE/.env" | sed -E 's/=.+$/=<set>/; s/=$/=<empty>/' | tr '\n' ' '))"
else
  ( umask 027; cp "$SRC/rscene.env.example" "$BASE/.env" )
  chown "$RUN_USER:$RUN_GROUP" "$BASE/.env"
  chmod 640 "$BASE/.env"
  echo "created $BASE/.env from the template (keys empty: edit it, or npm run deploy -- --push-env)"
fi

say "systemd unit"
if [[ -f "$UNIT" ]] && ! cmp -s "$UNIT" "$SRC/rscene-api.service"; then cp "$UNIT" "$BACKUPS/rscene-api.service_$TS.bak"; fi
install -m 644 "$SRC/rscene-api.service" "$UNIT"
systemctl daemon-reload
systemctl enable rscene-api >/dev/null
echo "rscene-api.service installed and enabled (starts with the first release)"
if [[ -e "$BASE/current" ]]; then systemctl restart rscene-api; fi

say "nginx site"
if [[ -f "$SITE" ]] && grep -q 'ssl_certificate' "$SITE" && [[ "${RSCENE_FORCE_NGINX:-0}" != 1 ]]; then
  echo "$SITE already has certbot's TLS block: left as is (RSCENE_FORCE_NGINX=1 to replace it, then rerun certbot)"
else
  [[ -f "$SITE" ]] && cp "$SITE" "$BACKUPS/nginx_rscene_$TS.bak"
  install -m 644 "$SRC/rscene.nxtdev.cloud.conf" "$SITE"
  ln -sfn "$SITE" "/etc/nginx/sites-enabled/$DOMAIN"
  if ! nginx -t 2>&1; then
    if [[ -f "$BACKUPS/nginx_rscene_$TS.bak" ]]; then cp "$BACKUPS/nginx_rscene_$TS.bak" "$SITE"; else rm -f "$SITE" "/etc/nginx/sites-enabled/$DOMAIN"; fi
    nginx -t >/dev/null 2>&1 || true
    fail "nginx -t failed: the rscene site was rolled back, nginx was not reloaded"
  fi
  systemctl reload nginx
  echo "site installed, nginx reloaded"
fi

say "DNS and TLS"
SERVER_IPS="$(hostname -I 2>/dev/null || true)"
RESOLVED="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1{print $1}' || true)"
if [[ -z "$RESOLVED" ]]; then
  echo "WARNING: $DOMAIN does not resolve yet. Add the DNS A record 'rscene' -> this VPS, wait, then rerun with a certbot email."
elif [[ " $SERVER_IPS " != *" $RESOLVED "* ]]; then
  echo "WARNING: $DOMAIN resolves to $RESOLVED, which is not this server ($SERVER_IPS)."
elif [[ -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
  echo "certificate present: $(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/cert.pem" 2>/dev/null || echo '?')"
elif [[ -n "$EMAIL" ]]; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect
  nginx -t && systemctl reload nginx
  echo "certificate issued; HTTP now redirects to HTTPS (renewal: the existing certbot timer)"
else
  echo "DNS is ready. Issue the certificate with:  CERTBOT_EMAIL=you@example.com npm run deploy -- --setup"
  echo "  (or on the server: certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m <email> --redirect)"
fi

say "Other sites unchanged?"
AFTER="$(snapshot)"
if [[ "$BEFORE" == "$AFTER" ]]; then echo "yes: the same services are running"; else
  echo "WARNING: running services changed:"; diff <(echo "$BEFORE") <(echo "$AFTER") || true
fi
