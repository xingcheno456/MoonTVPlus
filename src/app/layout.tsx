 

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

import { getRuntimeConfig } from '@/lib/config/runtime-config';

import { StartupCacheCleanup } from '../components/DanmakuCacheCleanup';
import { DownloadBubble } from '../components/DownloadBubble';
import { DownloadPanel } from '../components/DownloadPanel';
import { GlobalErrorIndicator } from '../components/GlobalErrorIndicator';
import RouteScrollReset from '../components/RouteScrollReset';
import { SiteProvider } from '../components/SiteProvider';
import { ThemeProvider } from '../components/ThemeProvider';
import { TokenRefreshManager } from '../components/TokenRefreshManager';
import TopProgressBar from '../components/TopProgressBar';
import ChatFloatingWindow from '../components/watch-room/ChatFloatingWindow';
import { WatchRoomProvider } from '../components/WatchRoomProvider';
import { DownloadProvider } from '../contexts/DownloadContext';

const inter = Inter({ subsets: ['latin'] });
export const dynamic = 'force-dynamic';

// 动态生成 metadata，支持配置更新后的标题变化
export async function generateMetadata(): Promise<Metadata> {
  const { getConfig } = await import('@/lib/config');
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  let siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'MoonTVPlus';
  if (storageType !== 'localstorage') {
    const config = await getConfig();
    siteName = config.SiteConfig.SiteName;
  }

  return {
    title: siteName,
    description: '影视聚合',
    manifest: '/manifest.json',
  };
}

export const viewport: Viewport = {
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const runtimeConfig = await getRuntimeConfig();

  return (
    <html lang='zh-CN' suppressHydrationWarning>
      <head>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1.0, viewport-fit=cover'
        />
        <link rel='apple-touch-icon' href='/icons/icon-192x192.png' />
        {/* 主题CSS */}
        <link rel='stylesheet' href='/api/theme/css' />
        <meta
          name='runtime-config'
          content={Buffer.from(JSON.stringify(runtimeConfig)).toString('base64')}
        />
        <script
          dangerouslySetInnerHTML={{
// SECURITY: 对 runtimeConfig 的值进行 HTML 转义，防止 XSS
            __html: `window.RUNTIME_CONFIG = ${JSON.stringify(runtimeConfig).replace(
              /</g, '\\u003c'
            ).replace(
              />/g, '\\u003e'
            ).replace(
              /\//g, '\\u002f'
            )};`,
          }}
        />
      </head>
      <body
        className={`${inter.className} min-h-screen bg-white text-gray-900 dark:bg-black dark:text-gray-200`}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <TopProgressBar />
          <RouteScrollReset />
          <TokenRefreshManager />
          <SiteProvider
            siteName={runtimeConfig.SITE_NAME}
            announcement={runtimeConfig.ANNOUNCEMENT}
            tmdbApiKey={runtimeConfig.TMDB_API_KEY}
          >
            <WatchRoomProvider>
              <DownloadProvider>
                <StartupCacheCleanup />
                {children}
                <GlobalErrorIndicator />
                <ChatFloatingWindow />
                <DownloadBubble />
                <DownloadPanel />
              </DownloadProvider>
            </WatchRoomProvider>
          </SiteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
