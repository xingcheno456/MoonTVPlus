import { NextRequest, NextResponse } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { db } from '@/lib/db';
import { MangaShelfItem } from '@/lib/manga.types';

import { getAuthorizedUsername } from '../_utils';

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
      const item = await db.getMangaShelf(username, sourceId, mangaId);
      return apiSuccess(item, { status: 200 });
    }

    const records = await db.getAllMangaShelf(username);
    return apiSuccess(records, { status: 200 });
  } catch (error) {
    return apiError('Internal Server Error', 500);
  }
}

export async function POST(request: NextRequest) {
  const username = await getAuthorizedUsername(request);
  if (username instanceof NextResponse) return username;

  try {
    const { key, item }: { key: string; item: MangaShelfItem } =
      await request.json();
    if (!key || !item?.title) {
      return apiError('Missing key or item', 400);
    }

    const [sourceId, mangaId] = key.split('+');
    if (!sourceId || !mangaId) {
      return apiError('Invalid key format', 400);
    }

    await db.saveMangaShelf(username, sourceId, mangaId, {
      ...item,
      saveTime: item.saveTime ?? Date.now(),
    });
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
      await db.deleteMangaShelf(username, sourceId, mangaId);
    } else {
      const all = await db.getAllMangaShelf(username);
      await Promise.all(
        Object.keys(all).map(async (itemKey) => {
          const [sourceId, mangaId] = itemKey.split('+');
          if (sourceId && mangaId) {
            await db.deleteMangaShelf(username, sourceId, mangaId);
          }
        }),
      );
    }

    return apiSuccess({ success: true }, { status: 200 });
  } catch (error) {
    return apiError('Internal Server Error', 500);
  }
}
