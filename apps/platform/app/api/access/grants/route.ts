import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminPrisma } from '@datalens/db';
import { requireRole } from '@/lib/auth';

const grantSchema = z.object({
  tableId: z.string().min(1),
  grantedToId: z.string().min(1),
  durationDays: z.number().int().positive().max(365).default(30),
});

export async function GET() {
  const auth = await requireRole(['MANAGER', 'DB_ADMIN']);
  if (auth.response) return auth.response;
  const db = createAdminPrisma();
  const grants = await db.tableAccessGrant.findMany({
    where: { tenantId: auth.session!.user.tenantId },
    include: { table: true, grantedTo: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ ok: true, grants });
}

export async function POST(request: Request) {
  const auth = await requireRole(['MANAGER', 'DB_ADMIN']);
  if (auth.response) return auth.response;
  const parsed = grantSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const db = createAdminPrisma();
  const expiresAt = new Date(Date.now() + parsed.data.durationDays * 24 * 60 * 60 * 1000);
  const grant = await db.tableAccessGrant.upsert({
    where: {
      tableId_grantedToId: {
        tableId: parsed.data.tableId,
        grantedToId: parsed.data.grantedToId,
      },
    },
    update: { expiresAt },
    create: {
      tenantId: auth.session!.user.tenantId,
      tableId: parsed.data.tableId,
      grantedToId: parsed.data.grantedToId,
      expiresAt,
    },
  });
  return NextResponse.json({ ok: true, grant }, { status: 201 });
}
