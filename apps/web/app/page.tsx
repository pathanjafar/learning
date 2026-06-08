import Link from "next/link";
import { BROWSER_API, type TrackView } from "@/lib/api";

async function TracksSection() {
  return (
    <>
      <div id="tracks-container" className="grid gap-6 md:grid-cols-2 mb-10 min-h-10">
        <p className="text-slate-500">Loading tracks...</p>
      </div>

      <p className="mt-10 text-sm text-slate-500">
        Try the sample problem:{" "}
        <Link className="text-accent underline" href="/problems/two-sum">Two Sum</Link>
      </p>

      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `
            (async () => {
              try {
                const res = await fetch('${BROWSER_API}/tracks');
                const tracks = await res.json();
                const container = document.getElementById('tracks-container');
                if (!tracks.length) {
                  container.innerHTML = '<p class="text-slate-500">No tracks yet. Run <code>npm run db:seed</code> to load content.</p>';
                } else {
                  container.innerHTML = tracks.map(track => \`
                    <a href="/tracks/\${track.slug}" class="rounded-xl border border-slate-800 bg-panel p-5 hover:border-accent transition block">
                      <div class="text-xs uppercase tracking-wide text-accent">\${track.category}</div>
                      <h2 class="text-xl font-semibold text-white mt-1">\${track.title}</h2>
                      <ul class="mt-3 space-y-1 text-sm">
                        \${track.topics.map(topic => \`
                          <li class="flex justify-between text-slate-300">
                            <span>\${topic.title}</span>
                            <span class="text-slate-500">\${topic._count.lessons} lessons / \${topic._count.problems} problems</span>
                          </li>
                        \`).join('')}
                        \${!track.topics.length ? '<li class="text-slate-500">Topics coming soon</li>' : ''}
                      </ul>
                    </a>
                  \`).join('');
                }
              } catch (e) {
                document.getElementById('tracks-container').innerHTML = '<p class="text-red-500">Unable to load tracks. Please refresh the page.</p>';
              }
            })();
          `
        }}
      />
    </>
  );
}

export default async function Home() {
  return (
    <div>
      <section className="mb-10">
        <h1 className="text-3xl font-bold text-white">Learn to build software and ace the interview</h1>
        <p className="text-slate-400 mt-2 max-w-2xl">
          Frontend, backend, databases, DevOps and a full DSA path. Read lessons, submit practice
          problems for review, build projects, and drill interview questions.
        </p>
      </section>

      <TracksSection />
    </div>
  );
}
