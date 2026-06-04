# Reborn

A self-hosted platform to **learn software development + DSA**: structured lessons, an
in-browser code editor, and **automated grading** of submitted code against hidden test cases
(LeetCode-style) — plus practice problems, projects, interview prep, and an admin CMS.

Covers Frontend (HTML, CSS, JS, TS, Tailwind, React, Next.js), Backend (Node, Python, Java),
Databases (SQL, PostgreSQL), DevOps (Docker, Nginx, PM2), and a full DSA path with solutions in
Python **and** Java.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design and the decisions behind it.

## How it works

```
Browser (Monaco editor)
  → Node API  (loads the problem's hidden test cases, authenticates the user)
     → Python grader  (wraps code in a per-language driver, batches the tests)
        → Judge0       (runs untrusted code in a locked-down sandbox: no network, CPU/mem caps)
  ← verdict (e.g. "AC — passed 4/4") returns up the chain
```

## Repository layout

```
apps/
  web/      Next.js (App Router, TS, Tailwind) — UI, lesson viewer, Monaco editor
  api/      Node API (Express, TS) — auth, content, submit-and-grade orchestration
  grader/   Python (FastAPI) — wraps code, calls Judge0, compares output, computes verdict
packages/
  db/       Prisma schema + the content seed pipeline
  runners/  per-language driver harness templates
content/    git-authored lessons/problems (this is how you add every topic)
infra/      docker-compose.yml, Nginx config, Judge0 host-prep docs
```

## Tech decisions (locked in)

- **Database:** PostgreSQL only (Mongo dropped — content MDX lives in TEXT/JSONB columns).
- **ORM:** Prisma.
- **Deploy:** all-Docker via `infra/docker-compose.yml`. No PM2 (Docker restart policies instead).
- **Sandbox:** self-hosted Judge0 1.13.1. **Requires cgroup v1 host prep** —
  see [infra/judge0/README.md](infra/judge0/README.md). Target host: Ubuntu 22.04.

---

## Local development

> Prerequisites: Node 20+, Docker Desktop (for Postgres + Judge0). On Windows, run the app
> processes in PowerShell and the infra in Docker.

```bash
cp .env.example .env          # then edit secrets
npm install

# 1) bring up infra (Postgres + Judge0 stack)
docker compose -f infra/docker-compose.yml up -d postgres judge0-db judge0-redis judge0-server judge0-workers

# 2) create the schema + load sample content
npm run db:generate
npm run db:migrate            # creates tables
npm run db:seed               # loads tracks + the Two Sum sample, plus demo users

# 3) run the services (separate terminals)
npm run dev:api               # http://localhost:4000
npm --workspace apps/grader run dev   # or: uvicorn app.main:app --port 8001 (in apps/grader)
npm run dev:web               # http://localhost:3000
```

Open http://localhost:3000 → **Two Sum** → sign in (`student@reborn.dev` / `student1234`) →
write a solution in Python or Java → **Submit** → see the per-test verdict.

## Production (Ubuntu 22.04 VPS)

1. Do the **Judge0 cgroup host prep** first: [infra/judge0/README.md](infra/judge0/README.md).
2. Put TLS certs in `infra/nginx/certs/` (`fullchain.pem`, `privkey.pem`).
3. `cp .env.example .env`, set strong `AUTH_JWT_SECRET` / `NEXTAUTH_SECRET` and real hostnames.
4. `docker compose -f infra/docker-compose.yml up -d --build`
5. Run migrations + seed once: `docker compose exec api node -e "..."` or run the `db` package
   against the production `DATABASE_URL`.

Nginx terminates TLS and proxies to the web + API; Judge0 is never exposed publicly.

---

## Adding content (every topic you want)

This is the whole point of the design: **adding a topic = adding files**, never code.

1. Copy `content/_TEMPLATE/topic/` to `content/topics/<track>/<slug>/`.
2. Fill in `topic.yaml`, `lessons/*.mdx`, `problems/*`, `cheatsheet.mdx`, `interview/*.mdx`.
3. `npm run db:seed` (idempotent — safe to re-run).

Tracks already scaffolded: `dsa`, `frontend`, `backend`, `databases`, `devops`. The **Arrays**
topic (`content/topics/dsa/arrays/`) is the gold-standard template: 4 lessons (beginner→advanced),
a pattern-recognition guide, a cheatsheet, a mock-interview set, and **8 graded problems
Easy→Hard** (Two Sum, Contains Duplicate, Best Time to Buy/Sell Stock, Maximum Subarray, Move
Zeroes, Product Except Self, Rotate Array, Trapping Rain Water) — each with Python & Java
starter/solution/driver and hidden tests. Clone its shape for the other 16 DSA patterns.

See `content/_TEMPLATE/README.md` for the FUNCTION vs STDIO grading modes and how to handle
topics that aren't auto-gradable yet (HTML/CSS layout, Nginx config — lessons + projects for now).

### Verify content before seeding

`scripts/verify_content.py` is an **offline dry-run** (no Judge0 needed): it wraps each problem's
reference solution in its driver, runs every test case in every supported language, and confirms
the output matches. Use it as a CI gate.

```bash
python scripts/verify_content.py    # needs python + a JDK on PATH
```

The shipped Arrays topic (8 problems) passes all cases in both Python and Java.

## Status / roadmap

Built so far:

- **M0–M2** — scaffold, docker-compose, Postgres schema + seed pipeline, auth (JWT + roles),
  and the **full execution slice** (Monaco → API → grader → Judge0 → verdict) with working
  Python+Java samples (Two Sum, Contains Duplicate).
- **M3 — lesson viewer** — track browser → topic overview → MDX lesson pages, cheatsheets,
  "mark complete".
- **M4 — progress dashboard** — streaks, solved/completed counts, recent submissions.
- **M5 — admin CMS** — role-gated problem editor with a **test-case dry-run** (grades the
  reference solution to confirm the tests are self-consistent before publishing).
- **M7 (partial)** — interview-prep flashcards + timed sets, and a projects module (brief pages).

**Remaining = mostly content authoring**, which scales via the `content/` pipeline (no code
changes): populate all 17 DSA patterns (15–30 problems each in Python + Java) and the
frontend/backend/databases/devops topics. Auto-grading for non-code topics (HTML/CSS layout,
Nginx config) is a future grader type. See ARCHITECTURE.md §9.

> **Note:** the `Project` model was added after the initial migration — run `npm run db:migrate`
> again to pick it up before seeding projects.
