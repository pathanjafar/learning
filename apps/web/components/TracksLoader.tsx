"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Topic {
  id: number;
  slug: string;
  title: string;
  _count: { lessons: number; problems: number };
}

interface Track {
  id: number;
  slug: string;
  title: string;
  category: string;
  topics: Topic[];
}

export function TracksLoader() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const res = await fetch("/api/backend/tracks");
        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }
        const data = await res.json();
        setTracks(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tracks");
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();
  }, []);

  if (loading) {
    return <div className="text-slate-500">Loading tracks...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 border border-red-500 rounded">
        Error loading tracks: {error}
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="text-slate-500">
        No tracks yet. Run <code>npm run db:seed</code> to load content.
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {tracks.map((track) => (
        <Link
          key={track.id}
          href={`/tracks/${track.slug}`}
          className="rounded-xl border border-slate-800 bg-panel p-5 hover:border-accent transition block"
        >
          <div className="text-xs uppercase tracking-wide text-accent">
            {track.category}
          </div>
          <h2 className="text-xl font-semibold text-white mt-1">
            {track.title}
          </h2>
          <ul className="mt-3 space-y-1 text-sm">
            {track.topics.map((topic) => (
              <li
                key={topic.id}
                className="flex justify-between text-slate-300"
              >
                <span>{topic.title}</span>
                <span className="text-slate-500">
                  {topic._count.lessons} lessons / {topic._count.problems}{" "}
                  problems
                </span>
              </li>
            ))}
            {track.topics.length === 0 && (
              <li className="text-slate-500">Topics coming soon</li>
            )}
          </ul>
        </Link>
      ))}
    </div>
  );
}
