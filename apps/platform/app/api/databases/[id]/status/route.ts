

import { prisma } from '@datalens/db';

function extractIdFromPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

export async function GET(request: Request) {
  const id = extractIdFromPath(new URL(request.url).pathname);
  const conn = await prisma.databaseConnection.findUnique({ where: { id } });
  if (!conn) return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify({ ok: true, status: conn.status }), { headers: { 'Content-Type': 'application/json' } });
}

export async function POST(_request: Request) {
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}





