import type { NextRequest } from "next/server";

const configuredApi = process.env.API_INTERNAL_URL || "http://localhost:4000";
const API = /^https?:\/\//.test(configuredApi) ? configuredApi : `http://${configuredApi}`;

async function proxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  const target = new URL(params.path.map(encodeURIComponent).join("/"), `${API.replace(/\/$/, "")}/`);
  target.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
    cache: "no-store",
    redirect: "manual",
  });

  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
  });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
