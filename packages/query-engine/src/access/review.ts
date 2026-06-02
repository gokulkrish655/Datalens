export async function reviewStage(params: { requestId: string; stageId: string; reviewerId: string; decision: 'APPROVED' | 'DENIED'; note?: string }): Promise<void> {
  const { createAdminPrisma } = await import('@datalens/db');
  const db = createAdminPrisma();
  await db.$transaction(async (tx) => {
    const stage = await tx.accessRequestStage.findUnique({
      where: { id: params.stageId },
      include: { request: true },
    });
    if (!stage || stage.requestId !== params.requestId) {
      throw new Error('Access request stage not found');
    }

    await tx.accessRequestStage.update({
      where: { id: params.stageId },
      data: {
        status: params.decision,
        note: params.note,
      },
    });

    if (params.decision === 'DENIED') {
      await tx.accessRequest.update({
        where: { id: params.requestId },
        data: { status: 'DENIED' },
      });
      return;
    }

    const pending = await tx.accessRequestStage.count({
      where: { requestId: params.requestId, status: 'PENDING' },
    });
    if (pending === 0) {
      const request = await tx.accessRequest.update({
        where: { id: params.requestId },
        data: { status: 'APPROVED' },
      });
      await tx.tableAccessGrant.upsert({
        where: {
          tableId_grantedToId: {
            tableId: request.tableId,
            grantedToId: request.requestedById,
          },
        },
        update: {
          expiresAt: new Date(Date.now() + request.durationDays * 24 * 60 * 60 * 1000),
        },
        create: {
          tenantId: request.tenantId,
          tableId: request.tableId,
          grantedToId: request.requestedById,
          expiresAt: new Date(Date.now() + request.durationDays * 24 * 60 * 60 * 1000),
        },
      });
    }
  });
}
