const activeQueries = new Map<string, number>();

export async function acquireQuerySlot(connectionId: string, limit: number): Promise<void> {
  const current = activeQueries.get(connectionId) ?? 0;
  if (current >= limit) {
    throw new Error('Query concurrency limit reached for this connection');
  }
  activeQueries.set(connectionId, current + 1);
}

export function releaseQuerySlot(connectionId: string): void {
  const current = activeQueries.get(connectionId) ?? 1;
  activeQueries.set(connectionId, Math.max(0, current - 1));
}
