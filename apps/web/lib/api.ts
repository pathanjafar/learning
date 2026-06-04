// Server-side fetch uses the internal URL; the browser uses the public one.
const SERVER_API = process.env.API_INTERNAL_URL || "http://localhost:4000";
export const BROWSER_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function serverGet<T>(path: string): Promise<T | null> {
  const r = await fetch(`${SERVER_API}${path}`, { cache: "no-store" });
  if (!r.ok) return null;
  return (await r.json()) as T;
}

export interface ProblemView {
  id: number;
  slug: string;
  title: string;
  difficulty: string;
  ioMode: string;
  languages: string[];
  starterCode: Record<string, string>;
  statementMdx: string;
  sampleTests: { input: string; expected: string }[];
  hiddenCount: number;
}

export interface TrackView {
  id: number;
  slug: string;
  title: string;
  category: string;
  topics: {
    id: number;
    slug: string;
    title: string;
    _count: { lessons: number; problems: number };
  }[];
}

export interface TopicDetail {
  id: number;
  slug: string;
  title: string;
  cheatsheetMdx: string | null;
  track: { slug: string; title: string };
  lessons: { slug: string; title: string; level: string; order: number }[];
  problems: { slug: string; title: string; difficulty: string }[];
  projects: { slug: string; title: string; difficulty: string }[];
  interviewQuestions: { id: number; type: string }[];
}

export interface LessonView {
  id: number;
  topicId: number;
  slug: string;
  title: string;
  level: string;
  contentMdx: string;
}

export interface InterviewQ {
  id: number;
  type: string;
  questionMdx: string;
  answerMdx: string;
}

export interface ProjectView {
  id: number;
  slug: string;
  title: string;
  difficulty: string;
  briefMdx: string;
  starterRepoUrl: string | null;
}
