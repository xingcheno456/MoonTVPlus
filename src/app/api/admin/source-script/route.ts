/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';
import { validateAdminAuth } from '@/lib/api-validation';
import { STORAGE_TYPE } from '@/lib/db';
import {
  deleteSourceScript,
  getDefaultSourceScriptTemplate,
  importSourceScripts,
  listSourceScripts,
  saveSourceScript,
  testSourceScript,
  toggleSourceScriptEnabled,
} from '@/lib/source-script';

export const runtime = 'nodejs';

function assertAdmin(request: NextRequest) {
  if (STORAGE_TYPE === 'localstorage') {
    throw new Error('不支持本地存储进行管理员配置');
  }
  const result = validateAdminAuth(request);
  if ('status' in result) return null;
  return result.username;
}

export async function GET(request: NextRequest) {
  try {
    const username = await assertAdmin(request);
    if (!username) {
      return apiError('Unauthorized', 401);
    }

    const items = await listSourceScripts();
    return apiSuccess({
        items,
        template: getDefaultSourceScriptTemplate(),
      }, {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
  } catch (_error) {
    return apiError('获取脚本列表失败', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const username = await assertAdmin(request);
    if (!username) {
      return apiError('Unauthorized', 401);
    }

    const body = (await request.json()) as Record<string, any>;
    const action = body.action as string;

    switch (action) {
      case 'save': {
        const saved = await saveSourceScript({
          id: body.id,
          key: body.key,
          name: body.name,
          description: body.description,
          code: body.code,
          enabled: body.enabled,
        });
        return apiSuccess({ ok: true, item: saved }, {
            headers: {
              'Cache-Control': 'no-store',
            },
          });
      }
      case 'delete': {
        await deleteSourceScript(body.id);
        return apiSuccess({ ok: true }, {
            headers: {
              'Cache-Control': 'no-store',
            },
          });
      }
      case 'toggle_enabled': {
        const item = await toggleSourceScriptEnabled(body.id);
        return apiSuccess({ ok: true, item }, {
            headers: {
              'Cache-Control': 'no-store',
            },
          });
      }
      case 'test': {
        const result = await testSourceScript({
          code: body.code,
          hook: body.hook,
          payload: body.payload || {},
          name: body.name,
          key: body.key,
          configValues: body.configValues,
        });

        if (!result.ok) {
          return apiError(result.error || '操作失败', 400);
        }

        return apiSuccess(result, {
          headers: {
            'Cache-Control': 'no-store',
          },
        });
      }
      case 'import': {
        const imported = await importSourceScripts(
          Array.isArray(body.items) ? body.items : [],
        );
        return apiSuccess({ ok: true, items: imported }, {
            headers: {
              'Cache-Control': 'no-store',
            },
          });
      }
      default:
        return apiError('未知操作', 400);
    }
  } catch (error) {
    return apiSuccess({
        error: (error as Error).message || '脚本操作失败',
      }, { status: 500 });
  }
}
