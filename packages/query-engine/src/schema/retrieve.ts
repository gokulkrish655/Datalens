export interface RelevantTable {
  tableId: string;
  tableDisplayName: string;
  tableName: string;
  description?: string;
  connectionId: string;
  connectorName: string;
  dialectDescription: string;
  isRestricted: boolean;
  hasAccess: boolean;
}

export async function retrieveRelevantTables(params: {
  queryText: string;
  userId: string;
  tenantId: string;
  maxTables?: number;
}): Promise<{ accessible: RelevantTable[]; blocked: RelevantTable[] }> {
  const { createAdminPrisma } = await import('@datalens/db');
  const db = createAdminPrisma();
  const maxTables = Math.min(Math.max(params.maxTables ?? 5, 1), 20);
  const query = params.queryText.toLowerCase();
  const tokens = query
    .split(/[^a-z0-9_]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  const tables = await db.schemaTable.findMany({
    where: { tenantId: params.tenantId },
    include: {
      connection: true,
      accessGrants: {
        where: {
          grantedToId: params.userId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      },
    },
    take: 300,
    orderBy: { updatedAt: 'desc' },
  });

  const scored = tables.map((table) => {
    const haystack = `${table.displayName} ${table.tableName} ${table.description ?? ''}`.toLowerCase();
    const tokenScore = tokens.reduce((acc, token) => (haystack.includes(token) ? acc + 1 : acc), 0);
    const score = tokenScore + (table.description ? 0.5 : 0);
    return { table, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, maxTables);

  const mapped = selected.map(({ table }) => {
    const isRestricted = table.visibility === 'RESTRICTED';
    const hasAccess = !isRestricted || table.accessGrants.length > 0;
    return {
      tableId: table.id,
      tableDisplayName: table.displayName,
      tableName: table.tableName,
      description: table.description ?? undefined,
      connectionId: table.connectionId,
      connectorName: table.connection.connectorName,
      dialectDescription: table.connection.connectorName,
      isRestricted,
      hasAccess,
    } satisfies RelevantTable;
  });

  return {
    accessible: mapped.filter((t) => t.hasAccess),
    blocked: mapped.filter((t) => !t.hasAccess),
  };
}
