export interface RelevantTable {
  tableId: string;
  tableDisplayName: string;
  description?: string;
  connectionId: string;
  connectorName: string;
  dialectDescription: string;
  isRestricted: boolean;
}

export async function retrieveRelevantTables(params: {
  queryText: string;
  tenantId: string;
  maxTables?: number;
}): Promise<{ accessible: RelevantTable[]; blocked: RelevantTable[] }> {
  return { accessible: [], blocked: [] };
}
