const GRADER_URL = process.env.GRADER_URL || "http://localhost:8001";

export interface GradeCaseResult {
  index: number;
  isHidden: boolean;
  status: string;
  timeMs: number | null;
  memoryKb: number | null;
  input?: string;
  expected?: string;
  actual?: string;
  stderr?: string;
}

export interface GradeResult {
  verdict: string;
  passed: number;
  total: number;
  score: number;
  maxTimeMs: number | null;
  maxMemoryKb: number | null;
  compileOutput: string | null;
  results: GradeCaseResult[];
}

export async function callGrader(body: unknown): Promise<GradeResult> {
  const r = await fetch(`${GRADER_URL}/grade`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`grader ${r.status}: ${await r.text()}`);
  return (await r.json()) as GradeResult;
}
