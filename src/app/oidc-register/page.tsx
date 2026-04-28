'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { CURRENT_VERSION } from '@/lib/version';

import { useSite } from '@/components/SiteProvider';
import { ThemeToggle } from '@/components/ThemeToggle';

import { logger } from '../../lib/logger';

function OIDCRegisterPageClient() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oidcInfo, setOidcInfo] = useState<any>(null);

  const { siteName } = useSite();

  // 检查OIDC session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/oidc/session-info');
        if (res.ok) {
          const _apiRes_data = await res.json(); const data = _apiRes_data.success === true ? _apiRes_data.data : _apiRes_data;
          setOidcInfo(data);
        } else {
          // session无效,跳转到登录页
          router.replace(
            '/login?error=' + encodeURIComponent('OIDC会话已过期'),
          );
        }
      } catch (error) {
        logger.error('检查session失败:', error);
        router.replace('/login');
      }
    };

    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!username) {
      setError('请输入用户名');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/oidc/complete-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (res.ok) {
        // 注册成功,跳转到首页
        router.replace('/');
      } else {
        const _apiRes_data = await res.json().catch(() => ({})); const data = _apiRes_data.success === true ? _apiRes_data.data : _apiRes_data;
        setError(data.error || '注册失败');
      }
    } catch (error) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!oidcInfo) {
    return (
      <div className='relative flex min-h-screen items-center justify-center px-4'>
        <div className='text-gray-500 dark:text-gray-400'>加载中...</div>
      </div>
    );
  }

  return (
    <div className='relative flex min-h-screen items-center justify-center overflow-hidden px-4'>
      <div className='absolute right-4 top-4'>
        <ThemeToggle />
      </div>
      <div className='relative z-10 w-full max-w-md rounded-3xl bg-gradient-to-b from-white/90 via-white/70 to-white/40 p-10 shadow-2xl backdrop-blur-xl dark:border dark:border-zinc-800 dark:from-zinc-900/90 dark:via-zinc-900/70 dark:to-zinc-900/40'>
        <h1 className='mb-2 bg-clip-text text-center text-3xl font-extrabold tracking-tight text-green-600 drop-shadow-sm'>
          {siteName}
        </h1>
        <p className='mb-8 text-center text-sm text-gray-600 dark:text-gray-400'>
          完成OIDC注册
        </p>

        {/* OIDC信息显示 */}
        {oidcInfo && (
          <div className='mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20'>
            <p className='text-sm text-blue-700 dark:text-blue-400'>
              {oidcInfo.email && (
                <>
                  邮箱: <strong>{oidcInfo.email}</strong>
                  <br />
                </>
              )}
              {oidcInfo.name && (
                <>
                  名称: <strong>{oidcInfo.name}</strong>
                  <br />
                </>
              )}
              {oidcInfo.trust_level !== undefined && (
                <>
                  信任等级: <strong>{oidcInfo.trust_level}</strong>
                </>
              )}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-6'>
          <div>
            <label
              htmlFor='username'
              className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'
            >
              选择用户名
            </label>
            <input
              id='username'
              type='text'
              autoComplete='username'
              className='block w-full rounded-lg border-0 bg-white/60 px-4 py-3 text-gray-900 shadow-sm ring-1 ring-white/60 backdrop-blur placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-zinc-800/60 dark:text-gray-100 dark:ring-white/20 dark:placeholder:text-gray-400 sm:text-base'
              placeholder='输入用户名（3-20位字母、数字、下划线）'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              用户名只能包含字母、数字、下划线，长度3-20位
            </p>
          </div>

          {error && (
            <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
          )}

          <button
            type='submit'
            disabled={!username || loading}
            className='inline-flex w-full justify-center rounded-lg bg-green-600 py-3 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:from-green-600 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {loading ? '注册中...' : '完成注册'}
          </button>

          {/* 返回登录链接 */}
          <div className='text-center'>
            <button
              type='button'
              onClick={() => router.push('/login')}
              className='text-sm text-green-600 transition-colors hover:text-green-700 dark:text-green-400 dark:hover:text-green-300'
            >
              返回登录
            </button>
          </div>
        </form>
      </div>

      {/* 版本信息 */}
      <div className='absolute bottom-4 left-1/2 -translate-x-1/2 transform text-xs text-gray-500 dark:text-gray-400'>
        <span className='font-mono'>v{CURRENT_VERSION}</span>
      </div>
    </div>
  );
}

export default function OIDCRegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OIDCRegisterPageClient />
    </Suspense>
  );
}
