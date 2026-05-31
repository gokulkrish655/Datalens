import { LRUCache } from 'lru-cache';

interface CachedResult {
  rows: Record<string, unknown>[];
  fields: Array<{ name: string; dataType: string }>;
  cachedAt: number;
}

export const queryCache = new LRUCache<string, CachedResult>({ max: 500 });

export function buildCacheKey(connectionId: string, sql: string): string {
  const normalized = sql.trim().toLowerCase().replace(/\s+/g, ' ');
  return `${connectionId}:${normalized}`;
}
