import { SchemaColumnInfo, SchemaTableInfo } from '@datalens/connectors/src/interface';

export function buildTableEmbeddingDocument(table: SchemaTableInfo & { columns: SchemaColumnInfo[] }): string {
  const lines = [
    `Table: ${table.displayName}`,
    table.description ?? '',
    ...table.columns.map((col) => `${col.displayName} (${col.dataType}): ${col.description ?? 'No description'}`),
  ];
  return lines.filter(Boolean).join('\n');
}
