export interface UploadOptions {
  contentType: string;
}

export interface IStorageProvider {
  readonly providerName: string;
  upload(key: string, content: Buffer, options: UploadOptions): Promise<{ key: string }>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
  deletePrefix(prefix: string): Promise<void>;
}
