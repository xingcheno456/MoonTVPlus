'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  getRecommendationCache,
  recommendationCacheKeys,
  setRecommendationCache,
} from '@/lib/recommendations/cache';
import { parseApiResponse } from '@/lib/api-response';
import { useEnableComments } from '@/hooks/useEnableComments';
import { useRecommendationDataSource } from '@/hooks/useRecommendationDataSource';

import ScrollableRow from '@/components/common/ScrollableRow';
import VideoCard from '@/components/VideoCard';

import { logger } from '../lib/logger';

interface Recommendation {
  doubanId?: string;
  tmdbId?: number;
  title: string;
  poster: string;
  rating: string;
  mediaType?: 'movie' | 'tv';
}

interface SmartRecommendationsProps {
  doubanId?: number;
  videoTitle: string;
}

export default function SmartRecommendations({
  doubanId,
  videoTitle,
}: SmartRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enableComments = useEnableComments();
  const recommendationDataSource = useRecommendationDataSource();

  // 决定使用哪个数据源
  const getDataSource = useCallback(() => {
    // 如果没有配置，默认使用混合模式
    const dataSource = recommendationDataSource || 'Mixed';

    switch (dataSource) {
      case 'TMDB':
        return 'tmdb';
      case 'Douban':
        // 豆瓣类型需要检查开关和豆瓣ID
        return enableComments && doubanId ? 'douban' : null;
      case 'Mixed':
        // 混合模式：优先豆瓣，无豆瓣ID或关闭评论开关时使用TMDB
        if (!enableComments || !doubanId) {
          return 'tmdb';
        }
        return 'douban';
      default:
        return doubanId && enableComments ? 'douban' : 'tmdb';
    }
  }, [recommendationDataSource, enableComments, doubanId]);

  const fetchDoubanRecommendations = useCallback(async () => {
    if (!doubanId) return;

    try {
      logger.info('正在获取豆瓣推荐');
      setLoading(true);
      setError(null);

      const cacheKey = recommendationCacheKeys.doubanRecommendations(doubanId);
      const cached = getRecommendationCache<Recommendation[]>(cacheKey);

      if (cached) {
        logger.info('使用缓存的豆瓣推荐数据');
        setRecommendations(cached);
        setLoading(false);
        return;
      }

      const response = await fetch(
        `/api/douban-recommendations?id=${doubanId}`,
      );

      if (!response.ok) {
        throw new Error('获取豆瓣推荐失败');
      }

      const result = await parseApiResponse<any>(response);
      const recommendationsData = result.recommendations || [];
      setRecommendations(recommendationsData);

      setRecommendationCache(cacheKey, recommendationsData);
    } catch (err) {
      logger.error('获取豆瓣推荐失败:', err);
      setError(err instanceof Error ? err.message : '获取推荐失败');
    } finally {
      setLoading(false);
    }
  }, [doubanId]);

  const fetchTMDBRecommendations = useCallback(async () => {
    if (!videoTitle) return;

    try {
      logger.info('正在获取TMDB推荐');
      setLoading(true);
      setError(null);

      const mappingCacheKey =
        recommendationCacheKeys.tmdbTitleMapping(videoTitle);
      const cachedId = getRecommendationCache<string>(mappingCacheKey);

      if (cachedId) {
        logger.info('使用缓存的TMDB ID映射');

        const recommendationsCacheKey =
          recommendationCacheKeys.tmdbRecommendations(cachedId);
        const recommendationsCache = getRecommendationCache<Recommendation[]>(
          recommendationsCacheKey,
        );

        if (recommendationsCache) {
          logger.info('使用缓存的TMDB推荐数据');
          setRecommendations(recommendationsCache);
          setLoading(false);
          return;
        }
      }

      // 构建请求URL
      const url = cachedId
        ? `/api/tmdb-recommendations?cachedId=${encodeURIComponent(cachedId)}`
        : `/api/tmdb-recommendations?title=${encodeURIComponent(videoTitle)}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('获取TMDB推荐失败');
      }

      const result = await parseApiResponse<any>(response);
      const recommendationsData = result.recommendations || [];
      setRecommendations(recommendationsData);

      // 保存title到tmdbId的映射到localStorage（1个月）
      if (result.tmdbId) {
        try {
          setRecommendationCache(mappingCacheKey, String(result.tmdbId));

          const recommendationsCacheKey =
            recommendationCacheKeys.tmdbRecommendations(result.tmdbId);
          setRecommendationCache(recommendationsCacheKey, recommendationsData);
        } catch (e) {
          logger.error('保存缓存失败:', e);
        }
      }
    } catch (err) {
      logger.error('获取TMDB推荐失败:', err);
      setError(err instanceof Error ? err.message : '获取推荐失败');
    } finally {
      setLoading(false);
    }
  }, [videoTitle]);

  useEffect(() => {
    const dataSource = getDataSource();

    if (!dataSource) {
      // 不显示推荐
      setRecommendations([]);
      return;
    }

    if (dataSource === 'douban') {
      fetchDoubanRecommendations();
    } else if (dataSource === 'tmdb') {
      fetchTMDBRecommendations();
    }
  }, [getDataSource, fetchDoubanRecommendations, fetchTMDBRecommendations]);

  // 如果不应该显示推荐，返回null
  const dataSource = getDataSource();
  if (!dataSource) {
    return null;
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <div className='h-8 w-8 animate-spin rounded-full border-b-2 border-green-500'></div>
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return null;
  }

  return (
    <div className='-mx-3 mt-6 md:mx-0 md:px-4'>
      <div className='overflow-hidden rounded-xl border border-gray-200/50 bg-white/50 backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-800/50'>
        {/* 标题 */}
        <div className='border-b border-gray-200 px-3 py-4 dark:border-gray-700 md:px-6'>
          <h3 className='flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white'>
            <svg className='h-5 w-5' fill='currentColor' viewBox='0 0 24 24'>
              <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
            </svg>
            更多推荐
          </h3>
        </div>

        {/* 推荐内容 */}
        <div className='px-3 pt-3 md:px-6 md:pt-6'>
          <ScrollableRow scrollDistance={600} bottomPadding='pb-2'>
            {recommendations.map((rec, index) => (
              <div
                key={rec.doubanId || rec.tmdbId || index}
                className='w-24 min-w-[96px] sm:w-[140px] sm:min-w-[140px]'
              >
                <VideoCard
                  title={rec.title}
                  poster={rec.poster}
                  rate={rec.rating}
                  douban_id={rec.doubanId ? parseInt(rec.doubanId) : undefined}
                  tmdb_id={rec.tmdbId}
                  from={rec.doubanId ? 'douban' : 'tmdb'}
                />
              </div>
            ))}
          </ScrollableRow>
        </div>
      </div>
    </div>
  );
}
