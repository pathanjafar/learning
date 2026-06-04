"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { BROWSER_API, type ProblemView } from "@/lib/api";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const MONACO_LANG: Record<string, string> = {
  python: "python", java: "java", javascript: "javascript", typescript: "typescript",
};

interface SubmissionResult {
  verdict: "PENDING";
  message: string;
}

export default function ProblemWorkbench({ problem }: { problem: ProblemView }) {
  const { data: session } = useSession();
  const token = (session as any)?.apiToken as string | undefined;

  const [lang, setLang] = useState(problem.languages[0]);
  const [code, setCode] = useState(problem.starterCode[problem.languages[0]] ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function switchLang(language: string) {
    setLang(language);
    setCode(problem.starterCode[language] ?? "");
    setResult(null);
  }

  async function submit() {
    if (!token) {
      setErr("Please sign in to submit.");
      return;
    }

    setSubmitting(true);
    setErr(null);
    setResult(null);
    try {
      const response = await fetch(`${BROWSER_API}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ problemSlug: problem.slug, language: lang, code }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "submission failed");
      setResult(body);
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-panel overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <select value={lang} onChange={(event) => switchLang(event.target.value)}
          className="bg-ink border border-slate-700 rounded px-2 py-1 text-sm">
          {problem.languages.map((language) => <option key={language} value={language}>{language}</option>)}
        </select>
        <button onClick={submit} disabled={submitting}
          className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {submitting ? "Submitting..." : "Submit for Review"}
        </button>
      </div>

      <Editor height="340px" theme="vs-dark" language={MONACO_LANG[lang]} value={code}
        onChange={(value) => setCode(value ?? "")} options={{ minimap: { enabled: false }, fontSize: 14 }} />

      <div className="p-3 text-sm">
        {err && <p className="text-red-400">{err}</p>}
        {result && (
          <div className="rounded bg-blue-900/30 border border-blue-700 p-3">
            <p className="text-blue-400 font-semibold">Submitted for Review</p>
            <p className="text-blue-300 text-xs mt-1">{result.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
