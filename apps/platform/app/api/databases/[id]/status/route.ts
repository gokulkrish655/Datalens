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
    select: { id: true, status: true, updatedAt: true },
  });
  if (!conn) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, connection: conn });
}
