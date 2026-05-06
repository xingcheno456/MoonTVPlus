/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { getConfig } from '@/lib/config';
import { db, STORAGE_TYPE } from '@/lib/db';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

// 支持的操作类型
type Action =
  | 'add'
  | 'disable'
  | 'enable'
  | 'delete'
  | 'sort'
  | 'batch_disable'
  | 'batch_enable'
  | 'batch_delete'
  | 'toggle_proxy_mode'
  | 'update_weight';

interface BaseBody {
  action?: Action;
}

export async function POST(request: NextRequest) {
  const storageType = STORAGE_TYPE;
  if (storageType === 'localstorage') {
    return apiError('不支持本地存储进行管理员配置', 400);
  }

  try {
    const body = (await request.json()) as BaseBody & Record<string, any>;
    const { action } = body;

    const adminAuth = validateAdminAuth(request);
    if ('status' in adminAuth) return adminAuth;
    const username = adminAuth.username;

    // 基础校验
    const ACTIONS: Action[] = [
      'add',
      'disable',
      'enable',
      'delete',
      'sort',
      'batch_disable',
      'batch_enable',
      'batch_delete',
      'toggle_proxy_mode',
      'update_weight',
    ];
    if (!username || !action || !ACTIONS.includes(action)) {
      return apiError('参数格式错误', 400);
    }

    // 获取配置与存储
    const adminConfig = await getConfig();

    switch (action) {
      case 'add': {
        const { key, name, api, detail } = body as {
          key?: string;
          name?: string;
          api?: string;
          detail?: string;
        };
        if (!key || !name || !api) {
          return apiError('缺少必要参数', 400);
        }
        // 禁止添加保留关键字
        if (key === 'openlist' || key === 'xiaoya') {
          return apiError(`${key} 是保留关键字，不能作为视频源 key`, 400);
        }
        if (key.startsWith('emby')) {
          return apiError('emby 开头的 key 是保留关键字，不能作为视频源 key', 400);
        }
        if (adminConfig.SourceConfig.some((s) => s.key === key)) {
          return apiError('该源已存在', 400);
        }
        adminConfig.SourceConfig.push({
          key,
          name,
          api,
          detail,
          from: 'custom',
          disabled: false,
        });
        break;
      }
      case 'disable': {
        const { key } = body as { key?: string };
        if (!key)
          return apiError('缺少 key 参数', 400);
        const entry = adminConfig.SourceConfig.find((s) => s.key === key);
        if (!entry)
          return apiError('源不存在', 404);
        entry.disabled = true;
        break;
      }
      case 'enable': {
        const { key } = body as { key?: string };
        if (!key)
          return apiError('缺少 key 参数', 400);
        const entry = adminConfig.SourceConfig.find((s) => s.key === key);
        if (!entry)
          return apiError('源不存在', 404);
        entry.disabled = false;
        break;
      }
      case 'delete': {
        const { key } = body as { key?: string };
        if (!key)
          return apiError('缺少 key 参数', 400);
        const idx = adminConfig.SourceConfig.findIndex((s) => s.key === key);
        if (idx === -1)
          return apiError('源不存在', 404);
        const entry = adminConfig.SourceConfig[idx];
        if (entry.from === 'config') {
          return apiError('该源不可删除', 400);
        }
        adminConfig.SourceConfig.splice(idx, 1);

        // 检查并清理用户组和用户的权限数组
        // 清理用户组权限
        if (adminConfig.UserConfig.Tags) {
          adminConfig.UserConfig.Tags.forEach((tag) => {
            if (tag.enabledApis) {
              tag.enabledApis = tag.enabledApis.filter((api) => api !== key);
            }
          });
        }

        // 清理用户权限
        adminConfig.UserConfig.Users.forEach((user) => {
          if (user.enabledApis) {
            user.enabledApis = user.enabledApis.filter((api) => api !== key);
          }
        });
        break;
      }
      case 'batch_disable': {
        const { keys } = body as { keys?: string[] };
        if (!Array.isArray(keys) || keys.length === 0) {
          return apiError('缺少 keys 参数或为空', 400);
        }
        keys.forEach((key) => {
          const entry = adminConfig.SourceConfig.find((s) => s.key === key);
          if (entry) {
            entry.disabled = true;
          }
        });
        break;
      }
      case 'batch_enable': {
        const { keys } = body as { keys?: string[] };
        if (!Array.isArray(keys) || keys.length === 0) {
          return apiError('缺少 keys 参数或为空', 400);
        }
        keys.forEach((key) => {
          const entry = adminConfig.SourceConfig.find((s) => s.key === key);
          if (entry) {
            entry.disabled = false;
          }
        });
        break;
      }
      case 'batch_delete': {
        const { keys } = body as { keys?: string[] };
        if (!Array.isArray(keys) || keys.length === 0) {
          return apiError('缺少 keys 参数或为空', 400);
        }
        // 过滤掉 from=config 的源，记录跳过的数量
        const keysToDelete: string[] = [];
        const skippedKeys: string[] = [];

        keys.forEach((key) => {
          const entry = adminConfig.SourceConfig.find((s) => s.key === key);
          if (entry && entry.from === 'config') {
            skippedKeys.push(key);
          } else if (entry) {
            keysToDelete.push(key);
          }
        });

        // 批量删除
        keysToDelete.forEach((key) => {
          const idx = adminConfig.SourceConfig.findIndex((s) => s.key === key);
          if (idx !== -1) {
            adminConfig.SourceConfig.splice(idx, 1);
          }
        });

        // 检查并清理用户组和用户的权限数组
        if (keysToDelete.length > 0) {
          // 清理用户组权限
          if (adminConfig.UserConfig.Tags) {
            adminConfig.UserConfig.Tags.forEach((tag) => {
              if (tag.enabledApis) {
                tag.enabledApis = tag.enabledApis.filter(
                  (api) => !keysToDelete.includes(api),
                );
              }
            });
          }

          // 清理用户权限
          adminConfig.UserConfig.Users.forEach((user) => {
            if (user.enabledApis) {
              user.enabledApis = user.enabledApis.filter(
                (api) => !keysToDelete.includes(api),
              );
            }
          });
        }

        const batchDeleteResult = {
          deleted: keysToDelete.length,
          skipped: skippedKeys.length,
        };
        (body as Record<string, unknown>)._batchDeleteResult = batchDeleteResult;
        break;
      }
      case 'sort': {
        const { order } = body as { order?: string[] };
        if (!Array.isArray(order)) {
          return apiError('排序列表格式错误', 400);
        }
        const map = new Map(adminConfig.SourceConfig.map((s) => [s.key, s]));
        const newList: typeof adminConfig.SourceConfig = [];
        order.forEach((k) => {
          const item = map.get(k);
          if (item) {
            newList.push(item);
            map.delete(k);
          }
        });
        // 未在 order 中的保持原顺序
        adminConfig.SourceConfig.forEach((item) => {
          if (map.has(item.key)) newList.push(item);
        });
        adminConfig.SourceConfig = newList;
        break;
      }
      case 'toggle_proxy_mode': {
        const { key } = body as { key?: string };
        if (!key)
          return apiError('缺少 key 参数', 400);
        const entry = adminConfig.SourceConfig.find((s) => s.key === key);
        if (!entry)
          return apiError('源不存在', 404);
        entry.proxyMode = !entry.proxyMode;
        break;
      }
      case 'update_weight': {
        const { key, weight } = body as { key?: string; weight?: number };
        if (!key)
          return apiError('缺少 key 参数', 400);
        if (weight === undefined || weight === null)
          return apiError('缺少 weight 参数', 400);
        if (typeof weight !== 'number' || weight < 0 || weight > 100)
          return apiError('权重必须是 0-100 之间的数字', 400);
        const entry = adminConfig.SourceConfig.find((s) => s.key === key);
        if (!entry)
          return apiError('源不存在', 404);
        entry.weight = weight;
        break;
      }
      default:
        return apiError('未知操作', 400);
    }

    // 持久化到存储
    await db.saveAdminConfig(adminConfig);

    // 清除短剧视频源缓存（因为视频源发生了变动）
    try {
      await db.deleteGlobalValue('duanju');
      logger.info('已清除短剧视频源缓存');
    } catch (error) {
      logger.error('清除短剧视频源缓存失败:', error);
      // 不影响主流程，继续执行
    }

    const responseData: Record<string, unknown> = { ok: true };

    if (action === 'batch_delete') {
      const deleteResult = (body as Record<string, unknown>)._batchDeleteResult as { deleted: number; skipped: number } | undefined;
      if (deleteResult) {
        responseData.deleted = deleteResult.deleted;
        responseData.skipped = deleteResult.skipped;
      }
    }

    return apiSuccess(responseData, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logger.error('视频源管理操作失败:', error);
    return apiError('视频源管理操作失败', 500);
  }
}
