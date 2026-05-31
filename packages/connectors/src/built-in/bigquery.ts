import { BigQuery } from '@google-cloud/bigquery';
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

function buildBigQueryClient(config: ConnectionConfig) {
  return new BigQuery({
    projectId: config.extra?.projectId ?? config.database,
    keyFilename: config.extra?.keyFilename ?? config.extra?.keyFile,
  });
}

function quoteIdentifier(value: string) {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error('Invalid BigQuery identifier');
  }
  return `\`${value}\``;
}

export const bigqueryConnector: IDbConnector = {
  name: 'bigquery',
  async detectVersion(config: ConnectionConfig): Promise<VersionInfo> {
    const client = buildBigQueryClient(config);
    const [rows] = await client.query({
      query: 'SELECT "BigQuery Standard SQL" AS version',
    });
    const versionString = String(
      (rows as any)?.[0]?.version ?? 'BigQuery Standard SQL',
    );
    return {
      connectorName: 'bigquery',
      dbVersionString: versionString,
      dbVersionMajor: 1,
      dialectDescription: buildDialectDescription('bigquery', versionString),
    };
  },
  async introspectTables(config: ConnectionConfig): Promise<SchemaTableInfo[]> {
    const client = buildBigQueryClient(config);
    const projectId = config.extra?.projectId ?? config.database;
    const dataset = config.extra?.dataset ?? config.schema;
    if (!projectId || !dataset) return [];
    const sql = `SELECT table_name FROM \`${projectId}.${dataset}.INFORMATION_SCHEMA.TABLES\` WHERE table_type = 'BASE TABLE' ORDER BY table_name`;
    const [rows] = await client.query({ query: sql });
    return (rows as any[]).map((row) => ({
      tableName: row.table_name,
      schemaName: dataset,
      displayName: row.table_name,
    }));
  },
  async introspectColumns(
    config: ConnectionConfig,
  ): Promise<SchemaColumnInfo[]> {
    const client = buildBigQueryClient(config);
    const projectId = config.extra?.projectId ?? config.database;
    const dataset = config.extra?.dataset ?? config.schema;
    if (!projectId || !dataset) return [];
    const sql = `SELECT table_name, column_name, data_type, is_nullable FROM \`${projectId}.${dataset}.INFORMATION_SCHEMA.COLUMNS\` ORDER BY table_name, ordinal_position`;
    const [rows] = await client.query({ query: sql });
    return (rows as any[]).map((row) => ({
      tableName: row.table_name,
      schemaName: dataset,
      columnName: row.column_name,
      displayName: row.column_name,
      dataType: row.data_type,
      description: undefined,
      semanticType: 'unknown',
    }));
  },
  async sampleColumn(
    config: ConnectionConfig,
    _schemaName: string,
    tableName: string,
    columnName: string,
    limit: number,
  ): Promise<string[]> {
    const client = buildBigQueryClient(config);
    const projectId = config.extra?.projectId ?? config.database;
    const dataset = config.extra?.dataset ?? config.schema;
    if (!projectId || !dataset) return [];
    const sql = `SELECT DISTINCT CAST(${quoteIdentifier(columnName)} AS STRING) AS sample FROM \`${projectId}.${dataset}.${tableName}\` WHERE ${quoteIdentifier(columnName)} IS NOT NULL LIMIT ${limit}`;
    const [rows] = await client.query({ query: sql });
    return (rows as any[]).map((row) => String(row.sample));
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
    const client = buildBigQueryClient(config);
    const [rows] = await client.query({ query: sql });
    return {
      rows: rows as Record<string, unknown>[],
      fields: [],
    };
  },
  async testConnection(config: ConnectionConfig) {
    const client = buildBigQueryClient(config);
    try {
      await client.query({ query: 'SELECT 1' });
      return { valid: true };
    } catch (error) {
      return { valid: false, error: String(error) };
    }
  },
};
