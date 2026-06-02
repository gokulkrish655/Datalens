import { Anthropic } from '@anthropic-ai/sdk';
import { ILLMProvider, LLMMessage, LLMResponse } from '../interface';

function flattenAnthropicMessageContent(content: any): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (block?.type === 'text') {
          return block.text ?? '';
        }
        return '';
      })
      .join('');
  }

  return '';
}

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
    const systemMessage = options.messages.find((message) => message.role === 'system');
    const userAssistantMessages = options.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({ role: message.role, content: message.content }));

    const response = await this.client.messages.create({
      model,
      max_tokens: options.maxTokens ?? 512,
      temperature: options.temperature ?? 0.3,
      system: systemMessage?.content,
      messages: userAssistantMessages,
    });

    return {
      content: flattenAnthropicMessageContent(response.content),
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage.output_tokens,
      model,
    };
  }
}
