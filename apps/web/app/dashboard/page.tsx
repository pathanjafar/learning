"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { BROWSER_API } from "@/lib/api";

interface Dashboard {
  streak: { current: number; longest: number; lastActiveDate: string | null };
  solvedCount: number;
  completedLessons: number;
  solvedSlugs: string[];
  recentSubmissions: {
    problemSlug: string; problemTitle: string; verdict: string; lang: string;
    passed: number; total: number; createdAt: string;
  }[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const token = (session as any)?.apiToken as string | undefined;
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${BROWSER_API}/me/dashboard`, { headers: { authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData);
  }, [token]);

  if (status === "loading") return <p className="text-slate-500">Loading…</p>;
  if (!token) return <p className="text-slate-400">Please <Link href="/login" className="text-accent underline">sign in</Link>.</p>;
  if (!data) return <p className="text-slate-500">Loading your progress…</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-white">Your dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Current streak" value={`${data.streak.current} 🔥`} />
        <Stat label="Problems solved" value={data.solvedCount} />
        <Stat label="Lessons completed" value={data.completedLessons} />
      </div>

      <h2 className="mt-10 text-xl font-semibold text-white">Recent submissions</h2>
      <ul className="mt-3 space-y-2">
        {data.recentSubmissions.map((s, i) => (
          <li key={i} className="flex items-center justify-between rounded border border-slate-800 bg-panel px-4 py-2">
            <Link href={`/problems/${s.problemSlug}`} className="hover:text-accent">{s.problemTitle}</Link>
            <span className="flex items-center gap-3 text-sm">
              <span className="text-slate-500">{s.lang}</span>
              <span className={s.verdict === "AC" ? "text-green-400" : "text-amber-400"}>
                {s.verdict} {s.passed}/{s.total}
              </span>
            </span>
          </li>
        ))}
        {data.recentSubmissions.length === 0 && <p className="text-slate-500 text-sm">No submissions yet.</p>}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-panel p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
