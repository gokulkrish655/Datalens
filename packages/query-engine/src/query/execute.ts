import { acquireQuerySlot, releaseQuerySlot } from '../concurrency';
import { buildCacheKey, queryCache } from '../cache';
import { registry } from '@datalens/connectors';
import { decrypt } from '@datalens/providers/src/crypto';
import { createAdminPrisma } from '@datalens/db';

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
  const db = createAdminPrisma();
  const mergedRows: Record<string, unknown>[] = [];
  const fields: Array<{ name: string; dataType: string }> = [];
  let fromCache = true;

  for (const query of params.queries) {
    await acquireQuerySlot(query.connectionId, 5);
    try {
      const cacheKey = buildCacheKey(query.connectionId, query.sql);
      const cached = queryCache.get(cacheKey);
      if (cached) {
        mergedRows.push(...cached.rows);
        if (fields.length === 0) fields.push(...cached.fields);
        continue;
      }

      fromCache = false;
      const connection = await db.databaseConnection.findUnique({
        where: { id: query.connectionId },
      });
      if (!connection) {
        throw new Error(`Connection not found: ${query.connectionId}`);
      }

      const secretsRaw = await decrypt(connection.encryptedCredentials);
      const secrets = JSON.parse(secretsRaw) as {
        username?: string;
        user?: string;
        password: string;
        database?: string;
        schema?: string;
      };
      const connector = registry.get(connection.connectorName);
      const result = await connector.executeQuery(
        {
          host: connection.host,
          port: connection.port ?? undefined,
          database: connection.database ?? secrets.database,
          schema: connection.schema ?? secrets.schema,
          username: secrets.username ?? secrets.user,
          password: secrets.password,
          ssl: true,
        },
        query.sql,
        params.rowLimit,
        params.timeoutMs,
      );

      queryCache.set(cacheKey, {
        rows: result.rows,
        fields: result.fields,
        cachedAt: Date.now(),
      });

      mergedRows.push(...result.rows);
      if (fields.length === 0) fields.push(...result.fields);
    } finally {
      releaseQuerySlot(query.connectionId);
    }
  }
  return { mergedRows, fields, fromCache };
}
