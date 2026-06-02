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

function buildPgConfig(config: ConnectionConfig) {
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
    throw new Error('Invalid PostgreSQL identifier');
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

function buildQueryRowCountEstimate(value: unknown): bigint | undefined {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.floor(value));
  if (typeof value === 'string' && value !== '') return BigInt(value);
  return undefined;
}

export const postgresConnector: IDbConnector = {
  name: 'postgres',
  displayName: 'PostgreSQL',
  async detectVersion(config: ConnectionConfig): Promise<VersionInfo> {
    const client = new Client(buildPgConfig(config));
    await client.connect();
    try {
      const result = await client.query('SELECT version() AS version');
      const versionString = String((result.rows as any)?.[0]?.version ?? 'PostgreSQL');
      const versionParts = parseVersionParts(versionString);
      return {
        connectorName: 'postgres',
        versionString,
        major: versionParts.major,
        minor: versionParts.minor,
        patch: versionParts.patch,
        dialectDescription: buildDialectDescription('postgres', versionString),
      };
    } finally {
      await client.end();
    }
  },
  async introspectRelationships(config: ConnectionConfig): Promise<ForeignKeyInfo[]> {
    const client = new Client(buildPgConfig(config));
    await client.connect();
    try {
      const schemaFilter = config.schema ? 'AND tc.table_schema = $1' : '';
      const params = config.schema ? [config.schema] : [];
      const result = await client.query(
        `SELECT
          kcu.table_schema AS from_schema,
          kcu.table_name AS from_table,
          kcu.column_name AS from_column,
          ccu.table_schema AS to_schema,
          ccu.table_name AS to_table,
          ccu.column_name AS to_column,
          tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
          AND tc.constraint_schema = rc.constraint_schema
        JOIN information_schema.constraint_column_usage ccu
          ON rc.unique_constraint_name = ccu.constraint_name
          AND rc.unique_constraint_schema = ccu.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          ${schemaFilter}
        ORDER BY kcu.table_schema, kcu.table_name, kcu.ordinal_position`,
        params,
      );
      return (result.rows as any[]).map((row: any) => ({
        fromSchema: row.from_schema,
        fromTable: row.from_table,
        fromColumn: row.from_column,
        toSchema: row.to_schema,
        toTable: row.to_table,
        toColumn: row.to_column,
        constraintName: row.constraint_name,
      }));
    } finally {
      await client.end();
    }
  },
  async introspectTables(config: ConnectionConfig): Promise<SchemaTableInfo[]> {
    const client = new Client(buildPgConfig(config));
    await client.connect();
    try {
      const schemaCondition = config.schema
        ? `t.table_schema = $1`
        : `t.table_schema NOT IN ('pg_catalog', 'information_schema')`;
      const params = config.schema ? [config.schema] : [];
      const result = await client.query(
        `SELECT
           t.table_name,
           t.table_schema,
           obj_description(c.oid) AS native_comment,
           c.reltuples::bigint AS row_count_estimate
         FROM information_schema.tables t
         JOIN pg_class c ON c.relname = t.table_name
         JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
         WHERE t.table_type = 'BASE TABLE'
           AND ${schemaCondition}
         ORDER BY t.table_schema, t.table_name`,
        params,
      );
      return (result.rows as any[]).map((row: any) => ({
        tableName: row.table_name,
        schemaName: row.table_schema,
        displayName: row.table_name,
        nativeComment: row.native_comment ?? undefined,
        rowCountEstimate: buildQueryRowCountEstimate(row.row_count_estimate),
      }));
    } finally {
      await client.end();
    }
  },
  async introspectColumns(
    config: ConnectionConfig,
    tableFilter?: Array<{ schemaName: string; tableName: string }>,
  ): Promise<SchemaColumnInfo[]> {
    const client = new Client(buildPgConfig(config));
    await client.connect();
    try {
      const schemaCondition = config.schema
        ? `c.table_schema = $1`
        : `c.table_schema NOT IN ('pg_catalog', 'information_schema')`;
      const params = config.schema ? [config.schema] : [];
      const result = await client.query(
        `SELECT
           c.table_name,
           c.table_schema,
           c.column_name,
           c.data_type,
           c.column_default,
           c.is_nullable,
           col_description(pc.oid, c.ordinal_position) AS native_comment
         FROM information_schema.columns c
         JOIN pg_class pc ON pc.relname = c.table_name
         JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = c.table_schema
         WHERE ${schemaCondition}
         ORDER BY c.table_schema, c.table_name, c.ordinal_position`,
        params,
      );
      return (result.rows as any[]).map((row: any) => ({
        tableName: row.table_name,
        schemaName: row.table_schema,
        columnName: row.column_name,
        displayName: row.column_name,
        dataType: row.data_type,
        defaultValue: row.column_default ?? undefined,
        isNullable: row.is_nullable === 'YES',
        semanticType: 'unknown',
        nativeComment: row.native_comment ?? undefined,
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
    const client = new Client(buildPgConfig(config));
    await client.connect();
    try {
      const schema = schemaName || config.schema || 'public';
      const qualifiedTable = `${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}`;
      const qualifiedColumn = `${quoteIdentifier(tableName)}.${quoteIdentifier(columnName)}`;
      const result = await client.query(
        `SELECT DISTINCT CAST(${qualifiedColumn} AS text) AS sample
         FROM ${qualifiedTable}
         WHERE ${qualifiedColumn} IS NOT NULL
         LIMIT $1`,
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
    timeoutMs: number,
  ): Promise<QueryResult> {
    ensureReadOnlySql(sql);
    const client = new Client(buildPgConfig(config));
    await client.connect();
    try {
      await client.query(`SET statement_timeout = ${Math.max(1, timeoutMs)}`);
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
    const client = new Client(buildPgConfig(config));
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
