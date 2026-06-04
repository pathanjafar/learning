"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { BROWSER_API } from "@/lib/api";

interface TestRow { input: string; expected: string; isHidden: boolean; compareMode: string; weight: number }
const blankTest = (): TestRow => ({ input: "", expected: "", isHidden: false, compareMode: "TRIMMED", weight: 1 });

// Lean problem editor. starterCode/solutions/drivers are entered as JSON keyed by language so a
// single form covers any language set. The dry-run grades the reference solution to confirm the
// test cases are self-consistent before publishing.
export default function NewProblem() {
  const { data: session } = useSession();
  const token = (session as any)?.apiToken as string | undefined;
  const role = (session as any)?.role;

  const [form, setForm] = useState({
    topicId: 1, slug: "", title: "", difficulty: "EASY", ioMode: "FUNCTION",
    languages: "python,java", statementMdx: "",
    starterCode: '{\n  "python": "def solve():\\n    pass"\n}',
    solutions: '{\n  "python": "def solve():\\n    return 0"\n}',
    drivers: '{\n  "python": "{{SOLUTION}}\\nprint(solve())"\n}',
  });
  const [tests, setTests] = useState<TestRow[]>([blankTest()]);
  const [msg, setMsg] = useState<string | null>(null);

  if (role !== "ADMIN") return <p className="text-red-400">Admin access required.</p>;

  const up = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function save(dryRunFirst: boolean) {
    setMsg(null);
    try {
      const body = {
        topicId: Number(form.topicId),
        slug: form.slug, title: form.title, difficulty: form.difficulty, ioMode: form.ioMode,
        languages: form.languages.split(",").map((s) => s.trim()).filter(Boolean),
        statementMdx: form.statementMdx,
        starterCode: JSON.parse(form.starterCode),
        solutions: JSON.parse(form.solutions),
        drivers: form.ioMode === "FUNCTION" ? JSON.parse(form.drivers) : undefined,
        testCases: tests,
      };
      const r = await fetch(`${BROWSER_API}/admin/problems`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(JSON.stringify(await r.json()));
      setMsg(`Saved "${form.slug}".`);
      if (dryRunFirst) {
        const lang = body.languages[0];
        const dr = await fetch(`${BROWSER_API}/admin/problems/${form.slug}/dry-run`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ language: lang }),
        });
        const result = await dr.json();
        setMsg(`Saved. Dry-run (${lang}): ${result.healthy ? "✓ healthy" : "✗ FAILED"} — ${result.verdict} ${result.passed}/${result.total}`);
      }
    } catch (e: any) {
      setMsg("Error: " + e.message);
    }
  }

  const field = "w-full rounded bg-panel border border-slate-700 px-3 py-2 text-sm";

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white">New / edit problem</h1>
      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <input className={field} placeholder="topicId" value={form.topicId} onChange={(e) => up("topicId", e.target.value)} />
          <input className={field} placeholder="slug (unique)" value={form.slug} onChange={(e) => up("slug", e.target.value)} />
        </div>
        <input className={field} placeholder="title" value={form.title} onChange={(e) => up("title", e.target.value)} />
        <div className="grid grid-cols-3 gap-3">
          <select className={field} value={form.difficulty} onChange={(e) => up("difficulty", e.target.value)}>
            <option>EASY</option><option>MEDIUM</option><option>HARD</option>
          </select>
          <select className={field} value={form.ioMode} onChange={(e) => up("ioMode", e.target.value)}>
            <option>FUNCTION</option><option>STDIO</option>
          </select>
          <input className={field} placeholder="languages csv" value={form.languages} onChange={(e) => up("languages", e.target.value)} />
        </div>
        <textarea className={field} rows={4} placeholder="statement (markdown)" value={form.statementMdx} onChange={(e) => up("statementMdx", e.target.value)} />
        <label className="text-xs text-slate-500">starterCode (JSON by language)</label>
        <textarea className={`${field} font-mono`} rows={3} value={form.starterCode} onChange={(e) => up("starterCode", e.target.value)} />
        <label className="text-xs text-slate-500">solutions (JSON by language)</label>
        <textarea className={`${field} font-mono`} rows={3} value={form.solutions} onChange={(e) => up("solutions", e.target.value)} />
        {form.ioMode === "FUNCTION" && (
          <>
            <label className="text-xs text-slate-500">drivers (JSON by language, with {"{{SOLUTION}}"})</label>
            <textarea className={`${field} font-mono`} rows={3} value={form.drivers} onChange={(e) => up("drivers", e.target.value)} />
          </>
        )}
      </div>

      <h2 className="mt-6 font-semibold text-white">Test cases</h2>
      {tests.map((t, i) => (
        <div key={i} className="mt-2 grid grid-cols-12 gap-2 items-center">
          <textarea className={`${field} col-span-4`} rows={2} placeholder="input (stdin)" value={t.input}
            onChange={(e) => setTests((ts) => ts.map((x, j) => j === i ? { ...x, input: e.target.value } : x))} />
          <textarea className={`${field} col-span-4`} rows={2} placeholder="expected (stdout)" value={t.expected}
            onChange={(e) => setTests((ts) => ts.map((x, j) => j === i ? { ...x, expected: e.target.value } : x))} />
          <select className={`${field} col-span-2`} value={t.compareMode}
            onChange={(e) => setTests((ts) => ts.map((x, j) => j === i ? { ...x, compareMode: e.target.value } : x))}>
            <option>TRIMMED</option><option>EXACT</option><option>FLOAT</option><option>UNORDERED</option>
          </select>
          <label className="col-span-2 text-xs text-slate-400 flex items-center gap-1">
            <input type="checkbox" checked={t.isHidden}
              onChange={(e) => setTests((ts) => ts.map((x, j) => j === i ? { ...x, isHidden: e.target.checked } : x))} />
            hidden
          </label>
        </div>
      ))}
      <button onClick={() => setTests((ts) => [...ts, blankTest()])} className="mt-2 text-sm text-accent">+ add test case</button>

      <div className="mt-6 flex gap-3">
        <button onClick={() => save(false)} className="rounded bg-slate-700 px-4 py-2 text-sm font-medium text-white">Save</button>
        <button onClick={() => save(true)} className="rounded bg-accent px-4 py-2 text-sm font-medium text-white">Save + dry-run</button>
      </div>
      {msg && <p className="mt-3 text-sm text-slate-300">{msg}</p>}
    </div>
  );
}
