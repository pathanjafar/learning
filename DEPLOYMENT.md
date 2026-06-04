# Deployment Guide

This app deploys to a **Linux VPS** via Docker Compose. GitHub stores the code and (optionally)
auto-deploys through GitHub Actions. It **cannot** run fully on Vercel/Netlify because self-hosted
**Judge0** requires privileged containers + cgroup v1 (see `infra/judge0/README.md`).

```
GitHub (code)  --push-->  GitHub Actions  --SSH-->  Ubuntu VPS (docker compose up)
```

---

## Part 1 — Put the code on GitHub

From the project root (`reborn/`):

```bash
git init
git add .
git commit -m "Initial commit: Reborn learning platform"
git branch -M main
```

Create the remote repo, then push. **Option A — GitHub CLI** (install `gh` first):
```bash
gh repo create reborn --private --source=. --remote=origin --push
```

**Option B — manually:** create an empty repo at github.com/new (no README), then:
```bash
git remote add origin https://github.com/<you>/reborn.git
git push -u origin main
```

> `.env` is gitignored, so your secrets are **not** pushed. Only `.env.example` ships. ✅

---

## Part 2 — Provision the VPS (one time)

Use a plain Ubuntu 22.04 VM (Hetzner / DigitalOcean / EC2 — somewhere that allows **privileged**
containers). 2 vCPU / 4 GB RAM minimum.

### 2.1 Install Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
```

### 2.2 cgroup v1 for Judge0 (critical)
Edit `/etc/default/grub`, add to `GRUB_CMDLINE_LINUX`:
```
systemd.unified_cgroup_hierarchy=0
```
Then `sudo update-grub && sudo reboot`. Verify: `stat -fc %T /sys/fs/cgroup/` → `tmpfs` (v1).
Full details in `infra/judge0/README.md`.

### 2.3 Clone the repo
```bash
sudo mkdir -p /opt/reborn && sudo chown $USER /opt/reborn
git clone https://github.com/<you>/reborn.git /opt/reborn
cd /opt/reborn
```

### 2.4 Configure secrets + TLS
```bash
cp .env.example .env
nano .env            # set STRONG AUTH_JWT_SECRET / NEXTAUTH_SECRET, real POSTGRES creds,
                     # and real hostnames (NEXTAUTH_URL=https://yourdomain.com, etc.)
```
Put your TLS certs in `infra/nginx/certs/` as `fullchain.pem` + `privkey.pem`
(use Let's Encrypt / certbot, or your provider's certs).

---

## Part 3 — First deploy (on the VPS)

```bash
cd /opt/reborn
docker compose -f infra/docker-compose.yml up -d --build
```

### Create the schema + load content (one time)
Apply the database schema:
```bash
docker compose -f infra/docker-compose.yml exec -T api \
  npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
# (or, if you have no migration files yet:)
docker compose -f infra/docker-compose.yml exec -T api \
  npx prisma db push --schema packages/db/prisma/schema.prisma
```

Seed the lessons/problems (the seeder needs the `content/` dir, so run it with the repo mounted on
the compose network):
```bash
docker run --rm --network reborn_appnet -v "$PWD":/repo -w /repo/packages/db \
  -e DATABASE_URL="postgresql://reborn:reborn@postgres:5432/reborn?schema=public" \
  node:20-slim sh -c "npm install --no-audit --no-fund && npx prisma generate && npx tsx prisma/seed.ts"
```
(Adjust the URL credentials to match your `.env`. The network name is `<project>_appnet` =
`reborn_appnet`.)

Visit `https://yourdomain.com` — done.

---

## Part 4 — Automated deploys with GitHub Actions

`.github/workflows/deploy.yml` redeploys on every push to `main`.

1. On the VPS, create a deploy SSH key and authorize it:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/deploy -N ""
   cat ~/.ssh/deploy.pub >> ~/.ssh/authorized_keys
   cat ~/.ssh/deploy            # copy this PRIVATE key
   ```
2. In GitHub → repo **Settings → Secrets and variables → Actions**, add:
   - `VPS_HOST` — the server IP
   - `VPS_USER` — the SSH user (owns `/opt/reborn`)
   - `VPS_SSH_KEY` — the **private** key from step 1
   - `VPS_PORT` — optional (default 22)
3. Push to `main` → the workflow pulls, rebuilds, and runs migrations automatically.

---

## Operations cheatsheet

```bash
docker compose -f infra/docker-compose.yml ps          # status
docker compose -f infra/docker-compose.yml logs -f api # tail a service
docker compose -f infra/docker-compose.yml down        # stop all
docker compose -f infra/docker-compose.yml up -d --build  # rebuild + restart
```

**Backups:** dump Postgres regularly —
`docker compose -f infra/docker-compose.yml exec -T postgres pg_dump -U reborn reborn > backup.sql`.

**Security before launch:** strong secrets, HTTPS only, firewall to ports 80/443 (keep Postgres &
Judge0 internal — they are not published in the compose file), and keep the OS/images patched.
