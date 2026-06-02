import { ILLMProvider, LLMMessage } from '@datalens/providers/src/llm/interface';
import { validateSql } from '@datalens/utils';

export type OracleResponse =
  | { type: 'CLARIFICATION'; question: string; options: string[] }
  | { type: 'SQL_PLAN'; understood: string; isSplitQuery: boolean; queries: Array<{ connectionId: string; connectorName: string; dialectDescription: string; sql: string }> }
  | { type: 'BLOCKED'; tableDisplayName: string; tableId: string; ownerName: string }
  | { type: 'IMPOSSIBLE'; reason: string };

export async function callQueryOracle(params: {
  queryText: string;
  llmProvider: ILLMProvider;
  schemaContext: string;
  blockedContext: string;
  clarificationCount: number;
}): Promise<OracleResponse & { inputTokens: number; outputTokens: number; model: string }> {
  const tableLines = params.schemaContext
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .slice(0, 3);

  if (tableLines.length === 0) {
    return {
      type: 'IMPOSSIBLE',
      reason: 'No schema metadata available for this tenant yet. Please crawl the database first.',
      inputTokens: 0,
      outputTokens: 0,
      model: 'none',
    };
  }

  if (params.blockedContext.trim().length > 0) {
    const [first] = params.blockedContext.split('\n').filter(Boolean);
    const [tableId, tableDisplayName] = first.split('|');
    return {
      type: 'BLOCKED',
      tableId: tableId ?? 'unknown',
      tableDisplayName: tableDisplayName ?? 'Restricted table',
      ownerName: 'Table owner',
      inputTokens: 0,
      outputTokens: 0,
      model: 'rule-engine',
    };
  }

  const messages: LLMMessage[] = [
    {
      role: 'system',
      content:
        'You are a SQL planner. Return only one SQL SELECT query as plain text. Use only tables in provided context.',
    },
    {
      role: 'user',
      content: `Question: ${params.queryText}\n\nSchema:\n${params.schemaContext}`,
    },
  ];
  let sql = '';
  let model = 'heuristic';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const response = await params.llmProvider.generate({
      messages,
      maxTokens: 512,
      temperature: 0.1,
      useFastModel: params.clarificationCount === 0,
    });
    sql = response.content.trim().replace(/^```sql/i, '').replace(/```$/i, '').trim();
    model = response.model;
    inputTokens = response.inputTokens;
    outputTokens = response.outputTokens;
  } catch {
    // fall through to deterministic fallback
  }

  if (!sql) {
    const first = tableLines[0].replace(/^- /, '');
    const [connectionId, connectorName, tableName] = first.split('|');
    sql = `SELECT * FROM "${tableName}" LIMIT 100`;
    return {
      type: 'SQL_PLAN',
      understood: `I will fetch rows from ${tableName}.`,
      isSplitQuery: false,
      queries: [
        {
          connectionId,
          connectorName,
          dialectDescription: connectorName,
          sql,
        },
      ],
      inputTokens,
      outputTokens,
      model,
    };
  }

  const valid = validateSql(sql);
  if (!valid.valid) {
    return {
      type: 'CLARIFICATION',
      question: `I could not generate a safe read-only query (${valid.reason}). Can you clarify what table or metric you need?`,
      options: ['Specify table name', 'Specify date range', 'Show top rows first'],
      inputTokens,
      outputTokens,
      model,
    };
  }

  const first = tableLines[0].replace(/^- /, '');
  const [connectionId, connectorName] = first.split('|');

  return {
    type: 'SQL_PLAN',
    understood: 'I will fetch the requested data using a read-only SQL query.',
    isSplitQuery: false,
    queries: [{ connectionId, connectorName, dialectDescription: connectorName, sql }],
    inputTokens,
    outputTokens,
    model,
  };
}
