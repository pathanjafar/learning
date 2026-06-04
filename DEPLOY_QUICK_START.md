# Deploy Reborn on Render

## 1. Push the repository

Push this repository to GitHub or GitLab. Render reads the root `render.yaml` Blueprint.

## 2. Create the Blueprint

In Render, choose **New > Blueprint**, connect the repository, and apply the Blueprint. It creates:

- `reborn-postgres`
- `reborn-api`
- `reborn-web`

## 3. Set prompted variables

Set these web-service variables when Render prompts:

- `NEXTAUTH_URL`: the public web URL, such as `https://reborn-web.onrender.com`
Render wires the internal API connection and generates the database and authentication secrets.

## 4. Deploy

The API runs migrations and idempotently seeds content whenever it starts. Visit
the web URL, sign in, and submit code. Submissions are saved as `PENDING` for instructor review.

See `DEPLOY_RENDER.md` for troubleshooting and Railway/Fly notes.
