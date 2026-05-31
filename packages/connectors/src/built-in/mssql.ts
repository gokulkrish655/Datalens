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

function buildMssqlConfig(config: ConnectionConfig) {
  return {
    server: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    options: {
      encrypt: config.ssl ?? false,
      trustServerCertificate: !config.ssl,
    },
  };
}

function quoteIdentifier(value: string) {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error('Invalid SQL Server identifier');
  }
  return `[${value}]`;
}

function parseMajorVersion(versionString: string) {
  const match = versionString.match(/(\d+)\.(\d+)/);
  return match ? Number(match[1]) : 0;
}

async function loadMssql() {
  const mssql = await import('mssql').catch(() => null);
  if (!mssql) {
    throw new Error('mssql driver is not installed.');
  }
  return mssql;
}

export const mssqlConnector: IDbConnector = {
  name: 'mssql',
  async detectVersion(config: ConnectionConfig): Promise<VersionInfo> {
    const mssql = await loadMssql();
    const pool = await new mssql.ConnectionPool(
      buildMssqlConfig(config),
    ).connect();
    try {
      const result = await pool.request().query('SELECT @@VERSION AS version');
      const versionString = String(
        result.recordset?.[0]?.version ?? 'SQL Server',
      );
      return {
        connectorName: 'mssql',
        dbVersionString: versionString,
        dbVersionMajor: parseMajorVersion(versionString),
        dialectDescription: buildDialectDescription('mssql', versionString),
      };
    } finally {
      await pool.close();
    }
  },
  async introspectTables(config: ConnectionConfig): Promise<SchemaTableInfo[]> {
    const mssql = await loadMssql();
    const pool = await new mssql.ConnectionPool(
      buildMssqlConfig(config),
    ).connect();
    try {
      const result = await pool
        .request()
        .query(
          "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_SCHEMA, TABLE_NAME",
        );
      return result.recordset.map((row: any) => ({
        tableName: row.TABLE_NAME,
        schemaName: row.TABLE_SCHEMA,
        displayName: row.TABLE_NAME,
      }));
    } finally {
      await pool.close();
    }
  },
  async introspectColumns(
    config: ConnectionConfig,
  ): Promise<SchemaColumnInfo[]> {
    const mssql = await loadMssql();
    const pool = await new mssql.ConnectionPool(
      buildMssqlConfig(config),
    ).connect();
    try {
      const result = await pool
        .request()
        .query(
          'SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION',
        );
      return result.recordset.map((row: any) => ({
        tableName: row.TABLE_NAME,
        schemaName: row.TABLE_SCHEMA,
        columnName: row.COLUMN_NAME,
        displayName: row.COLUMN_NAME,
        dataType: row.DATA_TYPE,
        description: undefined,
        semanticType: 'unknown',
      }));
    } finally {
      await pool.close();
    }
  },
  async sampleColumn(
    config: ConnectionConfig,
    schemaName: string,
    tableName: string,
    columnName: string,
    limit: number,
  ): Promise<string[]> {
    const mssql = await loadMssql();
    const pool = await new mssql.ConnectionPool(
      buildMssqlConfig(config),
    ).connect();
    try {
      const schema = schemaName || 'dbo';
      const table = `${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}`;
      const column = quoteIdentifier(columnName);
      const result = await pool
        .request()
        .query(
          `SELECT DISTINCT TOP (${limit}) CAST(${column} AS NVARCHAR(MAX)) AS sample FROM ${table} WHERE ${column} IS NOT NULL`,
        );
      return result.recordset.map((row: any) => String(row.sample));
    } finally {
      await pool.close();
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
    const mssql = await loadMssql();
    const pool = await new mssql.ConnectionPool(
      buildMssqlConfig(config),
    ).connect();
    try {
      const result = await pool.request().query(sql);
      return {
        rows: result.recordset as Record<string, unknown>[],
        fields:
          result.recordset && result.recordset.columns
            ? Object.values(result.recordset.columns).map((column: any) => ({
                name: column.name,
                dataType: column.type?.name ?? 'unknown',
              }))
            : [],
      };
    } finally {
      await pool.close();
    }
  },
  async testConnection(config: ConnectionConfig) {
    const mssql = await loadMssql();
    const pool = await new mssql.ConnectionPool(
      buildMssqlConfig(config),
    ).connect();
    try {
      await pool.request().query('SELECT 1');
      return { valid: true };
    } catch (error) {
      return { valid: false, error: String(error) };
    } finally {
      await pool.close();
    }
  },
};
