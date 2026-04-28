import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const oidcSessionCookie = request.cookies.get('oidc_session')?.value;

    if (!oidcSessionCookie) {
      return apiError('OIDC会话不存在', 404);
    }

    let oidcSession;
    try {
      oidcSession = JSON.parse(oidcSessionCookie);
    } catch {
      return apiError('OIDC会话无效', 400);
    }

    // 检查session是否过期(10分钟)
    if (Date.now() - oidcSession.timestamp > 600000) {
      return apiError('OIDC会话已过期', 400);
    }

    // 返回用户信息(不包含sub)
    return apiSuccess({
      email: oidcSession.email,
      name: oidcSession.name,
      trust_level: oidcSession.trust_level,
    });
  } catch (error) {
    return apiError('服务器错误', 500);
  }
}
