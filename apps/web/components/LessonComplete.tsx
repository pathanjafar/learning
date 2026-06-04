"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { BROWSER_API } from "@/lib/api";

export default function LessonComplete({ topicId, lessonId }: { topicId: number; lessonId: number }) {
  const { data: session } = useSession();
  const token = (session as any)?.apiToken as string | undefined;
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function mark() {
    if (!token) return;
    setBusy(true);
    await fetch(`${BROWSER_API}/me/lessons/complete`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ topicId, lessonId }),
    });
    setDone(true);
    setBusy(false);
  }

  if (!token) return <p className="mt-8 text-sm text-slate-500">Sign in to track your progress.</p>;
  return (
    <button onClick={mark} disabled={busy || done}
      className="mt-8 rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
      {done ? "✓ Completed" : busy ? "Saving…" : "Mark as complete"}
    </button>
  );
}
