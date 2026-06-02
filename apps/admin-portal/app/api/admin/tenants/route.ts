

export async function GET(request: Request) {
  return new Response(JSON.stringify({ ok: true, path: new URL(request.url).pathname }), { headers: { 'Content-Type': 'application/json' } });
}

export async function POST(request: Request) {
  return new Response(JSON.stringify({ ok: true, path: new URL(request.url).pathname }), { headers: { 'Content-Type': 'application/json' } });
}





