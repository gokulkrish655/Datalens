declare module 'pg';
declare module 'oracledb';
declare module 'mariadb';
declare module 'mssql';
declare module 'snowflake-sdk';
declare module 'mysql2/promise';
declare module '@sendgrid/mail';
declare module 'resend';

declare module 'cohere-ai' {
  export function init(apiKey: string): void;
  export function embed(opts: any): Promise<any>;
  const Cohere: any;
  export default Cohere;
}

declare module '@anthropic-ai/sdk' {
  export type Anthropic = any;
  export const Anthropic: new (opts?: any) => any;
  export type CreateChatCompletionResponse = any;
  export default Anthropic;
}
