import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const configuredApi = process.env.API_INTERNAL_URL || "http://localhost:4000";
const API = /^https?:\/\//.test(configuredApi) ? configuredApi : `http://${configuredApi}`;

// NextAuth delegates credential checking to the Node API, which is the auth authority and
// issues the HS256 JWT both services trust. We stash that JWT in the session so the browser
// can call the API as the authenticated user.
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const r = await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(credentials),
        });
        if (!r.ok) return null;
        const { token, user } = await r.json();
        return { id: String(user.sub), name: user.name, email: user.email, role: user.role, apiToken: token } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.apiToken = (user as any).apiToken;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).role = token.role;
      (session as any).apiToken = token.apiToken;
      return session;
    },
  },
  pages: { signIn: "/login" },
};
