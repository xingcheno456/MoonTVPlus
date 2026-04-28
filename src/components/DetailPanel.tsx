'use client';

import {
  Calendar,
  Clock,
  ExternalLink,
  Film,
  Globe,
  Images,
  Star,
  Tag,
  Users,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { getTMDBImageUrl } from '@/lib/tmdb.client';
import { processImageUrl } from '@/lib/utils';

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
  tmdbId?: number;
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
  tmdbId?: number;
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

interface GalleryImage {
  file_path: string;
  width: number;
  height: number;
  vote_average?: number;
  vote_count?: number;
  iso_639_1?: string | null;
  imageType: 'backdrop' | 'poster';
}

const DetailPanel: React.FC<DetailPanelProps> = ({
  isOpen,
  onClose,
  title,
  poster,
  doubanId,
  bangumiId,
  isBangumi,
  tmdbId,
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
  const [showGallery, setShowGallery] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryTotal, setGalleryTotal] = useState(0);
  const [galleryScrollTop, setGalleryScrollTop] = useState(0);
  const [galleryViewportHeight, setGalleryViewportHeight] = useState(0);
  const [galleryViewportWidth, setGalleryViewportWidth] = useState(0);
  const galleryScrollRef = React.useRef<HTMLDivElement>(null);

  // 数据源状态管理
  const [currentSource, setCurrentSource] = useState<
    'douban' | 'bangumi' | 'cms' | 'tmdb'
  >('tmdb');
  const [originalSource, setOriginalSource] = useState<
    'douban' | 'bangumi' | 'cms' | 'tmdb'
  >('tmdb');
  const [isUsingTmdb, setIsUsingTmdb] = useState(false);
  const [originalDetailData, setOriginalDetailData] =
    useState<DetailData | null>(null);

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

    if (currentSource === 'tmdb') {
      const actualTmdbId = detailData?.tmdbId || tmdbId;
      const actualMediaType = detailData?.mediaType || type;
      if (actualTmdbId) {
        return `https://www.themoviedb.org/${actualMediaType}/${actualTmdbId}`;
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
  const actorsScrollRef = React.useRef<HTMLDivElement>(null);
  const [isActorsDragging, setIsActorsDragging] = useState(false);
  const [isActorsMouseDown, setIsActorsMouseDown] = useState(false);
  const [actorsStartX, setActorsStartX] = useState(0);
  const [actorsScrollLeft, setActorsScrollLeft] = useState(0);

  // 图片点击处理
  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageViewer(true);
  };

  const galleryTmdbId = detailData?.tmdbId || tmdbId;
  const galleryMediaType = detailData?.mediaType || type;
  const canShowGalleryEntry = !!galleryTmdbId && !!galleryMediaType;

  const fetchGalleryImages = async () => {
    if (!galleryTmdbId || !galleryMediaType) return;

    setGalleryLoading(true);
    setGalleryError(null);

    try {
      const response = await fetch(
        `/api/tmdb/images?id=${galleryTmdbId}&type=${galleryMediaType}`,
      );

      if (!response.ok) {
        throw new Error('获取照片墙失败');
      }

      const _apiRes_data = await response.json(); const data = _apiRes_data.success === true ? _apiRes_data.data : _apiRes_data;
      setGalleryImages(data.list || []);
      setGalleryTotal(data.total || 0);
    } catch (err) {
      logger.error('获取照片墙失败:', err);
      setGalleryError(err instanceof Error ? err.message : '获取照片墙失败');
    } finally {
      setGalleryLoading(false);
    }
  };

  const openGallery = () => {
    setShowGallery(true);
  };

  // 确保组件在客户端挂载后才渲染 Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showGallery) {
      setGalleryImages([]);
      setGalleryError(null);
      setGalleryLoading(false);
      setGalleryTotal(0);
      setGalleryScrollTop(0);
      setGalleryViewportHeight(0);
      setGalleryViewportWidth(0);
      return;
    }

    fetchGalleryImages();
  }, [showGallery, galleryTmdbId, galleryMediaType]);

  useEffect(() => {
    if (!showGallery || !galleryScrollRef.current) return;

    const element = galleryScrollRef.current;

    const updateMetrics = () => {
      setGalleryViewportHeight(element.clientHeight);
      setGalleryViewportWidth(element.clientWidth);
      setGalleryScrollTop(element.scrollTop);
    };

    updateMetrics();
    element.addEventListener('scroll', updateMetrics, { passive: true });
    const resizeObserver = new ResizeObserver(updateMetrics);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener('scroll', updateMetrics);
      resizeObserver.disconnect();
    };
  }, [showGallery]);

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

  useEffect(() => {
    if (!isOpen) {
      setShowGallery(false);
    }
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
        // 如果正在使用 TMDB 数据，强制使用 TMDB
        if (isUsingTmdb && title) {
          await fetchTmdbData();
          return;
        }

        // 优先使用苹果CMS数据（短剧等）
        // 如果 cmsData 存在但 desc 为空，尝试通过 source-detail API 获取
        if (cmsData) {
          setCurrentSource('cms');
          setOriginalSource('cms');
          if (cmsData.desc) {
            // 有 desc，直接使用
            const data = {
              title: title,
              intro: cmsData.desc,
              episodesCount: cmsData.episodes?.length,
              poster: poster,
            };
            setDetailData(data);
            setOriginalDetailData(data);
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
                const _apiRes_data = await response.json(); const data = _apiRes_data.success === true ? _apiRes_data.data : _apiRes_data;
                const detailData = {
                  title: data.title || title,
                  intro: data.desc || '',
                  episodesCount:
                    data.episodes?.length || cmsData.episodes?.length,
                  poster: data.poster || poster,
                  year: data.year,
                };
                setDetailData(detailData);
                setOriginalDetailData(detailData);
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
          setOriginalSource('bangumi');
          const actualBangumiId = bangumiId || doubanId;
          const response = await fetch(
            `https://api.bgm.tv/v0/subjects/${actualBangumiId}`,
          );
          if (!response.ok) {
            throw new Error('获取Bangumi详情失败');
          }
          const _apiRes_data = await response.json(); const data = _apiRes_data.success === true ? _apiRes_data.data : _apiRes_data;

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
          setOriginalDetailData(detailData);
          return;
        }

        // 使用豆瓣ID
        if (doubanId && !isBangumi) {
          setCurrentSource('douban');
          setOriginalSource('douban');
          const response = await fetch(`/api/douban/detail?id=${doubanId}`);
          if (!response.ok) {
            throw new Error('获取豆瓣详情失败');
          }
          const _apiRes_data = await response.json(); const data = _apiRes_data.success === true ? _apiRes_data.data : _apiRes_data;

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
          setOriginalDetailData(detailData);
          return;
        }

        // 使用 TMDB 搜索
        if (title) {
          setCurrentSource('tmdb');
          setOriginalSource('tmdb');
          await fetchTmdbData();
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

    // 提取 TMDB 数据获取逻辑为独立函数
    const fetchTmdbData = async () => {
      setCurrentSource('tmdb');
      // 移除季度信息进行搜索
      let searchTitle = title;
      let extractedSeasonNumber = seasonNumber;

      // 匹配各种季度格式: 第一季、第1季、第一部、Season 1、S1等
      const seasonPatterns = [
        /第([一二三四五六七八九十\d]+)[季部]/,
        /Season\s*(\d+)/i,
        /S(\d+)/i,
      ];

      for (const pattern of seasonPatterns) {
        const match = title.match(pattern);
        if (match) {
          searchTitle = title.replace(pattern, '').trim();
          // 如果没有传入seasonNumber,尝试从标题中提取
          if (!extractedSeasonNumber) {
            const seasonStr = match[1];
            // 中文数字转数字
            const chineseNumbers: Record<string, number> = {
              一: 1,
              二: 2,
              三: 3,
              四: 4,
              五: 5,
              六: 6,
              七: 7,
              八: 8,
              九: 9,
              十: 10,
            };
            extractedSeasonNumber =
              chineseNumbers[seasonStr] || parseInt(seasonStr) || undefined;
          }
          break;
        }
      }

      const searchResponse = await fetch(
        `/api/tmdb/search?query=${encodeURIComponent(searchTitle)}`,
      );
      if (!searchResponse.ok) {
        throw new Error('搜索失败');
      }
      const _apiRes_searchData = await searchResponse.json(); const searchData = _apiRes_searchData.success === true ? _apiRes_searchData.data : _apiRes_searchData;

      if (searchData.results && searchData.results.length > 0) {
        const result = searchData.results[0];
        const detailId = result.id;
        const mediaType = result.media_type || type;

        // 获取详情
        const detailResponse = await fetch(
          `/api/tmdb/detail?id=${detailId}&type=${mediaType}`,
        );
        if (!detailResponse.ok) {
          throw new Error('获取TMDB详情失败');
        }
        const _apiRes_detailResult = await detailResponse.json(); const detailResult = _apiRes_detailResult.success === true ? _apiRes_detailResult.data : _apiRes_detailResult;

        // 如果有季度信息,尝试获取季度详情
        let seasonData = null;
        if (extractedSeasonNumber && mediaType === 'tv') {
          try {
            const seasonResponse = await fetch(
              `/api/tmdb/seasons?id=${detailId}&season=${extractedSeasonNumber}`,
            );
            if (seasonResponse.ok) {
              const _apiRes_seasonData = await seasonResponse.json();
              seasonData = _apiRes_seasonData.success === true ? _apiRes_seasonData.data : _apiRes_seasonData;
            }
          } catch (err) {
            logger.error('获取季度信息失败', err);
          }
        }

        setDetailData({
          title: mediaType === 'movie' ? detailResult.title : detailResult.name,
          originalTitle:
            mediaType === 'movie'
              ? detailResult.original_title
              : detailResult.original_name,
          year:
            mediaType === 'movie'
              ? detailResult.release_date?.substring(0, 4)
              : detailResult.first_air_date?.substring(0, 4),
          poster: detailResult.poster_path
            ? processImageUrl(getTMDBImageUrl(detailResult.poster_path, 'w500'))
            : poster,
          rating: detailResult.vote_average
            ? {
                value: detailResult.vote_average,
                count: detailResult.vote_count,
              }
            : undefined,
          intro: seasonData?.overview || detailResult.overview,
          genres: detailResult.genres?.map((g: any) => g.name),
          countries: detailResult.production_countries?.map((c: any) => c.name),
          languages: detailResult.spoken_languages?.map((l: any) => l.name),
          duration: detailResult.runtime
            ? `${detailResult.runtime}分钟`
            : undefined,
          episodesCount:
            seasonData?.episodes?.length || detailResult.number_of_episodes,
          releaseDate:
            mediaType === 'movie'
              ? detailResult.release_date
              : detailResult.first_air_date,
          status: detailResult.status,
          tagline: detailResult.tagline,
          seasons: detailResult.number_of_seasons,
          overview: detailResult.overview,
          tmdbId: detailId,
          mediaType: mediaType,
          seasonNumber: extractedSeasonNumber,
        });
        return;
      }

      throw new Error('未找到相关内容');
    };

    fetchDetail();
  }, [
    isOpen,
    doubanId,
    bangumiId,
    isBangumi,
    tmdbId,
    title,
    type,
    seasonNumber,
    poster,
    cmsData,
    sourceId,
    source,
    isUsingTmdb,
  ]);

  // 切换数据源的函数
  const handleToggleSource = async () => {
    if (currentSource === 'tmdb') {
      // 切换回原始数据源
      if (originalDetailData) {
        setDetailData(originalDetailData);
        setCurrentSource(originalSource);
        setError(null);
      }
    } else {
      // 切换到 TMDB
      // 保存当前数据
      if (detailData && !originalDetailData) {
        setOriginalDetailData(detailData);
      }

      setLoading(true);
      setError(null);
      try {
        await fetchTmdbDataForToggle();
      } catch (err) {
        logger.error('切换到TMDB失败:', err);
        setError(err instanceof Error ? err.message : '切换到TMDB失败');
        // 切换失败，但保持 currentSource 为 tmdb，这样可以显示切换回按钮
        setCurrentSource('tmdb');
      } finally {
        setLoading(false);
      }
    }
  };

  // 用于切换时获取 TMDB 数据
  const fetchTmdbDataForToggle = async () => {
    // 移除季度信息进行搜索
    let searchTitle = title;
    let extractedSeasonNumber = seasonNumber;

    // 匹配各种季度格式: 第一季、第1季、第一部、Season 1、S1等
    const seasonPatterns = [
      /第([一二三四五六七八九十\d]+)[季部]/,
      /Season\s*(\d+)/i,
      /S(\d+)/i,
    ];

    for (const pattern of seasonPatterns) {
      const match = title.match(pattern);
      if (match) {
        searchTitle = title.replace(pattern, '').trim();
        // 如果没有传入seasonNumber,尝试从标题中提取
        if (!extractedSeasonNumber) {
          const seasonStr = match[1];
          // 中文数字转数字
          const chineseNumbers: Record<string, number> = {
            一: 1,
            二: 2,
            三: 3,
            四: 4,
            五: 5,
            六: 6,
            七: 7,
            八: 8,
            九: 9,
            十: 10,
          };
          extractedSeasonNumber =
            chineseNumbers[seasonStr] || parseInt(seasonStr) || undefined;
        }
        break;
      }
    }

    const searchResponse = await fetch(
      `/api/tmdb/search?query=${encodeURIComponent(searchTitle)}`,
    );
    if (!searchResponse.ok) {
      throw new Error('搜索失败');
    }
    const _apiRes_searchData = await searchResponse.json(); const searchData = _apiRes_searchData.success === true ? _apiRes_searchData.data : _apiRes_searchData;

    if (searchData.results && searchData.results.length > 0) {
      const result = searchData.results[0];
      const detailId = result.id;
      const mediaType = result.media_type || type;

      // 获取详情
      const detailResponse = await fetch(
        `/api/tmdb/detail?id=${detailId}&type=${mediaType}`,
      );
      if (!detailResponse.ok) {
        throw new Error('获取TMDB详情失败');
      }
      const _apiRes_detailResult = await detailResponse.json(); const detailResult = _apiRes_detailResult.success === true ? _apiRes_detailResult.data : _apiRes_detailResult;

      // 如果有季度信息,尝试获取季度详情
      let seasonData = null;
      if (extractedSeasonNumber && mediaType === 'tv') {
        try {
          const seasonResponse = await fetch(
            `/api/tmdb/seasons?id=${detailId}&season=${extractedSeasonNumber}`,
          );
          if (seasonResponse.ok) {
            const _apiRes_seasonData = await seasonResponse.json();
            seasonData = _apiRes_seasonData.success === true ? _apiRes_seasonData.data : _apiRes_seasonData;
          }
        } catch (err) {
          logger.error('获取季度信息失败', err);
        }
      }

      setDetailData({
        title: mediaType === 'movie' ? detailResult.title : detailResult.name,
        originalTitle:
          mediaType === 'movie'
            ? detailResult.original_title
            : detailResult.original_name,
        year:
          mediaType === 'movie'
            ? detailResult.release_date?.substring(0, 4)
            : detailResult.first_air_date?.substring(0, 4),
        poster: detailResult.poster_path
          ? processImageUrl(getTMDBImageUrl(detailResult.poster_path, 'w500'))
          : poster,
        rating: detailResult.vote_average
          ? {
              value: detailResult.vote_average,
              count: detailResult.vote_count,
            }
          : undefined,
        intro: seasonData?.overview || detailResult.overview,
        genres: detailResult.genres?.map((g: any) => g.name),
        countries: detailResult.production_countries?.map((c: any) => c.name),
        languages: detailResult.spoken_languages?.map((l: any) => l.name),
        duration: detailResult.runtime
          ? `${detailResult.runtime}分钟`
          : undefined,
        episodesCount:
          seasonData?.episodes?.length || detailResult.number_of_episodes,
        releaseDate:
          mediaType === 'movie'
            ? detailResult.release_date
            : detailResult.first_air_date,
        status: detailResult.status,
        tagline: detailResult.tagline,
        seasons: detailResult.number_of_seasons,
        overview: detailResult.overview,
        tmdbId: detailId,
        mediaType: mediaType,
        seasonNumber: extractedSeasonNumber,
      });
      setCurrentSource('tmdb');
      return;
    }

    throw new Error('未找到相关内容');
  };

  // 异步获取季度和集数详情（仅TMDB）
  useEffect(() => {
    if (
      !detailData?.tmdbId ||
      !detailData?.mediaType ||
      detailData.mediaType !== 'tv' ||
      seasonsLoaded
    ) {
      return;
    }

    const fetchSeasonData = async () => {
      setLoadingSeasons(true);
      try {
        // 获取所有季度
        const seasonsResponse = await fetch(
          `/api/tmdb/seasons?tvId=${detailData.tmdbId}`,
        );
        if (!seasonsResponse.ok) return;
        const _apiRes_seasonsData = await seasonsResponse.json(); const seasonsData = _apiRes_seasonsData.success === true ? _apiRes_seasonsData.data : _apiRes_seasonsData;

        // 设置默认选中季度
        const defaultSeason = detailData.seasonNumber || 1;
        setSelectedSeason(defaultSeason);

        // 获取默认季度的集数详情
        const episodesResponse = await fetch(
          `/api/tmdb/episodes?id=${detailData.tmdbId}&season=${defaultSeason}`,
        );
        if (!episodesResponse.ok) return;
        const _apiRes_episodesData = await episodesResponse.json(); const episodesData = _apiRes_episodesData.success === true ? _apiRes_episodesData.data : _apiRes_episodesData;

        setSeasonData({
          seasons: seasonsData.seasons || [],
          episodes: episodesData.episodes || [],
        });
        setSeasonsLoaded(true);
      } catch (err) {
        logger.error('获取季度和集数详情失败:', err);
      } finally {
        setLoadingSeasons(false);
      }
    };

    fetchSeasonData();
  }, [
    detailData?.tmdbId,
    detailData?.mediaType,
    detailData?.seasonNumber,
    seasonsLoaded,
  ]);

  // 自动滚动到当前集数
  useEffect(() => {
    if (
      !currentEpisode ||
      !seasonData?.episodes ||
      !episodesScrollRef.current ||
      currentSource !== 'tmdb'
    ) {
      return;
    }

    // 等待 DOM 更新后再滚动
    const timer = setTimeout(() => {
      const episodeElement = document.getElementById(
        `episode-${currentEpisode}`,
      );
      if (episodeElement && episodesScrollRef.current) {
        // 计算滚动位置，使当前集数居中显示
        const container = episodesScrollRef.current;
        const elementLeft = episodeElement.offsetLeft;
        const elementWidth = episodeElement.offsetWidth;
        const containerWidth = container.offsetWidth;
        const scrollLeft = elementLeft - containerWidth / 2 + elementWidth / 2;

        container.scrollLeft = scrollLeft;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [currentEpisode, seasonData?.episodes, currentSource]);

  // 异步获取演职人员信息（仅TMDB）
  useEffect(() => {
    if (
      !detailData?.tmdbId ||
      !detailData?.mediaType ||
      currentSource !== 'tmdb'
    ) {
      return;
    }

    // 如果已经有演员信息，不重复获取
    if (detailData.actors && detailData.actors.length > 0) {
      return;
    }

    const fetchCredits = async () => {
      try {
        const creditsResponse = await fetch(
          `/api/tmdb/credits?id=${detailData.tmdbId}&type=${detailData.mediaType}`,
        );
        if (!creditsResponse.ok) return;
        const _apiRes_creditsData = await creditsResponse.json(); const creditsData = _apiRes_creditsData.success === true ? _apiRes_creditsData.data : _apiRes_creditsData;

        // 更新演员和导演信息
        setDetailData((prev) =>
          prev
            ? {
                ...prev,
                directors:
                  creditsData.crew
                    ?.filter((person: any) => person.job === 'Director')
                    .slice(0, 5)
                    .map((person: any) => ({
                      name: person.name,
                      profile_path: person.profile_path,
                    })) || prev.directors,
                actors:
                  creditsData.cast?.slice(0, 15).map((person: any) => ({
                    name: person.name,
                    character: person.character,
                    profile_path: person.profile_path,
                  })) || prev.actors,
              }
            : null,
        );
      } catch (err) {
        logger.error('获取演职人员信息失败:', err);
      }
    };

    fetchCredits();
  }, [
    detailData?.tmdbId,
    detailData?.mediaType,
    currentSource,
    detailData?.actors,
  ]);

  // 切换季度时获取集数
  const handleSeasonChange = async (seasonNumber: number) => {
    if (!detailData?.tmdbId || selectedSeason === seasonNumber) return;

    setSelectedSeason(seasonNumber);
    setLoadingSeasons(true);
    try {
      const episodesResponse = await fetch(
        `/api/tmdb/episodes?id=${detailData.tmdbId}&season=${seasonNumber}`,
      );
      if (!episodesResponse.ok) return;
      const _apiRes_episodesData = await episodesResponse.json(); const episodesData = _apiRes_episodesData.success === true ? _apiRes_episodesData.data : _apiRes_episodesData;

      // 从当前 seasonData 中查找季度信息
      const season = seasonData?.seasons.find(
        (s: any) => s.season_number === seasonNumber,
      );

      setSeasonData((prev) => ({
        seasons: prev?.seasons || [],
        episodes: episodesData.episodes || [],
      }));

      // 更新季度元信息
      setDetailData((prev) =>
        prev
          ? {
              ...prev,
              title: episodesData.name || season?.name || prev.title,
              intro: episodesData.overview || season?.overview || prev.overview,
              poster: season?.poster_path
                ? getTMDBImageUrl(season.poster_path, 'w500')
                : prev.poster,
              releaseDate:
                episodesData.air_date || season?.air_date || prev.releaseDate,
              year:
                episodesData.air_date?.substring(0, 4) ||
                season?.air_date?.substring(0, 4) ||
                prev.year,
              episodesCount:
                episodesData.episodes?.length ||
                season?.episode_count ||
                prev.episodesCount,
            }
          : null,
      );

      setExpandedEpisodes(new Set());
    } catch (err) {
      logger.error('获取集数详情失败:', err);
    } finally {
      setLoadingSeasons(false);
    }
  };

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

  // 演员列表拖动滚动处理函数
  const handleActorsMouseDown = (e: React.MouseEvent) => {
    if (!actorsScrollRef.current) return;
    setIsActorsMouseDown(true);
    setActorsStartX(e.pageX - actorsScrollRef.current.offsetLeft);
    setActorsScrollLeft(actorsScrollRef.current.scrollLeft);
  };

  const handleActorsMouseMove = (e: React.MouseEvent) => {
    if (!isActorsMouseDown || !actorsScrollRef.current) return;

    const x = e.pageX - actorsScrollRef.current.offsetLeft;
    const distance = Math.abs(x - actorsStartX);

    // 只有移动超过5px才进入拖动模式
    if (distance > 5 && !isActorsDragging) {
      setIsActorsDragging(true);
      actorsScrollRef.current.style.cursor = 'grabbing';
      actorsScrollRef.current.style.userSelect = 'none';
    }

    if (isActorsDragging) {
      e.preventDefault();
      const walk = (x - actorsStartX) * 2; // 滚动速度倍数
      actorsScrollRef.current.scrollLeft = actorsScrollLeft - walk;
    }
  };

  const handleActorsMouseUp = () => {
    setIsActorsMouseDown(false);
    setIsActorsDragging(false);
    if (actorsScrollRef.current) {
      actorsScrollRef.current.style.cursor = 'grab';
      actorsScrollRef.current.style.userSelect = 'auto';
    }
  };

  const handleActorsMouseLeave = () => {
    if (isActorsMouseDown || isActorsDragging) {
      setIsActorsMouseDown(false);
      setIsActorsDragging(false);
      if (actorsScrollRef.current) {
        actorsScrollRef.current.style.cursor = 'grab';
        actorsScrollRef.current.style.userSelect = 'auto';
      }
    }
  };

  const galleryEntryButton = canShowGalleryEntry ? (
    <button
      onClick={openGallery}
      className='inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-600'
    >
      <Images size={16} />
      照片墙
    </button>
  ) : null;

  const virtualGalleryLayout = React.useMemo(() => {
    if (galleryImages.length === 0 || galleryViewportWidth <= 0) {
      return {
        visibleItems: [] as Array<
          GalleryImage & {
            top: number;
            left: number;
            renderWidth: number;
            renderHeight: number;
            index: number;
          }
        >,
        totalHeight: 0,
        usedWidth: 0,
      };
    }

    const gap = 4;
    const overscan = 800;
    const horizontalPadding = 32;
    const width = Math.max(galleryViewportWidth - horizontalPadding, 0);
    const columnCount =
      width >= 1280 ? 5 : width >= 1024 ? 4 : width >= 640 ? 3 : 2;
    const columnWidth = Math.floor(
      (width - gap * (columnCount - 1)) / columnCount,
    );
    const usedWidth = columnWidth * columnCount + gap * (columnCount - 1);
    const columnHeights = new Array(columnCount).fill(0);

    const items = galleryImages.map((image, index) => {
      let targetColumn = 0;
      for (let i = 1; i < columnCount; i++) {
        if (columnHeights[i] < columnHeights[targetColumn]) {
          targetColumn = i;
        }
      }

      const ratio =
        image.width && image.height
          ? image.height / image.width
          : image.imageType === 'poster'
            ? 1.5
            : 0.5625;
      const renderHeight = Math.max(Math.round(columnWidth * ratio), 80);
      const top = columnHeights[targetColumn];
      const left = targetColumn * (columnWidth + gap);

      columnHeights[targetColumn] += renderHeight + gap;

      return {
        ...image,
        index,
        top,
        left,
        renderWidth: columnWidth,
        renderHeight,
      };
    });

    const totalHeight = Math.max(...columnHeights, 0);
    const minVisibleTop = Math.max(galleryScrollTop - overscan, 0);
    const maxVisibleBottom =
      galleryScrollTop + galleryViewportHeight + overscan;
    const visibleItems = items.filter(
      (item) =>
        item.top + item.renderHeight >= minVisibleTop &&
        item.top <= maxVisibleBottom,
    );

    return { visibleItems, totalHeight, usedWidth };
  }, [
    galleryImages,
    galleryScrollTop,
    galleryViewportHeight,
    galleryViewportWidth,
  ]);

  const galleryBody = (
    <div
      ref={galleryScrollRef}
      className='flex-1 overflow-y-auto overflow-x-hidden p-4'
    >
      {galleryLoading && (
        <div className='flex items-center justify-center py-20'>
          <div className='h-10 w-10 animate-spin rounded-full border-b-2 border-green-500'></div>
        </div>
      )}

      {!galleryLoading && galleryError && (
        <div className='py-12 text-center text-red-500 dark:text-red-400'>
          {galleryError}
        </div>
      )}

      {!galleryLoading && !galleryError && galleryImages.length === 0 && (
        <div className='py-12 text-center text-gray-500 dark:text-gray-400'>
          暂无图片
        </div>
      )}

      {!galleryLoading && !galleryError && galleryImages.length > 0 && (
        <div
          className='relative mx-auto'
          style={{
            height: virtualGalleryLayout.totalHeight,
            width: virtualGalleryLayout.usedWidth || '100%',
          }}
        >
          {virtualGalleryLayout.visibleItems.map((image) => {
            const imageUrl = getTMDBImageUrl(
              image.file_path,
              image.imageType === 'poster' ? 'w500' : 'original',
            );
            const thumbUrl = getTMDBImageUrl(
              image.file_path,
              image.imageType === 'poster' ? 'w342' : 'w780',
            );

            return (
              <div
                key={`${image.imageType}-${image.file_path}-${image.index}`}
                className='group absolute'
                style={{
                  top: image.top,
                  left: image.left,
                  width: image.renderWidth,
                  height: image.renderHeight,
                }}
              >
                <div
                  className='relative h-full w-full cursor-pointer overflow-hidden rounded-md bg-gray-100 transition-opacity hover:opacity-90 dark:bg-gray-800'
                  onClick={() => handleImageClick(imageUrl)}
                >
                  <ProxyImage
                    originalSrc={thumbUrl}
                    alt={`${detailData?.title || title}-gallery-${image.index + 1}`}
                    className='absolute inset-0 h-full w-full object-cover'
                    draggable={false}
                  />
                  <div className='absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white'>
                    {image.imageType === 'poster' ? '海报' : '剧照'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const galleryHeader = (
    <div className='flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800'>
      <div>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
          照片墙
        </h3>
        {!galleryLoading && (
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            共 {galleryTotal} 张
          </p>
        )}
      </div>
      <button
        onClick={() => setShowGallery(false)}
        className='rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800'
        aria-label='关闭照片墙'
      >
        <X size={20} className='text-gray-500 dark:text-gray-400' />
      </button>
    </div>
  );

  const galleryModal = showGallery ? (
    useDrawer ? (
      <div className='pointer-events-none fixed inset-0 z-[10000] flex items-center justify-end'>
        <div
          className={`relative ${drawerWidth} pointer-events-auto flex h-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-900`}
        >
          {galleryHeader}
          {galleryBody}
        </div>
      </div>
    ) : (
      <div className='fixed inset-0 z-[10000] flex items-center justify-center p-4'>
        <div
          className='absolute inset-0 bg-black/60'
          onClick={() => setShowGallery(false)}
        />
        <div className='relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900'>
          {galleryHeader}
          {galleryBody}
        </div>
      </div>
    )
  ) : null;

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
                      {currentSource === 'tmdb' && 'TMDB'}
                    </span>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    {galleryEntryButton}
                    {currentSource !== 'tmdb' && (
                      <button
                        onClick={handleToggleSource}
                        disabled={loading}
                        className='rounded-lg bg-green-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50'
                      >
                        切换到 TMDB
                      </button>
                    )}
                    {currentSource === 'tmdb' &&
                      originalSource !== 'tmdb' &&
                      originalDetailData && (
                        <button
                          onClick={handleToggleSource}
                          disabled={loading}
                          className='rounded-lg bg-gray-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50'
                        >
                          切换回{' '}
                          {originalSource === 'douban'
                            ? 'Douban'
                            : originalSource === 'bangumi'
                              ? 'Bangumi'
                              : 'CMS'}
                        </button>
                      )}
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
                    {galleryEntryButton}
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
                  {currentSource === 'tmdb' ? (
                    <div
                      ref={actorsScrollRef}
                      onMouseDown={handleActorsMouseDown}
                      onMouseMove={handleActorsMouseMove}
                      onMouseUp={handleActorsMouseUp}
                      onMouseLeave={handleActorsMouseLeave}
                      className='-mx-6 cursor-grab overflow-x-auto px-6 active:cursor-grabbing'
                      style={{
                        scrollbarWidth: 'thin',
                        scrollBehavior: isActorsDragging ? 'auto' : 'smooth',
                      }}
                    >
                      <div className='flex gap-4 pb-2'>
                        {detailData.actors.map((actor, index) => (
                          <div
                            key={index}
                            className='flex flex-shrink-0 flex-col items-center'
                            style={{
                              pointerEvents: isActorsDragging ? 'none' : 'auto',
                            }}
                          >
                            {actor.profile_path ? (
                              <div
                                className='relative mb-2 h-20 w-20 cursor-pointer overflow-hidden rounded-full bg-gray-200 transition-opacity hover:opacity-80 dark:bg-gray-700'
                                onClick={() =>
                                  handleImageClick(
                                    getTMDBImageUrl(
                                      actor.profile_path || null,
                                      'w185',
                                    ),
                                  )
                                }
                              >
                                <ProxyImage
                                  originalSrc={getTMDBImageUrl(
                                    actor.profile_path || null,
                                    'w185',
                                  )}
                                  alt={actor.name}
                                  className='absolute inset-0 h-full w-full object-cover'
                                  draggable={false}
                                />
                              </div>
                            ) : (
                              <div className='mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700'>
                                <Users size={28} className='text-gray-400' />
                              </div>
                            )}
                            <a
                              href={`https://baike.baidu.com/item/${encodeURIComponent(actor.name)}`}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='line-clamp-2 w-20 cursor-pointer text-center text-xs font-medium text-gray-900 transition-colors hover:text-green-600 dark:text-gray-100 dark:hover:text-green-400'
                              onClick={(e) => e.stopPropagation()}
                            >
                              {actor.name}
                            </a>
                            {actor.character && (
                              <p className='line-clamp-2 w-20 text-center text-xs text-gray-500 dark:text-gray-400'>
                                {actor.character}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
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

              {/* 季度和集数信息（仅TMDB电视剧） */}
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
                                  handleSeasonChange(season.season_number)
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
                      {currentSource === 'tmdb' && 'TMDB'}
                    </span>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    {galleryEntryButton}
                    {currentSource !== 'tmdb' && (
                      <button
                        onClick={handleToggleSource}
                        disabled={loading}
                        className='rounded-lg bg-green-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50'
                      >
                        切换到 TMDB
                      </button>
                    )}
                    {currentSource === 'tmdb' &&
                      originalSource !== 'tmdb' &&
                      originalDetailData && (
                        <button
                          onClick={handleToggleSource}
                          disabled={loading}
                          className='rounded-lg bg-gray-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50'
                        >
                          切换回{' '}
                          {originalSource === 'douban'
                            ? 'Douban'
                            : originalSource === 'bangumi'
                              ? 'Bangumi'
                              : 'CMS'}
                        </button>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 图片查看器 */}
      {galleryModal}
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
                      {currentSource === 'tmdb' && 'TMDB'}
                    </span>
                  </div>
                  {currentSource !== 'tmdb' && (
                    <button
                      onClick={handleToggleSource}
                      disabled={loading}
                      className='rounded-lg bg-green-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                      切换到 TMDB
                    </button>
                  )}
                  {currentSource === 'tmdb' &&
                    originalSource !== 'tmdb' &&
                    originalDetailData && (
                      <button
                        onClick={handleToggleSource}
                        disabled={loading}
                        className='rounded-lg bg-gray-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50'
                      >
                        切换回{' '}
                        {originalSource === 'douban'
                          ? 'Douban'
                          : originalSource === 'bangumi'
                            ? 'Bangumi'
                            : 'CMS'}
                      </button>
                    )}
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
                    {galleryEntryButton}
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
                  {currentSource === 'tmdb' ? (
                    <div
                      ref={actorsScrollRef}
                      onMouseDown={handleActorsMouseDown}
                      onMouseMove={handleActorsMouseMove}
                      onMouseUp={handleActorsMouseUp}
                      onMouseLeave={handleActorsMouseLeave}
                      className='-mx-6 cursor-grab overflow-x-auto px-6 active:cursor-grabbing'
                      style={{
                        scrollbarWidth: 'thin',
                        scrollBehavior: isActorsDragging ? 'auto' : 'smooth',
                      }}
                    >
                      <div className='flex gap-4 pb-2'>
                        {detailData.actors.map((actor, index) => (
                          <div
                            key={index}
                            className='flex flex-shrink-0 flex-col items-center'
                            style={{
                              pointerEvents: isActorsDragging ? 'none' : 'auto',
                            }}
                          >
                            {actor.profile_path ? (
                              <div
                                className='relative mb-2 h-20 w-20 cursor-pointer overflow-hidden rounded-full bg-gray-200 transition-opacity hover:opacity-80 dark:bg-gray-700'
                                onClick={() =>
                                  handleImageClick(
                                    getTMDBImageUrl(
                                      actor.profile_path || null,
                                      'w185',
                                    ),
                                  )
                                }
                              >
                                <ProxyImage
                                  originalSrc={getTMDBImageUrl(
                                    actor.profile_path || null,
                                    'w185',
                                  )}
                                  alt={actor.name}
                                  className='absolute inset-0 h-full w-full object-cover'
                                  draggable={false}
                                />
                              </div>
                            ) : (
                              <div className='mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700'>
                                <Users size={28} className='text-gray-400' />
                              </div>
                            )}
                            <a
                              href={`https://baike.baidu.com/item/${encodeURIComponent(actor.name)}`}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='line-clamp-2 w-20 cursor-pointer text-center text-xs font-medium text-gray-900 transition-colors hover:text-green-600 dark:text-gray-100 dark:hover:text-green-400'
                              onClick={(e) => e.stopPropagation()}
                            >
                              {actor.name}
                            </a>
                            {actor.character && (
                              <p className='line-clamp-2 w-20 text-center text-xs text-gray-500 dark:text-gray-400'>
                                {actor.character}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
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

              {/* 季度和集数信息（仅TMDB电视剧） */}
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
                                  handleSeasonChange(season.season_number)
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
                      {currentSource === 'tmdb' && 'TMDB'}
                    </span>
                  </div>
                  {currentSource !== 'tmdb' && (
                    <button
                      onClick={handleToggleSource}
                      disabled={loading}
                      className='rounded-lg bg-green-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                      切换到 TMDB
                    </button>
                  )}
                  {currentSource === 'tmdb' &&
                    originalSource !== 'tmdb' &&
                    originalDetailData && (
                      <button
                        onClick={handleToggleSource}
                        disabled={loading}
                        className='rounded-lg bg-gray-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50'
                      >
                        切换回{' '}
                        {originalSource === 'douban'
                          ? 'Douban'
                          : originalSource === 'bangumi'
                            ? 'Bangumi'
                            : 'CMS'}
                      </button>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 图片查看器 */}
      {galleryModal}
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
