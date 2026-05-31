import snowflake from 'snowflake-sdk';
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

function buildSnowflakeConfig(config: ConnectionConfig) {
  return {
    account: config.extra?.account ?? config.host,
    username: config.user,
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
  return `\"${value}\"`;
}

function parseMajorVersion(versionString: string) {
  const match = versionString.match(/(\d+)\.(\d+)/);
  return match ? Number(match[1]) : 0;
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

export const snowflakeConnector: IDbConnector = {
  name: 'snowflake',
  async detectVersion(config: ConnectionConfig): Promise<VersionInfo> {
    const connection = await connectSnowflake(config);
    try {
      const result = await executeSnowflake(
        connection,
        'SELECT CURRENT_VERSION() AS version',
      );
      const versionString = String(result.rows?.[0]?.VERSION ?? 'Snowflake');
      return {
        connectorName: 'snowflake',
        dbVersionString: versionString,
        dbVersionMajor: parseMajorVersion(versionString),
        dialectDescription: buildDialectDescription('snowflake', versionString),
      };
    } finally {
      connection.destroy();
    }
  },
  async introspectTables(config: ConnectionConfig): Promise<SchemaTableInfo[]> {
    const connection = await connectSnowflake(config);
    try {
      const schema = config.schema ?? 'PUBLIC';
      const result = await executeSnowflake(
        connection,
        `SHOW TABLES IN SCHEMA ${quoteIdentifier(config.database ?? '')}.${quoteIdentifier(schema)}`,
      );
      return result.rows.map((row) => ({
        tableName: row.name || row.TABLE_NAME,
        schemaName: schema,
        displayName: row.name || row.TABLE_NAME,
      }));
    } finally {
      connection.destroy();
    }
  },
  async introspectColumns(
    config: ConnectionConfig,
  ): Promise<SchemaColumnInfo[]> {
    const connection = await connectSnowflake(config);
    try {
      const schema = config.schema ?? 'PUBLIC';
      const query = `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = '${schema}' ORDER BY table_name, ordinal_position`;
      const result = await executeSnowflake(connection, query);
      return result.rows.map((row) => ({
        tableName: row.TABLE_NAME,
        schemaName: schema,
        columnName: row.COLUMN_NAME,
        displayName: row.COLUMN_NAME,
        dataType: row.DATA_TYPE,
        description: undefined,
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
    limit: number,
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
    const connection = await connectSnowflake(config);
    try {
      const result = await executeSnowflake(connection, sql);
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
