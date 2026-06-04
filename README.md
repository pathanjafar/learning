# Reborn

Reborn is a learning platform for software development and DSA. It includes structured lessons,
practice problems, an in-browser editor, projects, interview prep, progress tracking, and an
admin CMS.

Student code is saved for instructor review. The API does not execute submitted code.

## Stack

- Next.js web app
- Express API
- PostgreSQL with Prisma
- Docker Compose for local/self-hosted deployment
- Render Blueprint for a simple hosted deployment

## Local development

Prerequisites: Node.js 20+ and Docker.

```bash
cp .env.example .env
npm install
docker compose -f infra/docker-compose.yml up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
```

Run the API and web app in separate terminals:

```bash
npm run dev:api
npm run dev:web
```

Open `http://localhost:3000`. Demo student credentials are
`student@reborn.dev` / `student1234`.

## Submission flow

1. A signed-in student writes code in the Monaco editor.
2. `POST /submit` validates the problem and language.
3. The API stores the code with verdict `PENDING`.
4. The UI confirms that the submission was saved for instructor review.

Submitted code is treated as data and is never run by the application.

## Deploy

The easiest path is Render:

1. Push the repository to GitHub.
2. In Render, create a Blueprint from the repository.
3. Set `NEXTAUTH_URL` when prompted.

See [DEPLOY_QUICK_START.md](DEPLOY_QUICK_START.md) and [DEPLOY_RENDER.md](DEPLOY_RENDER.md).

## Content

Add or edit content under `content/`, then run:

```bash
npm run db:seed
```

The offline content verifier can check reference solutions without involving student submissions:

```bash
python scripts/verify_content.py
```
