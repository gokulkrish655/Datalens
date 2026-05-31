import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';

const KMS_KEY_ID = process.env.KMS_KEY_ID;
const LOCAL_KEY = process.env.ENCRYPTION_KEY ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex') : null;
const ALGO = 'aes-256-gcm';

export async function encrypt(plaintext: string): Promise<string> {
  if (KMS_KEY_ID) {
    const client = new KMSClient({});
    const cmd = new EncryptCommand({ KeyId: KMS_KEY_ID, Plaintext: Buffer.from(plaintext, 'utf8') });
    const response = await client.send(cmd);
    const blob = response.CiphertextBlob ? Buffer.from(response.CiphertextBlob as Uint8Array) : null;
    return `kms:${blob?.toString('base64')}`;
  }

  if (!LOCAL_KEY) {
    throw new Error('No local encryption key available');
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, LOCAL_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `local:${Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64')}`;
}

export async function decrypt(ciphertext: string): Promise<string> {
  if (ciphertext.startsWith('kms:')) {
    const client = new KMSClient({});
    const blob = Buffer.from(ciphertext.slice(4), 'base64');
    const cmd = new DecryptCommand({ CiphertextBlob: blob });
    const response = await client.send(cmd);
    const plain = response.Plaintext ? Buffer.from(response.Plaintext as Uint8Array) : null;
    return plain?.toString('utf8') ?? '';
  }

  if (!LOCAL_KEY) {
    throw new Error('No local encryption key available');
  }
  const buffer = Buffer.from(ciphertext.slice(6), 'base64');
  const iv = buffer.slice(0, 12);
  const authTag = buffer.slice(12, 28);
  const encrypted = buffer.slice(28);
  const decipher = createDecipheriv(ALGO, LOCAL_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
