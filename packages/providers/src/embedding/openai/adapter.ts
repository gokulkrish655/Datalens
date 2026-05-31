import OpenAI from 'openai';
import { EmbeddingResult, IEmbeddingProvider } from '../interface';

export class OpenAiEmbeddingProvider implements IEmbeddingProvider {
  readonly providerName = 'openai';
  private readonly client: OpenAI;
  private readonly modelId = 'text-embedding-3-small';

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async embedBatch(texts: string[], batchSize = 100): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await this.client.embeddings.create({ model: this.modelId, input: batch });
      for (const item of response.data) {
        results.push({ vector: item.embedding, dimensions: item.embedding.length, model: this.modelId });
      }
    }
    return results;
  }
}
