import OpenAI from 'openai';
import { ILLMProvider, LLMMessage, LLMResponse } from '../interface';

export class OpenAiProvider implements ILLMProvider {
  readonly providerName = 'openai';
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generate(options: {
    messages: LLMMessage[];
    maxTokens?: number;
    temperature?: number;
    useFastModel?: boolean;
  }): Promise<LLMResponse> {
    const model = process.env.OPENAI_LLM_MODEL ?? 'gpt-4o';
    const response = await this.client.chat.completions.create({
      model,
      messages: options.messages.map((message) => ({ role: message.role, content: message.content })),
      max_tokens: options.maxTokens ?? 512,
      temperature: options.temperature ?? 0.3,
    });
    const content = Array.isArray(response.choices) ? (response.choices[0]?.message?.content ?? '') : '';
    return {
      content,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      model,
    };
  }
}
