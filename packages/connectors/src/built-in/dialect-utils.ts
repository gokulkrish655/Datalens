export function buildDialectDescription(
  connectorName: string,
  versionString: string,
) {
  const version = versionString.trim();

  switch (connectorName) {
    case 'postgres':
      return `${version}. Full PostgreSQL-compatible SQL support with LIMIT, CTEs, window functions, JSON/JSONB operators, and row-level security. Use ILIKE for case-insensitive matching and :: for casts.`;
    case 'mysql':
      return `${version}. MySQL-compatible SQL with LIMIT, JSON functions, information_schema metadata, and optional window function support. Avoid server-specific features when generating portable queries.`;
    case 'mariadb':
      return `${version}. MariaDB-compatible SQL with MySQL-style syntax, LIMIT, JSON support, and information_schema metadata. Use standard SQL functions where available.`;
    case 'mssql':
      return `${version}. SQL Server-compatible syntax with TOP, OFFSET/FETCH, CTEs, window functions, and JSON support. Use GETDATE() for current datetime and COALESCE/NVL for null handling.`;
    case 'oracle':
      return `${version}. Oracle SQL with FETCH FIRST n ROWS ONLY, ROWNUM, LISTAGG, analytic functions, and standard Oracle date/time functions. Use double quotes for mixed-case identifiers.`;
    case 'snowflake':
      return `${version}. Snowflake SQL with LIMIT, CTEs, QUALIFY, VARIANT/ARRAY support, and standard analytic functions. Use CURRENT_TIMESTAMP() for current datetime.`;
    case 'bigquery':
      return `${version}. BigQuery Standard SQL with INFORMATION_SCHEMA, ARRAY/STRUCT support, and standard SQL functions. Avoid database-specific procedural extensions.`;
    case 'redshift':
      return `${version}. Amazon Redshift-compatible SQL with LIMIT, LISTAGG, CTE restrictions, and PostgreSQL-style syntax. Prefer simple aggregation queries and avoid unsupported DDL commands.`;
    default:
      return `${version}. SQL dialect for ${connectorName} with standard relational query support.`;
  }
}
