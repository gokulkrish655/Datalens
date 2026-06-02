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

function buildMssqlConfig(config: ConnectionConfig) {
  return {
    server: config.host,
    port: config.port,
    user: config.username ?? config.user,
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

async function loadMssql() {
  const mssql = await import('mssql').catch(() => null);
  if (!mssql) {
    throw new Error('mssql driver is not installed.');
  }
  return mssql;
}

export const mssqlConnector: IDbConnector = {
  name: 'mssql',
  displayName: 'SQL Server',
  async detectVersion(config: ConnectionConfig): Promise<VersionInfo> {
    const mssql = await loadMssql();
    const pool = await new mssql.ConnectionPool(buildMssqlConfig(config)).connect();
    try {
      const result = await pool.request().query('SELECT @@VERSION AS version');
      const versionString = String(result.recordset?.[0]?.version ?? 'SQL Server');
      const versionParts = parseVersionParts(versionString);
      return {
        connectorName: 'mssql',
        versionString,
        major: versionParts.major,
        minor: versionParts.minor,
        patch: versionParts.patch,
        dialectDescription: buildDialectDescription('mssql', versionString),
      };
    } finally {
      await pool.close();
    }
  },
  async introspectRelationships(config: ConnectionConfig): Promise<ForeignKeyInfo[]> {
    const mssql = await loadMssql();
    const pool = await new mssql.ConnectionPool(buildMssqlConfig(config)).connect();
    try {
      const result = await pool.request().query(
        `SELECT
          s1.name AS from_schema,
          t1.name AS from_table,
          c1.name AS from_column,
          s2.name AS to_schema,
          t2.name AS to_table,
          c2.name AS to_column,
          fk.name AS constraint_name
        FROM sys.foreign_keys fk
        JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
        JOIN sys.tables t1 ON fkc.parent_object_id = t1.object_id
        JOIN sys.schemas s1 ON t1.schema_id = s1.schema_id
        JOIN sys.columns c1 ON fkc.parent_object_id = c1.object_id AND fkc.parent_column_id = c1.column_id
        JOIN sys.tables t2 ON fkc.referenced_object_id = t2.object_id
        JOIN sys.schemas s2 ON t2.schema_id = s2.schema_id
        JOIN sys.columns c2 ON fkc.referenced_object_id = c2.object_id AND fkc.referenced_column_id = c2.column_id`,
      );
      return result.recordset.map((row: any) => ({
        fromSchema: row.from_schema,
        fromTable: row.from_table,
        fromColumn: row.from_column,
        toSchema: row.to_schema,
        toTable: row.to_table,
        toColumn: row.to_column,
        constraintName: row.constraint_name,
      }));
    } finally {
      await pool.close();
    }
  },
  async introspectTables(config: ConnectionConfig): Promise<SchemaTableInfo[]> {
    const mssql = await loadMssql();
    const pool = await new mssql.ConnectionPool(buildMssqlConfig(config)).connect();
    try {
      const result = await pool.request().query(
        "SELECT t.schema_id, s.name AS table_schema, t.name AS table_name, p.rows AS row_count_estimate, ep.value AS native_comment FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id LEFT JOIN sys.dm_db_partition_stats p ON p.object_id = t.object_id AND p.index_id IN (0,1) LEFT JOIN sys.extended_properties ep ON ep.major_id = t.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description' ORDER BY s.name, t.name",
      );
      const rows = result.recordset as any[];
      const tableMap = new Map<string, SchemaTableInfo>();
      for (const row of rows) {
        const key = `${row.table_schema}.${row.table_name}`;
        const existing = tableMap.get(key);
        const rowCount = buildRowCountEstimate(row.row_count_estimate);
        tableMap.set(key, {
          tableName: row.table_name,
          schemaName: row.table_schema,
          displayName: row.table_name,
          nativeComment: String(row.native_comment ?? existing?.nativeComment ?? undefined) || undefined,
          rowCountEstimate: rowCount ?? existing?.rowCountEstimate,
        });
      }
      return Array.from(tableMap.values());
    } finally {
      await pool.close();
    }
  },
  async introspectColumns(
    config: ConnectionConfig,
    tableFilter?: Array<{ schemaName: string; tableName: string }>,
  ): Promise<SchemaColumnInfo[]> {
    const mssql = await loadMssql();
    const pool = await new mssql.ConnectionPool(buildMssqlConfig(config)).connect();
    try {
      const result = await pool.request().query(
        `SELECT c.TABLE_SCHEMA, c.TABLE_NAME, c.COLUMN_NAME, c.DATA_TYPE, c.IS_NULLABLE, c.COLUMN_DEFAULT,
          ep.value AS native_comment
         FROM INFORMATION_SCHEMA.COLUMNS c
         LEFT JOIN sys.columns sc ON sc.name = c.COLUMN_NAME
         LEFT JOIN sys.objects so ON so.object_id = sc.object_id AND so.name = c.TABLE_NAME
         LEFT JOIN sys.extended_properties ep ON ep.major_id = sc.object_id AND ep.minor_id = sc.column_id AND ep.name = 'MS_Description'
         ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, sc.column_id`,
      );
      return result.recordset.map((row: any) => ({
        tableName: row.TABLE_NAME,
        schemaName: row.TABLE_SCHEMA,
        columnName: row.COLUMN_NAME,
        displayName: row.COLUMN_NAME,
        dataType: row.DATA_TYPE,
        defaultValue: row.COLUMN_DEFAULT ?? undefined,
        isNullable: row.IS_NULLABLE === 'YES',
        semanticType: 'unknown',
        nativeComment: row.native_comment ?? undefined,
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
    limit = 5,
  ): Promise<string[]> {
    const mssql = await loadMssql();
    const pool = await new mssql.ConnectionPool(buildMssqlConfig(config)).connect();
    try {
      const schema = schemaName || 'dbo';
      const table = `${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}`;
      const column = quoteIdentifier(columnName);
      const result = await pool.request().query(
        `SELECT DISTINCT TOP (${limit}) CAST(${column} AS NVARCHAR(MAX)) AS sample FROM ${table} WHERE ${column} IS NOT NULL`,
      );
      return result.recordset.map((row: any) => String(row.sample));
    } finally {
      await pool.close();
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
    const mssql = await loadMssql();
    const pool = await new mssql.ConnectionPool(buildMssqlConfig(config)).connect();
    try {
      const request = pool.request();
      request.timeout = Math.max(1, timeoutMs);
      const wrappedSql = `SELECT * FROM (${sql.replace(/;\s*$/, '')}) AS __datalens_query LIMIT ${rowLimit}`;
      const result = await request.query(wrappedSql);
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
    const pool = await new mssql.ConnectionPool(buildMssqlConfig(config)).connect();
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
