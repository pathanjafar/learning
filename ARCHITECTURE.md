# Architecture

## Runtime

```text
Browser -> Next.js web -> Express API -> PostgreSQL
```

The web app renders learning content and provides the code editor. The API owns authentication,
content access, progress, admin writes, and submissions. PostgreSQL stores application data.

## Submission safety

Submitted code is never executed. `POST /submit` validates authentication, problem slug,
language, and payload size, then stores the code with a `PENDING` verdict for instructor review.

## Deployment

- Local/self-hosted: `infra/docker-compose.yml`
- Render: `render.yaml`
- Railway/Fly: deploy the same API and web Dockerfiles with a managed PostgreSQL database

Only the API requires database access. The browser calls the public API URL; server-side Next.js
requests use `API_INTERNAL_URL`.

## Data

Prisma models live in `packages/db/prisma/schema.prisma`. Learning content is authored as files
under `content/` and loaded through the idempotent seed script.
