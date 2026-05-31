export async function sendOnboardingInvitation(to: string, tenantName: string, token: string): Promise<string> {
  return `Invitation sent to ${to} for ${tenantName} with token ${token}`;
}

export async function sendUserInvitation(to: string, inviterName: string, tenantName: string, role: string, token: string): Promise<string> {
  return `User invitation sent to ${to}`;
}

export async function sendPendingUserNotification(to: string[], requesterEmail: string, requesterName: string, tenantName: string): Promise<string> {
  return `Pending notification sent to ${to.join(', ')}`;
}

export async function sendStage1ApprovalRequest(to: string, requesterName: string, tableDisplayName: string, justification: string, requestId: string, stageId: string): Promise<string> {
  return `Stage1 approval request sent to ${to}`;
}

export async function sendStage2ApprovalRequest(to: string, requesterName: string, tableDisplayName: string, justification: string, stage1ApproverName: string, requestId: string, stageId: string): Promise<string> {
  return `Stage2 approval request sent to ${to}`;
}

export async function sendAccessApproved(to: string, tableDisplayName: string, expiresAt: Date | null): Promise<string> {
  return `Access approved for ${to}`;
}

export async function sendAccessDenied(to: string, tableDisplayName: string, note: string | null): Promise<string> {
  return `Access denied for ${to}`;
}

export async function sendAccessExpiryReminder(to: string, tableDisplayName: string, expiresAt: Date): Promise<string> {
  return `Expiry reminder sent to ${to}`;
}

export async function sendAccountApproved(to: string, tenantName: string, role: string): Promise<string> {
  return `Account approved for ${to}`;
}

export async function sendPasswordReset(to: string, token: string): Promise<string> {
  return `Password reset sent to ${to}`;
}
