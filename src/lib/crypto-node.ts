import nodeCrypto from 'crypto';

export function sha256(data: string): string {
  return nodeCrypto.createHash('sha256').update(data).digest('hex');
}

export function generateFolderKey(
  folderName: string,
  existingKeys: Set<string> = new Set(),
): string {
  let hash = sha256(folderName);
  let key = hash.substring(0, 10);

  while (existingKeys.has(key)) {
    hash = sha256(hash);
    key = hash.substring(0, 10);
  }

  return key;
}

const AES_ALGORITHM = 'aes-256-gcm';
const PBKDF2_ITERATIONS = 600000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const DIGEST = 'sha256';

function deriveKey(password: string, salt: Buffer): Buffer {
  return nodeCrypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST);
}

export class SimpleCrypto {
  static encrypt(data: string, password: string): string {
    try {
      const salt = nodeCrypto.randomBytes(SALT_LENGTH);
      const iv = nodeCrypto.randomBytes(IV_LENGTH);
      const key = deriveKey(password, salt);

      const cipher = nodeCrypto.createCipheriv(AES_ALGORITHM, key, iv);
      const encrypted = Buffer.concat([
        cipher.update(data, 'utf8'),
        cipher.final(),
      ]);
      const tag = cipher.getAuthTag();

      return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
    } catch (error) {
      throw new Error('加密失败');
    }
  }

  static decrypt(encryptedData: string, password: string): string {
    try {
      const buffer = Buffer.from(encryptedData, 'base64');

      const salt = buffer.subarray(0, SALT_LENGTH);
      const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      const tag = buffer.subarray(
        SALT_LENGTH + IV_LENGTH,
        SALT_LENGTH + IV_LENGTH + TAG_LENGTH,
      );
      const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
      const key = deriveKey(password, salt);

      const decipher = nodeCrypto.createDecipheriv(AES_ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error('解密失败，请检查密码是否正确');
    }
  }

  static canDecrypt(encryptedData: string, password: string): boolean {
    try {
      const decrypted = this.decrypt(encryptedData, password);
      return decrypted.length > 0;
    } catch {
      return false;
    }
  }
}
