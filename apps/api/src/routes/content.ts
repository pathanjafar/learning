import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware.js";

export const contentRouter = Router();

// Track browser: tracks -> topics with lesson/problem counts.
contentRouter.get("/tracks", async (_req, res) => {
  const tracks = await prisma.track.findMany({
    orderBy: { order: "asc" },
    include: {
      topics: {
        orderBy: { order: "asc" },
        include: { _count: { select: { lessons: true, problems: true } } },
      },
    },
  });
  res.json(tracks);
});

// Topic detail: everything needed to render a topic overview page.
contentRouter.get("/topics/:trackSlug/:topicSlug", async (req, res) => {
  const track = await prisma.track.findUnique({ where: { slug: req.params.trackSlug } });
  if (!track) return res.status(404).json({ error: "track not found" });
  const topic = await prisma.topic.findUnique({
    where: { trackId_slug: { trackId: track.id, slug: req.params.topicSlug } },
    include: {
      lessons: { orderBy: { order: "asc" }, select: { slug: true, title: true, level: true, order: true } },
      problems: { orderBy: { id: "asc" }, select: { slug: true, title: true, difficulty: true } },
      projects: { orderBy: { order: "asc" }, select: { slug: true, title: true, difficulty: true } },
      interviewQuestions: { select: { id: true, type: true } },
    },
  });
  if (!topic) return res.status(404).json({ error: "topic not found" });
  res.json({ track: { slug: track.slug, title: track.title }, ...topic });
});

// Interview questions for a topic (questions + answers, for flashcards/timed sets).
contentRouter.get("/topics/:trackSlug/:topicSlug/interview", async (req, res) => {
  const track = await prisma.track.findUnique({ where: { slug: req.params.trackSlug } });
  if (!track) return res.status(404).json({ error: "track not found" });
  const topic = await prisma.topic.findUnique({
    where: { trackId_slug: { trackId: track.id, slug: req.params.topicSlug } },
    include: { interviewQuestions: true },
  });
  if (!topic) return res.status(404).json({ error: "topic not found" });
  res.json(topic.interviewQuestions);
});

// Project brief.
contentRouter.get("/projects/:slug", async (req, res) => {
  const project = await prisma.project.findUnique({ where: { slug: req.params.slug } });
  if (!project) return res.status(404).json({ error: "project not found" });
  res.json(project);
});

// Lesson viewer payload.
contentRouter.get("/lessons/:topicSlug/:lessonSlug", async (req, res) => {
  const topic = await prisma.topic.findFirst({ where: { slug: req.params.topicSlug } });
  if (!topic) return res.status(404).json({ error: "topic not found" });
  const lesson = await prisma.lesson.findUnique({
    where: { topicId_slug: { topicId: topic.id, slug: req.params.lessonSlug } },
  });
  if (!lesson) return res.status(404).json({ error: "lesson not found" });
  res.json(lesson);
});

// Public problem view: everything the editor needs EXCEPT hidden test data and solutions.
contentRouter.get("/problems/:slug", async (req, res) => {
  const problem = await prisma.problem.findUnique({
    where: { slug: req.params.slug },
    include: { testCases: { where: { isHidden: false }, orderBy: { order: "asc" } } },
  });
  if (!problem) return res.status(404).json({ error: "problem not found" });

  const { solutions, drivers, testCases, ...rest } = problem;
  res.json({
    ...rest,
    sampleTests: testCases.map((t) => ({ input: t.input, expected: t.expected })),
    hiddenCount: await prisma.testCase.count({ where: { problemId: problem.id, isHidden: true } }),
  });
});

// Revealable reference solutions (auth-gated so it isn't trivially scraped).
contentRouter.get("/problems/:slug/solution", requireAuth, async (req, res) => {
  const problem = await prisma.problem.findUnique({ where: { slug: req.params.slug } });
  if (!problem) return res.status(404).json({ error: "problem not found" });
  res.json({ solutions: problem.solutions });
});
