# Render Deployment

The root `render.yaml` is a Render Blueprint for PostgreSQL, the Express API, and the Next.js web
app. Both apps build from their existing Dockerfiles.

## Before deploying

1. Push the repository to GitHub or GitLab.
2. Ensure the desired Render service names are available. If you rename them, use the generated
   public URLs when setting the web environment variables.
3. Treat Render free instances as development or hobby infrastructure, not production.

## Create the Blueprint

In the Render dashboard:

1. Choose **New > Blueprint**.
2. Connect this repository.
3. Apply `render.yaml`.
4. Supply the prompted variables:

| Variable | Value |
| --- | --- |
| `NEXTAUTH_URL` | Public URL of `reborn-web` |
`DATABASE_URL`, `API_INTERNAL_URL`, `AUTH_JWT_SECRET`, and `NEXTAUTH_SECRET` are wired or generated
by the Blueprint.

## Database setup

The API container runs migrations and the idempotent content seed before starting, which works on
free web services and ensures a new database is ready immediately.

To reload edited content later, open an API shell and run:

```bash
npm run db:seed
```

## Verify

- API health: `https://<api-service>.onrender.com/health`
- Web app: `https://<web-service>.onrender.com`
- Student submission: sign in, open a problem, and select **Submit for Review**

The API stores submissions with verdict `PENDING`; it does not execute student code.

## Railway and Fly.io

The same two Dockerfiles can be deployed on Railway or Fly.io. Create a managed PostgreSQL
database, set the variables from `.env.example`, run `npm run db:migrate:deploy`, then run
`npm run db:seed` once.

## Current Render references

- Blueprint YAML reference: https://render.com/docs/blueprint-spec
- Free instance limitations: https://render.com/free
