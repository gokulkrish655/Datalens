export function extractDomain(email: string): string | null {
  const parts = email.trim().toLowerCase().split('@');
  return parts.length === 2 ? parts[1] : null;
}
