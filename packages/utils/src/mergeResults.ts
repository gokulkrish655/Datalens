export function mergeResults(results: Record<string, unknown>[][]): Record<string, unknown>[] {
  return results.flat();
}
