
import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';

import { logger } from '../../../../../lib/logger';

export const runtime = 'nodejs';

// GET - 获取歌单中的所有歌曲
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
      return apiError('无权限访问此歌单', 403);
    }

    const songs = await db.getPlaylistSongs(playlistId);

    return apiSuccess({ songs });
  } catch (error) {
    logger.error('GET /api/music/playlists/songs error:', error);
    return apiError('Internal server error', 500);
  }
}

// POST - 添加歌曲到歌单
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
    const { playlistId, song } = body;

    if (!playlistId) {
      return apiError('歌单ID不能为空', 400);
    }

    if (!song || !song.platform || !song.id || !song.name || !song.artist) {
      return apiError('歌曲信息不完整', 400);
    }

    // 检查歌单是否存在且属于当前用户
    const playlist = await db.getMusicPlaylist(playlistId);
    if (!playlist) {
      return apiError('歌单不存在', 404);
    }
    if (playlist.username !== authInfo.username) {
      return apiError('无权限操作此歌单', 403);
    }

    // 检查歌曲是否已在歌单中
    const exists = await db.isSongInPlaylist(
      playlistId,
      song.platform,
      song.id,
    );
    if (exists) {
      return apiError('歌曲已在歌单中', 400);
    }

    await db.addSongToPlaylist(playlistId, {
      platform: song.platform,
      id: song.id,
      name: song.name,
      artist: song.artist,
      album: song.album,
      pic: song.pic,
      duration: song.duration || 0,
    });

    return apiSuccess({ success: true });
  } catch (error) {
    logger.error('POST /api/music/playlists/songs error:', error);
    return apiError('Internal server error', 500);
  }
}

// DELETE - 从歌单中移除歌曲
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
    const platform = searchParams.get('platform');
    const songId = searchParams.get('songId');

    if (!playlistId || !platform || !songId) {
      return apiError('参数不完整', 400);
    }

    // 检查歌单是否存在且属于当前用户
    const playlist = await db.getMusicPlaylist(playlistId);
    if (!playlist) {
      return apiError('歌单不存在', 404);
    }
    if (playlist.username !== authInfo.username) {
      return apiError('无权限操作此歌单', 403);
    }

    await db.removeSongFromPlaylist(playlistId, platform, songId);

    return apiSuccess({ success: true });
  } catch (error) {
    logger.error('DELETE /api/music/playlists/songs error:', error);
    return apiError('Internal server error', 500);
  }
}
