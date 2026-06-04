import Link from "next/link";
import { serverGet, type TrackView } from "@/lib/api";

// SSR track browser (SEO-friendly). Lists every track + its topics with counts.
export default async function Home() {
  const tracks = (await serverGet<TrackView[]>("/tracks")) ?? [];

  return (
    <div>
      <section className="mb-10">
        <h1 className="text-3xl font-bold text-white">Learn to build software — and ace the interview</h1>
        <p className="text-slate-400 mt-2 max-w-2xl">
          Frontend, backend, databases, DevOps and a full DSA path. Read the lesson, solve graded
          problems in the browser, build projects, and drill interview questions.
        </p>
      </section>

      {tracks.length === 0 ? (
        <p className="text-slate-500">No tracks yet. Run <code>npm run db:seed</code> to load content.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {tracks.map((t) => (
            <Link key={t.id} href={`/tracks/${t.slug}`}
              className="rounded-xl border border-slate-800 bg-panel p-5 hover:border-accent transition block">
              <div className="text-xs uppercase tracking-wide text-accent">{t.category}</div>
              <h2 className="text-xl font-semibold text-white mt-1">{t.title}</h2>
              <ul className="mt-3 space-y-1 text-sm">
                {t.topics.map((tp) => (
                  <li key={tp.id} className="flex justify-between text-slate-300">
                    <span>{tp.title}</span>
                    <span className="text-slate-500">
                      {tp._count.lessons} lessons · {tp._count.problems} problems
                    </span>
                  </li>
                ))}
                {t.topics.length === 0 && <li className="text-slate-500">Topics coming soon</li>}
              </ul>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-10 text-sm text-slate-500">
        Try the sample problem:{" "}
        <Link className="text-accent underline" href="/problems/two-sum">Two Sum →</Link>
      </p>
    </div>
  );
}
