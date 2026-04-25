/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { handleServiceError, validateAuthenticatedUser } from '@/services/auth.service';
import {
  deletePlayRecord,
  getAllPlayRecords,
  savePlayRecord,
} from '@/services/playrecord.service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);
    const records = await getAllPlayRecords(username);
    return apiSuccess(records);
  } catch (err) {
    console.error('获取播放记录失败', err);
    return handleServiceError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);
    const body = await request.json();
    const { key, record } = body;

    if (!key || !record) {
      return apiError('Missing key or record', 400);
    }

    await savePlayRecord(username, key, record);
    return apiSuccess(null);
  } catch (err) {
    if (err instanceof Error && (err.message === 'Invalid key format' || err.message === 'Invalid record data')) {
      return apiError(err.message, 400);
    }
    console.error('保存播放记录失败', err);
    return handleServiceError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    await deletePlayRecord(username, key || undefined);
    return apiSuccess(null);
  } catch (err) {
    if (err instanceof Error && err.message === 'Invalid key format') {
      return apiError(err.message, 400);
    }
    console.error('删除播放记录失败', err);
    return handleServiceError(err);
  }
}
