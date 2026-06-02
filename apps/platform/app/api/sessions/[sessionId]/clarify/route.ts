import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminPrisma } from '@datalens/db';
import { requireRole } from '@/lib/auth';

type RouteParams = { params: Promise<{ sessionId: string }> };
const clarifySchema = z.object({ answer: z.string().trim().min(1).max(2000) });

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireRole(['BASIC_USER', 'MANAGER', 'DB_ADMIN']);
  if (auth.response) return auth.response;
  const { sessionId } = await params;
  const parsed = clarifySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const db = createAdminPrisma();
  const session = await db.querySession.findFirst({
    where: { id: sessionId, tenantId: auth.session!.user.tenantId, userId: auth.session!.user.id },
  });
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 });
  }
  await db.queryMessage.create({
    data: {
      sessionId,
      role: 'USER',
      type: 'CLARIFICATION_ANSWER',
      content: parsed.data.answer,
    },
  });
  return NextResponse.json({ ok: true });
}
