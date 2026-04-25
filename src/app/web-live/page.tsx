'use client';

import { AlertTriangle, Radio } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useWebLiveSync } from '@/hooks/useWebLiveSync';

import PageLayout from '@/components/PageLayout';
import { useWatchRoomContextSafe } from '@/components/WatchRoomProvider';

let Artplayer: any = null;
let Hls: any = null;
let flvjs: any = null;

export default function WebLivePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const artRef = useRef<HTMLDivElement | null>(null);
  const artPlayerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<
    'loading' | 'fetching' | 'ready'
  >('loading');
  const [loadingMessage, setLoadingMessage] = useState('正在加载直播源...');
  const [sources, setSources] = useState<any[]>([]);
  const [currentSource, setCurrentSource] = useState<any | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [originalVideoUrl, setOriginalVideoUrl] = useState('');
  const [streamInfo, setStreamInfo] = useState<{
    name?: string;
    title?: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'rooms' | 'platforms'>('rooms');
  const [isChannelListCollapsed, setIsChannelListCollapsed] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isWebLiveEnabled, setIsWebLiveEnabled] = useState<boolean | null>(
    null,
  );
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  const hasAutoLoadedRef = useRef(false); // 防止重复自动加载

  // 观影室同步功能
  const webLiveSync = useWebLiveSync({
    currentSourceKey: currentSource?.key || '',
    currentSourceName: currentSource?.name || '',
    currentSourcePlatform: currentSource?.platform || '',
    currentSourceRoomId: currentSource?.roomId || '',
    onSourceChange: (sourceKey, platform, roomId) => {
      // 房员接收到直播源切换指令
      if (!sources || !Array.isArray(sources)) return;
      const source = sources.find((s) => s.key === sourceKey);
      if (source) {
        handleSourceClick(source);
      }
    },
  });

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);

    if (typeof window !== 'undefined') {
      // 异步加载所有必需的库
      Promise.all([
        import('artplayer').then((mod) => {
          Artplayer = mod.default;
        }),
        import('hls.js').then((mod) => {
          Hls = mod.default;
        }),
        import('flv.js').then((mod) => {
          flvjs = mod.default;
        }),
      ]).then(() => {
        setLibrariesLoaded(true);
      });

      // 检查网络直播功能是否启用
      const runtimeConfig = (window as any).RUNTIME_CONFIG;
      const enabled = runtimeConfig?.WEB_LIVE_ENABLED ?? false;
      setIsWebLiveEnabled(enabled);

      if (enabled) {
        fetchSources();
      } else {
        setLoading(false);
      }
    }

    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  const fetchSources = async () => {
    try {
      setLoading(true);
      setLoadingStage('loading');
      setLoadingMessage('正在加载直播源...');
      const res = await fetch('/api/web-live/sources');
      if (res.ok) {
        setLoadingStage('fetching');
        const data = await res.json();
        setSources(data);
        setLoadingStage('ready');
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error('获取直播源失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 当 sources 加载完成后，检查 URL 参数并自动加载对应的频道
  useEffect(() => {
    if (!sources || sources.length === 0) return;
    if (!librariesLoaded) return; // 等待库加载完成

    // 直接从 searchParams 读取，而不是从 useState
    const needLoadPlatform = searchParams.get('platform');
    const needLoadRoomId = searchParams.get('roomId');

    if (!needLoadPlatform || !needLoadRoomId) {
      hasAutoLoadedRef.current = false; // 重置标志
      return;
    }

    // 检查是否已经加载了这个频道
    if (
      currentSource?.platform === needLoadPlatform &&
      currentSource?.roomId === needLoadRoomId
    ) {
      return;
    }

    // 防止重复加载
    if (hasAutoLoadedRef.current) {
      return;
    }

    hasAutoLoadedRef.current = true;

    // 查找匹配的 source
    const foundSource = sources.find(
      (s) => s.platform === needLoadPlatform && s.roomId === needLoadRoomId,
    );
    if (foundSource) {
      handleSourceClick(foundSource);
    } else {
      hasAutoLoadedRef.current = false; // 重置标志以便重试
    }
  }, [sources, librariesLoaded, searchParams]);

  function m3u8Loader(video: HTMLVideoElement, url: string) {
    if (!Hls) return;
    const hls = new Hls({
      debug: false,
      enableWorker: true,
      lowLatencyMode: true,
    });
    hls.loadSource(url);
    hls.attachMedia(video);
    (video as any).hls = hls;
  }

  function flvLoader(video: HTMLVideoElement, url: string) {
    if (!flvjs) return;
    const flvPlayer = flvjs.createPlayer({ type: 'flv', url, isLive: true });
    flvPlayer.attachMediaElement(video);
    flvPlayer.on(
      flvjs.Events.ERROR,
      (errorType: string, errorDetail: string) => {
        console.error('FLV.js error:', errorType, errorDetail);
        setErrorMessage(`播放失败: ${errorType} - ${errorDetail}`);
        setVideoUrl('');
      },
    );
    flvPlayer.load();
    (video as any).flv = flvPlayer;
  }

  // 清理播放器资源的统一函数
  const cleanupPlayer = () => {
    if (artPlayerRef.current) {
      try {
        // 先暂停播放
        if (artPlayerRef.current.video) {
          artPlayerRef.current.video.pause();
          artPlayerRef.current.video.src = '';
          artPlayerRef.current.video.load();
        }

        // 销毁 HLS 实例
        if (artPlayerRef.current.video && artPlayerRef.current.video.hls) {
          artPlayerRef.current.video.hls.destroy();
          artPlayerRef.current.video.hls = null;
        }

        // 销毁 FLV 实例
        if (
          artPlayerRef.current.video &&
          (artPlayerRef.current.video as any).flv
        ) {
          try {
            if ((artPlayerRef.current.video as any).flv.unload) {
              (artPlayerRef.current.video as any).flv.unload();
            }
            (artPlayerRef.current.video as any).flv.destroy();
            (artPlayerRef.current.video as any).flv = null;
          } catch (flvError) {
            console.warn('FLV实例销毁时出错:', flvError);
            (artPlayerRef.current.video as any).flv = null;
          }
        }

        // 移除所有事件监听器
        artPlayerRef.current.off('ready');
        artPlayerRef.current.off('error');

        // 销毁 ArtPlayer 实例
        artPlayerRef.current.destroy();
        artPlayerRef.current = null;
      } catch (err) {
        console.warn('清理播放器资源时出错:', err);
        artPlayerRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (!Artplayer || !Hls || !flvjs || !videoUrl || !artRef.current) return;

    // 销毁旧的播放器实例
    cleanupPlayer();

    artPlayerRef.current = new Artplayer({
      container: artRef.current,
      url: videoUrl,
      isLive: true,
      autoplay: true,
      fullscreen: true,
      customType: {
        m3u8: m3u8Loader,
        flv: flvLoader,
      },
      icons: {
        loading:
          '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 100 100"><circle cx="50" cy="50" fill="none" stroke="currentColor" stroke-width="4" r="35" stroke-dasharray="164.93361431346415 56.97787143782138"><animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 50 50;360 50 50" keyTimes="0;1"/></circle></svg>',
      },
    });

    return () => {
      cleanupPlayer();
    };
  }, [videoUrl]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanupPlayer();
    };
  }, []);

  // 页面卸载前清理
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupPlayer();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanupPlayer();
    };
  }, []);

  const handleSourceClick = async (source: any) => {
    // 立即清理旧的播放器
    cleanupPlayer();

    setCurrentSource(source);
    setIsVideoLoading(true);
    setErrorMessage(null);
    setStreamInfo(null);

    // 更新 URL 参数
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set('platform', source.platform);
    newSearchParams.set('roomId', source.roomId);
    router.replace(`/web-live?${newSearchParams.toString()}`);

    try {
      const res = await fetch(
        `/api/web-live/stream?platform=${source.platform}&roomId=${source.roomId}`,
      );
      if (res.ok) {
        const data = await res.json();

        // 等待 DOM 渲染完成后再设置 videoUrl
        const waitForDom = () => {
          if (artRef.current) {
            setVideoUrl(data.url);
            setOriginalVideoUrl(data.originalUrl || data.url);
          } else {
            requestAnimationFrame(waitForDom);
          }
        };

        // 使用 requestAnimationFrame 等待下一帧
        requestAnimationFrame(waitForDom);

        // 保存主播信息
        if (data.name || data.title) {
          setStreamInfo({
            name: data.name,
            title: data.title,
          });
        }
      } else {
        const data = await res.json();
        setErrorMessage(data.error || '获取直播流失败');
      }
    } catch (err) {
      console.error('获取直播流失败:', err);
      setErrorMessage(err instanceof Error ? err.message : '获取直播流失败');
    } finally {
      setIsVideoLoading(false);
    }
  };

  const getRoomUrl = (source: any) => {
    if (source.platform === 'huya') {
      return `https://huya.com/${source.roomId}`;
    }
    if (source.platform === 'bilibili') {
      return `https://live.bilibili.com/${source.roomId}`;
    }
    if (source.platform === 'douyin') {
      return `https://live.douyin.com/${source.roomId}`;
    }
    return '';
  };

  const platforms = Array.from(new Set(sources.map((s) => s.platform)));

  // 根据选中的平台筛选房间
  const filteredSources = selectedPlatform
    ? sources.filter((s) => s.platform === selectedPlatform)
    : sources;

  // 处理平台点击
  const handlePlatformClick = (platform: string) => {
    setSelectedPlatform(platform);
    setActiveTab('rooms');
  };

  // 清除平台筛选
  const clearPlatformFilter = () => {
    setSelectedPlatform(null);
  };

  // 如果功能未启用，显示提示
  if (isWebLiveEnabled === false) {
    return (
      <PageLayout activePath='/web-live'>
        <div className='flex min-h-screen items-center justify-center bg-transparent'>
          <div className='mx-auto max-w-md px-6 text-center'>
            <div className='relative mb-8'>
              <div className='relative mx-auto flex h-24 w-24 transform items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 shadow-2xl transition-transform duration-300 hover:scale-105'>
                <AlertTriangle className='h-12 w-12 text-white' />
                <div className='absolute -inset-2 animate-pulse rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 opacity-20'></div>
              </div>
            </div>

            <div className='space-y-4'>
              <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                功能未启用
              </h3>
              <div className='rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20'>
                <p className='text-sm leading-relaxed text-gray-700 dark:text-gray-300'>
                  网络直播功能当前未启用。请联系管理员在管理面板中开启此功能。
                </p>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout activePath='/web-live'>
        <div className='flex min-h-screen items-center justify-center bg-transparent'>
          <div className='mx-auto max-w-md px-6 text-center'>
            {/* 动画直播图标 */}
            <div className='relative mb-8'>
              <div className='relative mx-auto flex h-24 w-24 transform items-center justify-center rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 shadow-2xl transition-transform duration-300 hover:scale-105'>
                <div className='text-4xl text-white'>📺</div>
                {/* 旋转光环 */}
                <div className='absolute -inset-2 animate-spin rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 opacity-20'></div>
              </div>

              {/* 浮动粒子效果 */}
              <div className='pointer-events-none absolute left-0 top-0 h-full w-full'>
                <div className='absolute left-2 top-2 h-2 w-2 animate-bounce rounded-full bg-green-400'></div>
                <div
                  className='absolute right-4 top-4 h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400'
                  style={{ animationDelay: '0.5s' }}
                ></div>
                <div
                  className='absolute bottom-3 left-6 h-1 w-1 animate-bounce rounded-full bg-lime-400'
                  style={{ animationDelay: '1s' }}
                ></div>
              </div>
            </div>

            {/* 进度指示器 */}
            <div className='mx-auto mb-6 w-80'>
              <div className='mb-4 flex justify-center space-x-2'>
                <div
                  className={`h-3 w-3 rounded-full transition-all duration-500 ${loadingStage === 'loading' ? 'scale-125 bg-green-500' : 'bg-green-500'}`}
                ></div>
                <div
                  className={`h-3 w-3 rounded-full transition-all duration-500 ${loadingStage === 'fetching' ? 'scale-125 bg-green-500' : 'bg-green-500'}`}
                ></div>
                <div
                  className={`h-3 w-3 rounded-full transition-all duration-500 ${loadingStage === 'ready' ? 'scale-125 bg-green-500' : 'bg-gray-300'}`}
                ></div>
              </div>

              {/* 进度条 */}
              <div className='h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700'>
                <div
                  className='h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-1000 ease-out'
                  style={{
                    width:
                      loadingStage === 'loading'
                        ? '33%'
                        : loadingStage === 'fetching'
                          ? '66%'
                          : '100%',
                  }}
                ></div>
              </div>
            </div>

            {/* 加载消息 */}
            <div className='space-y-2'>
              <p className='animate-pulse text-xl font-semibold text-gray-800 dark:text-gray-200'>
                {loadingMessage}
              </p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePath='/web-live'>
      <div className='flex flex-col gap-3 px-5 py-4 lg:px-[3rem] 2xl:px-20'>
        <div className='py-1'>
          <h1 className='flex max-w-[80%] items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100'>
            <Radio className='h-5 w-5 flex-shrink-0 text-blue-500' />
            <div className='min-w-0 flex-1'>
              <div className='truncate'>
                {currentSource?.name || '网络直播'}
              </div>
            </div>
          </h1>
        </div>

        <div className='space-y-2'>
          <div className='hidden justify-end lg:flex'>
            <button
              onClick={() => setIsChannelListCollapsed(!isChannelListCollapsed)}
              className='group relative flex items-center space-x-1.5 rounded-full border border-gray-200/50 bg-white/80 px-3 py-1.5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:border-gray-700/50 dark:bg-gray-800/80 dark:hover:bg-gray-800'
            >
              <svg
                className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${isChannelListCollapsed ? 'rotate-180' : 'rotate-0'}`}
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M9 5l7 7-7 7'
                />
              </svg>
              <span className='text-xs font-medium text-gray-600 dark:text-gray-300'>
                {isChannelListCollapsed ? '显示' : '隐藏'}
              </span>
              <div
                className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full transition-all duration-200 ${isChannelListCollapsed ? 'animate-pulse bg-orange-400' : 'bg-green-400'}`}
              ></div>
            </button>
          </div>

          <div
            className={`grid gap-4 transition-all duration-300 ease-in-out lg:h-[500px] xl:h-[650px] 2xl:h-[750px] ${isChannelListCollapsed ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-4'}`}
          >
            <div
              className={`h-full transition-all duration-300 ease-in-out ${isChannelListCollapsed ? 'col-span-1' : 'md:col-span-3'}`}
            >
              <div className='relative h-[300px] w-full lg:h-full'>
                <div
                  ref={artRef}
                  className='h-full w-full overflow-hidden rounded-xl border border-white/0 bg-black shadow-lg dark:border-white/30'
                ></div>

                {errorMessage && (
                  <div className='absolute inset-0 z-[600] flex items-center justify-center overflow-hidden rounded-xl border border-white/0 bg-black/90 shadow-lg backdrop-blur-sm transition-all duration-300 dark:border-white/30'>
                    <div className='mx-auto max-w-md px-6 text-center'>
                      <div className='relative mb-8'>
                        <div className='relative mx-auto flex h-24 w-24 transform items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 shadow-2xl transition-transform duration-300 hover:scale-105'>
                          <div className='text-4xl text-white'>⚠️</div>
                          <div className='absolute -inset-2 animate-pulse rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 opacity-20'></div>
                        </div>
                      </div>
                      <div className='space-y-4'>
                        <h3 className='text-xl font-semibold text-white'>
                          获取直播流失败
                        </h3>
                        <div className='rounded-lg border border-orange-500/30 bg-orange-500/20 p-4'>
                          <p className='font-medium text-orange-300'>
                            {errorMessage}
                          </p>
                        </div>
                        <p className='text-sm text-gray-300'>请尝试其他房间</p>
                      </div>
                    </div>
                  </div>
                )}

                {isVideoLoading && (
                  <div className='absolute inset-0 z-[500] flex items-center justify-center overflow-hidden rounded-xl border border-white/0 bg-black/85 shadow-lg backdrop-blur-sm transition-all duration-300 dark:border-white/30'>
                    <div className='mx-auto max-w-md px-6 text-center'>
                      <div className='relative mb-8'>
                        <div className='relative mx-auto flex h-24 w-24 transform items-center justify-center rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 shadow-2xl transition-transform duration-300 hover:scale-105'>
                          <div className='text-4xl text-white'>📺</div>
                          <div className='absolute -inset-2 animate-spin rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 opacity-20'></div>
                        </div>
                      </div>
                      <div className='space-y-2'>
                        <p className='animate-pulse text-xl font-semibold text-white'>
                          🔄 加载中...
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 外部播放器按钮 */}
              {currentSource && !webLiveSync.isInRoom && (
                <div className='mt-3 flex justify-end px-2 lg:flex-shrink-0'>
                  <div className='w-full overflow-x-auto rounded-lg border border-gray-200/50 bg-white/50 p-2 backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-800/50 lg:w-auto'>
                    <div className='flex items-center justify-end gap-1.5 lg:flex-wrap'>
                      {/* 网页播放 */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const roomUrl = getRoomUrl(currentSource);
                          if (roomUrl) {
                            window.open(roomUrl, '_blank');
                          }
                        }}
                        className='group relative flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-md border border-gray-300 bg-white text-xs font-medium shadow-sm transition-all duration-200 hover:bg-gray-100 hover:shadow-md dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 lg:h-auto lg:w-auto lg:px-2 lg:py-1.5'
                        title='网页播放'
                      >
                        <svg
                          className='h-4 w-4 flex-shrink-0 text-gray-700 dark:text-gray-200'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                          xmlns='http://www.w3.org/2000/svg'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25'
                          />
                        </svg>
                        <span className='hidden max-w-0 overflow-hidden whitespace-nowrap text-gray-700 transition-all duration-200 ease-in-out group-hover:max-w-[100px] dark:text-gray-200 lg:inline'>
                          网页播放
                        </span>
                      </button>

                      {/* PotPlayer */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (originalVideoUrl) {
                            window.open(
                              `potplayer://${originalVideoUrl}`,
                              '_blank',
                            );
                          }
                        }}
                        className='group relative flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-md border border-gray-300 bg-white text-xs font-medium shadow-sm transition-all duration-200 hover:bg-gray-100 hover:shadow-md dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 lg:h-auto lg:w-auto lg:px-2 lg:py-1.5'
                        title='PotPlayer'
                      >
                        <img
                          src='/players/potplayer.png'
                          alt='PotPlayer'
                          className='h-4 w-4 flex-shrink-0'
                        />
                        <span className='hidden max-w-0 overflow-hidden whitespace-nowrap text-gray-700 transition-all duration-200 ease-in-out group-hover:max-w-[100px] dark:text-gray-200 lg:inline'>
                          PotPlayer
                        </span>
                      </button>

                      {/* VLC */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (originalVideoUrl) {
                            window.open(`vlc://${originalVideoUrl}`, '_blank');
                          }
                        }}
                        className='group relative flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-md border border-gray-300 bg-white text-xs font-medium shadow-sm transition-all duration-200 hover:bg-gray-100 hover:shadow-md dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 lg:h-auto lg:w-auto lg:px-2 lg:py-1.5'
                        title='VLC'
                      >
                        <img
                          src='/players/vlc.png'
                          alt='VLC'
                          className='h-4 w-4 flex-shrink-0'
                        />
                        <span className='hidden max-w-0 overflow-hidden whitespace-nowrap text-gray-700 transition-all duration-200 ease-in-out group-hover:max-w-[100px] dark:text-gray-200 lg:inline'>
                          VLC
                        </span>
                      </button>

                      {/* MPV */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (originalVideoUrl) {
                            window.open(`mpv://${originalVideoUrl}`, '_blank');
                          }
                        }}
                        className='group relative flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-md border border-gray-300 bg-white text-xs font-medium shadow-sm transition-all duration-200 hover:bg-gray-100 hover:shadow-md dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 lg:h-auto lg:w-auto lg:px-2 lg:py-1.5'
                        title='MPV'
                      >
                        <img
                          src='/players/mpv.png'
                          alt='MPV'
                          className='h-4 w-4 flex-shrink-0'
                        />
                        <span className='hidden max-w-0 overflow-hidden whitespace-nowrap text-gray-700 transition-all duration-200 ease-in-out group-hover:max-w-[100px] dark:text-gray-200 lg:inline'>
                          MPV
                        </span>
                      </button>

                      {/* MX Player */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (originalVideoUrl) {
                            window.open(
                              `intent://${originalVideoUrl}#Intent;package=com.mxtech.videoplayer.ad;S.title=${encodeURIComponent(
                                currentSource?.name || '直播',
                              )};end`,
                              '_blank',
                            );
                          }
                        }}
                        className='group relative flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-md border border-gray-300 bg-white text-xs font-medium shadow-sm transition-all duration-200 hover:bg-gray-100 hover:shadow-md dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 lg:h-auto lg:w-auto lg:px-2 lg:py-1.5'
                        title='MX Player'
                      >
                        <img
                          src='/players/mxplayer.png'
                          alt='MX Player'
                          className='h-4 w-4 flex-shrink-0'
                        />
                        <span className='hidden max-w-0 overflow-hidden whitespace-nowrap text-gray-700 transition-all duration-200 ease-in-out group-hover:max-w-[100px] dark:text-gray-200 lg:inline'>
                          MX Player
                        </span>
                      </button>

                      {/* nPlayer */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (originalVideoUrl) {
                            window.open(
                              `nplayer-${originalVideoUrl}`,
                              '_blank',
                            );
                          }
                        }}
                        className='group relative flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-md border border-gray-300 bg-white text-xs font-medium shadow-sm transition-all duration-200 hover:bg-gray-100 hover:shadow-md dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 lg:h-auto lg:w-auto lg:px-2 lg:py-1.5'
                        title='nPlayer'
                      >
                        <img
                          src='/players/nplayer.png'
                          alt='nPlayer'
                          className='h-4 w-4 flex-shrink-0'
                        />
                        <span className='hidden max-w-0 overflow-hidden whitespace-nowrap text-gray-700 transition-all duration-200 ease-in-out group-hover:max-w-[100px] dark:text-gray-200 lg:inline'>
                          nPlayer
                        </span>
                      </button>

                      {/* IINA */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (originalVideoUrl) {
                            window.open(
                              `iina://weblink?url=${encodeURIComponent(originalVideoUrl)}`,
                              '_blank',
                            );
                          }
                        }}
                        className='group relative flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-md border border-gray-300 bg-white text-xs font-medium shadow-sm transition-all duration-200 hover:bg-gray-100 hover:shadow-md dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 lg:h-auto lg:w-auto lg:px-2 lg:py-1.5'
                        title='IINA'
                      >
                        <img
                          src='/players/iina.png'
                          alt='IINA'
                          className='h-4 w-4 flex-shrink-0'
                        />
                        <span className='hidden max-w-0 overflow-hidden whitespace-nowrap text-gray-700 transition-all duration-200 ease-in-out group-hover:max-w-[100px] dark:text-gray-200 lg:inline'>
                          IINA
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 直播信息显示 */}
              {streamInfo && (streamInfo.name || streamInfo.title) && (
                <div className='mt-3 px-2'>
                  <div className='space-y-1.5'>
                    {streamInfo.title && (
                      <div className='line-clamp-2 text-lg font-medium text-black dark:text-white'>
                        {streamInfo.title}
                      </div>
                    )}
                    {streamInfo.name && (
                      <div className='text-base text-black dark:text-white'>
                        {streamInfo.name}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              className={`h-[300px] transition-all duration-300 ease-in-out md:overflow-hidden lg:h-full ${isChannelListCollapsed ? 'md:col-span-1 lg:hidden lg:scale-95 lg:opacity-0' : 'md:col-span-1 lg:scale-100 lg:opacity-100'}`}
            >
              <div className='flex h-full flex-col overflow-hidden rounded-xl border border-white/0 bg-black/10 px-4 py-0 dark:border-white/30 dark:bg-white/5 md:ml-2'>
                <div className='-mx-6 mb-1 flex flex-shrink-0'>
                  <div
                    onClick={() => setActiveTab('rooms')}
                    className={`flex-1 cursor-pointer px-6 py-3 text-center font-medium transition-all duration-200 ${activeTab === 'rooms' ? 'text-green-600 dark:text-green-400' : 'hover:bg-black/3 dark:hover:bg-white/3 bg-black/5 text-gray-700 hover:text-green-600 dark:bg-white/5 dark:text-gray-300 dark:hover:text-green-400'}`}
                  >
                    房间
                  </div>
                  <div
                    onClick={() => setActiveTab('platforms')}
                    className={`flex-1 cursor-pointer px-6 py-3 text-center font-medium transition-all duration-200 ${activeTab === 'platforms' ? 'text-green-600 dark:text-green-400' : 'hover:bg-black/3 dark:hover:bg-white/3 bg-black/5 text-gray-700 hover:text-green-600 dark:bg-white/5 dark:text-gray-300 dark:hover:text-green-400'}`}
                  >
                    平台
                  </div>
                </div>

                {activeTab === 'rooms' && (
                  <div className='mt-4 flex-1 space-y-2 overflow-y-auto pb-4'>
                    {selectedPlatform && (
                      <div className='mb-3 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-2 py-2 dark:border-green-800 dark:bg-green-900/20'>
                        <div className='flex items-center gap-2'>
                          <span className='text-xs text-green-700 dark:text-green-300'>
                            筛选平台:
                          </span>
                          <span className='text-sm font-medium text-green-800 dark:text-green-200'>
                            {selectedPlatform === 'huya'
                              ? '虎牙'
                              : selectedPlatform === 'bilibili'
                                ? '哔哩哔哩'
                                : selectedPlatform === 'douyin'
                                  ? '抖音'
                                  : selectedPlatform}
                          </span>
                        </div>
                        <button
                          onClick={clearPlatformFilter}
                          className='text-xs text-green-700 underline hover:text-green-900 dark:text-green-300 dark:hover:text-green-100'
                        >
                          清除筛选
                        </button>
                      </div>
                    )}
                    {filteredSources.length > 0 ? (
                      filteredSources.map((source) => {
                        const isActive = source.key === currentSource?.key;
                        return (
                          <button
                            key={source.key}
                            onClick={() => handleSourceClick(source)}
                            disabled={webLiveSync.shouldDisableControls}
                            className={`w-full rounded-lg p-3 text-left transition-all duration-200 ${isActive ? 'border border-green-300 bg-green-100 dark:border-green-700 dark:bg-green-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} ${webLiveSync.shouldDisableControls ? 'cursor-not-allowed opacity-50' : ''}`}
                          >
                            <div className='flex items-center gap-3'>
                              <div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-300 dark:bg-gray-700'>
                                <Radio className='h-5 w-5 text-gray-500' />
                              </div>
                              <div className='min-w-0 flex-1'>
                                <div className='truncate text-sm font-medium text-gray-900 dark:text-gray-100'>
                                  {source.name}
                                </div>
                                <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                                  房间ID: {source.roomId}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className='flex flex-col items-center justify-center py-12 text-center'>
                        <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800'>
                          <Radio className='h-8 w-8 text-gray-400 dark:text-gray-600' />
                        </div>
                        <p className='font-medium text-gray-500 dark:text-gray-400'>
                          {selectedPlatform
                            ? '该平台暂无可用房间'
                            : '暂无可用房间'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'platforms' && (
                  <div className='mt-4 flex h-full flex-col'>
                    <div className='flex-1 space-y-2 overflow-y-auto pb-20'>
                      {platforms.length > 0 ? (
                        platforms.map((platform) => (
                          <button
                            key={platform}
                            onClick={() => handlePlatformClick(platform)}
                            disabled={webLiveSync.shouldDisableControls}
                            className={`flex w-full cursor-pointer items-start gap-3 rounded-lg bg-gray-200/50 px-2 py-3 transition-all duration-200 hover:bg-gray-300/50 dark:bg-white/10 dark:hover:bg-white/20 ${webLiveSync.shouldDisableControls ? 'cursor-not-allowed opacity-50' : ''}`}
                          >
                            <div className='flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-600'>
                              {platform === 'huya' ? (
                                <img
                                  src='https://hd.huya.com/favicon.ico'
                                  alt='虎牙'
                                  className='h-8 w-8'
                                />
                              ) : platform === 'bilibili' ? (
                                <img
                                  src='https://www.bilibili.com/favicon.ico'
                                  alt='哔哩哔哩'
                                  className='h-8 w-8'
                                />
                              ) : platform === 'douyin' ? (
                                <img
                                  src='https://lf1-cdn-tos.bytegoofy.com/goofy/ies/douyin_web/public/favicon.ico'
                                  alt='抖音'
                                  className='h-8 w-8'
                                />
                              ) : (
                                <Radio className='h-6 w-6 text-gray-500' />
                              )}
                            </div>
                            <div className='min-w-0 flex-1 text-left'>
                              <div className='truncate text-sm font-medium text-gray-900 dark:text-gray-100'>
                                {platform === 'huya'
                                  ? '虎牙'
                                  : platform === 'bilibili'
                                    ? '哔哩哔哩'
                                    : platform === 'douyin'
                                      ? '抖音'
                                      : platform}
                              </div>
                              <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                                {
                                  sources.filter((s) => s.platform === platform)
                                    .length
                                }{' '}
                                个房间
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className='flex flex-col items-center justify-center py-12 text-center'>
                          <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800'>
                            <Radio className='h-8 w-8 text-gray-400 dark:text-gray-600' />
                          </div>
                          <p className='font-medium text-gray-500 dark:text-gray-400'>
                            暂无可用平台
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
