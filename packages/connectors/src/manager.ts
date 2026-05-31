import { registry } from './registry';
import { decrypt } from '../../providers/src/crypto';
import { ConnectionConfig, SchemaColumnInfo, SchemaTableInfo } from './interface';
import { anonymizeSamples } from './built-in/pii';

export type RefreshOptions = {
  encryptedCredentials: string;
  connectorName: string;
  schema?: string;
  sampleLimit?: number;
  tableLimit?: number;
};

export async function refreshConnectionMetadata(opts: RefreshOptions) {
  const { encryptedCredentials, connectorName, schema, sampleLimit = 5, tableLimit = 200 } = opts;

  // Decrypt stored credentials (KMS/local) and build ConnectionConfig
  let config: ConnectionConfig;
  try {
    const json = await decrypt(encryptedCredentials);
    const parsed = JSON.parse(json || '{}');
    config = {
      host: parsed.host,
      port: parsed.port,
      user: parsed.user,
      password: parsed.password,
      database: parsed.database,
      schema: schema ?? parsed.schema,
      extra: parsed.extra,
    } as ConnectionConfig;
  } catch (err) {
    throw new Error(`Failed to decrypt connection credentials: ${String(err)}`);
  }

  const connector = registry.get(connectorName);

  // Detect version and build dialect description
  const versionInfo = await connector.detectVersion(config);

  // Introspect tables (limit results to avoid heavy metadata)
  const tables = (await connector.introspectTables(config)).slice(0, tableLimit);

  // Introspect columns (full) and sample values for a small subset
  const columns = await connector.introspectColumns(config);

  // Group columns by table for sampling
  const samplesByTable: Record<string, Record<string, string[]>> = {};
  for (const col of columns) {
    if (!samplesByTable[col.tableName]) samplesByTable[col.tableName] = {};
    try {
      const raw = await connector.sampleColumn(config, col.schemaName ?? config.schema ?? 'public', col.tableName, col.columnName, sampleLimit);
      samplesByTable[col.tableName][col.columnName] = anonymizeSamples(raw);
    } catch (e) {
      // ignore sampling errors and continue
      samplesByTable[col.tableName][col.columnName] = [];
    }
  }

  const tableDetails = tables.map((t: SchemaTableInfo) => ({
    ...t,
    columns: columns.filter((c) => c.tableName === t.tableName).map((c) => ({
      ...c,
      samples: samplesByTable[t.tableName]?.[c.columnName] ?? [],
    })),
  }));

  return {
    versionInfo,
    tables: tableDetails,
    generatedAt: new Date().toISOString(),
  };
}

export default refreshConnectionMetadata;
