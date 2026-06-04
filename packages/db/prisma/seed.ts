/**
 * Content seed pipeline (the "scalability story").
 *
 * Authoring = adding files under /content. This script walks that tree and upserts everything
 * into Postgres idempotently (by slug), so `npm run db:seed` is safe to re-run after edits.
 *
 *   content/
 *     tracks/<trackSlug>/track.yaml            -> Track
 *     topics/<path>/topic.yaml                 -> Topic (links Track by `track:` slug)
 *       lessons/*.mdx                          -> Lesson      (frontmatter: title, level, order)
 *       cheatsheet.mdx                         -> Topic.cheatsheetMdx
 *       interview/*.mdx                        -> InterviewQuestion (frontmatter: type)
 *       problems/<slug>/problem.yaml           -> Problem
 *                       statement.mdx
 *                       tests.json
 *                       starter/<lang>.<ext>
 *                       solution/<lang>.<ext>
 *                       drivers/<lang>.<ext>   (FUNCTION mode only)
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import yaml from "js-yaml";
import matter from "gray-matter";
import { PrismaClient, Level, Difficulty, IoMode, CompareMode, Role } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();
const CONTENT = resolve(__dirname, "../../../content");

const EXT: Record<string, string> = { python: "py", java: "java", javascript: "js", typescript: "ts" };

function read(p: string) {
  return readFileSync(p, "utf8");
}
function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
// A throwaway but deterministic password hash so demo users can log in without bcrypt at seed time.
// The API hashes real registrations with argon2; this matches the API's seed-hash scheme.
function seedHash(pw: string) {
  return "seed$" + createHash("sha256").update(pw).digest("hex");
}

async function seedUsers() {
  await prisma.user.upsert({
    where: { email: "admin@reborn.dev" },
    update: {},
    create: { name: "Admin", email: "admin@reborn.dev", role: Role.ADMIN, passwordHash: seedHash("admin1234") },
  });
  await prisma.user.upsert({
    where: { email: "student@reborn.dev" },
    update: {},
    create: { name: "Demo Student", email: "student@reborn.dev", role: Role.STUDENT, passwordHash: seedHash("student1234") },
  });
  console.log("✓ users: admin@reborn.dev / student@reborn.dev");
}

async function seedTracks() {
  const root = join(CONTENT, "tracks");
  for (const file of walk(root).filter((f) => f.endsWith("track.yaml"))) {
    const t = yaml.load(read(file)) as any;
    await prisma.track.upsert({
      where: { slug: t.slug },
      update: { title: t.title, category: t.category, order: t.order ?? 0 },
      create: { slug: t.slug, title: t.title, category: t.category, order: t.order ?? 0 },
    });
    console.log(`✓ track: ${t.slug}`);
  }
}

async function seedTopic(topicYamlPath: string) {
  const dir = topicYamlPath.replace(/[/\\]topic\.yaml$/, "");
  const meta = yaml.load(read(topicYamlPath)) as any;
  const track = await prisma.track.findUnique({ where: { slug: meta.track } });
  if (!track) throw new Error(`topic ${meta.slug}: unknown track '${meta.track}' (seed tracks first)`);

  const cheatsheetPath = join(dir, "cheatsheet.mdx");
  const topic = await prisma.topic.upsert({
    where: { trackId_slug: { trackId: track.id, slug: meta.slug } },
    update: { title: meta.title, order: meta.order ?? 0, cheatsheetMdx: existsSync(cheatsheetPath) ? read(cheatsheetPath) : null },
    create: {
      trackId: track.id,
      slug: meta.slug,
      title: meta.title,
      order: meta.order ?? 0,
      cheatsheetMdx: existsSync(cheatsheetPath) ? read(cheatsheetPath) : null,
    },
  });

  // ---- lessons ----
  for (const lf of walk(join(dir, "lessons")).filter((f) => f.endsWith(".mdx"))) {
    const { data, content } = matter(read(lf));
    const slug = basename(lf, ".mdx");
    await prisma.lesson.upsert({
      where: { topicId_slug: { topicId: topic.id, slug } },
      update: { title: data.title, level: (data.level as Level) ?? Level.BEGINNER, order: data.order ?? 0, contentMdx: content },
      create: { topicId: topic.id, slug, title: data.title ?? slug, level: (data.level as Level) ?? Level.BEGINNER, order: data.order ?? 0, contentMdx: content },
    });
  }

  // ---- interview questions ----
  for (const qf of walk(join(dir, "interview")).filter((f) => f.endsWith(".mdx"))) {
    const { data, content } = matter(read(qf));
    // Convention: frontmatter `answer` holds the answer body; `content` is the question.
    await prisma.interviewQuestion.create({
      data: { topicId: topic.id, type: data.type ?? "conceptual", questionMdx: content, answerMdx: data.answer ?? "" },
    }).catch(() => {/* allow re-seed: interview Qs are append-only; skip dupes silently */});
  }

  // ---- problems ----
  for (const py of walk(join(dir, "problems")).filter((f) => f.endsWith("problem.yaml"))) {
    await seedProblem(py, topic.id);
  }

  // ---- projects (one MDX per project; frontmatter carries metadata) ----
  for (const pf of walk(join(dir, "projects")).filter((f) => f.endsWith(".mdx"))) {
    const { data, content } = matter(read(pf));
    const slug = data.slug ?? basename(pf, ".mdx");
    await prisma.project.upsert({
      where: { slug },
      update: {
        topicId: topic.id,
        title: data.title ?? slug,
        difficulty: (data.difficulty?.toUpperCase() as Difficulty) ?? Difficulty.EASY,
        order: data.order ?? 0,
        briefMdx: content,
        starterRepoUrl: data.starterRepoUrl ?? null,
      },
      create: {
        slug,
        topicId: topic.id,
        title: data.title ?? slug,
        difficulty: (data.difficulty?.toUpperCase() as Difficulty) ?? Difficulty.EASY,
        order: data.order ?? 0,
        briefMdx: content,
        starterRepoUrl: data.starterRepoUrl ?? null,
      },
    });
  }

  console.log(`✓ topic: ${meta.track}/${meta.slug}`);
}

