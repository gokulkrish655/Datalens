import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminPrisma } from '@datalens/db';
import { requireRole } from '@/lib/auth';
import { executeSplitQuery, computeResultStats, generateResultSummary } from '@datalens/query-engine';
import { AnthropicProvider } from '@datalens/providers/src/llm/anthropic/adapter';
import { validateSql } from '@datalens/utils';

type RouteParams = { params: Promise<{ sessionId: string }> };

const executeSchema = z.object({
  queryText: z.string().trim().min(2).max(5000),
  queries: z.array(
    z.object({
      connectionId: z.string(),
      connectorName: z.string(),
      dialectDescription: z.string(),
      sql: z.string(),
    }),
  ).min(1),
});

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireRole(['BASIC_USER', 'MANAGER', 'DB_ADMIN']);
  if (auth.response) return auth.response;
  const { sessionId } = await params;
  const parsed = executeSchema.safeParse(await request.json().catch(() => ({})));
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

  for (const item of parsed.data.queries) {
    const valid = validateSql(item.sql);
    if (!valid.valid) {
      await db.queryLog.create({
        data: {
          tenantId: auth.session!.user.tenantId,
          sessionId,
          queryText: parsed.data.queryText,
          status: 'VALIDATION_ERROR',
          errorMessage: valid.reason,
        },
      });
      return NextResponse.json({ ok: false, error: valid.reason }, { status: 400 });
    }
  }

  try {
    const execution = await executeSplitQuery({
      queries: parsed.data.queries,
      timeoutMs: 60000,
      rowLimit: 50000,
    });
    const fieldNames = execution.fields.map((f) => f.name);
    const stats = computeResultStats(execution.mergedRows, fieldNames);
    const llm = new AnthropicProvider(process.env.ANTHROPIC_API_KEY ?? '');
    const summary = await generateResultSummary(stats, 'Query executed.', llm);

    const log = await db.queryLog.create({
      data: {
        tenantId: auth.session!.user.tenantId,
        sessionId,
        queryText: parsed.data.queryText,
        status: 'SUCCESS',
        executedSql: parsed.data.queries.map((q) => q.sql).join('\n\n-- SPLIT --\n\n'),
      },
      select: { id: true, createdAt: true },
    });

    await db.queryMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        type: 'RESULT',
        content: JSON.stringify({
          queryLogId: log.id,
          rows: execution.mergedRows,
          fields: execution.fields,
          stats,
          summary,
          fromCache: execution.fromCache,
        }),
      },
    });

    await db.querySession.update({
      where: { id: sessionId },
      data: {
        updatedAt: new Date(),
        title: session.title ?? parsed.data.queryText.slice(0, 80),
      },
    });

    return NextResponse.json({
      ok: true,
      queryLogId: log.id,
      rows: execution.mergedRows,
      fields: execution.fields,
      stats,
      summary,
      fromCache: execution.fromCache,
    });
  } catch (error) {
    await db.queryLog.create({
      data: {
        tenantId: auth.session!.user.tenantId,
        sessionId,
        queryText: parsed.data.queryText,
        status: 'SQL_ERROR',
        errorMessage: String(error),
      },
    });
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
