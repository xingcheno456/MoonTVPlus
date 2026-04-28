import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { db } from '@/lib/db';
import {
  getMusicV2Username,
  internalError,
  unauthorized,
} from '@/lib/music-v2-api';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> },
) {
  const username = await getMusicV2Username(request);
  if (!username) return unauthorized();

  try {
    const { playlistId } = await params;
    const playlist = await db.getMusicV2Playlist(playlistId);
    if (!playlist)
      return apiError('歌单不存在', 404, 'NOT_FOUND');
    if (playlist.username !== username)
      return apiError('无权限操作此歌单', 403, 'FORBIDDEN');

    const body = await request.json();
    await db.updateMusicV2Playlist(playlistId, {
      name: body?.name,
      description: body?.description,
      cover: body?.cover,
    });
    const updated = await db.getMusicV2Playlist(playlistId);
    return apiSuccess({ data: { playlist: updated } });
  } catch (error) {
    return internalError('更新歌单失败', (error as Error).message);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> },
) {
  const username = await getMusicV2Username(request);
  if (!username) return unauthorized();

  try {
    const { playlistId } = await params;
    const playlist = await db.getMusicV2Playlist(playlistId);
    if (!playlist)
      return apiError('歌单不存在', 404, 'NOT_FOUND');
    if (playlist.username !== username)
      return apiError('无权限操作此歌单', 403, 'FORBIDDEN');

    await db.deleteMusicV2Playlist(playlistId);
    return apiSuccess({ success: true });
  } catch (error) {
    return internalError('删除歌单失败', (error as Error).message);
  }
}
