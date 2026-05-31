import { ReadOnlyViolationError } from '../interface';

const forbiddenKeywords =
  /\b(?:ALTER|CREATE|DROP|DELETE|INSERT|UPDATE|TRUNCATE|MERGE|REPLACE|EXEC|CALL|GRANT|REVOKE|LOCK|UNLOCK|VACUUM|ANALYZE|SET|BEGIN|COMMIT|ROLLBACK|SAVEPOINT|DESCRIBE|USE|ATTACH|DETACH|REINDEX|COPY)\b/i;
const statementSeparator = /;/;

function stripComments(raw: string) {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function ensureReadOnlySql(rawSql: string) {
  const sql = stripComments(rawSql);
  if (!/^\s*(WITH|SELECT)\b/i.test(sql)) {
    throw new ReadOnlyViolationError(
      'Only read-only SELECT queries are permitted.',
    );
  }
  if (statementSeparator.test(sql)) {
    throw new ReadOnlyViolationError('Multi-statement SQL is not permitted.');
  }
  if (forbiddenKeywords.test(sql)) {
    throw new ReadOnlyViolationError(
      'Only read-only SELECT queries are permitted.',
    );
  }
}

export function validateWhereClause(whereClause: string) {
  const text = stripComments(whereClause);
  if (!text) return { valid: true };
  if (forbiddenKeywords.test(text)) {
    return { valid: false, error: 'Only safe WHERE clauses are permitted.' };
  }
  return { valid: true };
}
