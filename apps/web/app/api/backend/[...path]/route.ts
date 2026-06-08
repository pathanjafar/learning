const API_URL = process.env.API_INTERNAL_URL || "http://localhost:4000";

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const pathStr = params.path.join("/");
  const url = `${API_URL}/${pathStr}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error(`API proxy error for ${url}:`, error);
    return Response.json(
      { error: "Failed to fetch from API" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const pathStr = params.path.join("/");
  const url = `${API_URL}/${pathStr}`;
  const body = await request.json();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error(`API proxy error for ${url}:`, error);
    return Response.json(
      { error: "Failed to fetch from API" },
      { status: 500 }
    );
  }
}
