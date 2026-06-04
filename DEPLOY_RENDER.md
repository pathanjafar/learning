# Deploy Reborn to Render (or Railway/Fly)

This guide deploys the **simplified version** (no Judge0 sandbox) to Render.com's free tier. Students submit code for manual review instead of instant auto-grading.

**Why Render instead of VPS?**
- Free tier: 750 hours/month compute, $7/month Postgres (or use Supabase for free).
- Zero ops: Render handles scaling, backups, and HTTPS.
- Git-connected: push to GitHub → auto-deploy.

**Cost estimate:** ~$7/month (Postgres) + Render free tier = **$7–10 total**. Or use Supabase + Railway (both free tier possible).

---

## Part 1 — Prepare the repo for Render

Render reads `Dockerfile` from the root and `render.yaml` for multi-service setup. We'll use
`render.yaml` to deploy Postgres + API + web together.

### 1.1 Create `render.yaml`

```yaml
services:
  - type: web
    name: reborn-api
    runtime: docker
    plan: free
    healthCheckPath: /health
    envVars:
      - key: DATABASE_URL
        scope: service
        sync: false
      - key: AUTH_JWT_SECRET
        scope: service
        sync: false
      - key: API_PORT
        value: "4000"
    dockerfilePath: apps/api/Dockerfile
    dockerContext: .

  - type: web
    name: reborn-web
    runtime: docker
    plan: free
    healthCheckPath: /
    envVars:
      - key: NEXTAUTH_URL
        scope: service
        sync: false
      - key: NEXTAUTH_SECRET
        scope: service
        sync: false
      - key: NEXT_PUBLIC_API_URL
        scope: service
        sync: false
      - key: API_INTERNAL_URL
        value: "https://reborn-api.onrender.com"  # update to your API URL
    dockerfilePath: apps/web/Dockerfile
    dockerContext: .
    depends:
      - reborn-api

  - type: pserv
    name: reborn-postgres
    plan: free  # 90-day auto-reset; upgrade to starter for persistence
    ipAllowList: []  # accessible only from Render services
    envVars:
      - key: POSTGRES_USER
        value: reborn
      - key: POSTGRES_PASSWORD
        generateValue: true  # Render auto-generates; copy it for DATABASE_URL
      - key: POSTGRES_DB
        value: reborn
```

Save this as `render.yaml` at the repo root.

### 1.2 Update .env.example

Make sure `.env.example` has all needed vars (and `GRADER_URL` is **not** set):

```bash
# .env.example — no Judge0 vars; no GRADER_URL
DATABASE_URL=postgresql://user:pass@host/reborn
AUTH_JWT_SECRET=your-strong-secret-here-min-32-chars
NEXTAUTH_URL=https://your-domain.onrender.com
NEXTAUTH_SECRET=another-strong-secret-min-32-chars
NEXT_PUBLIC_API_URL=https://your-domain-api.onrender.com
API_INTERNAL_URL=http://reborn-api:4000  # used within the same network; overridden on Render
POSTGRES_USER=reborn
POSTGRES_PASSWORD=your-postgres-password
POSTGRES_DB=reborn
API_PORT=4000
```

### 1.3 Verify Dockerfiles are multi-stage (lean)

Both `apps/api/Dockerfile` and `apps/web/Dockerfile` should be multi-stage — build stage in a
heavy image, final stage on a slim base. Check that they don't have `RUN npm ci` in the final
stage (waste of space). They should look something like:

```dockerfile
# apps/api/Dockerfile
FROM node:20 AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
EXPOSE 4000
CMD ["node", "dist/server.js"]
```

---

## Part 2 — Create repo on GitHub + push

```bash
cd /path/to/reborn
git init
git add .
git commit -m "Initial: Reborn no-Judge0 version"
git branch -M main
git remote add origin https://github.com/<you>/reborn.git
git push -u origin main
```

---

## Part 3 — Deploy on Render

### 3.1 Create a Render account

