
import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

// GET - 获取用户的所有歌单
export async function GET(request: NextRequest) {
  try {
    // 从 cookie 获取用户信息
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('Unauthorized', 401);
    }

    // 检查用户状态
    if (authInfo.username !== process.env.USERNAME) {
      const userInfoV2 = await db.getUserInfoV2(authInfo.username);
      if (!userInfoV2) {
        return apiError('用户不存在', 401);
      }
      if (userInfoV2.banned) {
        return apiError('用户已被封禁', 401);
      }
    }

    const playlists = await db.getUserMusicPlaylists(authInfo.username);

    return apiSuccess({ playlists });
  } catch (error) {
    logger.error('GET /api/music/playlists error:', error);
    return apiError('Internal server error', 500);
  }
}

// POST - 创建新歌单
export async function POST(request: NextRequest) {
  try {
    // 从 cookie 获取用户信息
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('Unauthorized', 401);
    }

    // 检查用户状态
    if (authInfo.username !== process.env.USERNAME) {
      const userInfoV2 = await db.getUserInfoV2(authInfo.username);
      if (!userInfoV2) {
        return apiError('用户不存在', 401);
      }
      if (userInfoV2.banned) {
        return apiError('用户已被封禁', 401);
      }
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return apiError('歌单名称不能为空', 400);
    }

    const playlistId = randomUUID();

    await db.createMusicPlaylist(authInfo.username, {
      id: playlistId,
      name: name.trim(),
      description: description?.trim(),
    });

    const playlist = await db.getMusicPlaylist(playlistId);

    return apiSuccess({ playlist });
  } catch (error) {
    logger.error('POST /api/music/playlists error:', error);
    return apiError('Internal server error', 500);
  }
}

// PUT - 更新歌单信息
export async function PUT(request: NextRequest) {
  try {
    // 从 cookie 获取用户信息
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('Unauthorized', 401);
    }

    // 检查用户状态
    if (authInfo.username !== process.env.USERNAME) {
      const userInfoV2 = await db.getUserInfoV2(authInfo.username);
      if (!userInfoV2) {
        return apiError('用户不存在', 401);
      }
      if (userInfoV2.banned) {
        return apiError('用户已被封禁', 401);
      }
    }

    const body = await request.json();
    const { playlistId, name, description, cover } = body;

    if (!playlistId) {
      return apiError('歌单ID不能为空', 400);
    }

    // 检查歌单是否存在且属于当前用户
    const playlist = await db.getMusicPlaylist(playlistId);
    if (!playlist) {
      return apiError('歌单不存在', 404);
    }
    if (playlist.username !== authInfo.username) {
      return apiError('无权限操作此歌单', 403);
    }

    const updates: { name?: string; description?: string; cover?: string; song_count?: number } = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim();
    if (cover !== undefined) updates.cover = cover;

    await db.updateMusicPlaylist(playlistId, updates);

    const updatedPlaylist = await db.getMusicPlaylist(playlistId);

    return apiSuccess({ playlist: updatedPlaylist });
  } catch (error) {
    logger.error('PUT /api/music/playlists error:', error);
    return apiError('Internal server error', 500);
  }
}

// DELETE - 删除歌单
export async function DELETE(request: NextRequest) {
  try {
    // 从 cookie 获取用户信息
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('Unauthorized', 401);
    }

    // 检查用户状态
    if (authInfo.username !== process.env.USERNAME) {
      const userInfoV2 = await db.getUserInfoV2(authInfo.username);
      if (!userInfoV2) {
        return apiError('用户不存在', 401);
      }
      if (userInfoV2.banned) {
        return apiError('用户已被封禁', 401);
      }
    }

    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get('playlistId');

    if (!playlistId) {
      return apiError('歌单ID不能为空', 400);
    }

    // 检查歌单是否存在且属于当前用户
    const playlist = await db.getMusicPlaylist(playlistId);
    if (!playlist) {
      return apiError('歌单不存在', 404);
    }
    if (playlist.username !== authInfo.username) {
      return apiError('无权限操作此歌单', 403);
    }

    await db.deleteMusicPlaylist(playlistId);

    return apiSuccess({ success: true });
  } catch (error) {
    logger.error('DELETE /api/music/playlists error:', error);
    return apiError('Internal server error', 500);
  }
}
