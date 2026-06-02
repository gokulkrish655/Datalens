import { CohereClient } from 'cohere-ai';
import { EmbeddingResult, IEmbeddingProvider } from '../interface';

export class CohereEmbeddingProvider implements IEmbeddingProvider {
  readonly providerName = 'cohere';
  private readonly modelId = 'embed-english-v3.0';
  private readonly client: CohereClient;

  constructor(apiKey: string) {
    this.client = new CohereClient({ token: apiKey });
  }

  async embedBatch(texts: string[], batchSize = 100): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await this.client.v2.embed({
        model: this.modelId,
        texts: batch,
        inputType: 'search_document',
        embeddingTypes: ['float'],
      });

      const embeddings = response.embeddings?.float ?? [];
      for (const vector of embeddings) {
        results.push({ vector, dimensions: vector.length, model: this.modelId });
      }
    }
    return results;
  }
}
