/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db, STORAGE_TYPE } from '@/lib/db';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

// 支持的操作类型
const ACTIONS = [
  'add',
  'ban',
  'unban',
  'setAdmin',
  'cancelAdmin',
  'changePassword',
  'deleteUser',
  'updateUserApis',
  'userGroup',
  'updateUserGroups',
  'batchUpdateUserGroups',
] as const;

export async function POST(request: NextRequest) {
  const storageType = STORAGE_TYPE;
  if (storageType === 'localstorage') {
    return apiError('不支持本地存储进行管理员配置', 400);
  }

  try {
    const body = await request.json();

    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return apiError('Unauthorized', 401);
    }
    const username = authInfo.username;

    const {
      targetUsername, // 目标用户名
      targetPassword, // 目标用户密码（仅在添加用户时需要）
      action,
    } = body as {
      targetUsername?: string;
      targetPassword?: string;
      action?: (typeof ACTIONS)[number];
    };

    if (!action || !ACTIONS.includes(action)) {
      return apiError('参数格式错误', 400);
    }

    // 用户组操作和批量操作不需要targetUsername
    if (
      !targetUsername &&
      !['userGroup', 'batchUpdateUserGroups'].includes(action)
    ) {
      return apiError('缺少目标用户名', 400);
    }

    if (
      action !== 'changePassword' &&
      action !== 'deleteUser' &&
      action !== 'updateUserApis' &&
      action !== 'userGroup' &&
      action !== 'updateUserGroups' &&
      action !== 'batchUpdateUserGroups' &&
      username === targetUsername
    ) {
      return apiError('无法对自己进行此操作', 400);
    }

    // 获取配置与存储
    const adminConfig = await getConfig();

    // 判定操作者角色
    const adminAuth = validateAdminAuth(request);
    if ('status' in adminAuth) return adminAuth;
    const operatorRole = adminAuth.auth.role as 'owner' | 'admin';
    const operatorUsername = adminAuth.username;

    // 查找目标用户条目（用户组操作和批量操作不需要）
    let targetEntry: any = null;
    let isTargetAdmin = false;
    let targetUserV2: any = null;

    if (
      !['userGroup', 'batchUpdateUserGroups'].includes(action) &&
      targetUsername
    ) {
      // 先从配置中查找
      targetEntry = adminConfig.UserConfig.Users.find(
        (u) => u.username === targetUsername,
      );

      // 如果配置中没有，从新版本存储中查找
      if (!targetEntry) {
        targetUserV2 = await db.getUserInfoV2(targetUsername);
        if (targetUserV2) {
          // 构造一个兼容的targetEntry对象
          targetEntry = {
            username: targetUsername,
            role: targetUserV2.role,
            banned: targetUserV2.banned,
            tags: targetUserV2.tags,
          };
        }
      }

      if (
        targetEntry &&
        targetEntry.role === 'owner' &&
        !['changePassword', 'updateUserApis', 'updateUserGroups'].includes(
          action,
        )
      ) {
        return apiError('无法操作站长', 400);
      }

      // 权限校验逻辑
      isTargetAdmin = targetEntry?.role === 'admin';
    }

    switch (action) {
      case 'add': {
        if (targetEntry) {
          return apiError('用户已存在', 400);
        }
        // 检查新版本中是否已存在
        const existsV2 = await db.checkUserExistV2(targetUsername!);
        if (existsV2) {
          return apiError('用户已存在', 400);
        }
        if (!targetPassword) {
          return apiError('缺少目标用户密码', 400);
        }

        // 获取用户组信息
        const { userGroup } = body as { userGroup?: string };
        const tags = userGroup && userGroup.trim() ? [userGroup] : undefined;

        // 使用新版本创建用户
        await db.createUserV2(targetUsername!, targetPassword, 'user', tags);

        // 不再更新配置，因为用户已经存储在新版本中
        // 构造一个虚拟的targetEntry用于后续逻辑
        targetEntry = {
          username: targetUsername!,
          role: 'user',
          tags,
        };
        break;
      }
      case 'ban': {
        if (!targetEntry) {
          return apiError('目标用户不存在', 404);
        }
        if (isTargetAdmin) {
          // 目标是管理员
          if (operatorRole !== 'owner') {
            return apiError('仅站长可封禁管理员', 401);
          }
        }

        // 只更新V2存储
        await db.updateUserInfoV2(targetUsername!, { banned: true });
        break;
      }
      case 'unban': {
        if (!targetEntry) {
          return apiError('目标用户不存在', 404);
        }
        if (isTargetAdmin) {
          if (operatorRole !== 'owner') {
            return apiError('仅站长可操作管理员', 401);
          }
        }

        // 只更新V2存储
        await db.updateUserInfoV2(targetUsername!, { banned: false });
        break;
      }
      case 'setAdmin': {
        if (!targetEntry) {
          return apiError('目标用户不存在', 404);
        }
        if (targetEntry.role === 'admin') {
          return apiError('该用户已是管理员', 400);
        }
        if (operatorRole !== 'owner') {
          return apiError('仅站长可设置管理员', 401);
        }

        // 只更新V2存储
        await db.updateUserInfoV2(targetUsername!, { role: 'admin' });
        break;
      }
      case 'cancelAdmin': {
        if (!targetEntry) {
          return apiError('目标用户不存在', 404);
        }
        if (targetEntry.role !== 'admin') {
          return apiError('目标用户不是管理员', 400);
        }
        if (operatorRole !== 'owner') {
          return apiError('仅站长可取消管理员', 401);
        }

        // 只更新V2存储
        await db.updateUserInfoV2(targetUsername!, { role: 'user' });
        break;
      }
      case 'changePassword': {
        if (!targetEntry) {
          return apiError('目标用户不存在', 404);
        }
        if (!targetPassword) {
          return apiError('缺少新密码', 400);
        }

        // 权限检查：不允许修改站长密码
        if (targetEntry.role === 'owner') {
          return apiError('无法修改站长密码', 401);
        }

        if (
          isTargetAdmin &&
          operatorRole !== 'owner' &&
          username !== targetUsername
        ) {
          return apiError('仅站长可修改其他管理员密码', 401);
        }

        // 使用新版本修改密码（SHA256加密）
        await db.changePasswordV2(targetUsername!, targetPassword);
        break;
      }
      case 'deleteUser': {
        if (!targetEntry) {
          return apiError('目标用户不存在', 404);
        }

        // 权限检查：站长可删除所有用户（除了自己），管理员可删除普通用户
        if (username === targetUsername) {
          return apiError('不能删除自己', 400);
        }

        if (isTargetAdmin && operatorRole !== 'owner') {
          return apiError('仅站长可删除管理员', 401);
        }

        // 只删除V2存储中的用户
        await db.deleteUserV2(targetUsername!);

        break;
      }
      case 'updateUserApis': {
        if (!targetEntry) {
          return apiError('目标用户不存在', 404);
        }

        const { enabledApis } = body as { enabledApis?: string[] };

        // 权限检查：站长可配置所有人的采集源，管理员可配置普通用户和自己的采集源
        if (
          isTargetAdmin &&
          operatorRole !== 'owner' &&
          username !== targetUsername
        ) {
          return apiError('仅站长可配置其他管理员的采集源', 401);
        }

        // 更新V2存储中的采集源权限
        await db.updateUserInfoV2(targetUsername!, {
          enabledApis: enabledApis && enabledApis.length > 0 ? enabledApis : [],
        });

        break;
      }
      case 'userGroup': {
        // 用户组管理操作
        const { groupAction, groupName, enabledApis } = body as {
          groupAction: 'add' | 'edit' | 'delete';
          groupName: string;
          enabledApis?: string[];
        };

        if (!adminConfig.UserConfig.Tags) {
          adminConfig.UserConfig.Tags = [];
        }

        switch (groupAction) {
          case 'add': {
            // 检查用户组是否已存在
            if (adminConfig.UserConfig.Tags.find((t) => t.name === groupName)) {
              return apiError('用户组已存在', 400);
            }
            adminConfig.UserConfig.Tags.push({
              name: groupName,
              enabledApis: enabledApis || [],
            });
            break;
          }
          case 'edit': {
            const groupIndex = adminConfig.UserConfig.Tags.findIndex(
              (t) => t.name === groupName,
            );
            if (groupIndex === -1) {
              return apiError('用户组不存在', 404);
            }
            adminConfig.UserConfig.Tags[groupIndex].enabledApis =
              enabledApis || [];
            break;
          }
          case 'delete': {
            const groupIndex = adminConfig.UserConfig.Tags.findIndex(
              (t) => t.name === groupName,
            );
            if (groupIndex === -1) {
              return apiError('用户组不存在', 404);
            }

            // 查找使用该用户组的所有用户（从V2存储中查找）
            const affectedUsers = await db.getUsersByTag(groupName);

            // 从用户的tags中移除该用户组
            for (const username of affectedUsers) {
              const userInfo = await db.getUserInfoV2(username);
              if (userInfo && userInfo.tags) {
                const newTags = userInfo.tags.filter(
                  (tag) => tag !== groupName,
                );
                await db.updateUserInfoV2(username, { tags: newTags });
              }
            }

            // 删除用户组
            adminConfig.UserConfig.Tags.splice(groupIndex, 1);

            // 记录删除操作的影响
            logger.info(
              `删除用户组 "${groupName}"，影响用户: ${affectedUsers.length > 0 ? affectedUsers.join(', ') : '无'}`,
            );

            break;
          }
          default:
            return apiError('未知的用户组操作', 400);
        }
        break;
      }
      case 'updateUserGroups': {
        if (!targetEntry) {
          return apiError('目标用户不存在', 404);
        }

        const { userGroups } = body as { userGroups: string[] };

        // 权限检查：站长可配置所有人的用户组，管理员可配置普通用户和自己的用户组
        if (
          isTargetAdmin &&
          operatorRole !== 'owner' &&
          username !== targetUsername
        ) {
          return apiError('仅站长可配置其他管理员的用户组', 400);
        }

        // 更新用户的用户组
        if (userGroups && userGroups.length > 0) {
          // 只更新V2存储
          await db.updateUserInfoV2(targetUsername!, { tags: userGroups });
        } else {
          // 如果为空数组或未提供，则删除该字段，表示无用户组
          await db.updateUserInfoV2(targetUsername!, { tags: [] });
        }

        break;
      }
      case 'batchUpdateUserGroups': {
        const { usernames, userGroups } = body as {
          usernames: string[];
          userGroups: string[];
        };

        if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
          return apiError('缺少用户名列表', 400);
        }

        // 权限检查：站长可批量配置所有人的用户组，管理员只能批量配置普通用户
        if (operatorRole !== 'owner') {
          for (const targetUsername of usernames) {
            // 从V2存储中查找用户
            const userV2 = await db.getUserInfoV2(targetUsername);
            if (
              userV2 &&
              userV2.role === 'admin' &&
              targetUsername !== username
            ) {
              return apiError(`管理员无法操作其他管理员 ${targetUsername}`, 400);
            }
          }
        }

        // 批量更新用户组
        for (const targetUsername of usernames) {
          // 只更新V2存储
          if (userGroups && userGroups.length > 0) {
            await db.updateUserInfoV2(targetUsername, { tags: userGroups });
          } else {
            await db.updateUserInfoV2(targetUsername, { tags: [] });
          }
        }

        break;
      }
      default:
        return apiError('未知操作', 400);
    }

    // 将更新后的配置写入数据库
    await db.saveAdminConfig(adminConfig);

    return apiSuccess({ ok: true }, {
        headers: {
          'Cache-Control': 'no-store', // 管理员配置不缓存
        },
      });
  } catch (error) {
    logger.error('用户管理操作失败:', error);
    return apiError('用户管理操作失败', 500);
  }
}
