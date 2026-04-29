import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { db } from '@/lib/db';
import { SuwayomiClient } from '@/lib/suwayomi.client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const adminAuth = validateAdminAuth(request);
    if ('status' in adminAuth) return adminAuth;

    const body = await request.json();
    const { ServerURL, AuthMode, Username, Password, DefaultLang } = body as {
      ServerURL?: string;
      AuthMode?: 'none' | 'basic_auth' | 'simple_login';
      Username?: string;
      Password?: string;
      DefaultLang?: string;
    };

    if (!ServerURL?.trim()) {
      return apiError('请先填写 Suwayomi 服务地址', 400);
    }

    if (
      (AuthMode === 'basic_auth' || AuthMode === 'simple_login') &&
      (!Username?.trim() || !Password)
    ) {
      return apiError('当前认证方式需要填写用户名和密码', 400);
    }

    const client = new SuwayomiClient({
      serverUrl: ServerURL.trim(),
      authMode: AuthMode || 'none',
      username: Username?.trim(),
      password: Password,
    });

    const sources = await client.getSources(
      (DefaultLang || 'zh').trim() || 'zh',
    );

    return apiSuccess({ message: `连接成功，当前语言下检测到 ${sources.length} 个源`, });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : '测试连接失败', 400);
  }
}
