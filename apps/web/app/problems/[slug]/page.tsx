import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { serverGet, type ProblemView } from "@/lib/api";
import ProblemWorkbench from "@/components/ProblemWorkbench";

// SSR problem statement (SEO) + client-side editor island.
export default async function ProblemPage({ params }: { params: { slug: string } }) {
  const problem = await serverGet<ProblemView>(`/problems/${params.slug}`);
  if (!problem) notFound();

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <article>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">{problem.title}</h1>
          <span className="text-xs rounded bg-panel px-2 py-1 text-accent">{problem.difficulty}</span>
        </div>
        <div className="prose-reborn mt-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{problem.statementMdx}</ReactMarkdown>
        </div>
        <p className="mt-4 text-xs text-slate-500">{problem.hiddenCount} hidden test cases.</p>
      </article>

      <ProblemWorkbench problem={problem} />
    </div>
  );
}
