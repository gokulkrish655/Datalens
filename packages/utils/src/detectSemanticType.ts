export function detectSemanticType(columnName: string, dataType: string, samples: string[] = []): string {
  const lowerName = columnName.toLowerCase();
  if (lowerName.includes('email')) return 'EMAIL';
  if (lowerName.includes('phone') || lowerName.includes('mobile')) return 'PHONE';
  if (lowerName.includes('name')) return 'FULL_NAME';
  if (lowerName.includes('address')) return 'ADDRESS';
  if (lowerName.includes('url')) return 'URL';
  if (dataType.toLowerCase().includes('enum') || dataType.toLowerCase().includes('char')) return 'CATEGORY';
  return 'UNKNOWN';
}
