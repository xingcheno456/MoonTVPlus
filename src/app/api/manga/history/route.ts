import { NextRequest, NextResponse } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { db } from '@/lib/db';
import { MangaReadRecord } from '@/lib/manga.types';

import { getAuthorizedUsername } from '../_utils';
import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const username = await getAuthorizedUsername(request);
  if (username instanceof NextResponse) return username;

  try {
    const key = new URL(request.url).searchParams.get('key');
    if (key) {
      const [sourceId, mangaId] = key.split('+');
      if (!sourceId || !mangaId) {
        return apiError('Invalid key format', 400);
      }
      const record = await db.getMangaReadRecord(username, sourceId, mangaId);
      return apiSuccess(record, { status: 200 });
    }

    const records = await db.getAllMangaReadRecords(username);
    return apiSuccess(records, { status: 200 });
  } catch (error) {
    return apiError('Internal Server Error', 500);
  }
}

export async function POST(request: NextRequest) {
  const username = await getAuthorizedUsername(request);
  if (username instanceof NextResponse) return username;

  try {
    const { key, record }: { key: string; record: MangaReadRecord } =
      await request.json();
    if (!key || !record?.chapterId) {
      return apiError('Missing key or record', 400);
    }

    const [sourceId, mangaId] = key.split('+');
    if (!sourceId || !mangaId) {
      return apiError('Invalid key format', 400);
    }

    await db.saveMangaReadRecord(username, sourceId, mangaId, {
      ...record,
      saveTime: record.saveTime ?? Date.now(),
    });

    if ((db as any).storage.cleanupOldMangaReadRecords) {
      (db as any).storage
        .cleanupOldMangaReadRecords(username)
        .catch((err: Error) => {
          logger.error('异步清理漫画阅读历史失败:', err);
        });
    }

    return apiSuccess({ success: true }, { status: 200 });
  } catch (error) {
    return apiError('Internal Server Error', 500);
  }
}

export async function DELETE(request: NextRequest) {
  const username = await getAuthorizedUsername(request);
  if (username instanceof NextResponse) return username;

  try {
    const key = new URL(request.url).searchParams.get('key');
    if (key) {
      const [sourceId, mangaId] = key.split('+');
      if (!sourceId || !mangaId) {
        return apiError('Invalid key format', 400);
      }
      await db.deleteMangaReadRecord(username, sourceId, mangaId);
    } else {
      const all = await db.getAllMangaReadRecords(username);
      await Promise.all(
        Object.keys(all).map(async (itemKey) => {
          const [sourceId, mangaId] = itemKey.split('+');
          if (sourceId && mangaId) {
            await db.deleteMangaReadRecord(username, sourceId, mangaId);
          }
        }),
      );
    }

    return apiSuccess({ success: true }, { status: 200 });
  } catch (error) {
    return apiError('Internal Server Error', 500);
  }
}
