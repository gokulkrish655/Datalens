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
    const values = rows.map((row) => row[field]);
    const nonNull = values.filter((v) => v !== null && v !== undefined);
    const numeric = nonNull.map((v) => Number(v)).filter((n) => Number.isFinite(n));
    const distinctCount = new Set(nonNull.map((v) => String(v))).size;
    const nullPct = values.length === 0 ? 0 : ((values.length - nonNull.length) / values.length) * 100;

    if (numeric.length > 0 && numeric.length >= nonNull.length * 0.8) {
      const min = Math.min(...numeric);
      const max = Math.max(...numeric);
      const avg = numeric.reduce((sum, n) => sum + n, 0) / numeric.length;
      stats[field] = { type: 'numeric', min, max, avg, distinctCount, nullPct };
    } else {
      stats[field] = { type: 'categorical', distinctCount, nullPct };
    }
  }
  return { totalRows: rows.length, columnStats: stats };
}

export async function generateResultSummary(stats: ReturnType<typeof computeResultStats>, understood: string, llmProvider: any): Promise<string> {
  const columns = Object.keys(stats.columnStats);
  if (columns.length === 0) {
    return 'Query executed successfully but returned no columns.';
  }
  const hints = columns.slice(0, 5).map((name) => {
    const column = stats.columnStats[name];
    if (column.type === 'numeric') {
      return `${name}: avg ${column.avg?.toFixed(2) ?? 'n/a'}`;
    }
    return `${name}: ${column.distinctCount} distinct`;
  });
  return `${understood} Returned ${stats.totalRows} rows. ${hints.join('; ')}`;
}
