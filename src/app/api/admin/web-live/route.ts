import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    const username = authInfo?.username;
    const config = await getConfig();
    if (username !== process.env.USERNAME) {
      const userInfo = await db.getUserInfoV2(username || '');
      if (!userInfo || userInfo.role !== 'admin' || userInfo.banned) {
        return apiError('权限不足', 401);
      }
    }

    const body = await request.json();
    const { action } = body;

    if (!config) {
      return apiError('配置不存在', 404);
    }

    if (!config.WebLiveConfig) {
      config.WebLiveConfig = [];
    }

    switch (action) {
      case 'toggleEnabled': {
        const { enabled } = body;
        config.WebLiveEnabled = enabled;
        break;
      }

      case 'add': {
        const { name, platform, roomId } = body;
        if (!name || !platform || !roomId) {
          return apiError('缺少必要参数', 400);
        }

        const key = `web_${Date.now()}`;
        if (config.WebLiveConfig.some((s) => s.key === key)) {
          return apiError('Key已存在', 400);
        }

        config.WebLiveConfig.push({
          key,
          name,
          platform,
          roomId,
          from: 'custom',
          disabled: false,
        });
        break;
      }

      case 'delete': {
        const { key } = body;
        const source = config.WebLiveConfig.find((s) => s.key === key);
        if (!source) {
          return apiError('源不存在', 404);
        }
        if (source.from === 'config') {
          return apiError('无法删除配置文件中的源', 400);
        }
        config.WebLiveConfig = config.WebLiveConfig.filter(
          (s) => s.key !== key,
        );
        break;
      }

      case 'enable': {
        const { key } = body;
        const source = config.WebLiveConfig.find((s) => s.key === key);
        if (!source) {
          return apiError('源不存在', 404);
        }
        source.disabled = false;
        break;
      }

      case 'disable': {
        const { key } = body;
        const source = config.WebLiveConfig.find((s) => s.key === key);
        if (!source) {
          return apiError('源不存在', 404);
        }
        source.disabled = true;
        break;
      }

      case 'edit': {
        const { key, name, platform, roomId } = body;
        const source = config.WebLiveConfig.find((s) => s.key === key);
        if (!source) {
          return apiError('源不存在', 404);
        }
        if (source.from === 'config') {
          return apiError('无法编辑配置文件中的源', 400);
        }
        source.name = name;
        source.platform = platform;
        source.roomId = roomId;
        break;
      }

      case 'sort': {
        const { keys } = body;
        if (!Array.isArray(keys)) {
          return apiError('无效的排序数据', 400);
        }
        const sortedSources = keys
          .map((key) => config.WebLiveConfig!.find((s) => s.key === key))
          .filter((s): s is NonNullable<typeof s> => s !== undefined);
        config.WebLiveConfig = sortedSources;
        break;
      }

      default:
        return apiError('未知操作', 400);
    }

    await db.saveAdminConfig(config);
    return apiSuccess({ success: true });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : '操作失败', 500);
  }
}
