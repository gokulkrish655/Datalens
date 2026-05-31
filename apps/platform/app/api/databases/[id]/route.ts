

import { prisma } from '@datalens/db';
import { refreshConnectionMetadata } from '@datalens/connectors';

function extractIdFromPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

export async function GET(request: Request) {
  const id = extractIdFromPath(new URL(request.url).pathname);
  const conn = await prisma.databaseConnection.findUnique({ where: { id } });
  if (!conn) return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify({ ok: true, connection: conn }), { headers: { 'Content-Type': 'application/json' } });
}

export async function POST(request: Request) {
  const id = extractIdFromPath(new URL(request.url).pathname);
  const conn = await prisma.databaseConnection.findUnique({ where: { id } });
  if (!conn) return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  // Mark syncing
  await prisma.databaseConnection.update({ where: { id }, data: { status: 'SYNCING' } });

  try {
    const metadata = await refreshConnectionMetadata({
      encryptedCredentials: conn.encryptedCredentials,
      connectorName: conn.connectorName,
      schema: conn.schema ?? undefined,
    });

    // Update status on success
    await prisma.databaseConnection.update({ where: { id }, data: { status: 'CONNECTED' } });

    return new Response(JSON.stringify({ ok: true, metadata }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    await prisma.databaseConnection.update({ where: { id }, data: { status: 'ERROR' } });
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}





