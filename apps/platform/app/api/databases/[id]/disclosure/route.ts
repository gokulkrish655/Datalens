import { NextResponse } from 'next/server';
import { createAdminPrisma } from '@datalens/db';
import { requireRole } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireRole(['DB_ADMIN', 'MANAGER']);
  if (auth.response) return auth.response;
  const { id } = await params;
  const db = createAdminPrisma();
  const conn = await db.databaseConnection.findFirst({
    where: { id, tenantId: auth.session!.user.tenantId },
    select: { id: true, disclosureAcknowledgedAt: true, disclosureAcknowledgedBy: true },
  });
  if (!conn) return NextResponse.json({ ok: false, error: 'Connection not found' }, { status: 404 });
  return NextResponse.json({ ok: true, connection: conn });
}

export async function POST(_request: Request, { params }: RouteParams) {
  const auth = await requireRole(['DB_ADMIN']);
  if (auth.response) return auth.response;
  const { id } = await params;
  const db = createAdminPrisma();
  const connection = await db.databaseConnection.updateMany({
    where: { id, tenantId: auth.session!.user.tenantId },
    data: {
      disclosureAcknowledgedAt: new Date(),
      disclosureAcknowledgedBy: auth.session!.user.id,
    },
  });
  if (connection.count === 0) {
    return NextResponse.json({ ok: false, error: 'Connection not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
