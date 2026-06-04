import Link from "next/link";
import { serverGet, type TrackView } from "@/lib/api";

export default async function Home() {
  const tracks = (await serverGet<TrackView[]>("/tracks")) ?? [];

  return (
    <div>
      <section className="mb-10">
        <h1 className="text-3xl font-bold text-white">Learn to build software and ace the interview</h1>
        <p className="text-slate-400 mt-2 max-w-2xl">
          Frontend, backend, databases, DevOps and a full DSA path. Read lessons, submit practice
          problems for review, build projects, and drill interview questions.
        </p>
      </section>

      {tracks.length === 0 ? (
        <p className="text-slate-500">No tracks yet. Run <code>npm run db:seed</code> to load content.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {tracks.map((track) => (
            <Link key={track.id} href={`/tracks/${track.slug}`}
              className="rounded-xl border border-slate-800 bg-panel p-5 hover:border-accent transition block">
              <div className="text-xs uppercase tracking-wide text-accent">{track.category}</div>
              <h2 className="text-xl font-semibold text-white mt-1">{track.title}</h2>
              <ul className="mt-3 space-y-1 text-sm">
                {track.topics.map((topic) => (
                  <li key={topic.id} className="flex justify-between text-slate-300">
                    <span>{topic.title}</span>
                    <span className="text-slate-500">
                      {topic._count.lessons} lessons / {topic._count.problems} problems
                    </span>
                  </li>
                ))}
                {track.topics.length === 0 && <li className="text-slate-500">Topics coming soon</li>}
              </ul>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-10 text-sm text-slate-500">
        Try the sample problem:{" "}
        <Link className="text-accent underline" href="/problems/two-sum">Two Sum</Link>
      </p>
    </div>
  );
}
