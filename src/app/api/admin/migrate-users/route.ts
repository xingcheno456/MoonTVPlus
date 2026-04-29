 
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db, STORAGE_TYPE } from '@/lib/db';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const storageType = STORAGE_TYPE;
  if (storageType === 'localstorage') {
    return apiError('不支持本地存储进行数据迁移', 400);
  }

  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('Unauthorized', 401);
    }

    // 只有站长可以执行迁移
    if (authInfo.username !== process.env.USERNAME) {
      return apiError('权限不足', 401);
    }

    // 获取配置
    const adminConfig = await getConfig();

    // 检查是否有需要迁移的用户（排除站长）
    const usersToMigrate = adminConfig.UserConfig.Users.filter(
      (u) => u.role !== 'owner',
    );

    if (!usersToMigrate || usersToMigrate.length === 0) {
      return apiError('没有需要迁移的用户', 400);
    }

    // 执行迁移
    await db.migrateUsersFromConfig(adminConfig);

    // 迁移完成后，清空配置中的用户列表
    adminConfig.UserConfig.Users = [];
    await db.saveAdminConfig(adminConfig);

    // 更新配置缓存
    const { setCachedConfig } = await import('@/lib/config');
    await setCachedConfig(adminConfig);

    return apiSuccess({ ok: true, message: '用户数据迁移成功' }, {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
  } catch (error) {
    logger.error('用户数据迁移失败:', error);
    return apiError('用户数据迁移失败', 500);
  }
}
