

import { prisma } from '@datalens/db';
import { registry } from '@datalens/connectors';
import { decrypt } from '@datalens/providers/src/crypto';

function extractIdFromPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 2] === 'databases' ? parts[parts.length - 1] : parts[parts.length - 1];
}

export async function POST(request: Request) {
  const id = extractIdFromPath(new URL(request.url).pathname);
  const conn = await prisma.databaseConnection.findUnique({ where: { id } });
  if (!conn) return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  try {
    const json = await decrypt(conn.encryptedCredentials);
    const parsed = JSON.parse(json ?? '{}');
    const config = {
      host: parsed.host,
      port: parsed.port,
      user: parsed.user,
      password: parsed.password,
      database: parsed.database,
      schema: conn.schema ?? parsed.schema,
      extra: parsed.extra,
    };

    const connector = registry.get(conn.connectorName);
    const result = await connector.testConnection(config);
    return new Response(JSON.stringify({ ok: true, result }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}





