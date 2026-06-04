"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { BROWSER_API } from "@/lib/api";

interface TestRow {
  input: string;
  expected: string;
  isHidden: boolean;
  compareMode: string;
  weight: number;
}

const blankTest = (): TestRow => ({
  input: "",
  expected: "",
  isHidden: false,
  compareMode: "TRIMMED",
  weight: 1,
});

export default function NewProblem() {
  const { data: session } = useSession();
  const token = (session as any)?.apiToken as string | undefined;
  const role = (session as any)?.role;
  const [form, setForm] = useState({
    topicId: 1,
    slug: "",
    title: "",
    difficulty: "EASY",
    ioMode: "FUNCTION",
    languages: "python,java",
    statementMdx: "",
    starterCode: '{\n  "python": "def solve():\\n    pass"\n}',
    solutions: '{\n  "python": "def solve():\\n    return 0"\n}',
    drivers: '{\n  "python": "{{SOLUTION}}\\nprint(solve())"\n}',
  });
  const [tests, setTests] = useState<TestRow[]>([blankTest()]);
  const [message, setMessage] = useState<string | null>(null);

  if (role !== "ADMIN") return <p className="text-red-400">Admin access required.</p>;

  const updateForm = (key: string, value: any) => setForm((current) => ({ ...current, [key]: value }));
  const updateTest = (index: number, patch: Partial<TestRow>) =>
    setTests((current) => current.map((test, i) => i === index ? { ...test, ...patch } : test));

  async function save() {
    setMessage(null);
    try {
      const response = await fetch(`${BROWSER_API}/admin/problems`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({
          topicId: Number(form.topicId),
          slug: form.slug,
          title: form.title,
          difficulty: form.difficulty,
          ioMode: form.ioMode,
          languages: form.languages.split(",").map((value) => value.trim()).filter(Boolean),
          statementMdx: form.statementMdx,
          starterCode: JSON.parse(form.starterCode),
          solutions: JSON.parse(form.solutions),
          drivers: form.ioMode === "FUNCTION" ? JSON.parse(form.drivers) : undefined,
          testCases: tests,
        }),
      });
      if (!response.ok) throw new Error(JSON.stringify(await response.json()));
      setMessage(`Saved "${form.slug}".`);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    }
  }

  const field = "w-full rounded bg-panel border border-slate-700 px-3 py-2 text-sm";

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white">New / edit problem</h1>
      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <input className={field} placeholder="topicId" value={form.topicId}
            onChange={(event) => updateForm("topicId", event.target.value)} />
          <input className={field} placeholder="slug (unique)" value={form.slug}
            onChange={(event) => updateForm("slug", event.target.value)} />
        </div>
        <input className={field} placeholder="title" value={form.title}
          onChange={(event) => updateForm("title", event.target.value)} />
        <div className="grid grid-cols-3 gap-3">
          <select className={field} value={form.difficulty}
            onChange={(event) => updateForm("difficulty", event.target.value)}>
            <option>EASY</option><option>MEDIUM</option><option>HARD</option>
          </select>
          <select className={field} value={form.ioMode}
            onChange={(event) => updateForm("ioMode", event.target.value)}>
            <option>FUNCTION</option><option>STDIO</option>
          </select>
          <input className={field} placeholder="languages csv" value={form.languages}
            onChange={(event) => updateForm("languages", event.target.value)} />
        </div>
        <textarea className={field} rows={4} placeholder="statement (markdown)" value={form.statementMdx}
          onChange={(event) => updateForm("statementMdx", event.target.value)} />
        <label className="text-xs text-slate-500">starterCode (JSON by language)</label>
        <textarea className={`${field} font-mono`} rows={3} value={form.starterCode}
          onChange={(event) => updateForm("starterCode", event.target.value)} />
        <label className="text-xs text-slate-500">solutions (JSON by language)</label>
        <textarea className={`${field} font-mono`} rows={3} value={form.solutions}
          onChange={(event) => updateForm("solutions", event.target.value)} />
        {form.ioMode === "FUNCTION" && (
          <>
            <label className="text-xs text-slate-500">drivers (JSON by language)</label>
            <textarea className={`${field} font-mono`} rows={3} value={form.drivers}
              onChange={(event) => updateForm("drivers", event.target.value)} />
          </>
        )}
      </div>

      <h2 className="mt-6 font-semibold text-white">Test cases</h2>
      {tests.map((test, index) => (
        <div key={index} className="mt-2 grid grid-cols-12 gap-2 items-center">
          <textarea className={`${field} col-span-4`} rows={2} placeholder="input" value={test.input}
            onChange={(event) => updateTest(index, { input: event.target.value })} />
          <textarea className={`${field} col-span-4`} rows={2} placeholder="expected" value={test.expected}
            onChange={(event) => updateTest(index, { expected: event.target.value })} />
          <select className={`${field} col-span-2`} value={test.compareMode}
            onChange={(event) => updateTest(index, { compareMode: event.target.value })}>
            <option>TRIMMED</option><option>EXACT</option><option>FLOAT</option><option>UNORDERED</option>
          </select>
          <label className="col-span-2 text-xs text-slate-400 flex items-center gap-1">
            <input type="checkbox" checked={test.isHidden}
              onChange={(event) => updateTest(index, { isHidden: event.target.checked })} />
            hidden
          </label>
        </div>
      ))}
      <button onClick={() => setTests((current) => [...current, blankTest()])}
        className="mt-2 text-sm text-accent">+ add test case</button>

      <div className="mt-6">
        <button onClick={save} className="rounded bg-accent px-4 py-2 text-sm font-medium text-white">Save</button>
      </div>
      {message && <p className="mt-3 text-sm text-slate-300">{message}</p>}
    </div>
  );
}
