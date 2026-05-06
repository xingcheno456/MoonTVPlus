'use client';

import {
  Calendar,
  Clock,
  ExternalLink,
  Film,
  Globe,
  Star,
  Tag,
  Users,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { getTMDBImageUrl } from '@/lib/tmdb-image';
import { processImageUrl } from '@/lib/utils';
import { parseApiResponse } from '@/lib/api-response';

import ImageViewer from '@/components/ImageViewer';
import ProxyImage from '@/components/ProxyImage';

import { logger } from '../lib/logger';

interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  poster?: string;
  doubanId?: number;
  bangumiId?: number;
  isBangumi?: boolean;
  type?: 'movie' | 'tv';
  seasonNumber?: number;
  currentEpisode?: number;
  cmsData?: {
    desc?: string;
    episodes?: string[];
    episodes_titles?: string[];
  };
  sourceId?: string;
  source?: string;
  useDrawer?: boolean;
  drawerWidth?: string;
}

interface DetailData {
  title: string;
  originalTitle?: string;
  year?: string;
  poster?: string;
  rating?: {
    value: number;
    count: number;
  };
  intro?: string;
  genres?: string[];
  directors?: Array<{ name: string; profile_path?: string }>;
  actors?: Array<{ name: string; character?: string; profile_path?: string }>;
  countries?: string[];
  languages?: string[];
  duration?: string;
  episodesCount?: number;
  releaseDate?: string;
  status?: string;
  tagline?: string;
  seasons?: number;
  overview?: string;
  mediaType?: 'movie' | 'tv';
  seasonNumber?: number;
}

interface Episode {
  id: number;
  name: string;
  episode_number: number;
  still_path: string | null;
  overview: string;
  air_date: string;
}

