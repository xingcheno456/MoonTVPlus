'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  getRecommendationCache,
  recommendationCacheKeys,
  setRecommendationCache,
} from '@/lib/recommendations/cache';
import { parseApiResponse } from '@/lib/api-response';
import { useEnableComments } from '@/hooks/useEnableComments';

import ScrollableRow from '@/components/ScrollableRow';
import VideoCard from '@/components/VideoCard';

import { logger } from '../lib/logger';

interface DoubanRecommendation {
  doubanId: string;
  title: string;
  poster: string;
  rating: string;
}

interface DoubanRecommendationsProps {
  doubanId: number;
}

export default function DoubanRecommendations({
  doubanId,
}: DoubanRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<
    DoubanRecommendation[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enableComments = useEnableComments();

  const fetchRecommendations = useCallback(async () => {
    try {
      logger.info('正在获取推荐');
      setLoading(true);
      setError(null);

      const cacheKey = recommendationCacheKeys.doubanRecommendations(doubanId);
      const cached = getRecommendationCache<DoubanRecommendation[]>(cacheKey);

      if (cached) {
        logger.info('使用缓存的推荐数据');
        setRecommendations(cached);
        setLoading(false);
        return;
      }

      const response = await fetch(
        `/api/douban-recommendations?id=${doubanId}`,
      );

      if (!response.ok) {
        throw new Error('获取推荐失败');
      }

      const result = await parseApiResponse<any>(response);
      logger.info('获取到推荐:', result.recommendations);

      const recommendationsData = result.recommendations || [];
      setRecommendations(recommendationsData);

      setRecommendationCache(cacheKey, recommendationsData);
    } catch (err) {
      logger.error('获取推荐失败:', err);
      setError(err instanceof Error ? err.message : '获取推荐失败');
    } finally {
      setLoading(false);
    }
  }, [doubanId]);

  useEffect(() => {
    if (enableComments && doubanId) {
      fetchRecommendations();
    }
  }, [enableComments, doubanId, fetchRecommendations]);

  if (!enableComments) {
    return null;
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <div className='h-8 w-8 animate-spin rounded-full border-b-2 border-green-500'></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='py-8 text-center text-gray-500 dark:text-gray-400'>
        {error}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <ScrollableRow scrollDistance={600} bottomPadding='pb-2'>
      {recommendations.map((rec) => (
        <div
          key={rec.doubanId}
          className='w-24 min-w-[96px] sm:w-[140px] sm:min-w-[140px]'
        >
          <VideoCard
            title={rec.title}
            poster={rec.poster}
            rate={rec.rating}
            douban_id={parseInt(rec.doubanId)}
            from='douban'
          />
        </div>
      ))}
    </ScrollableRow>
  );
}
