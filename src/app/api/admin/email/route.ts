import { NextRequest } from 'next/server';

import type { AdminConfig } from '@/lib/admin.types';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { getStorage } from '@/lib/db';
import { EmailService } from '@/lib/email.service';

import { logger } from '../../../../lib/logger';

export const runtime = 'nodejs';

/**
 * GET - 获取邮件配置
 */
export async function GET(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }

  try {
    const storage = getStorage();
    const userInfo = await storage.getUserInfoV2?.(authInfo.username);

    // 只有管理员和站长可以访问
    if (!userInfo || (userInfo.role !== 'admin' && userInfo.role !== 'owner')) {
      return apiError('Forbidden', 403);
    }

    const adminConfig = await getConfig();
    const emailConfig = adminConfig?.EmailConfig || {
      enabled: false,
      provider: 'smtp' as const,
    };

    // 不返回敏感信息（密码、API Key）
    const safeConfig = {
      enabled: emailConfig.enabled,
      provider: emailConfig.provider,
      smtp: emailConfig.smtp
        ? {
            host: emailConfig.smtp.host,
            port: emailConfig.smtp.port,
            secure: emailConfig.smtp.secure,
            user: emailConfig.smtp.user,
            from: emailConfig.smtp.from,
            password: emailConfig.smtp.password ? '******' : '',
          }
        : undefined,
      resend: emailConfig.resend
        ? {
            from: emailConfig.resend.from,
            apiKey: emailConfig.resend.apiKey ? '******' : '',
          }
        : undefined,
    };

    return apiSuccess(safeConfig);
  } catch (error) {
    logger.error('获取邮件配置失败:', error);
    return apiError('获取邮件配置失败: ' + (error as Error).message, 500);
  }
}

/**
 * POST - 保存邮件配置或发送测试邮件
 */
export async function POST(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return apiError('Unauthorized', 401);
  }

  try {
    const storage = getStorage();
    const userInfo = await storage.getUserInfoV2?.(authInfo.username);

    // 只有管理员和站长可以访问
    if (!userInfo || (userInfo.role !== 'admin' && userInfo.role !== 'owner')) {
      return apiError('Forbidden', 403);
    }

    const body = await request.json();
    const { action, config, testEmail } = body;

    // 发送测试邮件
    if (action === 'test') {
      if (!testEmail) {
        return apiError('请提供测试邮箱地址', 400);
      }

      const emailConfig = config as AdminConfig['EmailConfig'];
      if (!emailConfig || !emailConfig.enabled) {
        return apiError('邮件配置未启用', 400);
      }

      try {
        const adminConfig = await getConfig();
        const siteName = adminConfig?.SiteConfig?.SiteName || 'MoonTVPlus';
        await EmailService.sendTestEmail(emailConfig, testEmail, siteName);
        return apiSuccess({ message: '测试邮件发送成功', });
      } catch (error) {
        logger.error('发送测试邮件失败:', error);
        return apiError(`发送失败: ${(error as Error).message}`, 500);
      }
    }

    // 保存邮件配置
    if (action === 'save') {
      const emailConfig = config as AdminConfig['EmailConfig'];
      if (!emailConfig) {
        return apiError('邮件配置不能为空', 400);
      }

      // 验证配置
      if (emailConfig.enabled) {
        if (emailConfig.provider === 'smtp') {
          if (
            !emailConfig.smtp?.host ||
            !emailConfig.smtp?.port ||
            !emailConfig.smtp?.user ||
            !emailConfig.smtp?.from
          ) {
            return apiError('SMTP配置不完整', 400);
          }
        } else if (emailConfig.provider === 'resend') {
          if (!emailConfig.resend?.apiKey || !emailConfig.resend?.from) {
            return apiError('Resend配置不完整', 400);
          }
        }
      }

      // 获取现有配置
      const adminConfig = await getConfig();
      if (!adminConfig) {
        return apiError('管理员配置不存在', 500);
      }

      // 如果密码或API Key是占位符，保留原有值
      if (emailConfig.smtp?.password === '******') {
        const oldConfig = adminConfig.EmailConfig;
        if (oldConfig?.smtp?.password) {
          emailConfig.smtp.password = oldConfig.smtp.password;
        }
      }

      if (emailConfig.resend?.apiKey === '******') {
        const oldConfig = adminConfig.EmailConfig;
        if (oldConfig?.resend?.apiKey) {
          emailConfig.resend.apiKey = oldConfig.resend.apiKey;
        }
      }

      // 更新配置
      adminConfig.EmailConfig = emailConfig;
      await storage.setAdminConfig(adminConfig);

      return apiSuccess({ message: '邮件配置保存成功' });
    }

    return apiError('无效的操作', 400);
  } catch (error) {
    logger.error('处理邮件配置失败:', error);
    return apiError((error as Error).message, 500);
  }
}
