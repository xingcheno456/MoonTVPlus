import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getStorage } from '@/lib/db';

export const runtime = 'nodejs';

// GET: 获取单个求片详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }

  try {
    const storage = getStorage();
    const movieRequest = await storage.getMovieRequest(id);

    if (!movieRequest) {
      return apiError('求片不存在', 404);
    }

    return apiSuccess({ request: movieRequest });
  } catch (error) {
    console.error('获取求片详情失败:', error);
    return apiError((error as Error).message, 500);
  }
}

// PATCH: 更新求片状态（标记已上架）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }

  try {
    const storage = getStorage();

    // 检查权限：只有管理员和站长可以操作
    if (storage.getUserInfoV2) {
      const userInfo = await storage.getUserInfoV2(authInfo.username);
      if (userInfo?.role !== 'admin' && userInfo?.role !== 'owner') {
        return apiError('无权限操作', 403);
      }
    } else {
      // 如果不支持 getUserInfoV2，只允许站长操作
      if (authInfo.username !== process.env.USERNAME) {
        return apiError('无权限操作', 403);
      }
    }

    const body = await request.json();
    const { status, fulfilledSource, fulfilledId } = body;

    const movieRequest = await storage.getMovieRequest(id);
    if (!movieRequest) {
      return apiError('求片不存在', 404);
    }

    // 更新状态
    const updates: any = {
      status,
      updatedAt: Date.now(),
    };

    if (status === 'fulfilled') {
      updates.fulfilledAt = Date.now();
      updates.fulfilledSource = fulfilledSource;
      updates.fulfilledId = fulfilledId;

      // 给所有求片用户发送通知
      for (const username of movieRequest.requestedBy) {
        await storage.addNotification(username, {
          id: `req_fulfilled_${id}_${Date.now()}`,
          type: 'request_fulfilled',
          title: '求片已上架',
          message: `您求的《${movieRequest.title}》已上架`,
          timestamp: Date.now(),
          read: false,
          metadata: {
            requestId: id,
            source: fulfilledSource,
            id: fulfilledId,
          },
        });
      }
    }

    await storage.updateMovieRequest(id, updates);

    return apiSuccess({
      message: '更新成功',
      request: { ...movieRequest, ...updates },
    });
  } catch (error) {
    console.error('更新求片失败:', error);
    return apiError((error as Error).message, 500);
  }
}

// DELETE: 删除求片
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }

  try {
    const storage = getStorage();

    // 检查权限：只有管理员和站长可以删除
    if (storage.getUserInfoV2) {
      const userInfo = await storage.getUserInfoV2(authInfo.username);
      if (userInfo?.role !== 'admin' && userInfo?.role !== 'owner') {
        return apiError('无权限操作', 403);
      }
    } else {
      // 如果不支持 getUserInfoV2，只允许站长操作
      if (authInfo.username !== process.env.USERNAME) {
        return apiError('无权限操作', 403);
      }
    }

    const movieRequest = await storage.getMovieRequest(id);
    if (!movieRequest) {
      return apiError('求片不存在', 404);
    }

    // 删除求片
    await storage.deleteMovieRequest(id);

    // 从所有用户的求片列表中移除
    for (const username of movieRequest.requestedBy) {
      await storage.removeUserMovieRequest(username, id);
    }

    return apiError('删除成功', 400);
  } catch (error) {
    console.error('删除求片失败:', error);
    return apiError((error as Error).message, 500);
  }
}
