 
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { db, STORAGE_TYPE } from '@/lib/db';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const storageType = STORAGE_TYPE;
  if (storageType === 'localstorage') {
    return apiError('不支持本地存储进行用户列表查询', 400);
  }

  try {
    const adminAuth = validateAdminAuth(request);
    if ('status' in adminAuth) return adminAuth;

    // 获取分页参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    // 获取用户列表（优先使用新版本）
    const result = await db.getUserListV2(offset, limit, process.env.USERNAME);

    if (result.users.length > 0) {
      // 使用新版本数据
      return apiSuccess({
          users: result.users,
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        }, {
          headers: {
            'Cache-Control': 'no-store',
          },
        });
    }

    return apiSuccess({
        users: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      }, {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
  } catch (error) {
    logger.error('获取用户列表失败:', error);
    return apiError('获取用户列表失败', 500);
  }
}
