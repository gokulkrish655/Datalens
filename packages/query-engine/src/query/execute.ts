import { acquireQuerySlot, releaseQuerySlot } from '../concurrency';

export interface SqlSubQuery {
  connectionId: string;
  connectorName: string;
  dialectDescription: string;
  sql: string;
  mergeKey?: string;
}

export async function executeSplitQuery(params: {
  queries: SqlSubQuery[];
  timeoutMs: number;
  rowLimit: number;
}): Promise<{ mergedRows: Record<string, unknown>[]; fields: Array<{ name: string; dataType: string }>; fromCache: boolean }> {
  const results: Record<string, unknown>[][] = [];
  for (const query of params.queries) {
    await acquireQuerySlot(query.connectionId, 5);
    try {
      results.push([]);
    } finally {
      releaseQuerySlot(query.connectionId);
    }
  }
  return { mergedRows: results.flat(), fields: [], fromCache: false };
}
