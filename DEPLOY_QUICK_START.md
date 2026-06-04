# Deploy Reborn in 10 minutes (without Judge0)

TL;DR — push to GitHub, connect to Render, done. Students submit code for manual review.

## Step 1: Initialize git locally

```bash
cd /path/to/reborn
git init
git add .
git commit -m "Initial commit: Reborn learning platform"
git branch -M main
```

## Step 2: Create a GitHub repo + push

Create an empty repo at [github.com/new](https://github.com/new), then:

```bash
git remote add origin https://github.com/<you>/reborn.git
git push -u origin main
```

## Step 3: Deploy on Render

1. **Sign up:** [render.com](https://render.com) (free account)
2. **Dashboard → Blueprint:** click "New" → "Blueprint"
3. **Connect repo:** select your GitHub account, then the `reborn` repo
4. **Render auto-detects `render.yaml`** and creates 3 services:
   - `reborn-api` (Node backend)
   - `reborn-web` (Next.js frontend)
   - `reborn-postgres` (database, free tier, resets every 90 days)
5. **Set environment variables** when prompted:
   - Copy the `DATABASE_URL` that Render generates for Postgres
   - Generate strong secrets:
     ```bash
     openssl rand -base64 32  # run twice for AUTH_JWT_SECRET and NEXTAUTH_SECRET
     ```
   - Leave `NEXTAUTH_URL`, `NEXT_PUBLIC_API_URL` as defaults for now (or set to your actual domain later)

6. **Deploy:** click "Deploy Blueprint". Wait ~5 minutes.

## Step 4: Done!

Visit `https://reborn-web-xxxx.onrender.com` → sign in (demo accounts: `student@reborn.dev` / `reborn`) → submit code.

**That's it.** No Judge0, no VPS, no ops. Code submissions are saved as "pending review."

---

## Optional: Persistent database

Render's free Postgres auto-resets every 90 days. For persistence, use **Supabase** (free tier):

1. Create a database at [supabase.com](https://supabase.com)
2. Copy the connection string (includes password)
3. Update `DATABASE_URL` in Render → API service
4. Data persists forever

**Cost:** free (Supabase) + free (Render web tier) = **$0** (until you need paid features).

---

## What changed from the full version?

- **No Judge0** → no sandboxing. Code doesn't auto-grade.
- **Submissions are "pending"** → students see "✓ Submitted for Review", instructors can export and grade manually.
- **Simpler stack** → 3 services instead of 8 (no grader, no Judge0, no Redis).
- **Free to deploy** → Render handles the ops.

---

## Customize later

- **Custom domain:** Render → Settings → Custom Domain (point DNS to their CNAME)
- **Enable auto-grading:** wire in the public Judge0 API (RapidAPI) instead of self-hosting
- **Review submissions UI:** build a dashboard for instructors to review + grade

See `DEPLOY_RENDER.md` for detailed setup instructions.
