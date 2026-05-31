import { Anthropic, type CreateChatCompletionResponse } from '@anthropic-ai/sdk';
import { ILLMProvider, LLMMessage, LLMResponse } from '../interface';

export class AnthropicProvider implements ILLMProvider {
  readonly providerName = 'anthropic';
  private readonly client: Anthropic;
  private readonly modelId: string;
  private readonly fastModelId: string;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
    this.modelId = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
    this.fastModelId = process.env.ANTHROPIC_FAST_MODEL ?? 'claude-haiku-4-5-20251001';
  }

  async generate(options: {
    messages: LLMMessage[];
    maxTokens?: number;
    temperature?: number;
    useFastModel?: boolean;
  }): Promise<LLMResponse> {
    const model = options.useFastModel ? this.fastModelId : this.modelId;
    const response = await this.client.chat.completions.create({
      model,
      messages: options.messages.map((message) => ({ role: message.role, content: message.content })),
      max_tokens_to_sample: options.maxTokens ?? 512,
      temperature: options.temperature ?? 0.3,
    });
    return {
      content: response.completion || '',
      inputTokens: response?.meta?.input_tokens ?? 0,
      outputTokens: response?.meta?.output_tokens ?? 0,
      model,
    };
  }
}
