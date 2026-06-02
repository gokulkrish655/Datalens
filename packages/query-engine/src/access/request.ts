export async function createAccessRequest(params: { tenantId: string; tableId: string; requestedById: string; justification: string; durationDays: number }): Promise<{ requestId: string }> {
  const { createAdminPrisma } = await import('@datalens/db');
  const db = createAdminPrisma();
  const request = await db.accessRequest.create({
    data: {
      tenantId: params.tenantId,
      tableId: params.tableId,
      requestedById: params.requestedById,
      justification: params.justification,
      durationDays: params.durationDays,
      status: 'PENDING',
      stages: {
        create: [
          { stageNumber: 1, approverType: 'MANAGER', status: 'PENDING' },
          { stageNumber: 2, approverType: 'TABLE_OWNER', status: 'PENDING' },
        ],
      },
    },
  });
  return { requestId: request.id };
}
