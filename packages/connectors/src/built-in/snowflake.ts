import snowflake from 'snowflake-sdk';
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

function buildSnowflakeConfig(config: ConnectionConfig) {
  return {
    account: config.extra?.account ?? config.host,
    username: config.username ?? config.user,
    password: config.password,
    warehouse: config.extra?.warehouse,
    database: config.database,
    schema: config.schema,
    role: config.extra?.role,
  };
}

function quoteIdentifier(value: string) {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error('Invalid Snowflake identifier');
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

function connectSnowflake(config: ConnectionConfig) {
  return new Promise<any>((resolve, reject) => {
    const connection = snowflake.createConnection(buildSnowflakeConfig(config));
    connection.connect((error: any, conn: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(conn);
      }
    });
  });
}

function executeSnowflake(connection: any, sql: string) {
  return new Promise<{ rows: any[]; columns: any[] }>((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      complete: (err: any, stmt: any, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve({ rows, columns: stmt?.getColumns?.() ?? [] });
        }
      },
    });
  });
}

function buildRowCountEstimate(value: unknown): bigint | undefined {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.floor(value));
  if (typeof value === 'string' && value !== '') return BigInt(value);
  return undefined;
}

export const snowflakeConnector: IDbConnector = {
  name: 'snowflake',
  displayName: 'Snowflake',
  async detectVersion(config: ConnectionConfig): Promise<VersionInfo> {
    const connection = await connectSnowflake(config);
    try {
      const result = await executeSnowflake(connection, 'SELECT CURRENT_VERSION() AS version');
      const versionString = String(result.rows?.[0]?.VERSION ?? 'Snowflake');
      const versionParts = parseVersionParts(versionString);
      return {
        connectorName: 'snowflake',
        versionString,
        major: versionParts.major,
        minor: versionParts.minor,
        patch: versionParts.patch,
        dialectDescription: buildDialectDescription('snowflake', versionString),
      };
    } finally {
      connection.destroy();
    }
  },
  async introspectRelationships(_config: ConnectionConfig): Promise<ForeignKeyInfo[]> {
    return [];
  },
  async introspectTables(config: ConnectionConfig): Promise<SchemaTableInfo[]> {
    const connection = await connectSnowflake(config);
    try {
      const schema = config.schema ?? 'PUBLIC';
      const database = config.database ?? '';
      const result = await executeSnowflake(
        connection,
        `SELECT table_name, row_count FROM information_schema.tables WHERE table_schema = '${schema}' AND table_catalog = '${database}' ORDER BY table_name`,
      );
      return result.rows.map((row) => ({
        tableName: row.TABLE_NAME,
        schemaName: schema,
        displayName: row.TABLE_NAME,
        rowCountEstimate: buildRowCountEstimate(row.ROW_COUNT),
      }));
    } finally {
      connection.destroy();
    }
  },
  async introspectColumns(
    config: ConnectionConfig,
    tableFilter?: Array<{ schemaName: string; tableName: string }>,
  ): Promise<SchemaColumnInfo[]> {
    const connection = await connectSnowflake(config);
    try {
      const schema = config.schema ?? 'PUBLIC';
      const query = `SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = '${schema}' ORDER BY table_name, ordinal_position`;
      const result = await executeSnowflake(connection, query);
      return result.rows.map((row) => ({
        tableName: row.TABLE_NAME,
        schemaName: schema,
        columnName: row.COLUMN_NAME,
        displayName: row.COLUMN_NAME,
        dataType: row.DATA_TYPE,
        isNullable: row.IS_NULLABLE === 'Y',
        semanticType: 'unknown',
      }));
    } finally {
      connection.destroy();
    }
  },
  async sampleColumn(
    config: ConnectionConfig,
    _schemaName: string,
    tableName: string,
    columnName: string,
    limit = 5,
  ): Promise<string[]> {
    const connection = await connectSnowflake(config);
    try {
      const schema = config.schema ?? 'PUBLIC';
      const query = `SELECT DISTINCT CAST(${quoteIdentifier(columnName)} AS STRING) AS sample FROM ${quoteIdentifier(config.database ?? '')}.${quoteIdentifier(schema)}.${quoteIdentifier(tableName)} WHERE ${quoteIdentifier(columnName)} IS NOT NULL LIMIT ${limit}`;
      const result = await executeSnowflake(connection, query);
      return result.rows.map((row) => String(row.SAMPLE));
    } finally {
      connection.destroy();
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
    const connection = await connectSnowflake(config);
    try {
      const wrappedSql = `SELECT * FROM (${sql.replace(/;\s*$/, '')}) AS __datalens_query LIMIT ${rowLimit}`;
      const result = await executeSnowflake(connection, wrappedSql);
      return {
        rows: result.rows as Record<string, unknown>[],
        fields: result.columns.map((column) => ({
          name: column.getName?.() ?? column.name,
          dataType: String(column.getType?.() ?? column.type),
        })),
      };
    } finally {
      connection.destroy();
    }
  },
  async testConnection(config: ConnectionConfig) {
    const connection = await connectSnowflake(config);
    try {
      await executeSnowflake(connection, 'SELECT 1');
      return { valid: true };
    } catch (error) {
      return { valid: false, error: String(error) };
    } finally {
      connection.destroy();
    }
  },
};
