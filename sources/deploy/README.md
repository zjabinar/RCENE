# Hosting on the VPS: rscene.nxtdev.cloud

The entry runs on the shared Hostinger VPS (Ubuntu 24.04) next to `erms`, `motiong`, `govaideas`, `pop` and `aislecue`, with the **same conventions as SSU ERMS** (`C:\ssu\PRD_ERMS_VPS_HOSTING.md`): systemd + host-level nginx + certbot, one folder per app under `/srv`, one env file per app, the `deploy` user, and "never break the neighbours".

The demo never depends on it: it runs on the laptop (`npm run dev`) with Wi-Fi off. The VPS adds a public address for the poster's QR code and for judges' phones.

```text
browser ──HTTPS──▶ nginx (rscene.nxtdev.cloud)
                    ├─ /            → /srv/rscene/current/dist      (Vite build, SPA fallback, /data/ included)
                    └─ /api/        → 127.0.0.1:8010                 rscene-api.service
                                                                      node /srv/rscene/current/server/api.mjs
                                                                      keys: /srv/rscene/.env (640, deploy:www-data)
```

| Piece | File here | On the server |
|---|---|---|
| nginx site | `deploy/nginx/rscene.nxtdev.cloud.conf` | `/etc/nginx/sites-available/rscene.nxtdev.cloud` (+ symlink in `sites-enabled`) |
| AI relay service | `deploy/systemd/rscene-api.service` | `/etc/systemd/system/rscene-api.service` |
| env template | `deploy/env/rscene.env.example` | `/srv/rscene/.env` (created once, never overwritten) |
| releases | `npm run build` + `npm run build:server` | `/srv/rscene/releases/<stamp>/` (`dist/`, `server/api.mjs`, `RELEASE`), `current` → the live one, last 5 kept |
| scripts | `deploy/scripts/deploy.sh` (laptop) and `server-*.sh` (uploaded and run on the server) | — |

Port **8010** (8001–8009 are taken: govaideas, erms, motiong, pop, aislecue, and 8009 reserved for the ERMS AI sidecar). No database, no Redis.

## One-time setup

1. **DNS**: in the `nxtdev.cloud` zone, add an **A record `rscene` → the VPS IP** (the same IP as `erms.nxtdev.cloud`). Check: `nslookup rscene.nxtdev.cloud`.
2. **SSH key** (no passwords in scripts). If you don't have a key yet, in PowerShell:
   ```powershell
   ssh-keygen -t ed25519 -C "rscene-deploy"
   type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@<VPS-IP> "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
   ```
   (you type the server password once, yourself). Then add the alias to `%USERPROFILE%\.ssh\config`:
   ```
   Host rscene-vps
       HostName <VPS-IP>
       User root
       Port 22
       IdentityFile ~/.ssh/id_ed25519
   ```
   Check: `ssh -o BatchMode=yes rscene-vps true` returns without asking for a password.
3. **Node on the server**: `ssh rscene-vps node -v` must print v18 or newer (pop already runs Node). If not: install Node 22 LTS from NodeSource (the setup script prints the command).
4. **First deploy with setup** (Git Bash, in the project folder):
   ```bash
   CERTBOT_EMAIL=you@example.com npm run deploy -- --setup --push-env
   ```
   - `--setup` creates `/srv/rscene`, installs the systemd unit and the nginx site (backup, `nginx -t`, **reload, never restart**), creates `/srv/rscene/.env` from the template, and issues the certificate with `certbot --nginx --redirect` once DNS points here. It prints whether the other sites' services are unchanged.
   - `--push-env` copies only the AI lines (`AI_*`, `OPENAI_*`, `ANTHROPIC_*`, `GEMINI_*`, `LOCAL_AI_*`) of your `.env.local` into `/srv/rscene/.env`; values are never printed. Or edit the file on the server: `ssh rscene-vps nano /srv/rscene/.env`, then `systemctl restart rscene-api`.
5. **Spending cap**: set a monthly limit on the OpenAI account. The site is public: nginx allows 12 completions a minute per IP (burst 6) and the relay 30 a minute in total; beyond that the app answers with the demo rules.

## Deploy, roll back, check

| Do | Command |
|---|---|
| Deploy the current code | `npm run deploy` (build, upload, activate, health checks; switches back on failure) |
| Deploy without rebuilding | `npm run deploy -- --skip-build` |
| Package only (no server) | `npm run deploy -- --dry-run` → `deploy/out/rscene-<stamp>.tgz` |
| Update the AI keys | `npm run deploy -- --push-env --skip-build` |
| Roll back | `ssh rscene-vps bash -s < deploy/scripts/server-rollback.sh` (or name a release: `… -s -- 20261007-101500`) |
| Status | `ssh rscene-vps bash -s < deploy/scripts/server-check.sh` |
| Logs | `ssh rscene-vps journalctl -u rscene-api -f` · `/var/log/nginx/rscene.{access,error}.log` |

Activation (`server-activate.sh`): extract to `releases/<stamp>`, `chown deploy:www-data`, atomic `current` switch, restart `rscene-api`, then require `/healthz`, `/api/ai/status` and the site (`/console` → 200) to pass; otherwise switch back to the previous release and print the journal.

## Rules on the shared server (from the SSU runbook)

- Touch only rscene's files: `/srv/rscene`, `rscene-api.service`, the rscene site file. Never edit another app's site, unit or env.
- nginx: back up, `nginx -t`, `systemctl reload nginx`. Never `restart`.
- Files are owned `deploy:www-data`; the env file is `640`. Never `chown` other apps' folders.
- After any change, check the other sites still answer (the setup script compares the running services before and after).
- Scripts strip CRLF before running (Windows line endings break bash with `$'\r'`).

## Security notes

- No credentials live in this repository: SSH uses your key through the `rscene-vps` alias; the AI keys go from your laptop to `/srv/rscene/.env` only through `--push-env`. Nothing from `C:\ssu` or `C:\lgu_portal` is copied (rscene needs no database or Redis).
- **Rotate the VPS root password**: the SSU PRD stores it in plain text in several places. Prefer key-only SSH for root (`PasswordAuthentication no` once every operator has a key; coordinate with the other apps' deployers first).
- The relay refuses POSTs without an `Origin` header and from other origins, caps request size, and never returns a key; `/api/ai/status` shows only which providers are ready.

## Troubleshooting

| Symptom | Check |
|---|---|
| `Cannot reach 'rscene-vps' with an SSH key` | the alias and key (step 2); `ssh -v rscene-vps` |
| certbot fails | DNS not pointing at the VPS yet (`getent hosts rscene.nxtdev.cloud` on the server); port 80 open |
| 502 on `/api/` | `systemctl status rscene-api`, `journalctl -u rscene-api -n 50`; `/srv/rscene/.env` readable by `deploy` |
| AI answers say "Fallback" | `/admin/ai` → Test connection; key in `/srv/rscene/.env`; `systemctl restart rscene-api` after editing |
| 429 "Too many AI requests" | the rate limits above; raise `AI_RATE_LIMIT_PER_MIN` in `/srv/rscene/.env` or the nginx zone rate |
| old version still shown | hard refresh; `index.html` is `no-cache`, assets are hashed |
