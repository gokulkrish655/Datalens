export interface ConnectionConfig {
  host: string;
  port?: number;
  user?: string;
  username?: string;
  password: string;
  database?: string;
  schema?: string;
  ssl?: boolean;
  extra?: Record<string, string>;
}

export interface VersionInfo {
  connectorName: string;
  versionString: string;
  major: number;
  minor: number;
  patch: number;
  dialectDescription: string;
}

export interface SchemaTableInfo {
  tableName: string;
  schemaName?: string;
  displayName: string;
  description?: string;
  rowCountEstimate?: bigint;
  nativeComment?: string;
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
  isNullable?: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  referencesTable?: string;
  referencesColumn?: string;
  nativeComment?: string;
}

export interface ForeignKeyInfo {
  fromSchema: string;
  fromTable: string;
  fromColumn: string;
  toSchema: string;
  toTable: string;
  toColumn: string;
  constraintName?: string;
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
  readonly displayName: string;
  detectVersion(config: ConnectionConfig): Promise<VersionInfo>;
  introspectTables(config: ConnectionConfig): Promise<SchemaTableInfo[]>;
  introspectColumns(
    config: ConnectionConfig,
    tableFilter?: Array<{ schemaName: string; tableName: string }>,
  ): Promise<SchemaColumnInfo[]>;
  introspectRelationships(config: ConnectionConfig): Promise<ForeignKeyInfo[]>;
  sampleColumn(
    config: ConnectionConfig,
    schemaName: string,
    tableName: string,
    columnName: string,
    limit?: number,
  ): Promise<string[]>;
  validateWhereClause(
    config: ConnectionConfig,
    schemaName: string,
    tableName: string,
    whereClause: string,
  ): Promise<{ valid: boolean; error?: string }>;
  executeQuery(
    config: ConnectionConfig,
    sql: string,
    rowLimit: number,
    timeoutMs: number,
  ): Promise<QueryResult>;
  testConnection(
    config: ConnectionConfig,
  ): Promise<{ valid: boolean; error?: string }>;
}
