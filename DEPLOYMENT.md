# Deployment

Reborn needs three runtime services: PostgreSQL, the Express API, and the Next.js web app.
Submitted code is stored for review and is never executed.

## Render

Use the root `render.yaml` Blueprint. It creates the API, web app, and PostgreSQL database.
See `DEPLOY_RENDER.md` for the exact setup.

## Railway

1. Create a PostgreSQL service.
2. Deploy `apps/api/Dockerfile` and set `DATABASE_URL`, `AUTH_JWT_SECRET`, and `PORT=4000`.
3. Deploy `apps/web/Dockerfile` and set `NEXTAUTH_URL`, `NEXTAUTH_SECRET`,
   `API_INTERNAL_URL`, and `PORT=3000`.

The API container runs migrations and the idempotent content seed whenever it starts.

## Fly.io

Deploy the two Dockerfiles as separate apps and use Fly Postgres or another managed PostgreSQL
provider. Set the same environment variables listed above, then run migrations and seed once.

## Self-hosted Docker

Copy `.env.example` to `.env`, add TLS certificates under `infra/nginx/certs/`, then run:

```bash
docker compose -f infra/docker-compose.yml up -d --build
```
