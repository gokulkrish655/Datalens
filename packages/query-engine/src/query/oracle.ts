import { ILLMProvider, LLMMessage } from '@datalens/providers/src/llm/interface';

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
  const messages: LLMMessage[] = [
    { role: 'system', content: 'You are DataLens...' },
    { role: 'user', content: params.queryText },
  ];
  const response = await params.llmProvider.generate({ messages, maxTokens: 512, temperature: 0.2 });
  return {
    type: 'SQL_PLAN',
    understood: 'I will fetch the requested data.',
    isSplitQuery: false,
    queries: [{ connectionId: 'unknown', connectorName: 'postgres', dialectDescription: 'PostgreSQL', sql: 'SELECT 1' }],
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    model: response.model,
  };
}
