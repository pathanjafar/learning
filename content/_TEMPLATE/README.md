# Topic template — copy this to add any new topic

To add a topic (e.g. `react`, `docker`, `sql`, or a DSA pattern like `strings`):

1. Copy `_TEMPLATE/topic/` to `content/topics/<track>/<topic-slug>/`.
2. Edit `topic.yaml` — set `track:` to an existing track slug (dsa | frontend | backend |
   databases | devops) and a unique `slug:`.
3. Fill in `lessons/*.mdx` (beginner → intermediate → advanced via the `level` frontmatter).
4. For each practice problem, copy `problem-template/` into `problems/<problem-slug>/` and fill
   in `problem.yaml`, `statement.mdx`, `tests.json`, and the `starter/`, `solution/`, `drivers/`
   files for each language you support.
5. Add `cheatsheet.mdx` and `interview/*.mdx` questions.
6. Run `npm run db:seed` — it upserts everything idempotently.

No application code changes are ever needed to add content. That's the scalability contract.

## Problem modes

- **FUNCTION** (most DSA + algorithm problems): user implements a signature; you provide a
  `drivers/<lang>` file with a `{{SOLUTION}}` placeholder that parses stdin and prints output.
- **STDIO** (full-program exercises): set `ioMode: stdio`, omit `drivers/`; the user's program
  reads the test `input` from stdin and writes the answer to stdout.

## Visual and configuration topics

Use lessons + interview questions + projects for visual and configuration topics. The content structure
supports adding those problem types without schema changes.
