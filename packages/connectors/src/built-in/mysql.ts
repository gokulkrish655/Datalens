import { createConnection } from 'mysql2/promise';
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

function buildMysqlConfig(config: ConnectionConfig) {
  return {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
  };
}

function quoteIdentifier(value: string) {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error('Invalid MySQL identifier');
  }
  return `\`${value}\``;
}

function parseMajorVersion(versionString: string) {
  const match = versionString.match(/(\d+)\.(\d+)/);
  return match ? Number(match[1]) : 0;
}

export const mysqlConnector: IDbConnector = {
  name: 'mysql',
  async detectVersion(config: ConnectionConfig): Promise<VersionInfo> {
    const connection = await createConnection(buildMysqlConfig(config));
    try {
      const [rows] = (await connection.query(
        'SELECT VERSION() AS version',
      )) as [Array<Record<string, unknown>>, unknown];
      const versionString = String((rows?.[0] as any)?.version ?? 'MySQL');
      return {
        connectorName: 'mysql',
        dbVersionString: versionString,
        dbVersionMajor: parseMajorVersion(versionString),
        dialectDescription: buildDialectDescription('mysql', versionString),
      };
    } finally {
      await connection.end();
    }
  },
  async introspectTables(config: ConnectionConfig): Promise<SchemaTableInfo[]> {
    const connection = await createConnection(buildMysqlConfig(config));
    await connection.connect();
    try {
      const schema = config.database;
      const [rows] = (await connection.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = "BASE TABLE" ORDER BY table_name',
        [schema],
      )) as [Array<Record<string, unknown>>, unknown];
      return (rows as any[]).map((row: any) => ({
        tableName: (row as any).table_name,
        schemaName: schema,
        displayName: (row as any).table_name,
      }));
    } finally {
      await connection.end();
    }
  },
  async introspectColumns(
    config: ConnectionConfig,
  ): Promise<SchemaColumnInfo[]> {
    const connection = await createConnection(buildMysqlConfig(config));
    await connection.connect();
    try {
      const schema = config.database;
      const [rows] = (await connection.query(
        'SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = ? ORDER BY table_name, ordinal_position',
        [schema],
      )) as [Array<Record<string, unknown>>, unknown];
      return rows.map((row: any) => ({
        tableName: (row as any).table_name,
        schemaName: schema,
        columnName: (row as any).column_name,
        displayName: (row as any).column_name,
        dataType: (row as any).data_type,
        description: undefined,
        semanticType: 'unknown',
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
    limit: number,
  ): Promise<string[]> {
    const connection = await createConnection(buildMysqlConfig(config));
    await connection.connect();
    try {
      const table = quoteIdentifier(tableName);
      const column = quoteIdentifier(columnName);
      const [rows] = (await connection.query(
        `SELECT DISTINCT CAST(${column} AS CHAR) AS sample FROM ${table} WHERE ${column} IS NOT NULL LIMIT ?`,
        [limit],
      )) as [Array<Record<string, unknown>>, unknown];
      return rows.map((row: any) => String((row as any).sample));
    } finally {
      await connection.end();
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
    const connection = await createConnection(buildMysqlConfig(config));
    await connection.connect();
    try {
      const [rows, fields] = (await connection.query(sql)) as unknown as [Array<Record<string, unknown>>, any[]];
      return {
        rows: rows as Record<string, unknown>[],
        fields: (fields as any[]).map((field) => ({
          name: field.name,
          dataType: String(field.type),
        })),
      };
    } finally {
      await connection.end();
    }
  },
  async testConnection(config: ConnectionConfig) {
    const connection = await createConnection(buildMysqlConfig(config));
    await connection.connect();
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
