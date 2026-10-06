#!/usr/bin/env bash
# Merge uploaded AI settings into /srv/rscene/.env without printing a value, then delete
# the upload and restart the relay. Only AI keys are accepted; PORT, HOST and the rate
# limits stay as the server has them.
# Run as root: bash server-env-merge.sh <uploaded file>
set -euo pipefail

UPLOAD="${1:?usage: server-env-merge.sh <uploaded env file>}"
ENV_FILE=/srv/rscene/.env
ALLOWED='^(AI_PROVIDER|AI_TIMEOUT_MS|OPENAI_[A-Z0-9_]+|ANTHROPIC_[A-Z0-9_]+|GEMINI_[A-Z0-9_]+|GOOGLE_API_KEY|LOCAL_AI_[A-Z0-9_]+)='

[[ $EUID -eq 0 ]] || { echo "Run as root." >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { rm -f "$UPLOAD"; echo "$ENV_FILE is missing: run the setup first." >&2; exit 1; }
trap 'shred -u "$UPLOAD" 2>/dev/null || rm -f "$UPLOAD"' EXIT

umask 077
NEW="$(mktemp)"
sed -i 's/\r$//' "$UPLOAD"
# Keys with a non-empty value in the upload replace the server's line for that key.
mapfile -t KEYS < <(grep -E "$ALLOWED" "$UPLOAD" | grep -Ev '^[A-Z0-9_]+=$' | cut -d= -f1 | sort -u)
[[ ${#KEYS[@]} -gt 0 ]] || { rm -f "$NEW"; echo "Nothing to merge (no AI key with a value)." >&2; exit 1; }

PATTERN="^($(IFS='|'; echo "${KEYS[*]}"))="
grep -Ev "$PATTERN" "$ENV_FILE" > "$NEW" || true
for key in "${KEYS[@]}"; do grep -E "^$key=" "$UPLOAD" | tail -n 1 >> "$NEW"; done

install -m 640 -o deploy -g www-data "$NEW" "$ENV_FILE"
rm -f "$NEW"
echo "merged into $ENV_FILE: ${KEYS[*]}"

if systemctl is-active --quiet rscene-api; then systemctl restart rscene-api && echo "rscene-api restarted"; fi