Sign up at [render.com](https://render.com) (free).

### 3.2 Connect your GitHub repo

Dashboard → **New** → **Web Service**
- Connect your GitHub account and select the `reborn` repo.
- Render auto-detects `render.yaml` and deploys all three services.

### 3.3 Set environment variables

Render will prompt you to set `DATABASE_URL`, `AUTH_JWT_SECRET`, `NEXTAUTH_SECRET`, etc.

**For DATABASE_URL:** Render creates the Postgres service and outputs a connection string. Copy it
(it includes the auto-generated password) and paste it into the API service's `DATABASE_URL`.

For secrets, use **strong random strings** (32+ chars):
```bash
openssl rand -base64 32  # generates a safe secret
```

### 3.4 Wait for deploy

Render builds and deploys. Watch the logs for each service. Once all three are live (green):
- `reborn-web` at `https://reborn-xxxx.onrender.com`
- `reborn-api` at `https://reborn-api-xxxx.onrender.com`

### 3.5 Run migrations + seed (one time)

After the API service is live, SSH in or use Render's shell to run migrations:

```bash
# Option A: Render shell (if available in your plan)
# Option B: Manually seed via a one-off job in Render dashboard

# If you can SSH or access the deployment:
npm run db:migrate
npm run db:seed
```

Actually, **easier:** add a `postdeploy` hook in `render.yaml`:

```yaml
services:
  - type: web
    name: reborn-api
    # ... rest of config ...
    postdeploy: npm run db:migrate && npm run db:seed
```

Then Render runs these after every deploy.

### 3.6 Update domain (optional)

Render gives you a free `*.onrender.com` subdomain. To use a custom domain:
- Settings → Custom Domain
- Point your DNS to Render's provided CNAME.
- Update `NEXTAUTH_URL` to `https://yourdomain.com`.

---

## Part 4 — How it works now

- **No Judge0**, so no sandboxing. When students submit code:
  - The code is stored in Postgres.
  - The UI shows "✓ Submitted for Review" (not instant pass/fail).
  - Instructors can review submissions in the Dashboard (future: build a review UI, or export submissions).
- Auto-deploy: push to `main` → Render rebuilds and deploys all three services.

---

## Part 5 — Cost & persistence

| Item | Free tier | Upgrade |
|------|-----------|---------|
| **Render Web** (API + web) | 750 hours/month (free) | $7/month per service |
| **Render Postgres** | 90-day auto-reset | $7/month (starter, persists) |
| **Supabase Postgres** | Free 500 MB (persists) | $25/month |

**Recommendation for a real deployment:**
- Use **Render web (free)** for the API and web.
- Use **Supabase Postgres (free tier, persists)** instead of Render Postgres (auto-resets every 90 days).

To switch to Supabase:
1. Create a Postgres database at [supabase.com](https://supabase.com) (free).
2. Copy the connection string.
3. Update `DATABASE_URL` in Render → API service environment.
4. Done — your data persists across redeploys.

---

## Part 6 — Troubleshooting

**"Deploy fails with Dockerfile error"**  
Render expects Dockerfiles at `apps/api/Dockerfile` and `apps/web/Dockerfile` (relative to the
repo root specified in `render.yaml`). Check `dockerContext: .`.

**"Database connection fails"**  
Make sure `DATABASE_URL` includes the correct password (Render auto-generates it when you create
the Postgres service). Copy it exactly from Render's output.

**"Migrations don't run"**  
Use the `postdeploy` hook in `render.yaml`, or manually trigger a migration after deploy:
- SSH/shell into the service and run `npm run db:migrate`.

**"Free Postgres resets every 90 days"**  
Switch to Supabase (free 500 MB, persists forever) or pay $7/month for Render Starter Postgres.

---

## Next steps

- Instructors review submissions manually (export from Postgres, or build a review dashboard UI).
- Streaks/progress still track, just not tied to auto-grading.
- If you want auto-grading back, wire in the public Judge0 API (RapidAPI) instead of self-hosting.