async function seedProblem(problemYamlPath: string, topicId: number) {
  const dir = problemYamlPath.replace(/[/\\]problem\.yaml$/, "");
  const p = yaml.load(read(problemYamlPath)) as any;
  const langs: string[] = p.languages ?? ["python"];

  const codeBag = (sub: string) =>
    Object.fromEntries(
      langs
        .map((l) => [l, join(dir, sub, `${l}.${EXT[l]}`)] as const)
        .filter(([, f]) => existsSync(f))
        .map(([l, f]) => [l, read(f)])
    );

  const ioMode = (p.ioMode?.toUpperCase() as IoMode) ?? IoMode.FUNCTION;
  const drivers = ioMode === IoMode.FUNCTION ? codeBag("drivers") : null;

  const problem = await prisma.problem.upsert({
    where: { slug: p.slug },
    update: {
      topicId,
      title: p.title,
      difficulty: (p.difficulty?.toUpperCase() as Difficulty) ?? Difficulty.EASY,
      ioMode,
      languages: langs,
      starterCode: codeBag("starter"),
      drivers: drivers ?? undefined,
      solutions: codeBag("solution"),
      hints: p.hints ?? [],
      statementMdx: read(join(dir, "statement.mdx")),
    },
    create: {
      slug: p.slug,
      topicId,
      title: p.title,
      difficulty: (p.difficulty?.toUpperCase() as Difficulty) ?? Difficulty.EASY,
      ioMode,
      languages: langs,
      starterCode: codeBag("starter"),
      drivers: drivers ?? undefined,
      solutions: codeBag("solution"),
      hints: p.hints ?? [],
      statementMdx: read(join(dir, "statement.mdx")),
    },
  });

  // Replace test cases wholesale so edits to tests.json always win.
  await prisma.testCase.deleteMany({ where: { problemId: problem.id } });
  const tests = JSON.parse(read(join(dir, "tests.json"))) as any[];
  await prisma.testCase.createMany({
    data: tests.map((t, i) => ({
      problemId: problem.id,
      input: String(t.input),
      expected: String(t.expected),
      isHidden: !!t.isHidden,
      compareMode: (t.compareMode?.toUpperCase() as CompareMode) ?? CompareMode.TRIMMED,
      weight: t.weight ?? 1,
      order: i,
    })),
  });
  console.log(`  ✓ problem: ${p.slug} (${tests.length} tests)`);
}

async function main() {
  console.log(`Seeding from ${CONTENT}`);
  await seedUsers();
  await seedTracks();
  for (const ty of walk(join(CONTENT, "topics")).filter((f) => f.endsWith("topic.yaml"))) {
    await seedTopic(ty);
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
