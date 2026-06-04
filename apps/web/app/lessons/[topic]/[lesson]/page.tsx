import { notFound } from "next/navigation";
import { serverGet, type LessonView } from "@/lib/api";
import Markdown from "@/components/Markdown";
import LessonComplete from "@/components/LessonComplete";

// SSR lesson viewer (SEO). The "mark complete" button is a client island.
export default async function LessonPage({ params }: { params: { topic: string; lesson: string } }) {
  const lesson = await serverGet<LessonView>(`/lessons/${params.topic}/${params.lesson}`);
  if (!lesson) notFound();

  return (
    <article className="max-w-3xl">
      <div className="text-xs uppercase tracking-wide text-accent">{lesson.level}</div>
      <Markdown>{lesson.contentMdx}</Markdown>
      <LessonComplete topicId={lesson.topicId} lessonId={lesson.id} />
    </article>
  );
}
