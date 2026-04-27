import nodeCrypto from 'crypto';

/**
 * 生成 HMAC-SHA256 签名
 * @param data 要签名的数据字符串
 * @param secret 签名密钥
 * @returns 十六进制格式的签名字符串
 */
export async function generateHmacSignature(
  data: string,
  secret: string,
): Promise<string> {
  if (!secret) {
    throw new Error('generateHmacSignature: secret is required');
  }

  try {
    return nodeCrypto.createHmac('sha256', secret).update(data).digest('hex');
  } catch (error) {
    throw new Error(
      `generateHmacSignature failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * 验证 HMAC-SHA256 签名
 * @param data 原始数据字符串
 * @param signature 十六进制格式的签名
 * @param secret 签名密钥
 * @returns 签名是否有效
 */
export async function verifyHmacSignature(
  data: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!secret || !signature) {
    return false;
  }

  try {
    const expected = nodeCrypto.createHmac('sha256', secret).update(data).digest('hex');
    return nodeCrypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * 生成 SHA256 哈希值
 * @param data 要哈希的数据
 * @returns SHA256 哈希值（十六进制字符串）
 */
export function sha256(data: string): string {
  return nodeCrypto.createHash('sha256').update(data).digest('hex');
}

/**
 * 生成文件夹的唯一 key
 * @param folderName 文件夹名称
 * @param existingKeys 已存在的 key 集合，用于检测冲突
 * @returns 唯一的 key（SHA256 的前10位）
 */
export function generateFolderKey(
  folderName: string,
  existingKeys: Set<string> = new Set(),
): string {
  let hash = sha256(folderName);
  let key = hash.substring(0, 10);

  // 如果遇到冲突，继续 sha256 直到不冲突
  while (existingKeys.has(key)) {
    hash = sha256(hash);
    key = hash.substring(0, 10);
  }

  return key;
}

/**
 * 简单的对称加密工具
 * 使用 AES 加密算法
 */
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
  /**
   * 加密数据
   * @param data 要加密的数据
   * @param password 加密密码
   * @returns base64 编码的加密字符串
   */
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

  /**
   * 解密数据
   * @param encryptedData base64 编码的加密数据
   * @param password 解密密码
   * @returns 解密后的字符串
   */
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

  /**
   * 验证密码是否能正确解密数据
   * @param encryptedData 加密的数据
   * @param password 密码
   * @returns 是否能正确解密
   */
  static canDecrypt(encryptedData: string, password: string): boolean {
    try {
      const decrypted = this.decrypt(encryptedData, password);
      return decrypted.length > 0;
    } catch {
      return false;
    }
  }
}