const DetailPanel: React.FC<DetailPanelProps> = ({
  isOpen,
  onClose,
  title,
  poster,
  doubanId,
  bangumiId,
  isBangumi,
  type = 'movie',
  seasonNumber,
  currentEpisode,
  cmsData,
  sourceId,
  source,
  useDrawer = false,
  drawerWidth = 'w-full md:w-[25%]',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seasonData, setSeasonData] = useState<{
    seasons: any[];
    episodes: Episode[];
  } | null>(null);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [expandedEpisodes, setExpandedEpisodes] = useState<Set<number>>(
    new Set(),
  );
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [seasonsLoaded, setSeasonsLoaded] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');

  // 数据源状态管理
  const [currentSource, setCurrentSource] = useState<
    'douban' | 'bangumi' | 'cms'
  >('cms');

  const getExternalUrl = () => {
    if (currentSource === 'douban' && doubanId) {
      return `https://movie.douban.com/subject/${doubanId}`;
    }

    if (currentSource === 'bangumi') {
      const actualBangumiId = bangumiId || doubanId;
      if (actualBangumiId) {
        return `https://bgm.tv/subject/${actualBangumiId}`;
      }
    }

    return null;
  };

  const externalUrl = getExternalUrl();

  // 拖动滚动状态
  const [isDragging, setIsDragging] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const episodesScrollRef = React.useRef<HTMLDivElement>(null);

  // 图片点击处理
  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageViewer(true);
  };

  // 确保组件在客户端挂载后才渲染 Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // 控制动画状态
  useEffect(() => {
    let animationId: number;
    let timer: NodeJS.Timeout;

    if (isOpen) {
      setIsVisible(true);
      animationId = requestAnimationFrame(() => {
        animationId = requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      timer = setTimeout(() => {
        setIsVisible(false);
      }, 200);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isOpen]);

  // 阻止背景滚动（仅在非抽屉模式下）
  useEffect(() => {
    if (isVisible && !useDrawer) {
      // 保存当前滚动位置
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      const body = document.body;
      const html = document.documentElement;

      // 获取滚动条宽度
      const scrollBarWidth = window.innerWidth - html.clientWidth;

      // 保存原始样式
      const originalBodyStyle = {
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        width: body.style.width,
        paddingRight: body.style.paddingRight,
        overflow: body.style.overflow,
      };

      // 设置body样式来阻止滚动，但保持原位置
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.left = `-${scrollX}px`;
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      body.style.paddingRight = `${scrollBarWidth}px`;

      return () => {
        // 恢复所有原始样式
        body.style.position = originalBodyStyle.position;
        body.style.top = originalBodyStyle.top;
        body.style.left = originalBodyStyle.left;
        body.style.right = originalBodyStyle.right;
        body.style.width = originalBodyStyle.width;
        body.style.paddingRight = originalBodyStyle.paddingRight;
        body.style.overflow = originalBodyStyle.overflow;

        // 使用 requestAnimationFrame 确保样式恢复后再滚动
        requestAnimationFrame(() => {
          window.scrollTo(scrollX, scrollY);
        });
      };
    }
  }, [isVisible, useDrawer]);

  // ESC键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isVisible, onClose]);

  // 获取详情数据
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        // 优先使用苹果CMS数据（短剧等）
        // 如果 cmsData 存在但 desc 为空，尝试通过 source-detail API 获取
        if (cmsData) {
          setCurrentSource('cms');
          if (cmsData.desc) {
            // 有 desc，直接使用
            const data = {
              title: title,
              intro: cmsData.desc,
              episodesCount: cmsData.episodes?.length,
              poster: poster,
            };
            setDetailData(data);
            setLoading(false);
            return;
          }

          // cmsData 存在但 desc 为空，尝试通过 API 获取详情
          if (sourceId && source) {
            try {
              const response = await fetch(
                `/api/source-detail?id=${encodeURIComponent(sourceId)}&source=${encodeURIComponent(source)}&title=${encodeURIComponent(title)}`,
              );
              if (response.ok) {
                const data = await parseApiResponse<any>(response);
                const detailData = {
                  title: data.title || title,
                  intro: data.desc || '',
                  episodesCount:
                    data.episodes?.length || cmsData.episodes?.length,
                  poster: data.poster || poster,
                  year: data.year,
                };
                setDetailData(detailData);
                setLoading(false);
                return;
              }
            } catch (err) {
              logger.error('获取source-detail失败:', err);
              // 继续执行后续逻辑
            }
          }
        }

        // 优先使用 Bangumi ID（因为 isBangumi 为 true 时，doubanId 实际上是 bangumiId）
        if (bangumiId || (isBangumi && doubanId)) {
          setCurrentSource('bangumi');
          const actualBangumiId = bangumiId || doubanId;
          const response = await fetch(
            `https://api.bgm.tv/v0/subjects/${actualBangumiId}`,
          );
          if (!response.ok) {
            throw new Error('获取Bangumi详情失败');
          }
          const data = await parseApiResponse<any>(response);

          const detailData = {
            title: data.name_cn || data.name,
            originalTitle: data.name,
            year: data.date ? data.date.substring(0, 4) : undefined,
            poster: data.images?.large || poster,
            rating: data.rating
              ? {
                  value: data.rating.score,
                  count: data.rating.total,
                }
              : undefined,
            intro: data.summary,
            genres: data.tags?.map((tag: any) => tag.name).slice(0, 5),
            episodesCount: data.eps,
            releaseDate: data.date,
          };
          setDetailData(detailData);
          return;
        }

        // 使用豆瓣ID
        if (doubanId && !isBangumi) {
          setCurrentSource('douban');
          const response = await fetch(`/api/douban/detail?id=${encodeURIComponent(doubanId)}`);
          if (!response.ok) {
            throw new Error('获取豆瓣详情失败');
          }
          const data = await parseApiResponse<any>(response);

          const detailData = {
            title: data.title,
            originalTitle: data.original_title,
            year: data.year,
            poster: data.pic?.large || data.pic?.normal || poster,
            rating: data.rating
              ? {
                  value: data.rating.value,
                  count: data.rating.count,
                }
              : undefined,
            intro: data.intro,
            genres: data.genres,
            directors: data.directors,
            actors: data.actors,
            countries: data.countries,
            languages: data.languages,
            duration: data.durations?.[0],
            episodesCount: data.episodes_count,
          };
          setDetailData(detailData);
          return;
        }

        throw new Error('缺少必要的查询参数');
      } catch (err) {
        logger.error('获取详情失败:', err);
        setError(err instanceof Error ? err.message : '获取详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [
    isOpen,
    doubanId,
    bangumiId,
    isBangumi,
    title,
    type,
    seasonNumber,
    poster,
    cmsData,
    sourceId,
    source,
  ]);

  // 拖动滚动处理函数
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!episodesScrollRef.current) return;
    setIsMouseDown(true);
    setStartX(e.pageX - episodesScrollRef.current.offsetLeft);
    setScrollLeft(episodesScrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !episodesScrollRef.current) return;

    const x = e.pageX - episodesScrollRef.current.offsetLeft;
    const distance = Math.abs(x - startX);

    // 只有移动超过5px才进入拖动模式
    if (distance > 5 && !isDragging) {
      setIsDragging(true);
      episodesScrollRef.current.style.cursor = 'grabbing';
      episodesScrollRef.current.style.userSelect = 'none';
    }

    if (isDragging) {
      e.preventDefault();
      const walk = (x - startX) * 2; // 滚动速度倍数
      episodesScrollRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    setIsDragging(false);
    if (episodesScrollRef.current) {
      episodesScrollRef.current.style.cursor = 'grab';
      episodesScrollRef.current.style.userSelect = 'auto';
    }
  };

  const handleMouseLeave = () => {
    if (isMouseDown || isDragging) {
      setIsMouseDown(false);
      setIsDragging(false);
      if (episodesScrollRef.current) {
        episodesScrollRef.current.style.cursor = 'grab';
        episodesScrollRef.current.style.userSelect = 'auto';
      }
    }
  };

  if (!isVisible || !mounted) return null;

  const content = useDrawer ? (
    <div className='pointer-events-none fixed inset-0 z-[9999] flex items-center justify-end'>
      {/* 详情面板 - 抽屉模式 */}
      <div
        className={`relative ${drawerWidth} pointer-events-auto flex h-full flex-col overflow-hidden bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-gray-900 ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 头部 */}
        <div className='sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
            详情
          </h2>
          <div className='flex items-center gap-2'>
            {externalUrl && (
              <button
                onClick={() =>
                  window.open(externalUrl, '_blank', 'noopener,noreferrer')
                }
                className='rounded-full p-2 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800'
                title='打开外部页面'
                aria-label='打开外部页面'
              >
                <ExternalLink
                  size={18}
                  className='text-gray-500 dark:text-gray-400'
                />
              </button>
            )}
            <button
              onClick={onClose}
              className='rounded-full p-2 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800'
              title='关闭'
              aria-label='关闭'
            >
              <X size={20} className='text-gray-500 dark:text-gray-400' />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className='max-h-[calc(90vh-4rem)] overflow-y-auto'>
          {loading && (
            <div className='flex items-center justify-center py-20'>
              <div className='h-12 w-12 animate-spin rounded-full border-b-2 border-green-500'></div>
            </div>
          )}

          {error && (
            <div className='p-6'>
              <div className='mb-6 text-center'>
                <p className='text-red-500 dark:text-red-400'>{error}</p>
              </div>

              {/* 数据源显示和切换 - 错误时也显示 */}
              <div className='mt-6 border-t border-gray-200 pt-4 dark:border-gray-700'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>
                      数据来源:
                    </span>
                    <span className='text-sm font-medium uppercase text-gray-700 dark:text-gray-300'>
                      {currentSource === 'douban' && 'Douban'}
                      {currentSource === 'bangumi' && 'Bangumi'}
                      {currentSource === 'cms' && 'CMS'}
                    </span>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && detailData && (
            <div className='p-6'>
              {/* 海报和基本信息 */}
              <div className='mb-6 flex gap-6'>
                {detailData.poster && (
                  <div className='flex flex-shrink-0 flex-col items-start gap-3'>
                    <div
                      className='relative h-48 w-32 cursor-pointer overflow-hidden rounded-lg bg-gray-100 transition-opacity hover:opacity-90 dark:bg-gray-800'
                      onClick={() => handleImageClick(detailData.poster!)}
                    >
                      <ProxyImage
                        originalSrc={detailData.poster}
                        alt={detailData.title}
                        className='absolute inset-0 h-full w-full object-cover'
                        draggable={false}
                      />
                    </div>
                  </div>
                )}
                <div className='min-w-0 flex-1'>
                  <h3 className='mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100'>
                    {detailData.title}
                  </h3>
                  {detailData.originalTitle &&
                    detailData.originalTitle !== detailData.title && (
                      <p className='mb-3 text-sm text-gray-500 dark:text-gray-400'>
                        {detailData.originalTitle}
                      </p>
                    )}

                  {/* 评分 */}
                  {detailData.rating && (
                    <div className='mb-3 flex items-center gap-2'>
                      <Star
                        size={20}
                        className='fill-yellow-500 text-yellow-500'
                      />
                      <span className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                        {detailData.rating.value.toFixed(1)}
                      </span>
                      {detailData.rating.count > 0 && (
                        <span className='text-sm text-gray-500 dark:text-gray-400'>
                          ({detailData.rating.count} 评价)
                        </span>
                      )}
                    </div>
                  )}

                  {/* 类型标签 */}
                  {detailData.genres && detailData.genres.length > 0 && (
                    <div className='mb-3 flex flex-wrap gap-2'>
                      {detailData.genres.map((genre, index) => (
                        <span
                          key={index}
                          className='rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 年份和时长 */}
                  <div className='flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400'>
                    {detailData.year && (
                      <div className='flex items-center gap-1'>
                        <Calendar size={16} />
                        <span>{detailData.year}</span>
                      </div>
                    )}
                    {detailData.duration && (
                      <div className='flex items-center gap-1'>
                        <Clock size={16} />
                        <span>{detailData.duration}</span>
                      </div>
                    )}
                    {detailData.episodesCount && (
                      <div className='flex items-center gap-1'>
                        <Film size={16} />
                        <span>{detailData.episodesCount} 集</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 简介 */}
              {(detailData.intro || detailData.overview) && (
                <div className='mb-6'>
                  <h4 className='mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100'>
                    简介
                  </h4>
                  <p className='whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300'>
                    {detailData.intro || detailData.overview}
                  </p>
                </div>
              )}

              {/* 导演和演员 */}
              {detailData.directors && detailData.directors.length > 0 && (
                <div className='mb-4'>
                  <h4 className='mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                    <Users size={16} />
                    导演
                  </h4>
                  <p className='text-gray-700 dark:text-gray-300'>
                    {detailData.directors.map((d) => d.name).join(', ')}
                  </p>
                </div>
              )}

              {detailData.actors && detailData.actors.length > 0 && (
                <div className='mb-4'>
                  <h4 className='mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                    <Users size={16} />
                    演员
                  </h4>
                  {(
                    <p className='text-gray-700 dark:text-gray-300'>
                      {detailData.actors
                        .slice(0, 10)
                        .map((a) => a.name)
                        .join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* 制作信息 */}
              <div className='grid grid-cols-2 gap-4 text-sm'>
                {detailData.countries && detailData.countries.length > 0 && (
                  <div>
                    <h4 className='mb-1 flex items-center gap-1 font-semibold text-gray-900 dark:text-gray-100'>
                      <Globe size={14} />
                      国家/地区
                    </h4>
                    <p className='text-gray-700 dark:text-gray-300'>
                      {detailData.countries.join(', ')}
                    </p>
                  </div>
                )}

                {detailData.languages && detailData.languages.length > 0 && (
                  <div>
                    <h4 className='mb-1 flex items-center gap-1 font-semibold text-gray-900 dark:text-gray-100'>
                      <Tag size={14} />
                      语言
                    </h4>
                    <p className='text-gray-700 dark:text-gray-300'>
                      {detailData.languages.join(', ')}
                    </p>
                  </div>
                )}

                {detailData.releaseDate && (
                  <div>
                    <h4 className='mb-1 flex items-center gap-1 font-semibold text-gray-900 dark:text-gray-100'>
                      <Calendar size={14} />
                      上映日期
                    </h4>
                    <p className='text-gray-700 dark:text-gray-300'>
                      {detailData.releaseDate}
                    </p>
                  </div>
                )}

                {detailData.status && (
                  <div>
                    <h4 className='mb-1 font-semibold text-gray-900 dark:text-gray-100'>
                      状态
                    </h4>
                    <p className='text-gray-700 dark:text-gray-300'>
                      {detailData.status}
                    </p>
                  </div>
                )}
              </div>

              {/* 季度和集数信息 */}
              {detailData.mediaType === 'tv' && (
                <div className='mt-6'>
                  {loadingSeasons && (
                    <div className='flex items-center justify-center py-4'>
                      <div className='h-8 w-8 animate-spin rounded-full border-b-2 border-green-500'></div>
                    </div>
                  )}

                  {!loadingSeasons && seasonData && (
                    <>
                      {/* 季度列表 */}
                      {seasonData.seasons.length > 0 && (
                        <div className='mb-6'>
                          <h4 className='mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100'>
                            季度
                          </h4>
                          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                            {seasonData.seasons.map((season: any) => (
                              <div
                                key={season.id}
                                onClick={() =>
                                  setSelectedSeason(season.season_number)
                                }
                                className={`flex cursor-pointer items-center gap-2 rounded p-2 transition-colors ${
                                  selectedSeason === season.season_number
                                    ? 'bg-green-100 ring-2 ring-green-500 dark:bg-green-900/30'
                                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'
                                }`}
                              >
                                {season.poster_path && (
                                  <div
                                    className='relative h-16 w-12 flex-shrink-0 overflow-hidden rounded bg-gray-200 transition-opacity hover:opacity-80 dark:bg-gray-700'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleImageClick(
                                        getTMDBImageUrl(
                                          season.poster_path,
                                          'w500',
                                        ),
                                      );
                                    }}
                                  >
                                    <ProxyImage
                                      originalSrc={getTMDBImageUrl(
                                        season.poster_path,
                                        'w92',
                                      )}
                                      alt={season.name}
                                      className='absolute inset-0 h-full w-full object-cover'
                                      draggable={false}
                                    />
                                  </div>
                                )}
                                <div className='min-w-0 flex-1'>
                                  <p className='truncate text-sm font-medium text-gray-900 dark:text-gray-100'>
                                    {season.name}
                                  </p>
                                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                                    {season.episode_count} 集
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 集数列表 */}
                      {seasonData.episodes.length > 0 && (
                        <div>
                          <h4 className='mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100'>
                            {seasonData.seasons.find(
                              (s: any) => s.season_number === selectedSeason,
                            )?.name || `第${selectedSeason}季`}
                          </h4>
                          <div
                            ref={episodesScrollRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseLeave}
                            className='-mx-6 cursor-grab overflow-x-auto px-6 active:cursor-grabbing'
                            style={{
                              scrollbarWidth: 'thin',
                              scrollBehavior: isDragging ? 'auto' : 'smooth',
                            }}
                          >
                            <div className='flex gap-3 py-2'>
                              {seasonData.episodes.map((episode: Episode) => {
                                const isExpanded = expandedEpisodes.has(
                                  episode.id,
                                );
                                const isCurrentEpisode =
                                  currentEpisode === episode.episode_number;
                                return (
                                  <div
                                    key={episode.id}
                                    id={`episode-${episode.episode_number}`}
                                    className={`w-64 flex-shrink-0 rounded p-3 ${
                                      isCurrentEpisode
                                        ? 'bg-green-100 ring-2 ring-green-500 dark:bg-green-900/30'
                                        : 'bg-gray-50 dark:bg-gray-800'
                                    }`}
                                    style={{
                                      pointerEvents: isDragging
                                        ? 'none'
                                        : 'auto',
                                    }}
                                  >
                                    {episode.still_path && (
                                      <div
                                        className='relative mb-2 h-36 w-full cursor-pointer overflow-hidden rounded bg-gray-200 transition-opacity hover:opacity-90 dark:bg-gray-700'
                                        onClick={() =>
                                          handleImageClick(
                                            getTMDBImageUrl(
                                              episode.still_path,
                                              'w500',
                                            ),
                                          )
                                        }
                                      >
                                        <ProxyImage
                                          originalSrc={getTMDBImageUrl(
                                            episode.still_path,
                                            'w300',
                                          )}
                                          alt={episode.name}
                                          className='absolute inset-0 h-full w-full object-cover'
                                          draggable={false}
                                        />
                                      </div>
                                    )}
                                    <p className='mb-1 text-sm font-medium text-gray-900 dark:text-gray-100'>
                                      第{episode.episode_number}集:{' '}
                                      {episode.name}
                                    </p>
                                    {episode.overview && (
                                      <p
                                        onClick={() => {
                                          const newExpanded = new Set(
                                            expandedEpisodes,
                                          );
                                          if (isExpanded) {
                                            newExpanded.delete(episode.id);
                                          } else {
                                            newExpanded.add(episode.id);
                                          }
                                          setExpandedEpisodes(newExpanded);
                                        }}
                                        className={`cursor-pointer text-xs text-gray-600 dark:text-gray-400 ${isExpanded ? '' : 'line-clamp-3'}`}
                                      >
                                        {episode.overview}
                                      </p>
                                    )}
                                    {episode.air_date && (
                                      <p className='mt-1 text-xs text-gray-500 dark:text-gray-500'>
                                        {episode.air_date}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* 数据源显示和切换 */}
              <div className='mt-6 border-t border-gray-200 pt-4 dark:border-gray-700'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>
                      数据来源:
                    </span>
                    <span className='text-sm font-medium uppercase text-gray-700 dark:text-gray-300'>
                      {currentSource === 'douban' && 'Douban'}
                      {currentSource === 'bangumi' && 'Bangumi'}
                      {currentSource === 'cms' && 'CMS'}
                    </span>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 图片查看器 */}
      {showImageViewer && (
        <ImageViewer
          isOpen={showImageViewer}
          onClose={() => setShowImageViewer(false)}
          imageUrl={selectedImage}
          alt={detailData?.title || title}
        />
      )}
    </div>
  ) : (
    <div className='fixed inset-0 z-[9999] flex items-center justify-center p-4'>
      {/* 背景遮罩 */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ease-out ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        style={{
          backdropFilter: 'blur(4px)',
          willChange: 'opacity',
        }}
      />

      {/* 详情面板 - 居中模式 */}
      <div
        className='relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-200 ease-out dark:bg-gray-900'
        style={{
          willChange: 'transform, opacity',
          backfaceVisibility: 'hidden',
          transform: isAnimating
            ? 'scale(1) translateZ(0)'
            : 'scale(0.95) translateZ(0)',
          opacity: isAnimating ? 1 : 0,
        }}
      >
        {/* 头部 */}
        <div className='sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
            详情
          </h2>
          <div className='flex items-center gap-2'>
            {externalUrl && (
              <button
                onClick={() =>
                  window.open(externalUrl, '_blank', 'noopener,noreferrer')
                }
                className='rounded-full p-2 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800'
                title='打开外部页面'
                aria-label='打开外部页面'
              >
                <ExternalLink
                  size={18}
                  className='text-gray-500 dark:text-gray-400'
                />
              </button>
            )}
            <button
              onClick={onClose}
              className='rounded-full p-2 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800'
              title='关闭'
              aria-label='关闭'
            >
              <X size={20} className='text-gray-500 dark:text-gray-400' />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className='max-h-[calc(90vh-4rem)] overflow-y-auto'>
          {loading && (
            <div className='flex items-center justify-center py-20'>
              <div className='h-12 w-12 animate-spin rounded-full border-b-2 border-green-500'></div>
            </div>
          )}

          {error && (
            <div className='p-6'>
              <div className='mb-6 text-center'>
                <p className='text-red-500 dark:text-red-400'>{error}</p>
              </div>

              {/* 数据源显示和切换 - 错误时也显示 */}
              <div className='mt-6 border-t border-gray-200 pt-4 dark:border-gray-700'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>
                      数据来源:
                    </span>
                    <span className='text-sm font-medium uppercase text-gray-700 dark:text-gray-300'>
                      {currentSource === 'douban' && 'Douban'}
                      {currentSource === 'bangumi' && 'Bangumi'}
                      {currentSource === 'cms' && 'CMS'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && detailData && (
            <div className='p-6'>
              {/* 海报和基本信息 */}
              <div className='mb-6 flex gap-6'>
                {detailData.poster && (
                  <div className='flex flex-shrink-0 flex-col items-start gap-3'>
                    <div
                      className='relative h-48 w-32 cursor-pointer overflow-hidden rounded-lg bg-gray-100 transition-opacity hover:opacity-90 dark:bg-gray-800'
                      onClick={() => handleImageClick(detailData.poster!)}
                    >
                      <ProxyImage
                        originalSrc={detailData.poster}
                        alt={detailData.title}
                        className='absolute inset-0 h-full w-full object-cover'
                        draggable={false}
                      />
                    </div>
                  </div>
                )}
                <div className='min-w-0 flex-1'>
                  <h3 className='mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100'>
                    {detailData.title}
                  </h3>
                  {detailData.originalTitle &&
                    detailData.originalTitle !== detailData.title && (
                      <p className='mb-3 text-sm text-gray-500 dark:text-gray-400'>
                        {detailData.originalTitle}
                      </p>
                    )}

                  {/* 评分 */}
                  {detailData.rating && (
                    <div className='mb-3 flex items-center gap-2'>
                      <Star
                        size={20}
                        className='fill-yellow-500 text-yellow-500'
                      />
                      <span className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                        {detailData.rating.value.toFixed(1)}
                      </span>
                      {detailData.rating.count > 0 && (
                        <span className='text-sm text-gray-500 dark:text-gray-400'>
                          ({detailData.rating.count} 评价)
                        </span>
                      )}
                    </div>
                  )}

                  {/* 类型标签 */}
                  {detailData.genres && detailData.genres.length > 0 && (
                    <div className='mb-3 flex flex-wrap gap-2'>
                      {detailData.genres.map((genre, index) => (
                        <span
                          key={index}
                          className='rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 年份和时长 */}
                  <div className='flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400'>
                    {detailData.year && (
                      <div className='flex items-center gap-1'>
                        <Calendar size={16} />
                        <span>{detailData.year}</span>
                      </div>
                    )}
                    {detailData.duration && (
                      <div className='flex items-center gap-1'>
                        <Clock size={16} />
                        <span>{detailData.duration}</span>
                      </div>
                    )}
                    {detailData.episodesCount && (
                      <div className='flex items-center gap-1'>
                        <Film size={16} />
                        <span>{detailData.episodesCount} 集</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 简介 */}
              {(detailData.intro || detailData.overview) && (
                <div className='mb-6'>
                  <h4 className='mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100'>
                    简介
                  </h4>
                  <p className='whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300'>
                    {detailData.intro || detailData.overview}
                  </p>
                </div>
              )}

              {/* 导演和演员 */}
              {detailData.directors && detailData.directors.length > 0 && (
                <div className='mb-4'>
                  <h4 className='mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                    <Users size={16} />
                    导演
                  </h4>
                  <p className='text-gray-700 dark:text-gray-300'>
                    {detailData.directors.map((d) => d.name).join(', ')}
                  </p>
                </div>
              )}

              {detailData.actors && detailData.actors.length > 0 && (
                <div className='mb-4'>
                  <h4 className='mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                    <Users size={16} />
                    演员
                  </h4>
                  {(
                    <p className='text-gray-700 dark:text-gray-300'>
                      {detailData.actors
                        .slice(0, 10)
                        .map((a) => a.name)
                        .join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* 制作信息 */}
              <div className='grid grid-cols-2 gap-4 text-sm'>
                {detailData.countries && detailData.countries.length > 0 && (
                  <div>
                    <h4 className='mb-1 flex items-center gap-1 font-semibold text-gray-900 dark:text-gray-100'>
                      <Globe size={14} />
                      国家/地区
                    </h4>
                    <p className='text-gray-700 dark:text-gray-300'>
                      {detailData.countries.join(', ')}
                    </p>
                  </div>
                )}

                {detailData.languages && detailData.languages.length > 0 && (
                  <div>
                    <h4 className='mb-1 flex items-center gap-1 font-semibold text-gray-900 dark:text-gray-100'>
                      <Tag size={14} />
                      语言
                    </h4>
                    <p className='text-gray-700 dark:text-gray-300'>
                      {detailData.languages.join(', ')}
                    </p>
                  </div>
                )}

                {detailData.releaseDate && (
                  <div>
                    <h4 className='mb-1 flex items-center gap-1 font-semibold text-gray-900 dark:text-gray-100'>
                      <Calendar size={14} />
                      上映日期
                    </h4>
                    <p className='text-gray-700 dark:text-gray-300'>
                      {detailData.releaseDate}
                    </p>
                  </div>
                )}

                {detailData.status && (
                  <div>
                    <h4 className='mb-1 font-semibold text-gray-900 dark:text-gray-100'>
                      状态
                    </h4>
                    <p className='text-gray-700 dark:text-gray-300'>
                      {detailData.status}
                    </p>
                  </div>
                )}
              </div>

              {/* 季度和集数信息 */}
              {detailData.mediaType === 'tv' && (
                <div className='mt-6'>
                  {loadingSeasons && (
                    <div className='flex items-center justify-center py-4'>
                      <div className='h-8 w-8 animate-spin rounded-full border-b-2 border-green-500'></div>
                    </div>
                  )}

                  {!loadingSeasons && seasonData && (
                    <>
                      {/* 季度列表 */}
                      {seasonData.seasons.length > 0 && (
                        <div className='mb-6'>
                          <h4 className='mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100'>
                            季度
                          </h4>
                          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                            {seasonData.seasons.map((season: any) => (
                              <div
                                key={season.id}
                                onClick={() =>
                                  setSelectedSeason(season.season_number)
                                }
                                className={`flex cursor-pointer items-center gap-2 rounded p-2 transition-colors ${
                                  selectedSeason === season.season_number
                                    ? 'bg-green-100 ring-2 ring-green-500 dark:bg-green-900/30'
                                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'
                                }`}
                              >
                                {season.poster_path && (
                                  <div
                                    className='relative h-16 w-12 flex-shrink-0 overflow-hidden rounded bg-gray-200 transition-opacity hover:opacity-80 dark:bg-gray-700'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleImageClick(
                                        getTMDBImageUrl(
                                          season.poster_path,
                                          'w500',
                                        ),
                                      );
                                    }}
                                  >
                                    <ProxyImage
                                      originalSrc={getTMDBImageUrl(
                                        season.poster_path,
                                        'w92',
                                      )}
                                      alt={season.name}
                                      className='absolute inset-0 h-full w-full object-cover'
                                      draggable={false}
                                    />
                                  </div>
                                )}
                                <div className='min-w-0 flex-1'>
                                  <p className='truncate text-sm font-medium text-gray-900 dark:text-gray-100'>
                                    {season.name}
                                  </p>
                                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                                    {season.episode_count} 集
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 集数列表 */}
                      {seasonData.episodes.length > 0 && (
                        <div>
                          <h4 className='mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100'>
                            {seasonData.seasons.find(
                              (s: any) => s.season_number === selectedSeason,
                            )?.name || `第${selectedSeason}季`}
                          </h4>
                          <div
                            ref={episodesScrollRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseLeave}
                            className='-mx-6 cursor-grab overflow-x-auto px-6 active:cursor-grabbing'
                            style={{
                              scrollbarWidth: 'thin',
                              scrollBehavior: isDragging ? 'auto' : 'smooth',
                            }}
                          >
                            <div className='flex gap-3 py-2'>
                              {seasonData.episodes.map((episode: Episode) => {
                                const isExpanded = expandedEpisodes.has(
                                  episode.id,
                                );
                                const isCurrentEpisode =
                                  currentEpisode === episode.episode_number;
                                return (
                                  <div
                                    key={episode.id}
                                    id={`episode-${episode.episode_number}`}
                                    className={`w-64 flex-shrink-0 rounded p-3 ${
                                      isCurrentEpisode
                                        ? 'bg-green-100 ring-2 ring-green-500 dark:bg-green-900/30'
                                        : 'bg-gray-50 dark:bg-gray-800'
                                    }`}
                                    style={{
                                      pointerEvents: isDragging
                                        ? 'none'
                                        : 'auto',
                                    }}
                                  >
                                    {episode.still_path && (
                                      <div
                                        className='relative mb-2 h-36 w-full cursor-pointer overflow-hidden rounded bg-gray-200 transition-opacity hover:opacity-90 dark:bg-gray-700'
                                        onClick={() =>
                                          handleImageClick(
                                            getTMDBImageUrl(
                                              episode.still_path,
                                              'w500',
                                            ),
                                          )
                                        }
                                      >
                                        <ProxyImage
                                          originalSrc={getTMDBImageUrl(
                                            episode.still_path,
                                            'w300',
                                          )}
                                          alt={episode.name}
                                          className='absolute inset-0 h-full w-full object-cover'
                                          draggable={false}
                                        />
                                      </div>
                                    )}
                                    <p className='mb-1 text-sm font-medium text-gray-900 dark:text-gray-100'>
                                      第{episode.episode_number}集:{' '}
                                      {episode.name}
                                    </p>
                                    {episode.overview && (
                                      <p
                                        onClick={() => {
                                          const newExpanded = new Set(
                                            expandedEpisodes,
                                          );
                                          if (isExpanded) {
                                            newExpanded.delete(episode.id);
                                          } else {
                                            newExpanded.add(episode.id);
                                          }
                                          setExpandedEpisodes(newExpanded);
                                        }}
                                        className={`cursor-pointer text-xs text-gray-600 dark:text-gray-400 ${isExpanded ? '' : 'line-clamp-3'}`}
                                      >
                                        {episode.overview}
                                      </p>
                                    )}
                                    {episode.air_date && (
                                      <p className='mt-1 text-xs text-gray-500 dark:text-gray-500'>
                                        {episode.air_date}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* 数据源显示和切换 */}
              <div className='mt-6 border-t border-gray-200 pt-4 dark:border-gray-700'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>
                      数据来源:
                    </span>
                    <span className='text-sm font-medium uppercase text-gray-700 dark:text-gray-300'>
                      {currentSource === 'douban' && 'Douban'}
                      {currentSource === 'bangumi' && 'Bangumi'}
                      {currentSource === 'cms' && 'CMS'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 图片查看器 */}
      {showImageViewer && (
        <ImageViewer
          isOpen={showImageViewer}
          onClose={() => setShowImageViewer(false)}
          imageUrl={selectedImage}
          alt={detailData?.title || title}
        />
      )}
    </div>
  );

  return createPortal(content, document.body);
};

export default DetailPanel;
