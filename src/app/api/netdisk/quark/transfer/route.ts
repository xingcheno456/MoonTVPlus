import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { transferQuarkShare } from '@/lib/netdisk/quark.client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo?.username) {
      return apiError('未登录', 401);
    }

    const { shareUrl, passcode } = await request.json();
    if (!shareUrl) {
      return apiError('分享链接不能为空', 400);
    }

    const config = await getConfig();
    const quarkConfig = config.NetDiskConfig?.Quark;

    if (!quarkConfig?.Enabled || !quarkConfig.Cookie) {
      return apiError('夸克网盘未配置或未启用', 400);
    }

    const result = await transferQuarkShare(quarkConfig.Cookie, {
      shareUrl,
      passcode,
      savePath: quarkConfig.SavePath,
    });

    return apiSuccess({ ...result, });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : '转存失败', 500);
  }
}
