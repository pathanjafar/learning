import Link from "next/link";
import { TracksLoader } from "@/components/TracksLoader";

export default function Home() {
  return (
    <div>
      <section className="mb-10">
        <h1 className="text-3xl font-bold text-white">Learn to build software and ace the interview</h1>
        <p className="text-slate-400 mt-2 max-w-2xl">
          Frontend, backend, databases, DevOps and a full DSA path. Read lessons, submit practice
          problems for review, build projects, and drill interview questions.
        </p>
      </section>

      <div className="mb-10">
        <TracksLoader />
      </div>

      <p className="mt-10 text-sm text-slate-500">
        Try the sample problem:{" "}
        <Link className="text-accent underline" href="/problems/two-sum">Two Sum</Link>
      </p>
    </div>
  );
}
