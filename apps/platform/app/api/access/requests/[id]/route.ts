import { NextResponse } from 'next/server';
import { createAdminPrisma } from '@datalens/db';
import { requireRole } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireRole(['BASIC_USER', 'MANAGER', 'DB_ADMIN']);
  if (auth.response) return auth.response;
  const { id } = await params;
  const db = createAdminPrisma();
  const request = await db.accessRequest.findFirst({
    where: { id, tenantId: auth.session!.user.tenantId },
    include: { table: true, stages: true },
  });
  if (!request) {
    return NextResponse.json({ ok: false, error: 'Access request not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, request });
}
