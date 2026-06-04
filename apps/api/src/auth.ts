import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";

const SECRET = process.env.AUTH_JWT_SECRET || "dev-insecure-secret";

export interface TokenPayload {
  sub: number;
  email: string;
  name: string;
  role: "STUDENT" | "ADMIN";
}

export function signToken(p: TokenPayload): string {
  return jwt.sign(p, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload;
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

/** Verifies against either a bcrypt hash (real registrations) or the seed's `seed$sha256` scheme. */
export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  if (stored.startsWith("seed$")) {
    return "seed$" + createHash("sha256").update(pw).digest("hex") === stored;
  }
  return bcrypt.compare(pw, stored);
}
