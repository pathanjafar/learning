"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function AdminHome() {
  const { data: session, status } = useSession();
  const role = (session as any)?.role;

  if (status === "loading") return <p className="text-slate-500">Loading…</p>;
  if (role !== "ADMIN")
    return <p className="text-red-400">Admin access required. (The API also enforces this on every write.)</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-white">Admin CMS</h1>
      <p className="text-slate-400 mt-2">Create and edit content. All writes are re-checked server-side.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/admin/problems/new" className="rounded-lg border border-slate-800 bg-panel p-5 hover:border-accent">
          <div className="font-semibold text-white">New / edit problem</div>
          <div className="text-sm text-slate-500 mt-1">Statement, languages, test cases, dry-run check</div>
        </Link>
      </div>
      <p className="mt-8 text-sm text-slate-500">
        Tip: bulk content is best authored as files under <code>content/</code> and loaded with
        <code> npm run db:seed</code>. The CMS is for quick edits and one-off additions.
      </p>
    </div>
  );
}
