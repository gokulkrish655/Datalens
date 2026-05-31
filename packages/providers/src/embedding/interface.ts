export interface EmbeddingResult {
  vector: number[];
  dimensions: number;
  model: string;
}

export interface IEmbeddingProvider {
  readonly providerName: string;
  embedBatch(texts: string[], batchSize?: number): Promise<EmbeddingResult[]>;
}
