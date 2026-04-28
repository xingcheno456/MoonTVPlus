
import { generateHmacSignature } from './crypto';
import { logger } from './logger';
import { TOKEN_CONFIG, verifyRefreshToken } from './refresh-token';

// 刷新 Access Token
export async function refreshAccessToken(
  username: string,
  role: string,
  tokenId: string,
  refreshToken: string,
  refreshExpires: number,
): Promise<string | null> {
  const isValid = await verifyRefreshToken(username, tokenId, refreshToken);

  if (!isValid) {
    logger.info(`Refresh token invalid for ${username}:${tokenId}`);
    return null;
  }

  const now = Date.now();

  const dataToSign = JSON.stringify({
    username,
    role,
    timestamp: now,
  });

  const signature = await generateHmacSignature(
    dataToSign,
    process.env.PASSWORD || '',
  );

  const authData = {
    username,
    role,
    timestamp: now,
    tokenId,
    refreshToken,
    refreshExpires,
    signature,
  };

  logger.info(`Refreshed access token for ${username}`);

  return JSON.stringify(authData);
}

// 检查是否需要续期
export function shouldRenewToken(timestamp: number): boolean {
  const age = Date.now() - timestamp;
  const remaining = TOKEN_CONFIG.ACCESS_TOKEN_AGE - age;

  return remaining < TOKEN_CONFIG.RENEWAL_THRESHOLD && remaining > 0;
}
