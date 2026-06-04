"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BROWSER_API, type InterviewQ } from "@/lib/api";

// Flashcards + optional timed mode. Reveal the answer per card; "Timed set" counts down.
export default function InterviewPage({ params }: { params: { track: string; topic: string } }) {
  const { track, topic } = params;
  const [cards, setCards] = useState<InterviewQ[]>([]);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [timed, setTimed] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    fetch(`${BROWSER_API}/topics/${track}/${topic}/interview`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setCards);
  }, [track, topic]);

  useEffect(() => {
    if (!timed) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timed]);

  if (cards.length === 0) return <p className="text-slate-500">No interview questions for this topic yet.</p>;
  const card = cards[i];

  function next() {
    setRevealed(false);
    setI((n) => (n + 1) % cards.length);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Interview prep</h1>
        <button onClick={() => { setTimed((t) => !t); setSeconds(0); }}
          className="text-sm rounded border border-slate-700 px-3 py-1">
          {timed ? `Timed: ${seconds}s (stop)` : "Start timed set"}
        </button>
      </div>
      <p className="text-sm text-slate-500 mt-1">Card {i + 1} / {cards.length} · {card.type}</p>

      <div className="mt-4 rounded-xl border border-slate-800 bg-panel p-6 min-h-[180px]">
        <div className="prose-reborn">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{card.questionMdx}</ReactMarkdown>
        </div>
        {revealed && (
          <div className="prose-reborn mt-4 border-t border-slate-800 pt-4 text-slate-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{card.answerMdx}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <button onClick={() => setRevealed((r) => !r)}
          className="rounded bg-slate-700 px-4 py-2 text-sm font-medium text-white">
          {revealed ? "Hide answer" : "Reveal answer"}
        </button>
        <button onClick={next} className="rounded bg-accent px-4 py-2 text-sm font-medium text-white">Next →</button>
      </div>
    </div>
  );
}
