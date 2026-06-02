import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createTenantPrisma } from '@datalens/db';
import { registry } from '@datalens/connectors';
import { encrypt } from '@datalens/providers/src/crypto';
import { z } from 'zod';

const CreateConnectionSchema = z.object({
  name: z.string().min(1).max(100),
  connectorName: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().positive().optional(),
  database: z.string().optional(),
  schema: z.string().optional(),
  username: z.string().optional(),
  password: z.string().min(1),
  sslEnabled: z.boolean().default(false),
  loadProfile: z.enum(['CONSERVATIVE', 'BALANCED', 'PERFORMANCE']).default('BALANCED'),
  queryRowLimit: z.number().int().positive().default(50000),
  queryTimeoutSeconds: z.number().int().positive().default(60),
  cacheTtlSeconds: z.number().int().positive().default(300),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Only DB_ADMIN and MANAGER can see connections
  if (!['DB_ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const db = createTenantPrisma(session.user.tenantId);
  const connections = await db.databaseConnection.findMany({
    select: {
      id: true,
      name: true,
      connectorName: true,
      host: true,
      port: true,
      database: true,
      status: true,
      loadProfile: true,
      queryRowLimit: true,
      queryTimeoutSeconds: true,
      cacheTtlSeconds: true,
      disclosureAcknowledgedAt: true,
      createdAt: true,
      updatedAt: true,
      // Never return encryptedCredentials
    },
  });

  return NextResponse.json({ ok: true, connections });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'DB_ADMIN') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const body: unknown = await request.json();
  const parsed = CreateConnectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, connectorName, host, port, database, schema,
          username, password, sslEnabled, loadProfile,
          queryRowLimit, queryTimeoutSeconds, cacheTtlSeconds } = parsed.data;

  // Validate connector exists in registry
  try {
    registry.get(connectorName);
  } catch {
    return NextResponse.json({ ok: false, error: `Unknown connector: ${connectorName}` }, { status: 400 });
  }

  // Encrypt credentials server-side before storage
  const encryptedCredentials = await encrypt(
    JSON.stringify({ username, password })
  );

  const db = createTenantPrisma(session.user.tenantId);
  const connection = await db.databaseConnection.create({
    data: {
      name,
      connectorName,
      host,
      port,
      database,
      schema,
      sslEnabled,
      encryptedCredentials,
      loadProfile,
      queryRowLimit,
      queryTimeoutSeconds,
      cacheTtlSeconds,
      status: 'PENDING',
    },
    select: {
      id: true,
      name: true,
      connectorName: true,
      host: true,
      port: true,
      database: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, connection }, { status: 201 });
}