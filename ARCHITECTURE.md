# Reborn — Architecture Plan

A learn-to-code + DSA platform: structured MDX lessons, in-browser Monaco editor,
auto-graded problems via self-hosted Judge0, progress tracking, projects, interview prep,
and an admin CMS.

> **Status:** planning only. No application code yet. This doc is the contract we build
> against. Decisions flagged **[DECISION]** are ones where your spec had a tension I
> resolved with a recommendation — push back on any of them.

---

## 1. Guiding principles

1. **Prove the risky part first.** The hard, novel piece is *secure code execution + grading*,
   not CRUD. The milestone plan front-loads a thin end-to-end execution slice (§9) before
   we invest in broad content.
2. **Content is data, authored in git.** Lessons/problems live as MDX + frontmatter files in
   the repo and are *seeded* into the databases. This is the "scalable pattern to add the rest" —
   adding a topic = adding files, not hand-editing a DB. Reproducible, reviewable, diffable.
3. **One system of record per fact.** No field lives authoritatively in two databases. The
   Postgres/Mongo boundary (§3) is drawn so nothing needs dual-writes for correctness.
4. **The browser never talks to Judge0.** All execution is orchestrated server-side so test
   inputs (including hidden ones) and resource limits can never be tampered with by a client.

---

## 2. Service topology

```
                          Internet (HTTPS)
                                │
                        ┌───────▼────────┐
                        │     Nginx      │  TLS termination, reverse proxy,
                        │  (reverse proxy)│  rate limiting, gzip/brotli
                        └───┬────────┬────┘
                  /api/auth │        │ /, /tracks, /lessons (SSR)
                  /api/...  │        │
                ┌───────────▼──┐  ┌──▼──────────────┐
                │  Node API    │  │   Next.js app   │  App Router, SSR/RSC,
                │ (Express/    │  │  (web frontend) │  Monaco editor, MDX viewer
                │  Fastify)    │  └─────────────────┘
                └──────┬───────┘
                       │ grade request (problem_id, code, lang)
                ┌──────▼─────────┐
                │  Grader svc    │  Python / FastAPI. Wraps code in per-language
                │  (Python)      │  runner harness, batches to Judge0, compares
                └──────┬─────────┘  outputs, computes verdict.
                       │ submissions (batch)
                ┌──────▼─────────┐
                │  Judge0        │  server + workers + its own Redis + Postgres.
                │  (Dockerized)  │  isolate sandbox: no network, CPU/mem/time caps.
                └────────────────┘

   Data plane (used by Node API + Grader, NOT by Judge0's internal DB):
   ┌────────────┐   ┌────────────┐
   │ PostgreSQL │   │  MongoDB   │
   │ (relational│   │ (content   │
   │  + txnal)  │   │  documents)│
   └────────────┘   └────────────┘
```

**Why a separate Node API when Next.js has API routes?** Two reasons: (a) the grading
orchestration and Judge0 polling are long-lived and stateful — better off the Next.js
request path; (b) your spec asks for it and it gives a clean place for cron-ish jobs
(streak rollover, submission cleanup). Next.js route handlers still own auth/session and
light reads; heavy/secure work proxies to the Node API.

> **[DECISION] Judge0's own datastore is separate from ours.** Judge0 ships with its own
> Postgres + Redis for its job queue. Do **not** reuse our application Postgres for it — keep
> them isolated containers so a Judge0 upgrade can't touch user data. Two Postgres instances
> is intentional.

---

## 3. Data model — the Postgres/Mongo boundary

Your spec says "Postgres for users/progress/metadata, Mongo for lesson/question content,"
but the schema you gave is **fully relational** (everything has integer ids + FKs). Storing
half of a row's identity in Postgres and its body in Mongo invites drift. Here's the boundary
that keeps each fact in exactly one place:

### PostgreSQL — system of record for anything transactional or relational

