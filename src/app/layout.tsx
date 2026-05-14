
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

import { getConfig } from '@/lib/config';
import { getRuntimeConfig } from '@/lib/runtime-config';

import { StartupCacheCleanup } from '../components/danmaku/DanmakuCacheCleanup';
import { DownloadBubble } from '../components/player/DownloadBubble';
import { DownloadPanel } from '../components/player/DownloadPanel';
import { GlobalErrorIndicator } from '../components/common/GlobalErrorIndicator';
import RouteScrollReset from '../components/layout/RouteScrollReset';
import { SiteProvider } from '../components/SiteProvider';
import { ThemeProvider } from '../components/ThemeProvider';
import { TokenRefreshManager } from '../components/TokenRefreshManager';
import TopProgressBar from '../components/layout/TopProgressBar';
import { DownloadProvider } from '../contexts/DownloadContext';

const inter = Inter({ subsets: ['latin'] });
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  const config = await getConfig();
  let siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'MoonTVPlus';
  if (storageType !== 'localstorage') {
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

function safeJsonStringify(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\//g, '\\u002f');
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';

  let siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'MoonTVPlus';
  let announcement =
    process.env.ANNOUNCEMENT ||
    '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。';

  if (storageType !== 'localstorage') {
    const config = await getConfig();
    siteName = config.SiteConfig.SiteName;
    announcement = config.SiteConfig.Announcement;
  }

  const runtimeConfig = await getRuntimeConfig();
  const configJson = safeJsonStringify(runtimeConfig);

  return (
    <html lang='zh-CN' suppressHydrationWarning>
      <head>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1.0, viewport-fit=cover'
        />
        <link rel='apple-touch-icon' href='/icons/icon-192x192.png' />
        <link rel='stylesheet' href='/api/theme/css' />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.RUNTIME_CONFIG=${configJson};`,
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
            siteName={siteName}
            announcement={announcement}
          >
            <DownloadProvider>
              <StartupCacheCleanup />
              {children}
              <GlobalErrorIndicator />
              <DownloadBubble />
              <DownloadPanel />
            </DownloadProvider>
          </SiteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
