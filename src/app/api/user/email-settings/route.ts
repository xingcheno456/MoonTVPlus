import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getStorage } from '@/lib/db';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

/**
 * GET - 获取用户邮箱设置
 */
export async function GET(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }

  try {
    const storage = getStorage();
    const username = authInfo.username;

    const email = storage.getUserEmail
      ? await storage.getUserEmail(username)
      : null;

    const emailNotifications = storage.getEmailNotificationPreference
      ? await storage.getEmailNotificationPreference(username)
      : false;

    return apiSuccess({
      email: email || '',
      emailNotifications,
    });
  } catch (error) {
    logger.error('获取用户邮箱设置失败:', error);
    return apiError((error as Error).message, 500);
  }
}

/**
 * POST - 保存用户邮箱设置
 */
export async function POST(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }

  try {
    const storage = getStorage();
    const username = authInfo.username;
    const body = await request.json();
    const { email, emailNotifications } = body;

    // 验证邮箱格式
    if (email && typeof email === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return apiError('邮箱格式不正确', 400);
      }

      if (storage.setUserEmail) {
        await storage.setUserEmail(username, email);
      }
    }

    // 保存邮件通知偏好
    if (typeof emailNotifications === 'boolean') {
      if (storage.setEmailNotificationPreference) {
        await storage.setEmailNotificationPreference(
          username,
          emailNotifications,
        );
      }
    }

    return apiSuccess({ message: '邮箱设置保存成功', });
  } catch (error) {
    logger.error('保存用户邮箱设置失败:', error);
    return apiError((error as Error).message, 500);
  }
}
