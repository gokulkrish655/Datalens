export interface EmailPayload {
  to: string | string[];
  from: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IEmailProvider {
  readonly providerName: string;
  send(payload: EmailPayload): Promise<{ messageId: string }>;
}
