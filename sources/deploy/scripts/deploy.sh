#!/usr/bin/env bash
# Deploy the RSCENE entry to rscene.nxtdev.cloud. Run on the laptop (Git Bash) from the
# project folder:  npm run deploy -- [--setup] [--push-env] [--skip-build] [--dry-run]
#
#   --setup       first time (or after changing deploy/): folders, systemd unit, nginx
#                 site, env file template, certbot if CERTBOT_EMAIL is set
#   --push-env    copy the AI settings and keys (AI_*, OPENAI_*, ANTHROPIC_*, GEMINI_*,
#                 LOCAL_AI_*) from .env.local into /srv/rscene/.env on the server.
#                 Nothing is printed but the key names
#   --skip-build  reuse dist/ and dist-server/ as they are
#   --dry-run     build and package only; no connection to the server
#
# SSH: key-based only, through a Host alias in ~/.ssh/config (default "rscene-vps"; set
# RSCENE_SSH to use another). No password is read or stored here. See deploy/README.md.
set -euo pipefail

HOST_ALIAS="${RSCENE_SSH:-rscene-vps}"
DOMAIN="${RSCENE_DOMAIN:-rscene.nxtdev.cloud}"
REMOTE_TMP="/tmp/rscene-deploy"
SETUP=0 PUSH_ENV=0 SKIP_BUILD=0 DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --setup) SETUP=1 ;;
    --push-env) PUSH_ENV=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --dry-run) DRY_RUN=1 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
step() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

# 1. Build ------------------------------------------------------------------
if [[ $SKIP_BUILD -eq 0 ]]; then
  step "Build the app and the AI relay"
  npm run build
  npm run build:server
fi
[[ -f dist/index.html ]] || { echo "dist/index.html is missing: run without --skip-build" >&2; exit 1; }
[[ -f dist-server/api.mjs ]] || { echo "dist-server/api.mjs is missing: run without --skip-build" >&2; exit 1; }

# 2. Package ----------------------------------------------------------------
STAMP="$(date +%Y%m%d-%H%M%S)"
STAGE="deploy/out/stage-$STAMP"
TARBALL="deploy/out/rscene-$STAMP.tgz"
step "Package release $STAMP"
mkdir -p "$STAGE/server"
cp -R dist "$STAGE/dist"
cp dist-server/api.mjs "$STAGE/server/api.mjs"
{
  echo "release=$STAMP"
  echo "commit=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  echo "dirty=$( [[ -n "$(git status --porcelain 2>/dev/null)" ]] && echo yes || echo no )"
  echo "built=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$STAGE/RELEASE"
tar -czf "$TARBALL" -C "$STAGE" .
rm -rf "$STAGE"
echo "$TARBALL ($(du -h "$TARBALL" | cut -f1))"

if [[ $DRY_RUN -eq 1 ]]; then
  echo "Dry run: not connecting to $HOST_ALIAS."
  exit 0
fi

# 3. Connect (keys only: BatchMode never asks for a password) ----------------
SSH=(ssh -o BatchMode=yes -o ConnectTimeout=10 "$HOST_ALIAS")
step "Connect to $HOST_ALIAS"
if ! "${SSH[@]}" true; then
  echo "Cannot reach '$HOST_ALIAS' with an SSH key. Set up the alias and key first (deploy/README.md, 'One-time setup')." >&2
  exit 1
fi

step "Upload"
"${SSH[@]}" "rm -rf $REMOTE_TMP && mkdir -p $REMOTE_TMP && chmod 700 $REMOTE_TMP"
scp -o BatchMode=yes -q "$TARBALL" deploy/scripts/server-*.sh "$HOST_ALIAS:$REMOTE_TMP/"
if [[ $SETUP -eq 1 ]]; then
  scp -o BatchMode=yes -q deploy/nginx/rscene.nxtdev.cloud.conf deploy/systemd/rscene-api.service deploy/env/rscene.env.example "$HOST_ALIAS:$REMOTE_TMP/"
fi
# Scripts written on Windows may carry CRLF; strip it before running.
"${SSH[@]}" "sed -i 's/\r\$//' $REMOTE_TMP/*.sh $REMOTE_TMP/*.conf $REMOTE_TMP/*.service $REMOTE_TMP/*.example 2>/dev/null; chmod 700 $REMOTE_TMP/*.sh"

# Runs a server script as root (directly when the alias logs in as root, else with sudo).
remote() { "${SSH[@]}" "if [ \"\$(id -u)\" = 0 ]; then bash $*; else sudo bash $*; fi"; }

if [[ $SETUP -eq 1 ]]; then
  step "Server setup"
  remote "$REMOTE_TMP/server-setup.sh" "$REMOTE_TMP" "${CERTBOT_EMAIL:-}"
fi

if [[ $PUSH_ENV -eq 1 ]]; then
  step "Push the AI settings from .env.local"
  [[ -f .env.local ]] || { echo ".env.local not found in $ROOT" >&2; exit 1; }
  # Only the AI lines leave the laptop, through a private temp file; values are never echoed.
  ENV_TMP="$(mktemp)"
  trap 'rm -f "$ENV_TMP"' EXIT
  grep -E '^(AI_PROVIDER|AI_TIMEOUT_MS|OPENAI_[A-Z0-9_]+|ANTHROPIC_[A-Z0-9_]+|GEMINI_[A-Z0-9_]+|GOOGLE_API_KEY|LOCAL_AI_[A-Z0-9_]+)=' .env.local > "$ENV_TMP" || true
  if [[ ! -s "$ENV_TMP" ]]; then echo "No AI settings found in .env.local." >&2; exit 1; fi
  scp -o BatchMode=yes -q "$ENV_TMP" "$HOST_ALIAS:$REMOTE_TMP/env.upload"
  rm -f "$ENV_TMP"
  remote "$REMOTE_TMP/server-env-merge.sh" "$REMOTE_TMP/env.upload"
fi

step "Activate release $STAMP"
remote "$REMOTE_TMP/server-activate.sh" "$REMOTE_TMP/rscene-$STAMP.tgz" "$DOMAIN"

"${SSH[@]}" "rm -rf $REMOTE_TMP"
step "Done: https://$DOMAIN/"
