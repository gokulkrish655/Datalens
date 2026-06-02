import { NextResponse } from 'next/server';
import { createAdminPrisma } from '@datalens/db';
import { requireRole } from '@/lib/auth';

type RouteParams = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireRole(['BASIC_USER', 'MANAGER', 'DB_ADMIN']);
  if (auth.response) return auth.response;
  const { sessionId } = await params;
  const db = createAdminPrisma();
  const session = await db.querySession.findFirst({
    where: {
      id: sessionId,
      tenantId: auth.session!.user.tenantId,
      userId: auth.session!.user.id,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, session });
}
