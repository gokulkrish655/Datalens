export type ModelTier = 'fast' | 'smart';

const COMPLEXITY_KEYWORDS = [
  'compare', 'vs', 'versus', 'difference', 'more than', 'less than',
  'previous', 'forecast', 'growth', 'change', 'trend', 'aggregate', 'group by',
  'top', 'worst', 'best', 'last', 'month', 'quarter', 'year'
];

export function computeModelTier(params: {
  queryText: string;
  topSimilarityScore: number;
  retrievedTableCount: number;
  queryWordCount: number;
}): ModelTier {
  const { queryText, topSimilarityScore, retrievedTableCount, queryWordCount } = params;
  const lower = queryText.toLowerCase();
  const hasComplexKeyword = COMPLEXITY_KEYWORDS.some((keyword) => lower.includes(keyword));
  if (hasComplexKeyword || retrievedTableCount > 3 || queryWordCount > 25 || topSimilarityScore < 0.75) {
    return 'smart';
  }
  return 'fast';
}
