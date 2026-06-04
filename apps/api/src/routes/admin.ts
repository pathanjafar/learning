import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin); // every admin route re-checks the role server-side

// ----- tracks -----
const trackInput = z.object({ slug: z.string(), title: z.string(), category: z.string(), order: z.number().optional() });
adminRouter.post("/tracks", async (req, res) => {
  const p = trackInput.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  res.json(await prisma.track.upsert({ where: { slug: p.data.slug }, update: p.data, create: p.data }));
});

// ----- topics -----
const topicInput = z.object({
  trackId: z.number(), slug: z.string(), title: z.string(), order: z.number().optional(), cheatsheetMdx: z.string().optional(),
});
adminRouter.post("/topics", async (req, res) => {
  const p = topicInput.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const { trackId, slug, ...rest } = p.data;
  res.json(
    await prisma.topic.upsert({
      where: { trackId_slug: { trackId, slug } },
      update: rest,
      create: { trackId, slug, ...rest },
    })
  );
});

// ----- lessons -----
const lessonInput = z.object({
  topicId: z.number(), slug: z.string(), title: z.string(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]), order: z.number().optional(), contentMdx: z.string(),
});
adminRouter.post("/lessons", async (req, res) => {
  const p = lessonInput.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const { topicId, slug, ...rest } = p.data;
  res.json(
    await prisma.lesson.upsert({
      where: { topicId_slug: { topicId, slug } },
      update: rest,
      create: { topicId, slug, ...rest },
    })
  );
});

// ----- problems (+ nested test cases) -----
const testCaseInput = z.object({
  input: z.string(), expected: z.string(), isHidden: z.boolean().default(false),
  compareMode: z.enum(["EXACT", "TRIMMED", "FLOAT", "UNORDERED"]).default("TRIMMED"),
  weight: z.number().default(1),
});
const problemInput = z.object({
  topicId: z.number(), slug: z.string(), title: z.string(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  ioMode: z.enum(["STDIO", "FUNCTION"]).default("FUNCTION"),
  languages: z.array(z.string()),
  starterCode: z.record(z.string()),
  drivers: z.record(z.string()).optional(),
  solutions: z.record(z.string()),
  hints: z.array(z.string()).optional(),
  statementMdx: z.string(),
  testCases: z.array(testCaseInput),
});
adminRouter.post("/problems", async (req, res) => {
  const p = problemInput.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const { testCases, ...prob } = p.data;
  const problem = await prisma.problem.upsert({
    where: { slug: prob.slug },
    update: { ...prob, hints: prob.hints ?? [] },
    create: { ...prob, hints: prob.hints ?? [] },
  });
  await prisma.testCase.deleteMany({ where: { problemId: problem.id } });
  await prisma.testCase.createMany({
    data: testCases.map((t, i) => ({ ...t, problemId: problem.id, order: i })),
  });
  res.json({ ...problem, testCount: testCases.length });
});

adminRouter.delete("/problems/:slug", async (req, res) => {
  await prisma.problem.delete({ where: { slug: req.params.slug } }).catch(() => {});
  res.json({ ok: true });
});
