import { NextResponse } from 'next/server';
import { createAdminPrisma } from '@datalens/db';
import { requireRole } from '@/lib/auth';
import { z } from 'zod';

const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

export async function GET() {
  const auth = await requireRole(['BASIC_USER', 'MANAGER', 'DB_ADMIN']);
  if (auth.response) return auth.response;
  const db = createAdminPrisma();
  const sessions = await db.querySession.findMany({
    where: { tenantId: auth.session!.user.tenantId, userId: auth.session!.user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      createdAt: true,
      _count: { select: { messages: true } },
    },
    take: 100,
  });
  return NextResponse.json({ ok: true, sessions });
}

export async function POST(request: Request) {
  const auth = await requireRole(['BASIC_USER', 'MANAGER', 'DB_ADMIN']);
  if (auth.response) return auth.response;

  const parsed = createSessionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const db = createAdminPrisma();
  const session = await db.querySession.create({
    data: {
      tenantId: auth.session!.user.tenantId,
      userId: auth.session!.user.id,
      title: parsed.data.title ?? 'New query',
    },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ ok: true, session }, { status: 201 });
}
