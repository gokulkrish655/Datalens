import oracledb from 'oracledb';
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

function buildOracleConfig(config: ConnectionConfig) {
  const port = config.port ?? 1521;
  const service = config.extra?.serviceName || config.database;
  return {
    user: config.username ?? config.user,
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

async function openOracleConnection(config: ConnectionConfig) {
  return oracledb.getConnection(buildOracleConfig(config));
}

export const oracleConnector: IDbConnector = {
  name: 'oracle',
  displayName: 'Oracle',
  async detectVersion(config: ConnectionConfig): Promise<VersionInfo> {
    const connection = await openOracleConnection(config);
    try {
      const result = await connection.execute('SELECT BANNER FROM v$version WHERE ROWNUM = 1');
      const versionString = String((result.rows?.[0] as any)?.[0] ?? 'Oracle Database');
      const versionParts = parseVersionParts(versionString);
      return {
        connectorName: 'oracle',
        versionString,
        major: versionParts.major,
        minor: versionParts.minor,
        patch: versionParts.patch,
        dialectDescription: buildDialectDescription('oracle', versionString),
      };
    } finally {
      await connection.close();
    }
  },
  async introspectRelationships(config: ConnectionConfig): Promise<ForeignKeyInfo[]> {
    const connection = await openOracleConnection(config);
    try {
      const owner = config.schema?.toUpperCase() ?? config.username?.toUpperCase() ?? config.user?.toUpperCase();
      const result = await connection.execute(
        `SELECT a.owner AS from_schema, a.table_name AS from_table, a.column_name AS from_column,
          c.r_owner AS to_schema, cc.table_name AS to_table, cc.column_name AS to_column,
          a.constraint_name AS constraint_name
         FROM all_cons_columns a
         JOIN all_constraints c ON a.owner = c.owner AND a.constraint_name = c.constraint_name
         JOIN all_cons_columns cc ON c.r_owner = cc.owner AND c.r_constraint_name = cc.constraint_name
         WHERE c.constraint_type = 'R' AND a.owner = :owner`,
        [owner],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return (result.rows as any[]).map((row) => ({
        fromSchema: row.FROM_SCHEMA,
        fromTable: row.FROM_TABLE,
        fromColumn: row.FROM_COLUMN,
        toSchema: row.TO_SCHEMA,
        toTable: row.TO_TABLE,
        toColumn: row.TO_COLUMN,
        constraintName: row.CONSTRAINT_NAME,
      }));
    } finally {
      await connection.close();
    }
  },
  async introspectTables(config: ConnectionConfig): Promise<SchemaTableInfo[]> {
    const connection = await openOracleConnection(config);
    try {
      const owner = config.schema?.toUpperCase() ?? config.username?.toUpperCase() ?? config.user?.toUpperCase();
      const result = await connection.execute(
        'SELECT OWNER, TABLE_NAME, COMMENTS FROM ALL_TAB_COMMENTS WHERE OWNER = :owner ORDER BY TABLE_NAME',
        [owner],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return (result.rows as any[]).map((row) => ({
        tableName: row.TABLE_NAME,
        schemaName: row.OWNER,
        displayName: row.TABLE_NAME,
        nativeComment: row.COMMENTS ?? undefined,
      }));
    } finally {
      await connection.close();
    }
  },
  async introspectColumns(
    config: ConnectionConfig,
    tableFilter?: Array<{ schemaName: string; tableName: string }>,
  ): Promise<SchemaColumnInfo[]> {
    const connection = await openOracleConnection(config);
    try {
      const owner = config.schema?.toUpperCase() ?? config.username?.toUpperCase() ?? config.user?.toUpperCase();
      const result = await connection.execute(
        `SELECT c.OWNER, c.TABLE_NAME, c.COLUMN_NAME, c.DATA_TYPE, c.NULLABLE,
          c.DATA_DEFAULT AS column_default, cc.COMMENTS
         FROM ALL_TAB_COLUMNS c
         LEFT JOIN ALL_COL_COMMENTS cc ON cc.OWNER = c.OWNER AND cc.TABLE_NAME = c.TABLE_NAME AND cc.COLUMN_NAME = c.COLUMN_NAME
         WHERE c.OWNER = :owner
         ORDER BY c.TABLE_NAME, c.COLUMN_ID`,
        [owner],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return (result.rows as any[]).map((row) => ({
        tableName: row.TABLE_NAME,
        schemaName: row.OWNER,
        columnName: row.COLUMN_NAME,
        displayName: row.COLUMN_NAME,
        dataType: row.DATA_TYPE,
        defaultValue: row.COLUMN_DEFAULT ?? undefined,
        isNullable: row.NULLABLE === 'Y',
        semanticType: 'unknown',
        nativeComment: row.COMMENTS ?? undefined,
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
    limit = 5,
  ): Promise<string[]> {
    const connection = await openOracleConnection(config);
    try {
      const owner = schemaName?.toUpperCase() ?? config.schema?.toUpperCase() ?? config.username?.toUpperCase() ?? config.user?.toUpperCase();
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
    const connection = await openOracleConnection(config);
    try {
      const wrappedSql = `SELECT * FROM (${sql.replace(/;\s*$/, '')}) __datalens_query WHERE ROWNUM <= ${rowLimit}`;
      const result = await connection.execute(wrappedSql, [], {
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
