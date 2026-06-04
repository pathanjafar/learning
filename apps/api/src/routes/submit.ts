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

  const drivers = (problem.drivers as Record<string, string> | null) ?? {};

  let grade;
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

  const userId = req.user!.sub;
  await prisma.submission.create({
    data: {
      userId,
      problemId: problem.id,
      code,
      lang: language,
      verdict: grade.verdict,
      passed: grade.passed,
      total: grade.total,
      runtimeMs: grade.maxTimeMs,
      memoryKb: grade.maxMemoryKb,
    },
  });

  // Update progress + streak on a fully-correct solve.
  // (find-then-write rather than upsert: Prisma can't match a compound unique with a null field.)
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
  }

  // The grader already stripped hidden inputs/expected; safe to return verbatim.
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
