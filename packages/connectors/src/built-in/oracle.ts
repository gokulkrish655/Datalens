import oracledb from 'oracledb';
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

function buildOracleConfig(config: ConnectionConfig) {
  const port = config.port ?? 1521;
  const service = config.extra?.serviceName || config.database;
  return {
    user: config.user,
    password: config.password,
    connectString: `${config.host}:${port}/${service}`,
  };
}

function quoteIdentifier(value: string) {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error('Invalid Oracle identifier');
  }
  return `"${value}"`;
}

function parseMajorVersion(versionString: string) {
  const match = versionString.match(/(\d+)\.(\d+)/);
  return match ? Number(match[1]) : 0;
}

async function openOracleConnection(config: ConnectionConfig) {
  return oracledb.getConnection(buildOracleConfig(config));
}

export const oracleConnector: IDbConnector = {
  name: 'oracle',
  async detectVersion(config: ConnectionConfig): Promise<VersionInfo> {
    const connection = await openOracleConnection(config);
    try {
      const result = await connection.execute(
        'SELECT BANNER FROM v$version WHERE ROWNUM = 1',
      );
      const dbVersionString = String(
        (result.rows?.[0] as any)?.[0] ?? 'Oracle Database',
      );
      return {
        connectorName: 'oracle',
        dbVersionString,
        dbVersionMajor: parseMajorVersion(dbVersionString),
        dialectDescription: buildDialectDescription('oracle', dbVersionString),
      };
    } finally {
      await connection.close();
    }
  },
  async introspectTables(config: ConnectionConfig): Promise<SchemaTableInfo[]> {
    const connection = await openOracleConnection(config);
    try {
      const owner = config.schema?.toUpperCase() ?? config.user?.toUpperCase();
      const result = await connection.execute(
        'SELECT OWNER, TABLE_NAME FROM ALL_TABLES WHERE OWNER = :owner ORDER BY TABLE_NAME',
        [owner],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return (result.rows as any[]).map((row) => ({
        tableName: row.TABLE_NAME,
        schemaName: row.OWNER,
        displayName: row.TABLE_NAME,
      }));
    } finally {
      await connection.close();
    }
  },
  async introspectColumns(
    config: ConnectionConfig,
  ): Promise<SchemaColumnInfo[]> {
    const connection = await openOracleConnection(config);
    try {
      const owner = config.schema?.toUpperCase() ?? config.user?.toUpperCase();
      const result = await connection.execute(
        'SELECT OWNER, TABLE_NAME, COLUMN_NAME, DATA_TYPE, NULLABLE FROM ALL_TAB_COLUMNS WHERE OWNER = :owner ORDER BY TABLE_NAME, COLUMN_ID',
        [owner],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return (result.rows as any[]).map((row) => ({
        tableName: row.TABLE_NAME,
        schemaName: row.OWNER,
        columnName: row.COLUMN_NAME,
        displayName: row.COLUMN_NAME,
        dataType: row.DATA_TYPE,
        description: undefined,
        semanticType: 'unknown',
      }));
    } finally {
      await connection.close();
    }
  },
  async sampleColumn(
    config: ConnectionConfig,
    schemaName: string,
    tableName: string,
    columnName: string,
    limit: number,
  ): Promise<string[]> {
    const connection = await openOracleConnection(config);
    try {
      const owner =
        schemaName?.toUpperCase() ??
        config.schema?.toUpperCase() ??
        config.user?.toUpperCase();
      const qualifiedTable = `${quoteIdentifier(owner)}.${quoteIdentifier(tableName)}`;
      const qualifiedColumn = quoteIdentifier(columnName);
      const result = await connection.execute(
        `SELECT DISTINCT CAST(${qualifiedColumn} AS VARCHAR2(4000)) AS sample FROM ${qualifiedTable} WHERE ${qualifiedColumn} IS NOT NULL AND ROWNUM <= :limit`,
        [limit],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return (result.rows as any[]).map((row) => String(row.SAMPLE));
    } finally {
      await connection.close();
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
    const connection = await openOracleConnection(config);
    try {
      const result = await connection.execute(sql, [], {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });
      return {
        rows: (result.rows as Record<string, unknown>[]) ?? [],
        fields: (result.metaData ?? []).map((column: any) => ({
          name: column.name,
          dataType: column.dbTypeName ?? 'unknown',
        })),
      };
    } finally {
      await connection.close();
    }
  },
  async testConnection(config: ConnectionConfig) {
    const connection = await openOracleConnection(config);
    try {
      await connection.execute('SELECT 1 FROM DUAL');
      return { valid: true };
    } catch (error) {
      return { valid: false, error: String(error) };
    } finally {
      await connection.close();
    }
  },
};
