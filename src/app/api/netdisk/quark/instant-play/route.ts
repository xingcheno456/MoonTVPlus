import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { createQuarkInstantPlayFolder } from '@/lib/netdisk/quark.client';
import { base58Encode } from '@/lib/utils';

export const runtime = 'nodejs';

function joinPath(...parts: string[]) {
  const joined = parts.filter(Boolean).join('/').replace(/\/+/g, '/');
  return joined.startsWith('/') ? joined : `/${joined}`;
}

export async function POST(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo?.username) {
      return apiError('未登录', 401);
    }

    const { shareUrl, passcode, title } = await request.json();
    if (!shareUrl) {
      return apiError('分享链接不能为空', 400);
    }

    const config = await getConfig();
    const quarkConfig = config.NetDiskConfig?.Quark;

    if (!quarkConfig?.Enabled || !quarkConfig.Cookie) {
      return apiError('夸克网盘未配置或未启用', 400);
    }

    const result = await createQuarkInstantPlayFolder(quarkConfig.Cookie, {
      shareUrl,
      passcode,
      playTempSavePath: quarkConfig.PlayTempSavePath,
      title,
    });

    if (!result.folderName) {
      throw new Error('未生成临时播放目录');
    }

    const openlistFolderPath = joinPath(
      quarkConfig.OpenListTempPath,
      result.folderName,
    );

    if (
      config.OpenListConfig?.Enabled &&
      config.OpenListConfig.URL &&
      config.OpenListConfig.Username &&
      config.OpenListConfig.Password
    ) {
      try {
        const { OpenListClient } = await import('@/lib/openlist.client');
        const openListClient = new OpenListClient(
          config.OpenListConfig.URL,
          config.OpenListConfig.Username,
          config.OpenListConfig.Password,
        );
        await openListClient.refreshDirectory(
          quarkConfig.OpenListTempPath || '/',
        );
        await openListClient.refreshDirectory(openlistFolderPath);
      } catch (refreshError) {
        console.warn(
          '[quark instant-play] 刷新 OpenList 临时目录失败:',
          refreshError,
        );
      }
    }

    return apiSuccess({ source: 'quark-temp',
      id: base58Encode(openlistFolderPath),
      title: title || result.folderName,
      openlistFolderPath,
      ...result, });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : '立即播放失败', 500);
  }
}