```
users(id, name, email, role, password_hash, created_at)
tracks(id, slug, title, category, order)
topics(id, track_id, title, slug, order)
lessons(id, topic_id, slug, level, order, mongo_doc_id)        -- skeleton only; body in Mongo
problems(id, topic_id, slug, title, difficulty, language,       -- starter_code small enough to keep here
         starter_code, judge_runner_key, mongo_doc_id)
test_cases(id, problem_id, input, expected, is_hidden,          -- KEPT IN POSTGRES (see below)
           compare_mode, weight)
submissions(id, user_id, problem_id, code, lang, verdict,
            runtime_ms, memory_kb, passed, total, created_at)
progress(id, user_id, topic_id, lesson_id, problem_id, status,  -- one row per (user, unit)
         updated_at, UNIQUE(user_id, lesson_id, problem_id))
streaks(user_id, current, longest, last_active_date)            -- added: needed for "streaks"
interview_questions(id, topic_id, type, mongo_doc_id)           -- skeleton; Q/A body in Mongo
```

### MongoDB — document store for read-heavy authored content

```
lesson_content   { _id, lessonRef, mdx, headings[], codeSamples[], version }
problem_content  { _id, problemRef, statementMdx, constraints, examples[],
                   solutionMdx (revealable), hints[], complexity }
interview_content{ _id, qRef, questionMdx, answerMdx, tags[] }
cheatsheets      { _id, topicRef, mdx, version }
```

> **[DECISION] `test_cases` stay in PostgreSQL, not Mongo.** Grading correctness depends on
> them; they must be transactionally consistent with the problem and never partially seeded.
> Mongo's eventual-consistency story isn't worth the risk here. If hidden inputs get large
> (big arrays/graphs), store the bulky payload in an object store / Mongo GridFS and keep a
> reference — but the default is Postgres `TEXT`/`JSONB`.

> **[DECISION] Why this split at all (vs. Postgres-only JSONB)?** Honestly, Postgres `JSONB`
> could hold the MDX and you'd drop a database. I'm keeping Mongo because (a) you asked for it,
> (b) lesson bodies are genuinely document-shaped and versioned, and (c) it keeps large text
> blobs off the transactional DB's row cache. If you'd rather cut operational surface area,
> say so and I'll collapse to Postgres-only — the seed pipeline (§7) makes that a config change,
> not a rewrite.

Join model: Postgres row is the canonical id; `mongo_doc_id` points to the body. Reads that
need both do a Postgres query for the skeleton + a Mongo `findById`. Content is immutable per
version, so caching is trivial.

---

## 4. Code execution & grading (the core)

### Flow
1. Client submits `{ problemId, language, code }` to Node API (authenticated).
2. Node API loads the problem's `judge_runner_key` + all `test_cases` from Postgres.
3. Node API calls the **Grader (Python/FastAPI)** with code + test cases + limits.
4. Grader wraps user code in the **per-language runner harness** for that problem type,
   then submits a **batch** of (one job per test case) to Judge0 with:
   - `enable_network: false`
   - `cpu_time_limit`, `wall_time_limit`, `memory_limit`, `stack_limit`, `max_processes_and_or_threads`
   - `enable_per_process_and_thread_*_limit: true`
5. Grader polls Judge0 batch tokens, compares each stdout to `expected` using the test case's
   `compare_mode` (exact / trimmed / float-tolerant / unordered-lines), aggregates a verdict
   (`AC / WA / TLE / MLE / RE / CE`), passed/total, max runtime & memory.
6. Node API persists a `submissions` row, updates `progress`, returns the verdict.
   Hidden test cases return pass/fail + (optionally) which index failed — never the input.

### Runner harnesses — the part people forget
DSA problems are usually *function-signature* ("implement `twoSum(nums, target)`"), not
stdin/stdout programs. Judge0 only runs whole programs over stdin/stdout. So each language
needs a **driver template** that: reads stdin → parses args per the problem's I/O spec →
calls the user's solution → serializes the result to stdout in a canonical form.

```
runners/
  python/driver.py.tmpl     # injects user code, parses harness JSON from stdin, calls fn
  java/Main.java.tmpl       # wraps Solution class
  javascript/driver.js.tmpl
  typescript/driver.ts.tmpl # transpile step or ts-node in the image
```

> **[DECISION] Problems declare an `io_mode`.** `"stdio"` (program reads/writes streams) or
> `"function"` (signature + serializer). The runner_key selects the harness. This is what makes
> the same grading engine serve both web-dev exercises and LeetCode-style DSA problems. Without
> it, DSA grading doesn't work — worth nailing down before we write the grader.

