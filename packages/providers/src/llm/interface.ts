export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface ILLMProvider {
  readonly providerName: string;
  generate(options: {
    messages: LLMMessage[];
    maxTokens?: number;
    temperature?: number;
    useFastModel?: boolean;
  }): Promise<LLMResponse>;
}
