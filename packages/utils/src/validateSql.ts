export function validateSql(sql: string): { valid: boolean; reason?: string } {
  const trimmed = sql.trim();
  if (!trimmed.toUpperCase().startsWith('SELECT')) {
    return { valid: false, reason: 'Only SELECT statements are allowed.' };
  }
  if (trimmed.toUpperCase().includes('DROP') || trimmed.toUpperCase().includes('DELETE') || trimmed.toUpperCase().includes('UPDATE') || trimmed.toUpperCase().includes('ALTER')) {
    return { valid: false, reason: 'Only read-only SELECT queries are allowed.' };
  }
  return { valid: true };
}
