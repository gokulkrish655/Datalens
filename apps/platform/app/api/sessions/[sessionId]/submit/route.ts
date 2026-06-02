import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminPrisma } from '@datalens/db';
import { requireRole } from '@/lib/auth';
import { retrieveRelevantTables, callQueryOracle } from '@datalens/query-engine';
import { computeModelTier } from '@datalens/utils';
import { AnthropicProvider } from '@datalens/providers/src/llm/anthropic/adapter';

type RouteParams = { params: Promise<{ sessionId: string }> };

const submitSchema = z.object({
  queryText: z.string().trim().min(2).max(5000),
});

function buildSchemaContext(
  tables: Array<{
    connectionId: string;
    connectorName: string;
    tableName: string;
    description?: string;
  }>,
) {
  return tables
    .map((table) => `- ${table.connectionId}|${table.connectorName}|${table.tableName}|${table.description ?? ''}`)
    .join('\n');
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireRole(['BASIC_USER', 'MANAGER', 'DB_ADMIN']);
  if (auth.response) return auth.response;
  const { sessionId } = await params;

  const parsed = submitSchema.safeParse(await request.json().catch(() => ({})));
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
      type: 'QUERY',
      content: parsed.data.queryText,
    },
  });

  const { accessible, blocked } = await retrieveRelevantTables({
    queryText: parsed.data.queryText,
    tenantId: auth.session!.user.tenantId,
    userId: auth.session!.user.id,
    maxTables: 5,
  });

  const llm = new AnthropicProvider(process.env.ANTHROPIC_API_KEY ?? '');
  const topSimilarityScore = accessible.length > 0 ? 0.8 : 0.4;
  const queryWordCount = parsed.data.queryText.split(/\s+/).filter(Boolean).length;
  const modelTier = computeModelTier({
    queryText: parsed.data.queryText,
    topSimilarityScore,
    retrievedTableCount: accessible.length + blocked.length,
    queryWordCount,
  });

  const oracle = await callQueryOracle({
    queryText: parsed.data.queryText,
    llmProvider: llm,
    schemaContext: buildSchemaContext(accessible),
    blockedContext: blocked.map((t) => `${t.tableId}|${t.tableDisplayName}`).join('\n'),
    clarificationCount: 0,
  });

  await db.queryMessage.create({
    data: {
      sessionId,
      role: 'ASSISTANT',
      type:
        oracle.type === 'SQL_PLAN'
          ? 'UNDERSTANDING'
          : oracle.type === 'BLOCKED'
            ? 'BLOCKED'
            : oracle.type === 'CLARIFICATION'
              ? 'CLARIFICATION_QUESTION'
              : 'ERROR',
      content: JSON.stringify({ modelTier, oracle }),
    },
  });

  return NextResponse.json({ ok: true, modelTier, oracle });
}