### Sandboxing — Judge0 on a Linux VPS
> **[DECISION / GOTCHA] Judge0 needs cgroups configured on the host.** Self-hosted Judge0 uses
> the `isolate` sandbox, which historically requires **cgroup v1** and specific kernel boot
> flags (`systemd.unified_cgroup_hierarchy=0`) plus `privileged: true` on the worker container.
> Modern distros default to cgroup v2 — this is the #1 reason self-hosted Judge0 "works on my
> machine, breaks on the VPS." We pin a Judge0 version known to work with the target kernel and
> document the host prep in the README. **This must be validated on the actual VPS in the
> execution-slice milestone (M2), not discovered at launch.**

Defenses, layered:
- Network disabled per submission (`enable_network:false`) **and** Judge0 workers on an internal
  Docker network with no egress.
- Per-submission CPU/wall/memory/stack/process limits.
- Output size cap (prevent multi-GB stdout DoS).
- Node API rate-limits submissions per user; Grader has a global concurrency cap → backpressure.
- Judge0 is never exposed through Nginx — internal only.

---

## 5. Auth & RBAC

- **NextAuth (Auth.js) with JWT session strategy.** Credentials provider (email + bcrypt/argon2
  hash in Postgres). Room to add OAuth later without schema change.
- `role` (`student` | `admin`) is a JWT claim, set at sign-in from the Postgres `users` row.
- **Two enforcement layers** (defense in depth):
  - Next.js `middleware.ts` gates `/admin/*` routes (UX-level redirect).
  - Node API verifies the JWT and checks role on every mutating/admin endpoint (real security).
- Never trust the client role. The middleware is for redirects; the API is the gate.

---

## 6. Frontend (Next.js App Router)

- **SSR/RSC for content** (lessons, track browser, problem statements) → SEO-friendly, your
  stated constraint. MDX rendered server-side with syntax highlighting (Shiki).
- **Client islands** for the interactive bits: Monaco editor (lazy-loaded, language switcher),
  submission panel, progress widgets, flashcards/timed sets.
- **Route groups:**
  ```
  app/
    (marketing)/            # landing, SEO pages
    (learn)/tracks/[track]/[topic]/[lesson]      # lesson viewer
    (learn)/problems/[slug]                       # editor + grading UI
    (learn)/interview/...                         # flashcards, timed sets
    (dashboard)/progress                          # streaks, completion, filters
    (admin)/admin/...                             # CMS (role-gated)
    api/auth/[...nextauth]                         # NextAuth only; heavy work → Node API
  ```
- **Monaco**: dynamic import (`ssr:false`), language from problem metadata, starter code preloaded,
  theme synced to site.

---

## 7. Content pipeline (the scalability story)

Authoring = adding files under `content/`. A **seed/migrate script** ingests them into Postgres
(skeleton) + Mongo (bodies). Re-runnable and idempotent (upsert by `slug`).

```
content/
  tracks/
    javascript/track.yaml
    react/track.yaml
    dsa-python/track.yaml
    _TEMPLATE/                      # copy-to-create a new track
  topics/
    dsa/arrays/
      topic.yaml
      lessons/01-concept.mdx        # frontmatter: level, order, title
      lessons/02-worked.mdx
      problems/two-sum/
        problem.yaml                # difficulty, io_mode, runner_key, language
        statement.mdx
        solution.python.md
        solution.java.md
        tests.json                  # [{input, expected, is_hidden, compare_mode, weight}]
      interview.mdx
      cheatsheet.mdx
```

- **MDX frontmatter schema is validated at seed time** (zod/pydantic) — a malformed lesson fails
  the seed loudly instead of producing a broken page.
- `_TEMPLATE/` dirs are the "reusable content templates" deliverable. Adding Trees or Graphs =
  copy the template, fill it in, run seed.
- DSA solution files in **both Python and Java** live beside the problem.

This is also what lets the **Admin CMS** (§8) and git-authored content coexist: the CMS writes to
the DBs; an optional "export" can round-trip back to MDX. For v1 the CMS edits DB content directly;
git remains the source for bulk/sample content.

