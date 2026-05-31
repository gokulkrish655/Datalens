import Cohere from 'cohere-ai';
import { EmbeddingResult, IEmbeddingProvider } from '../interface';

export class CohereEmbeddingProvider implements IEmbeddingProvider {
  readonly providerName = 'cohere';
  private readonly modelId = 'embed-english-v3.0';

  constructor(apiKey: string) {
    Cohere.init(apiKey);
  }

  async embedBatch(texts: string[], batchSize = 100): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await Cohere.embed({ model: this.modelId, texts: batch });
      for (const vector of response.body.embeddings) {
        results.push({ vector, dimensions: vector.length, model: this.modelId });
      }
    }
    return results;
  }
}
