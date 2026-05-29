import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const getEncryptionKey = (): Buffer => {
  const configured = process.env.MFA_ENCRYPTION_KEY ?? 'dev-mfa-encryption-key-change-me';
  return createHash('sha256').update(configured).digest();
};

export const encryptText = (plainText: string): string => {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const payload = Buffer.concat([iv, authTag, encrypted]);
  return payload.toString('base64');
};

export const decryptText = (cipherText: string): string => {
  const key = getEncryptionKey();
  const payload = Buffer.from(cipherText, 'base64');

  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};
