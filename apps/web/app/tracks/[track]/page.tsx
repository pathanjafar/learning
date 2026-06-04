import Link from "next/link";
import { notFound } from "next/navigation";
import { serverGet, type TrackView } from "@/lib/api";

// A track's topic list. (Reuses the /tracks payload and picks the one we need.)
export default async function TrackPage({ params }: { params: { track: string } }) {
  const tracks = (await serverGet<TrackView[]>("/tracks")) ?? [];
  const track = tracks.find((t) => t.slug === params.track);
  if (!track) notFound();

  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-accent">{track.category}</div>
      <h1 className="text-3xl font-bold text-white">{track.title}</h1>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {track.topics.map((tp) => (
          <Link key={tp.id} href={`/tracks/${track.slug}/${tp.slug}`}
            className="rounded-lg border border-slate-800 bg-panel p-4 hover:border-accent transition">
            <div className="font-semibold text-white">{tp.title}</div>
            <div className="text-sm text-slate-500 mt-1">
              {tp._count.lessons} lessons · {tp._count.problems} problems
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
