import { registry } from './registry';
import { decrypt } from '../../providers/src/crypto';
import {
  ConnectionConfig,
  ForeignKeyInfo,
  SchemaColumnInfo,
  SchemaTableInfo,
} from './interface';
import { anonymizeSamples } from './built-in/pii';
import { detectSemanticType } from '@datalens/utils';

const PII_SEMANTIC_TYPES = new Set(['EMAIL', 'PHONE', 'FULL_NAME', 'ADDRESS']);

function normalizeCredentials(parsed: Record<string, unknown>, schema?: string): ConnectionConfig {
  return {
    host: String(parsed.host ?? ''),
    port: parsed.port as number | undefined,
    user: parsed.user as string | undefined,
    username: parsed.username as string | undefined,
    password: String(parsed.password ?? ''),
    database: parsed.database as string | undefined,
    schema: schema ?? (parsed.schema as string | undefined),
    ssl: parsed.ssl as boolean | undefined,
    extra: (parsed.extra as Record<string, string>) ?? undefined,
  };
}

function buildTableKey(schemaName: string | undefined, tableName: string) {
  return `${schemaName ?? 'public'}.${tableName}`;
}

export type RefreshOptions = {
  encryptedCredentials: string;
  connectorName: string;
  schema?: string;
  sampleLimit?: number;
  tableLimit?: number;
};

export async function refreshConnectionMetadata(opts: RefreshOptions) {
  const { encryptedCredentials, connectorName, schema, sampleLimit = 5, tableLimit = 200 } = opts;

  let config: ConnectionConfig;
  try {
    const json = await decrypt(encryptedCredentials);
    const parsed = JSON.parse(json || '{}');
    config = normalizeCredentials(parsed, schema);
  } catch (err) {
    throw new Error(`Failed to decrypt connection credentials: ${String(err)}`);
  }

  const connector = registry.get(connectorName);

  const versionInfo = await connector.detectVersion(config);
  const relationships = await connector.introspectRelationships(config);
  const tables = (await connector.introspectTables(config)).slice(0, tableLimit);
  const columns = await connector.introspectColumns(config);

  const fkMap = new Map<string, ForeignKeyInfo[]>();
  for (const relationship of relationships) {
    const key = `${relationship.fromSchema ?? config.schema ?? 'public'}.${relationship.fromTable}`;
    const bucket = fkMap.get(key) ?? [];
    bucket.push(relationship);
    fkMap.set(key, bucket);
  }

  const annotatedColumns = columns.map((col) => {
    const schemaName = col.schemaName ?? config.schema ?? 'public';
    const tableKey = `${schemaName}.${col.tableName}`;
    const fks = fkMap.get(tableKey) ?? [];
    const fk = fks.find((relationship) => relationship.fromColumn === col.columnName);
    return {
      ...col,
      isForeignKey: Boolean(fk),
      isPrimaryKey: col.isPrimaryKey ?? false,
      referencesTable: fk?.toTable,
      referencesColumn: fk?.toColumn,
    };
  });

  const samplesByTable: Record<string, Record<string, string[]>> = {};
  for (const col of columns) {
    const schemaName = col.schemaName ?? config.schema ?? 'public';
    const tableKey = buildTableKey(schemaName, col.tableName);
    samplesByTable[tableKey] ||= {};
    try {
      const rawSamples = await connector.sampleColumn(
        config,
        schemaName,
        col.tableName,
        col.columnName,
        sampleLimit,
      );
      const semanticType = detectSemanticType(col.columnName, col.dataType, rawSamples);
      col.semanticType = semanticType;
      const samples = PII_SEMANTIC_TYPES.has(semanticType)
        ? rawSamples.map((_, index) => `[${semanticType}_${index + 1}]`)
        : anonymizeSamples(rawSamples);
      samplesByTable[tableKey][col.columnName] = samples;
    } catch (e) {
      samplesByTable[tableKey][col.columnName] = [];
      col.semanticType = detectSemanticType(col.columnName, col.dataType, []);
    }
  }

  const tableDetails = tables.map((table: SchemaTableInfo) => {
    const tableKey = buildTableKey(table.schemaName ?? config.schema ?? 'public', table.tableName);
    return {
      ...table,
      columns: columns
        .filter((col) => buildTableKey(col.schemaName ?? config.schema ?? 'public', col.tableName) === tableKey)
        .map((col) => ({
          ...col,
          samples: samplesByTable[tableKey]?.[col.columnName] ?? [],
        })),
    };
  });

  return {
    versionInfo,
    relationships,
    tables: tableDetails,
    generatedAt: new Date().toISOString(),
  };
}

export default refreshConnectionMetadata;
