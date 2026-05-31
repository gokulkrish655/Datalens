export async function createAccessRequest(params: { tenantId: string; tableId: string; requestedById: string; justification: string; durationDays: number }): Promise<{ requestId: string }> {
  return { requestId: 'request-1' };
}
