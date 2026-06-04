"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("student@reborn.dev");
  const [password, setPassword] = useState("student1234");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) setError("Invalid credentials");
    else router.push("/");
  }

  return (
    <form onSubmit={submit} className="max-w-sm mx-auto mt-12 space-y-4">
      <h1 className="text-2xl font-bold text-white">Sign in</h1>
      <p className="text-xs text-slate-500">Seeded demo: student@reborn.dev / student1234</p>
      <input className="w-full rounded bg-panel border border-slate-700 px-3 py-2"
        value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
      <input type="password" className="w-full rounded bg-panel border border-slate-700 px-3 py-2"
        value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button className="w-full rounded bg-accent py-2 font-medium text-white">Sign in</button>
    </form>
  );
}
