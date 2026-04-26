import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getStorage } from '@/lib/db';

import { logger } from '../../../lib/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }

  try {
    const storage = getStorage();
    const notifications = await storage.getNotifications(authInfo.username);
    const unreadCount = await storage.getUnreadNotificationCount(
      authInfo.username,
    );

    return apiSuccess({ notifications, unreadCount });
  } catch (error) {
    logger.error('获取通知失败:', error);
    return apiError((error as Error).message, 500);
  }
}

export async function POST(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }

  try {
    const body = await request.json();
    const { action, notificationId } = body;

    const storage = getStorage();

    if (action === 'mark_read' && notificationId) {
      await storage.markNotificationAsRead(authInfo.username, notificationId);
      return apiSuccess({ message: '已标记为已读' });
    }

    if (action === 'delete' && notificationId) {
      await storage.deleteNotification(authInfo.username, notificationId);
      return apiSuccess({ message: '已删除' });
    }

    if (action === 'clear_all') {
      await storage.clearAllNotifications(authInfo.username);
      return apiSuccess({ message: '已清空所有通知' });
    }

    return apiError('无效的操作', 400);
  } catch (error) {
    logger.error('操作通知失败:', error);
    return apiError((error as Error).message, 500);
  }
}
