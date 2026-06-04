import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware.js";

export const submitRouter = Router();

const submission = z.object({
  problemSlug: z.string(),
  language: z.string(),
  code: z.string().min(1).max(64_000),
});

// Store code for instructor review. Submitted code is never executed by the API.
submitRouter.post("/submit", requireAuth, async (req, res) => {
  const parsed = submission.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { problemSlug, language, code } = parsed.data;
  const problem = await prisma.problem.findUnique({
    where: { slug: problemSlug },
    select: { id: true, topicId: true, languages: true },
  });

  if (!problem) return res.status(404).json({ error: "problem not found" });
  if (!problem.languages.includes(language)) {
    return res.status(400).json({ error: `language '${language}' not allowed for this problem` });
  }

  const userId = req.user!.sub;
  await prisma.submission.create({
    data: {
      userId,
      problemId: problem.id,
      code,
      lang: language,
      verdict: "PENDING",
      passed: 0,
      total: 0,
    },
  });

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

  res.status(201).json({
    verdict: "PENDING",
    message: "Your code has been saved. An instructor will review it and provide feedback.",
  });
});
