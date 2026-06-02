import { NextResponse } from 'next/server';
import { createAdminPrisma } from '@datalens/db';
import { requireRole } from '@/lib/auth';

type RouteParams = { params: Promise<{ queryLogId: string }> };

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escapeCell = (value: unknown) => {
    const s = String(value ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(','))].join('\n');
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireRole(['BASIC_USER', 'MANAGER', 'DB_ADMIN']);
  if (auth.response) return auth.response;
  const { queryLogId } = await params;
  const db = createAdminPrisma();
  const queryLog = await db.queryLog.findFirst({
    where: { id: queryLogId, tenantId: auth.session!.user.tenantId },
  });
  if (!queryLog) {
    return NextResponse.json({ ok: false, error: 'Query log not found' }, { status: 404 });
  }

  const resultMessage = await db.queryMessage.findFirst({
    where: {
      sessionId: queryLog.sessionId,
      type: 'RESULT',
      role: 'ASSISTANT',
      content: { contains: queryLogId },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!resultMessage) {
    return NextResponse.json({ ok: false, error: 'No result available for download' }, { status: 404 });
  }

  const parsed = JSON.parse(resultMessage.content) as {
    queryLogId: string;
    rows: Record<string, unknown>[];
  };
  const csv = toCsv(parsed.rows ?? []);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="query-${queryLogId}.csv"`,
    },
  });
}
