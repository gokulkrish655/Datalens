import * as mariadb from 'mariadb';
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

function buildMariaDbConfig(config: ConnectionConfig) {
  return {
    host: config.host,
    port: config.port,
    user: config.username ?? config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
  };
}

function quoteIdentifier(value: string) {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error('Invalid MariaDB identifier');
  }
  return `\`${value}\``;
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

export const mariadbConnector: IDbConnector = {
  name: 'mariadb',
  displayName: 'MariaDB',
  async detectVersion(config: ConnectionConfig): Promise<VersionInfo> {
    const connection = await mariadb.createConnection(buildMariaDbConfig(config));
    try {
      const rows = (await connection.query('SELECT VERSION() AS version')) as Array<Record<string, unknown>>;
      const versionString = String((rows?.[0] as any)?.version ?? 'MariaDB');
      const versionParts = parseVersionParts(versionString);
      return {
        connectorName: 'mariadb',
        versionString,
        major: versionParts.major,
        minor: versionParts.minor,
        patch: versionParts.patch,
        dialectDescription: buildDialectDescription('mariadb', versionString),
      };
    } finally {
      await connection.end();
    }
  },
  async introspectRelationships(config: ConnectionConfig): Promise<ForeignKeyInfo[]> {
    const connection = await mariadb.createConnection(buildMariaDbConfig(config));
    try {
      const [rows] = (await connection.query(
        `SELECT
          TABLE_SCHEMA AS from_schema,
          TABLE_NAME AS from_table,
          COLUMN_NAME AS from_column,
          REFERENCED_TABLE_SCHEMA AS to_schema,
          REFERENCED_TABLE_NAME AS to_table,
          REFERENCED_COLUMN_NAME AS to_column,
          CONSTRAINT_NAME AS constraint_name
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE REFERENCED_TABLE_NAME IS NOT NULL
          AND TABLE_SCHEMA = DATABASE()`
      )) as [Array<Record<string, unknown>>, unknown];
      return rows.map((row: any) => ({
        fromSchema: row.from_schema,
        fromTable: row.from_table,
        fromColumn: row.from_column,
        toSchema: row.to_schema,
        toTable: row.to_table,
        toColumn: row.to_column,
        constraintName: row.constraint_name,
      }));
    } finally {
      await connection.end();
    }
  },
  async introspectTables(config: ConnectionConfig): Promise<SchemaTableInfo[]> {
    const connection = await mariadb.createConnection(buildMariaDbConfig(config));
    try {
      const schema = config.database;
      const rows = (await connection.query(
        'SELECT table_name, table_comment, table_rows FROM information_schema.tables WHERE table_schema = ? AND table_type = "BASE TABLE" ORDER BY table_name',
        [schema],
      )) as Array<Record<string, unknown>>;
      return rows.map((row: any) => ({
        tableName: row.TABLE_NAME ?? row.table_name,
        schemaName: schema,
        displayName: row.TABLE_NAME ?? row.table_name,
        nativeComment: row.table_comment ?? undefined,
        rowCountEstimate: buildRowCountEstimate(row.table_rows),
      }));
    } finally {
      await connection.end();
    }
  },
  async introspectColumns(
    config: ConnectionConfig,
    tableFilter?: Array<{ schemaName: string; tableName: string }>,
  ): Promise<SchemaColumnInfo[]> {
    const connection = await mariadb.createConnection(buildMariaDbConfig(config));
    try {
      const schema = config.database;
      const rows = (await connection.query(
        'SELECT table_name, column_name, data_type, is_nullable, column_default, column_comment FROM information_schema.columns WHERE table_schema = ? ORDER BY table_name, ordinal_position',
        [schema],
      )) as Array<Record<string, unknown>>;
      return rows.map((row: any) => ({
        tableName: row.TABLE_NAME ?? row.table_name,
        schemaName: schema,
        columnName: row.COLUMN_NAME ?? row.column_name,
        displayName: row.COLUMN_NAME ?? row.column_name,
        dataType: row.DATA_TYPE ?? row.data_type,
        defaultValue: row.COLUMN_DEFAULT ?? row.column_default ?? undefined,
        isNullable: (row.IS_NULLABLE ?? row.is_nullable) === 'YES',
        semanticType: 'unknown',
        nativeComment: row.COLUMN_COMMENT ?? row.column_comment ?? undefined,
      }));
    } finally {
      await connection.end();
    }
  },
  async sampleColumn(
    config: ConnectionConfig,
    _schemaName: string,
    tableName: string,
    columnName: string,
    limit = 5,
  ): Promise<string[]> {
    const connection = await mariadb.createConnection(buildMariaDbConfig(config));
    try {
      const table = quoteIdentifier(tableName);
      const column = quoteIdentifier(columnName);
      const rows = (await connection.query(
        `SELECT DISTINCT CAST(${column} AS CHAR) AS sample FROM ${table} WHERE ${column} IS NOT NULL LIMIT ?`,
        [limit],
      )) as Array<Record<string, unknown>>;
      return rows.map((row: any) => String((row as any).sample));
    } finally {
      await connection.end();
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
    const connection = await mariadb.createConnection(buildMariaDbConfig(config));
    try {
      const rows = (await connection.query(
        `SELECT * FROM (${sql.replace(/;\s*$/, '')}) AS __datalens_query LIMIT ${rowLimit}`,
      )) as Array<Record<string, unknown>>;
      return {
        rows: rows as Record<string, unknown>[],
        fields: [],
      };
    } finally {
      await connection.end();
    }
  },
  async testConnection(config: ConnectionConfig) {
    const connection = await mariadb.createConnection(buildMariaDbConfig(config));
    try {
      await connection.query('SELECT 1');
      return { valid: true };
    } catch (error) {
      return { valid: false, error: String(error) };
    } finally {
      await connection.end();
    }
  },
};
