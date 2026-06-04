"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { BROWSER_API, type ProblemView } from "@/lib/api";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const MONACO_LANG: Record<string, string> = {
  python: "python", java: "java", javascript: "javascript", typescript: "typescript",
};

interface CaseResult {
  index: number; isHidden: boolean; status: string;
  timeMs: number | null; input?: string; expected?: string; actual?: string; stderr?: string;
}
interface GradeResult {
  verdict: string; passed: number; total: number;
  compileOutput: string | null; results: CaseResult[];
}

export default function ProblemWorkbench({ problem }: { problem: ProblemView }) {
  const { data: session } = useSession();
  const token = (session as any)?.apiToken as string | undefined;

  const [lang, setLang] = useState(problem.languages[0]);
  const [code, setCode] = useState(problem.starterCode[problem.languages[0]] ?? "");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function switchLang(l: string) {
    setLang(l);
    setCode(problem.starterCode[l] ?? "");
    setResult(null);
  }

  async function submit() {
    if (!token) { setErr("Please sign in to submit."); return; }
    setRunning(true); setErr(null); setResult(null);
    try {
      const r = await fetch(`${BROWSER_API}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ problemSlug: problem.slug, language: lang, code }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "submission failed");
      setResult(await r.json());
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setRunning(false);
    }
  }

  const ok = result?.verdict === "AC";

  return (
    <div className="rounded-xl border border-slate-800 bg-panel overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <select value={lang} onChange={(e) => switchLang(e.target.value)}
          className="bg-ink border border-slate-700 rounded px-2 py-1 text-sm">
          {problem.languages.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <button onClick={submit} disabled={running}
          className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {running ? "Running…" : "Submit"}
        </button>
      </div>

      <Editor height="340px" theme="vs-dark" language={MONACO_LANG[lang]} value={code}
        onChange={(v) => setCode(v ?? "")} options={{ minimap: { enabled: false }, fontSize: 14 }} />

      <div className="p-3 text-sm">
        {err && <p className="text-red-400">{err}</p>}
        {result && (
          <div>
            <p className={ok ? "text-green-400 font-semibold" : "text-amber-400 font-semibold"}>
              {result.verdict} — passed {result.passed}/{result.total}
            </p>
            {result.compileOutput && (
              <pre className="mt-2 bg-ink p-2 rounded text-xs text-red-300 overflow-x-auto">{result.compileOutput}</pre>
            )}
            <ul className="mt-2 space-y-1">
              {result.results.map((c) => (
                <li key={c.index} className="flex items-center gap-2">
                  <span className={c.status === "AC" ? "text-green-400" : "text-red-400"}>
                    {c.status === "AC" ? "✓" : "✗"}
                  </span>
                  <span className="text-slate-400">
                    Test {c.index + 1}{c.isHidden ? " (hidden)" : ""}
                    {c.timeMs != null ? ` · ${c.timeMs}ms` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
