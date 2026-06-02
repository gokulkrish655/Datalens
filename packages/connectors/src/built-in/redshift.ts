import { Client } from 'pg';
import {
  ConnectionConfig,
  ForeignKeyInfo,
  IDbConnector,
  QueryResult,
  SchemaColumnInfo,
  SchemaTableInfo,
  VersionInfo,
} from '../interface';
import { buildDialectDescription } from './dialect-utils';
import { ensureReadOnlySql, validateWhereClause } from './query-safety';

function buildRedshiftConfig(config: ConnectionConfig) {
  return {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username ?? config.user,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
  };
}

function quoteIdentifier(value: string) {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error('Invalid Redshift identifier');
  }
  return `"${value}"`;
}

function parseVersionParts(versionString: string) {
  const match = versionString.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  return {
    major: match ? Number(match[1]) : 0,
    minor: match && match[2] ? Number(match[2]) : 0,
    patch: match && match[3] ? Number(match[3]) : 0,
  };
}

function buildRowCountEstimate(value: unknown): bigint | undefined {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.floor(value));
  if (typeof value === 'string' && value !== '') return BigInt(value);
  return undefined;
}

export const redshiftConnector: IDbConnector = {
  name: 'redshift',
  displayName: 'Amazon Redshift',
  async detectVersion(config: ConnectionConfig): Promise<VersionInfo> {
    const client = new Client(buildRedshiftConfig(config));
    await client.connect();
    try {
      const result = await client.query('SELECT version() AS version');
      const versionString = String((result.rows as any)?.[0]?.version ?? 'Amazon Redshift');
      const versionParts = parseVersionParts(versionString);
      return {
        connectorName: 'redshift',
        versionString,
        major: versionParts.major,
        minor: versionParts.minor,
        patch: versionParts.patch,
        dialectDescription: buildDialectDescription('redshift', versionString),
      };
    } finally {
      await client.end();
    }
  },
  async introspectRelationships(_config: ConnectionConfig): Promise<ForeignKeyInfo[]> {
    return [];
  },
  async introspectTables(config: ConnectionConfig): Promise<SchemaTableInfo[]> {
    const client = new Client(buildRedshiftConfig(config));
    await client.connect();
    try {
      const schemaCondition = config.schema
        ? `table_schema = '${config.schema}'`
        : 'table_schema NOT IN (\'pg_catalog\', \'information_schema\')';
      const result = await client.query(
        `SELECT table_name, table_schema, "rows" AS row_count_estimate FROM svv_table_info WHERE ${schemaCondition} ORDER BY table_schema, table_name`,
      );
      return (result.rows as any[]).map((row: any) => ({
        tableName: row.table_name,
        schemaName: row.table_schema,
        displayName: row.table_name,
        rowCountEstimate: buildRowCountEstimate(row.row_count_estimate),
      }));
    } finally {
      await client.end();
    }
  },
  async introspectColumns(
    config: ConnectionConfig,
    tableFilter?: Array<{ schemaName: string; tableName: string }>,
  ): Promise<SchemaColumnInfo[]> {
    const client = new Client(buildRedshiftConfig(config));
    await client.connect();
    try {
      const schemaCondition = config.schema
        ? `table_schema = '${config.schema}'`
        : 'table_schema NOT IN (\'pg_catalog\', \'information_schema\')';
      const result = await client.query(
        `SELECT table_name, table_schema, column_name, data_type, is_nullable FROM information_schema.columns WHERE ${schemaCondition} ORDER BY table_schema, table_name, ordinal_position`,
      );
      return (result.rows as any[]).map((row: any) => ({
        tableName: row.table_name,
        schemaName: row.table_schema,
        columnName: row.column_name,
        displayName: row.column_name,
        dataType: row.data_type,
        isNullable: row.is_nullable === 'YES',
        semanticType: 'unknown',
      }));
    } finally {
      await client.end();
    }
  },
  async sampleColumn(
    config: ConnectionConfig,
    schemaName: string,
    tableName: string,
    columnName: string,
    limit = 5,
  ): Promise<string[]> {
    const client = new Client(buildRedshiftConfig(config));
    await client.connect();
    try {
      const schema = schemaName || config.schema || 'public';
      const qualifiedTable = `${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}`;
      const quotedColumn = quoteIdentifier(columnName);
      const result = await client.query(
        `SELECT DISTINCT CAST(${quotedColumn} AS VARCHAR) AS sample FROM ${qualifiedTable} WHERE ${quotedColumn} IS NOT NULL LIMIT $1`,
        [limit],
      );
      return (result.rows as any[]).map((row: any) => String(row.sample));
    } finally {
      await client.end();
    }
  },
  async validateWhereClause(
    _config: ConnectionConfig,
    _schemaName: string,
    _tableName: string,
    whereClause: string,
  ) {
    return validateWhereClause(whereClause);
  },
  async executeQuery(
    config: ConnectionConfig,
    sql: string,
    rowLimit: number,
    _timeoutMs: number,
  ): Promise<QueryResult> {
    ensureReadOnlySql(sql);
    const client = new Client(buildRedshiftConfig(config));
    await client.connect();
    try {
      const wrappedSql = `SELECT * FROM (${sql.replace(/;\s*$/, '')}) AS __datalens_query LIMIT ${rowLimit}`;
      const result = await client.query(wrappedSql);
      return {
        rows: result.rows as Record<string, unknown>[],
        fields: result.fields.map((field: any) => ({
          name: field.name,
          dataType: String(field.dataTypeID),
        })),
      };
    } finally {
      await client.end();
    }
  },
  async testConnection(config: ConnectionConfig) {
    const client = new Client(buildRedshiftConfig(config));
    await client.connect();
    try {
      await client.query('SELECT 1');
      return { valid: true };
    } catch (error) {
      return { valid: false, error: String(error) };
    } finally {
      await client.end();
    }
  },
};
