import { Router } from "express";
import { z } from "zod";
import { prisma } from "@reborn/db";
import { requireAuth } from "../middleware.js";

export const meRouter = Router();
meRouter.use(requireAuth);

// Dashboard summary: streak, counts, recent submissions, solved problem slugs.
meRouter.get("/me/dashboard", async (req, res) => {
  const userId = req.user!.sub;
  const [streak, solvedProgress, recent, completedLessons] = await Promise.all([
    prisma.streak.findUnique({ where: { userId } }),
    prisma.progress.findMany({
      where: { userId, status: "solved", problemId: { not: null } },
      select: { problemId: true },
    }),
    prisma.submission.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { problem: { select: { slug: true, title: true } } },
    }),
    prisma.progress.count({ where: { userId, status: "completed", lessonId: { not: null } } }),
  ]);

  const solvedSlugs = solvedProgress.length
    ? (
        await prisma.problem.findMany({
          where: { id: { in: solvedProgress.map((p) => p.problemId!) } },
          select: { slug: true },
        })
      ).map((p) => p.slug)
    : [];

  res.json({
    streak: streak ?? { current: 0, longest: 0, lastActiveDate: null },
    solvedCount: solvedSlugs.length,
    completedLessons,
    solvedSlugs,
    recentSubmissions: recent.map((s) => ({
      problemSlug: s.problem.slug,
      problemTitle: s.problem.title,
      verdict: s.verdict,
      lang: s.lang,
      passed: s.passed,
      total: s.total,
      createdAt: s.createdAt,
    })),
  });
});

// Mark a lesson completed (find-then-write: compound unique has nullable fields).
const lessonDone = z.object({ topicId: z.number(), lessonId: z.number() });
meRouter.post("/me/lessons/complete", async (req, res) => {
  const parsed = lessonDone.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const userId = req.user!.sub;
  const { topicId, lessonId } = parsed.data;

  const existing = await prisma.progress.findFirst({ where: { userId, lessonId, problemId: null } });
  if (existing) {
    await prisma.progress.update({ where: { id: existing.id }, data: { status: "completed" } });
  } else {
    await prisma.progress.create({ data: { userId, topicId, lessonId, status: "completed" } });
  }
  res.json({ ok: true });
});
