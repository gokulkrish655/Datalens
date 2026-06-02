

import { prisma } from '@datalens/db';

export async function GET(_request: Request) {
  try {
    const connections = await prisma.databaseConnection.findMany();
    return new Response(JSON.stringify({ ok: true, connections }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // create minimal new DatabaseConnection record (frontend should encrypt credentials before sending)
    const created = await prisma.databaseConnection.create({ data: body });
    return new Response(JSON.stringify({ ok: true, connection: created }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}





