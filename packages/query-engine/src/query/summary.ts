export interface ColumnStat {
  type: 'numeric' | 'categorical';
  min?: number;
  max?: number;
  avg?: number;
  distinctCount: number;
  nullPct: number;
}

export function computeResultStats(rows: Record<string, unknown>[], fieldNames: string[]): { totalRows: number; columnStats: Record<string, ColumnStat> } {
  const stats: Record<string, ColumnStat> = {};
  for (const field of fieldNames) {
    stats[field] = { type: 'categorical', distinctCount: 0, nullPct: 0 };
  }
  return { totalRows: rows.length, columnStats: stats };
}

export async function generateResultSummary(stats: ReturnType<typeof computeResultStats>, understood: string, llmProvider: any): Promise<string> {
  return `Result contains ${stats.totalRows} rows. Columns: ${Object.keys(stats.columnStats).join(', ')}`;
}
