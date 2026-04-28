import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { STORAGE_TYPE } from '@/lib/db';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const storageType = STORAGE_TYPE;
  if (storageType === 'localstorage') {
    return apiSuccess({
        error: '不支持本地存储进行管理员配置',
      }, { status: 400 });
  }

  try {
    const adminAuth = validateAdminAuth(request);
    if ('status' in adminAuth) return adminAuth;

    const { issuerUrl } = await request.json();

    if (!issuerUrl || typeof issuerUrl !== 'string') {
      return apiError('Issuer URL不能为空', 400);
    }

    // 构建well-known URL
    const wellKnownUrl = `${issuerUrl}/.well-known/openid-configuration`;

    logger.info('正在获取OIDC配置:', wellKnownUrl);

    // 通过后端获取配置，避免CORS问题
    const response = await fetch(wellKnownUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      // 设置超时
      signal: AbortSignal.timeout(10000), // 10秒超时
    });

    if (!response.ok) {
      logger.error('获取OIDC配置失败:', response.status, response.statusText);
      return apiSuccess({
          error: `无法获取OIDC配置: ${response.status} ${response.statusText}`,
        }, { status: 400 });
    }

    const data = await response.json();

    // 验证返回的数据包含必需的端点
    if (
      !data.authorization_endpoint ||
      !data.token_endpoint ||
      !data.userinfo_endpoint
    ) {
      return apiSuccess({
          error: 'OIDC配置不完整，缺少必需的端点',
        }, { status: 400 });
    }

    // 返回端点配置
    return apiSuccess({
      authorization_endpoint: data.authorization_endpoint,
      token_endpoint: data.token_endpoint,
      userinfo_endpoint: data.userinfo_endpoint,
      issuer: data.issuer,
    });
  } catch (error) {
    logger.error('OIDC自动发现失败:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return apiError('请求超时，请检查Issuer URL是否正确', 408);
      }
      return apiError(`获取配置失败: ${error.message}`, 500);
    }

    return apiError('获取配置失败，请检查Issuer URL是否正确', 500);
  }
}
