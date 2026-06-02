import { createAdminPrisma } from '@datalens/db';
import { registry } from '@datalens/connectors';
import { decrypt } from '@datalens/providers/src/crypto';
import { requireRole } from '@/lib/auth';
import { NextResponse } from 'next/server';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const auth = await requireRole(['DB_ADMIN', 'MANAGER']);
  if (auth.response) return auth.response;
  const { id } = await params;
  const db = createAdminPrisma();
  const conn = await db.databaseConnection.findFirst({
    where: { id, tenantId: auth.session!.user.tenantId },
  });
  if (!conn) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  try {
    const json = await decrypt(conn.encryptedCredentials);
    const parsed = JSON.parse(json ?? '{}') as {
      username?: string;
      user?: string;
      password: string;
      database?: string;
      schema?: string;
      extra?: Record<string, string>;
    };
    const config = {
      host: conn.host,
      port: conn.port ?? undefined,
      username: parsed.username ?? parsed.user,
      password: parsed.password,
      database: conn.database ?? parsed.database,
      schema: conn.schema ?? parsed.schema,
      extra: parsed.extra,
    };

    const connector = registry.get(conn.connectorName);
    const result = await connector.testConnection(config);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}





