import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageProvider, UploadOptions } from '../interface';

export class S3StorageProvider implements IStorageProvider {
  readonly providerName = 's3';
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(bucket: string, region = 'us-east-1') {
    this.bucket = bucket;
    this.client = new S3Client({ region });
  }

  async upload(key: string, content: Buffer, options: UploadOptions): Promise<{ key: string }> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: content, ContentType: options.contentType }));
    return { key };
  }

  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key });
    return getS3SignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async deletePrefix(prefix: string): Promise<void> {
    const listResponse = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }));
    if (!listResponse.Contents?.length) return;
    const objects = listResponse.Contents.map((item) => ({ Key: item.Key! }));
    await this.client.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: objects } }));
  }
}
