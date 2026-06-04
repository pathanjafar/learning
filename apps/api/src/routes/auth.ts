import { Router } from "express";
import { z } from "zod";
import { prisma } from "@reborn/db";
import { hashPassword, verifyPassword, signToken } from "../auth.js";

export const authRouter = Router();

const credentials = z.object({ email: z.string().email(), password: z.string().min(6) });
const registration = credentials.extend({ name: z.string().min(1) });

authRouter.post("/register", async (req, res) => {
  const parsed = registration.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, email, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "email already registered" });

  const user = await prisma.user.create({
    data: { name, email, role: "STUDENT", passwordHash: await hashPassword(password) },
  });
  const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
  return res.json({ token: signToken(payload), user: payload });
});

authRouter.post("/login", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
  return res.json({ token: signToken(payload), user: payload });
});
