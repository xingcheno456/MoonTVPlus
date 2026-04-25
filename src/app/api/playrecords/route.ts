/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';
import { PlayRecord } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('Unauthorized', 401);
    }

    if (authInfo.username !== process.env.USERNAME) {
      const userInfoV2 = await db.getUserInfoV2(authInfo.username);
      if (!userInfoV2) {
        return apiError('用户不存在', 401);
      }
      if (userInfoV2.banned) {
        return apiError('用户已被封禁', 401);
      }

      if (!userInfoV2.playrecord_migrated) {
        console.log(
          `用户 ${authInfo.username} 播放记录未迁移，开始执行迁移...`,
        );
        await db.migratePlayRecords(authInfo.username);
      }
    } else {
      const userInfoV2 = await db.getUserInfoV2(authInfo.username);
      if (!userInfoV2 || !userInfoV2.playrecord_migrated) {
        console.log(
          `站长 ${authInfo.username} 播放记录未迁移，开始执行迁移...`,
        );
        await db.migratePlayRecords(authInfo.username);
      }
    }

    const records = await db.getAllPlayRecords(authInfo.username);
    return apiSuccess(records);
  } catch (err) {
    console.error('获取播放记录失败', err);
    return apiError('Internal Server Error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('Unauthorized', 401);
    }

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
    const { key, record }: { key: string; record: PlayRecord } = body;

    if (!key || !record) {
      return apiError('Missing key or record', 400);
    }

    if (!record.title || !record.source_name || record.index < 1) {
      return apiError('Invalid record data', 400);
    }

    const [source, id] = key.split('+');
    if (!source || !id) {
      return apiError('Invalid key format', 400);
    }

    const finalRecord = {
      ...record,
      save_time: record.save_time ?? Date.now(),
    } as PlayRecord;

    await db.savePlayRecord(authInfo.username, source, id, finalRecord);

    (db as any).storage
      .cleanupOldPlayRecords(authInfo.username)
      .catch((err: Error) => {
        console.error('异步清理播放记录失败:', err);
      });

    return apiSuccess(null);
  } catch (err) {
    console.error('保存播放记录失败', err);
    return apiError('Internal Server Error', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('Unauthorized', 401);
    }

    if (authInfo.username !== process.env.USERNAME) {
      const userInfoV2 = await db.getUserInfoV2(authInfo.username);
      if (!userInfoV2) {
        return apiError('用户不存在', 401);
      }
      if (userInfoV2.banned) {
        return apiError('用户已被封禁', 401);
      }
    }

    const username = authInfo.username;
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key) {
      const [source, id] = key.split('+');
      if (!source || !id) {
        return apiError('Invalid key format', 400);
      }

      await db.deletePlayRecord(username, source, id);
    } else {
      const all = await db.getAllPlayRecords(username);
      await Promise.all(
        Object.keys(all).map(async (k) => {
          const [s, i] = k.split('+');
          if (s && i) await db.deletePlayRecord(username, s, i);
        }),
      );
    }

    return apiSuccess(null);
  } catch (err) {
    console.error('删除播放记录失败', err);
    return apiError('Internal Server Error', 500);
  }
}
