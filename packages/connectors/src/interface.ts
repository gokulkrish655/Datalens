export interface ConnectionConfig {
  host: string;
  port?: number;
  user: string;
  password: string;
  database?: string;
  schema?: string;
  ssl?: boolean;
  extra?: Record<string, string>;
}

export interface VersionInfo {
  connectorName: string;
  dbVersionString: string;
  dbVersionMajor: number;
  dialectDescription: string;
}

export interface SchemaTableInfo {
  tableName: string;
  schemaName?: string;
  displayName: string;
  description?: string;
  rowCountEstimate?: bigint;
}

export interface SchemaColumnInfo {
  tableName: string;
  schemaName?: string;
  columnName: string;
  displayName: string;
  dataType: string;
  description?: string;
  semanticType: string;
  defaultValue?: string;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  fields: Array<{ name: string; dataType: string }>;
}

export class ReadOnlyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReadOnlyViolationError';
  }
}

export interface IDbConnector {
  readonly name: string;
  detectVersion(config: ConnectionConfig): Promise<VersionInfo>;
  introspectTables(config: ConnectionConfig): Promise<SchemaTableInfo[]>;
  introspectColumns(config: ConnectionConfig): Promise<SchemaColumnInfo[]>;
  sampleColumn(
    config: ConnectionConfig,
    schemaName: string,
    tableName: string,
    columnName: string,
    limit: number,
  ): Promise<string[]>;
  validateWhereClause(
    config: ConnectionConfig,
    whereClause: string,
  ): Promise<{ valid: boolean; error?: string }>;
  executeQuery(
    config: ConnectionConfig,
    sql: string,
    timeoutMs: number,
    rowLimit: number,
  ): Promise<QueryResult>;
  testConnection(
    config: ConnectionConfig,
  ): Promise<{ valid: boolean; error?: string }>;
}
