/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';
import { DanmakuFilterConfig } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('未登录', 401);
    }

    if (authInfo.username !== process.env.USERNAME) {
      // 非站长，检查用户存在或被封禁
      const userInfoV2 = await db.getUserInfoV2(authInfo.username);
      if (!userInfoV2) {
        return apiError('用户不存在', 401);
      }
      if (userInfoV2.banned) {
        return apiError('用户已被封禁', 401);
      }
    }

    // 获取弹幕过滤配置
    const filterConfig = await db.getDanmakuFilterConfig(authInfo.username);

    // 如果没有配置，返回默认值
    if (!filterConfig) {
      return apiSuccess({ rules: [] });
    }

    return apiSuccess(filterConfig);
  } catch (error) {
    console.error('获取弹幕过滤配置失败:', error);
    return apiError('获取弹幕过滤配置失败', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('未登录', 401);
    }

    if (authInfo.username !== process.env.USERNAME) {
      // 非站长，检查用户存在或被封禁
      const userInfoV2 = await db.getUserInfoV2(authInfo.username);
      if (!userInfoV2) {
        return apiError('用户不存在', 401);
      }
      if (userInfoV2.banned) {
        return apiError('用户已被封禁', 401);
      }
    }

    const body = await request.json();
    const config: DanmakuFilterConfig = body;

    if (!config || !Array.isArray(config.rules)) {
      return apiError('配置格式错误', 400);
    }

    // 验证每个规则的格式
    const validatedRules = config.rules.map((rule) => ({
      keyword: String(rule.keyword || ''),
      type:
        rule.type === 'regex' || rule.type === 'normal' ? rule.type : 'normal',
      enabled: Boolean(rule.enabled),
      id: rule.id || undefined,
    }));

    const validatedConfig: DanmakuFilterConfig = {
      rules: validatedRules,
    };

    await db.setDanmakuFilterConfig(authInfo.username, validatedConfig);

    return apiSuccess({ success: true });
  } catch (error) {
    console.error('保存弹幕过滤配置失败:', error);
    return apiError('保存弹幕过滤配置失败', 500);
  }
}
