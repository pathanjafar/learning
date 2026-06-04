import Link from "next/link";
import { notFound } from "next/navigation";
import { serverGet, type TopicDetail } from "@/lib/api";
import Markdown from "@/components/Markdown";

const diffColor: Record<string, string> = {
  EASY: "text-green-400", MEDIUM: "text-amber-400", HARD: "text-red-400",
};

export default async function TopicPage({ params }: { params: { track: string; topic: string } }) {
  const topic = await serverGet<TopicDetail>(`/topics/${params.track}/${params.topic}`);
  if (!topic) notFound();

  return (
    <div>
      <nav className="text-sm text-slate-500 mb-2">
        <Link href={`/tracks/${topic.track.slug}`} className="hover:text-accent">{topic.track.title}</Link>
        <span> / {topic.title}</span>
      </nav>
      <h1 className="text-3xl font-bold text-white">{topic.title}</h1>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-white">Lessons</h2>
        <ul className="mt-3 space-y-2">
          {topic.lessons.map((l) => (
            <li key={l.slug}>
              <Link href={`/lessons/${topic.slug}/${l.slug}`}
                className="flex justify-between rounded border border-slate-800 bg-panel px-4 py-2 hover:border-accent">
                <span>{l.title}</span>
                <span className="text-xs text-slate-500">{l.level}</span>
              </Link>
            </li>
          ))}
          {topic.lessons.length === 0 && <p className="text-slate-500 text-sm">No lessons yet.</p>}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-white">Practice problems</h2>
        <ul className="mt-3 space-y-2">
          {topic.problems.map((p) => (
            <li key={p.slug}>
              <Link href={`/problems/${p.slug}`}
                className="flex justify-between rounded border border-slate-800 bg-panel px-4 py-2 hover:border-accent">
                <span>{p.title}</span>
                <span className={`text-xs ${diffColor[p.difficulty] ?? ""}`}>{p.difficulty}</span>
              </Link>
            </li>
          ))}
          {topic.problems.length === 0 && <p className="text-slate-500 text-sm">No problems yet.</p>}
        </ul>
      </section>

      {topic.projects.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-white">Projects</h2>
          <ul className="mt-3 space-y-2">
            {topic.projects.map((p) => (
              <li key={p.slug}>
                <Link href={`/projects/${p.slug}`}
                  className="flex justify-between rounded border border-slate-800 bg-panel px-4 py-2 hover:border-accent">
                  <span>{p.title}</span>
                  <span className={`text-xs ${diffColor[p.difficulty] ?? ""}`}>{p.difficulty}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 flex gap-4 text-sm">
        {topic.interviewQuestions.length > 0 && (
          <Link href={`/interview/${topic.track.slug}/${topic.slug}`} className="text-accent underline">
            Interview prep ({topic.interviewQuestions.length}) →
          </Link>
        )}
      </div>

      {topic.cheatsheetMdx && (
        <section className="mt-10 rounded-lg border border-slate-800 bg-panel p-5">
          <h2 className="text-xl font-semibold text-white mb-2">Cheatsheet</h2>
          <Markdown>{topic.cheatsheetMdx}</Markdown>
        </section>
      )}
    </div>
  );
}
