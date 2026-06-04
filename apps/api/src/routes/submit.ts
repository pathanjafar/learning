import { Router } from "express";
import { z } from "zod";
import { prisma } from "@reborn/db";
import { requireAuth } from "../middleware.js";
import { callGrader } from "../graderClient.js";

export const submitRouter = Router();

const submission = z.object({
  problemSlug: z.string(),
  language: z.string(),
  code: z.string().min(1).max(64_000),
});

// POST /submit — the core loop: load problem + ALL test cases (incl. hidden), grade, persist.
submitRouter.post("/submit", requireAuth, async (req, res) => {
  const parsed = submission.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { problemSlug, language, code } = parsed.data;

  const problem = await prisma.problem.findUnique({
    where: { slug: problemSlug },
    include: { testCases: { orderBy: { order: "asc" } } },
  });
  if (!problem) return res.status(404).json({ error: "problem not found" });
  if (!problem.languages.includes(language)) {
    return res.status(400).json({ error: `language '${language}' not allowed for this problem` });
  }

  // In "simple" mode (no Judge0), just store the submission as pending review.
  // (If GRADER_URL is set, the old auto-grading flow can still run.)
  const graderUrl = process.env.GRADER_URL;
  const userId = req.user!.sub;

  let grade: any;
  if (graderUrl) {
    // Auto-grading enabled: call the grader
    const drivers = (problem.drivers as Record<string, string> | null) ?? {};
    try {
      grade = await callGrader({
        language,
        code,
        ioMode: problem.ioMode,
        driver: problem.ioMode === "FUNCTION" ? drivers[language] : undefined,
        testCases: problem.testCases.map((t) => ({
          input: t.input,
          expected: t.expected,
          isHidden: t.isHidden,
          compareMode: t.compareMode,
          weight: t.weight,
        })),
      });
    } catch (e) {
      console.error("grader error", e);
      return res.status(502).json({ error: "grader unavailable" });
    }
  } else {
    // No grader: submission is pending manual review
    grade = {
      verdict: "PENDING",
      passed: null,
      total: problem.testCases.length,
      results: [],
      maxTimeMs: null,
      maxMemoryKb: null,
    };
  }

  await prisma.submission.create({
    data: {
      userId,
      problemId: problem.id,
      code,
      lang: language,
      verdict: grade.verdict,
      passed: grade.passed ?? undefined,
      total: grade.total,
      runtimeMs: grade.maxTimeMs ?? undefined,
      memoryKb: grade.maxMemoryKb ?? undefined,
    },
  });

  // Update progress + streak only if auto-grading says AC.
  if (grade.verdict === "AC") {
    const existing = await prisma.progress.findFirst({
      where: { userId, problemId: problem.id, lessonId: null },
    });
    if (existing) {
      await prisma.progress.update({ where: { id: existing.id }, data: { status: "solved" } });
    } else {
      await prisma.progress.create({
        data: { userId, topicId: problem.topicId, problemId: problem.id, status: "solved" },
      });
    }
    await bumpStreak(userId);
  } else if (grade.verdict === "PENDING") {
    // Mark as submitted (not solved) for manual review
    const existing = await prisma.progress.findFirst({
      where: { userId, problemId: problem.id, lessonId: null },
    });
    if (existing) {
      await prisma.progress.update({ where: { id: existing.id }, data: { status: "submitted" } });
    } else {
      await prisma.progress.create({
        data: { userId, topicId: problem.topicId, problemId: problem.id, status: "submitted" },
      });
    }
  }

  res.json(grade);
});

async function bumpStreak(userId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const streak = await prisma.streak.findUnique({ where: { userId } });
  if (!streak) {
    await prisma.streak.create({ data: { userId, current: 1, longest: 1, lastActiveDate: today } });
    return;
  }
  const last = streak.lastActiveDate ? new Date(streak.lastActiveDate) : null;
  if (last) last.setHours(0, 0, 0, 0);
  const dayMs = 86_400_000;
  let current = streak.current;
  if (!last || today.getTime() - last.getTime() >= 2 * dayMs) current = 1; // streak broken
  else if (today.getTime() - last.getTime() === dayMs) current += 1; // consecutive day
  // same-day re-solve: leave current unchanged
  await prisma.streak.update({
    where: { userId },
    data: { current, longest: Math.max(streak.longest, current), lastActiveDate: today },
  });
}
