import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminPrisma } from '@datalens/db';
import { requireRole } from '@/lib/auth';
import { createAccessRequest } from '@datalens/query-engine';

const createRequestSchema = z.object({
  tableId: z.string().min(1),
  justification: z.string().trim().min(5).max(2000),
  durationDays: z.number().int().positive().max(365).default(30),
});

export async function GET() {
  const auth = await requireRole(['BASIC_USER', 'MANAGER', 'DB_ADMIN']);
  if (auth.response) return auth.response;
  const db = createAdminPrisma();
  const requests = await db.accessRequest.findMany({
    where: { tenantId: auth.session!.user.tenantId },
    include: { table: true, stages: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return NextResponse.json({ ok: true, requests });
}

export async function POST(request: Request) {
  const auth = await requireRole(['BASIC_USER', 'MANAGER', 'DB_ADMIN']);
  if (auth.response) return auth.response;
  const parsed = createRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const result = await createAccessRequest({
    tenantId: auth.session!.user.tenantId,
    tableId: parsed.data.tableId,
    requestedById: auth.session!.user.id,
    justification: parsed.data.justification,
    durationDays: parsed.data.durationDays,
  });
  return NextResponse.json({ ok: true, ...result }, { status: 201 });
}
