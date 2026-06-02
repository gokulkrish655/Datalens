import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { reviewStage } from '@datalens/query-engine';

type RouteParams = { params: Promise<{ id: string; sid: string }> };
const stageReviewSchema = z.object({
  decision: z.enum(['APPROVED', 'DENIED']),
  note: z.string().max(1000).optional(),
});

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireRole(['MANAGER', 'DB_ADMIN']);
  if (auth.response) return auth.response;
  const { id, sid } = await params;
  const parsed = stageReviewSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  await reviewStage({
    requestId: id,
    stageId: sid,
    reviewerId: auth.session!.user.id,
    decision: parsed.data.decision,
    note: parsed.data.note,
  });
  return NextResponse.json({ ok: true });
}
