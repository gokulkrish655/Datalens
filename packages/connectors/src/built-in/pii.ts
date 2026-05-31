// Simple PII anonymization utilities used before storing or sending samples to LLMs.
export function anonymizeSample(value: string): string {
  if (!value) return value;
  let s = String(value);
  // Mask email addresses
  s = s.replace(/([\w.+-]+)@([\w.-]+\.[A-Za-z]{2,})/g, '***@***');
  // Mask credit-card-like sequences (13-19 digits)
  s = s.replace(/\b\d{13,19}\b/g, '****');
  // Mask long digit sequences (phone numbers)
  s = s.replace(/\b\d{4,}\b/g, (m) => '*'.repeat(Math.min(8, m.length)));
  // Mask IPv4 addresses
  s = s.replace(/\b(\d{1,3}\.){3}\d{1,3}\b/g, '***.***.***.***');
  // Truncate long strings
  if (s.length > 200) s = s.slice(0, 200) + '...';
  return s;
}

export function anonymizeSamples(values: string[]): string[] {
  return values.map((v) => anonymizeSample(String(v ?? '')));
}
