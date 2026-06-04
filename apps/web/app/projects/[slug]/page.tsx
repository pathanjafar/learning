import { notFound } from "next/navigation";
import { serverGet, type ProjectView } from "@/lib/api";
import Markdown from "@/components/Markdown";

export default async function ProjectPage({ params }: { params: { slug: string } }) {
  const project = await serverGet<ProjectView>(`/projects/${params.slug}`);
  if (!project) notFound();

  return (
    <article className="max-w-3xl">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold text-white">{project.title}</h1>
        <span className="text-xs rounded bg-panel px-2 py-1 text-accent">{project.difficulty}</span>
      </div>
      {project.starterRepoUrl && (
        <a href={project.starterRepoUrl} className="mt-2 inline-block text-sm text-accent underline">
          Starter repo →
        </a>
      )}
      <div className="mt-4">
        <Markdown>{project.briefMdx}</Markdown>
      </div>
    </article>
  );
}
