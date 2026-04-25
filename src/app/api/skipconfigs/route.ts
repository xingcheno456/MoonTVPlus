/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';
import { SkipConfig } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('未登录', 401);
    }

    if (authInfo.username !== process.env.USERNAME) {
      const userInfoV2 = await db.getUserInfoV2(authInfo.username);
      if (!userInfoV2) {
        return apiError('用户不存在', 401);
      }
      if (userInfoV2.banned) {
        return apiError('用户已被封禁', 401);
      }

      if (!userInfoV2.skip_migrated) {
        await db.migrateSkipConfigs(authInfo.username);
      }
    } else {
      const userInfoV2 = await db.getUserInfoV2(authInfo.username);
      if (!userInfoV2?.skip_migrated) {
        await db.migrateSkipConfigs(authInfo.username);
      }
    }

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const id = searchParams.get('id');

    if (source && id) {
      const config = await db.getSkipConfig(authInfo.username, source, id);
      return apiSuccess(config);
    } else {
      const configs = await db.getAllSkipConfigs(authInfo.username);
      return apiSuccess(configs);
    }
  } catch (error) {
    console.error('获取跳过片头片尾配置失败:', error);
    return apiError('获取跳过片头片尾配置失败', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('未登录', 401);
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
    const { key, config } = body;

    if (!key || !config) {
      return apiError('缺少必要参数', 400);
    }

    const [source, id] = key.split('+');
    if (!source || !id) {
      return apiError('无效的key格式', 400);
    }

    const skipConfig: SkipConfig = {
      enable: Boolean(config.enable),
      intro_time: Number(config.intro_time) || 0,
      outro_time: Number(config.outro_time) || 0,
    };

    await db.setSkipConfig(authInfo.username, source, id, skipConfig);

    return apiSuccess(null);
  } catch (error) {
    console.error('保存跳过片头片尾配置失败:', error);
    return apiError('保存跳过片头片尾配置失败', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('未登录', 401);
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

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return apiError('缺少必要参数', 400);
    }

    const [source, id] = key.split('+');
    if (!source || !id) {
      return apiError('无效的key格式', 400);
    }

    await db.deleteSkipConfig(authInfo.username, source, id);

    return apiSuccess(null);
  } catch (error) {
    console.error('删除跳过片头片尾配置失败:', error);
    return apiError('删除跳过片头片尾配置失败', 500);
  }
}
