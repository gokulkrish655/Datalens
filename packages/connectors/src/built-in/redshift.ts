import { Client } from 'pg';
import {
  ConnectionConfig,
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
    user: config.user,
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

function parseMajorVersion(versionString: string) {
  const match =
    versionString.match(/Redshift\s+([0-9]+)/i) ||
    versionString.match(/PostgreSQL\s+(\d+)/i);
  return match ? Number(match[1]) : 0;
}

export const redshiftConnector: IDbConnector = {
  name: 'redshift',
  async detectVersion(config: ConnectionConfig): Promise<VersionInfo> {
    const client = new Client(buildRedshiftConfig(config));
    await client.connect();
    try {
      const result = await client.query('SELECT version() AS version');
      const dbVersionString = String((result.rows as any)?.[0]?.version ?? 'Amazon Redshift');
      return {
        connectorName: 'redshift',
        dbVersionString,
        dbVersionMajor: parseMajorVersion(dbVersionString),
        dialectDescription: buildDialectDescription(
          'redshift',
          dbVersionString,
        ),
      };
    } finally {
      await client.end();
    }
  },
  async introspectTables(config: ConnectionConfig): Promise<SchemaTableInfo[]> {
    const client = new Client(buildRedshiftConfig(config));
    await client.connect();
    try {
      const schemaCondition = config.schema
        ? `table_schema = '${config.schema}'`
        : 'table_schema NOT IN (\'pg_catalog\', \'information_schema\')';
      const result = await client.query(
        `SELECT table_name, table_schema FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND ${schemaCondition} ORDER BY table_schema, table_name`,
      );
      return (result.rows as any[]).map((row: any) => ({
        tableName: row.table_name,
        schemaName: row.table_schema,
        displayName: row.table_name,
      }));
    } finally {
      await client.end();
    }
  },
  async introspectColumns(
    config: ConnectionConfig,
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
        description: undefined,
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
    limit: number,
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
  async validateWhereClause(_config: ConnectionConfig, whereClause: string) {
    return validateWhereClause(whereClause);
  },
  async executeQuery(
    config: ConnectionConfig,
    sql: string,
    _timeoutMs: number,
    _rowLimit: number,
  ): Promise<QueryResult> {
    ensureReadOnlySql(sql);
    const client = new Client(buildRedshiftConfig(config));
    await client.connect();
    try {
      const result = await client.query(sql);
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