---

## 8. Admin CMS

- Role-gated section (`/admin`). CRUD for tracks, topics, lessons, problems, **test cases**
  (including hidden), and interview questions.
- Test-case editor includes a "dry run against reference solution" button → runs the stored
  solution through the same grader to confirm the test cases are self-consistent before publishing.
- Edits write to Postgres/Mongo through the Node API (role-checked), same data model as seeded content.

---

## 9. Milestone roadmap (you asked me to decide the order)

Ordered to **retire risk early** and keep every milestone shippable/demoable.

| # | Milestone | What lands | Why here |
|---|-----------|-----------|----------|
| **M0** | Scaffold + compose + config | Monorepo layout, `docker-compose.yml` (Next, Node API, Grader, Judge0+its Redis/PG, app Postgres, Mongo, Nginx), env config, README skeleton, content `_TEMPLATE`s + frontmatter schema | Foundation; nothing else can be tested without it |
| **M1** | Auth + RBAC + Postgres migrations | NextAuth credentials, roles, migration tooling (Prisma or Drizzle), `users` + core tables | Everything authenticated depends on this |
| **M2** | **Execution vertical slice** | ONE DSA problem end-to-end: Monaco → Node API → Grader → Judge0 → verdict, with the `function` runner harness, on the real VPS to validate cgroups | **The riskiest unknown — prove it before building breadth** |
| **M3** | Lesson viewer + content pipeline | MDX SSR rendering + Shiki, seed script ingesting `content/` into PG+Mongo | Unlocks all content work |
| **M4** | Progress + dashboard | progress/streaks tables, completion %, difficulty filters | Depends on M1+M2+M3 |
| **M5** | Admin CMS | CRUD + test-case dry-run | Depends on stable data model |
| **M6** | Sample tracks | JavaScript, React, DSA-Python fully populated via pipeline | Proves the scaling pattern with real volume |
| **M7** | Interview prep + projects | flashcards, timed sets, projects module | Additive features |
| **M8** | Prod hardening | Nginx TLS, security headers, rate limits, backups, PM2/replicas, observability | Pre-launch |

I'd build **M0 → M1 → M2** as the first block: that gets you a working, secure
submit-and-grade loop, which is the whole point of the platform and the part most likely to
surprise us. Content breadth (M6) is comparatively mechanical once M2 and M3 exist.

---

## 10. Open decisions for you

1. **PM2 *and* Docker?** Your spec lists both. Running PM2 *inside* a container is an
   anti-pattern unless you specifically want Node cluster-mode multi-core within one container.
   **[DECISION — recommend]** Containerize everything; rely on Docker restart policies +
   `deploy.replicas` for resilience, and use PM2 **only inside the Next.js and Node API images**
   in cluster mode if we need multi-core per container. Alternative: run Next/Node via PM2 on the
   host and only Judge0/DBs in Docker. Pick one — it changes the compose file.
2. **Mongo vs Postgres-only JSONB** (§3) — keep Mongo or collapse to one DB?
3. **ORM/migration tool:** Prisma (great DX, types) vs Drizzle (lighter, SQL-first). I lean
   **Prisma** for this team-content-heavy app unless you object.
4. **Languages at launch:** spec says Python, Java, JS, TS. TS needs a transpile step in the
   runner image — fine, just confirming it's in scope for M2.
5. **VPS specifics:** which provider/OS? Judge0 cgroup setup (§4) depends on the kernel. If you
   tell me the distro I'll pin a known-good Judge0 version in M0.

---

## 11. Repo layout (target)

```
reborn/
  apps/
    web/            # Next.js (App Router, TS, Tailwind)
    api/            # Node API (Express/Fastify, TS)
    grader/         # Python FastAPI grading service
  packages/
    runners/        # per-language driver harness templates
    db/             # Prisma schema + migrations + seed
    content-schema/ # zod/pydantic frontmatter validators
  content/          # git-authored MDX tracks/topics/problems
  infra/
    docker-compose.yml
    nginx/          # site config, TLS
    judge0/         # Judge0 compose fragment + host-prep docs
  README.md
  ARCHITECTURE.md   # this file
```
```
```
