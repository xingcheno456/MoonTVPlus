import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig, setCachedConfig } from '@/lib/config';
import { db, STORAGE_TYPE } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const storageType = STORAGE_TYPE;
  if (storageType === 'localstorage') {
    return apiError('不支持本地存储进行管理员配置', 400);
  }

  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('Unauthorized', 401);
    }

    // 仅站长可用
    if (authInfo.username !== process.env.USERNAME) {
      return apiError('权限不足，仅站长可用', 403);
    }

    const body = await request.json();
    const { data } = body;

    if (!data) {
      return apiError('缺少导入数据', 400);
    }

    const adminConfig = await getConfig();

    // 追加和覆盖：合并Sources数组
    if (data.Sources && Array.isArray(data.Sources)) {
      const existingSources = adminConfig.EmbyConfig?.Sources || [];

      // 覆盖已存在的，追加新的
      const mergedSources = [...existingSources];
      for (const importSource of data.Sources) {
        const existingIndex = mergedSources.findIndex(
          (s) => s.key === importSource.key,
        );
        if (existingIndex >= 0) {
          mergedSources[existingIndex] = importSource;
        } else {
          mergedSources.push(importSource);
        }
      }

      adminConfig.EmbyConfig = {
        ...adminConfig.EmbyConfig,
        Sources: mergedSources,
      };
    } else {
      // 旧格式：直接覆盖
      adminConfig.EmbyConfig = {
        ...adminConfig.EmbyConfig,
        ...data,
      };
    }

    await db.saveAdminConfig(adminConfig);

    // 更新内存缓存
    await setCachedConfig(adminConfig);

    return apiSuccess({ message: '导入成功', });
  } catch (error) {
    return apiError('导入失败: ' + (error as Error).message, 500);
  }
}
