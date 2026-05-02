'use client';

import { useCallback, useEffect, useState } from 'react';
import { parseApiResponse } from '@/lib/api-response';

import { useEnableComments } from '@/hooks/useEnableComments';

import { logger } from '../lib/logger';

interface DoubanComment {
  id: string;
  userName: string;
  userAvatar: string;
  userUrl: string;
  rating: number | null;
  content: string;
  time: string;
  votes: number;
}

interface DoubanCommentsProps {
  doubanId: number;
}

// 获取运行时配置的类型
interface RuntimeConfig {
  EnableComments: boolean;
}

export default function DoubanComments({ doubanId }: DoubanCommentsProps) {
  const [comments, setComments] = useState<DoubanComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [hasStartedLoading, setHasStartedLoading] = useState(false);
  const limit = 20;

  const enableComments = useEnableComments();

  const fetchComments = useCallback(
    async (startIndex: number) => {
      try {
        logger.info('正在获取评论，起始位置:', startIndex);
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/douban-comments?id=${doubanId}&start=${startIndex}&limit=${limit}`,
        );

        if (!response.ok) {
          throw new Error('获取评论失败');
        }

        const data = await parseApiResponse<any>(response);
        logger.info('获取到评论数据:', {
          newComments: data.comments.length,
          total: data.total,
          hasMore: data.hasMore,
          start: data.start,
        });

        if (startIndex === 0) {
          setComments(data.comments);
        } else {
          setComments((prev) => {
            logger.info(
              '追加评论，之前:',
              prev.length,
              '新增:',
              data.comments.length,
            );
            return [...prev, ...data.comments];
          });
        }

        setTotal(data.total);
        setHasMore(data.hasMore);
        logger.info(
          '更新后状态 - hasMore:',
          data.hasMore,
          'total:',
          data.total,
        );
      } catch (err) {
        logger.error('获取评论失败:', err);
        setError(err instanceof Error ? err.message : '获取评论失败');
      } finally {
        setLoading(false);
      }
    },
    [doubanId],
  );

  useEffect(() => {
    // 重置状态当 doubanId 变化时
    setHasStartedLoading(false);
    setComments([]);
    setLoading(false);
    setError(null);
    setTotal(0);
    setHasMore(false);
  }, [doubanId]); // 只在 doubanId 变化时重新获取

  const startLoading = () => {
    logger.info('开始加载评论');
    setHasStartedLoading(true);
    fetchComments(0);
  };

  const loadMore = () => {
    logger.info('点击加载更多，当前状态:', {
      loading,
      hasMore,
      commentsLength: comments.length,
    });
    if (!loading && hasMore) {
      // 使用当前已加载的评论数量作为下一页的起始位置
      fetchComments(comments.length);
    }
  };

  // 星级渲染
  const renderStars = (rating: number | null) => {
    if (rating === null) return null;

    return (
      <div className='flex items-center gap-0.5'>
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className='h-4 w-4'
            fill={star <= rating ? '#f99b01' : '#e0e0e0'}
            viewBox='0 0 24 24'
          >
            <path d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' />
          </svg>
        ))}
      </div>
    );
  };

  // 如果评论功能被禁用，不显示任何内容
  if (!enableComments) {
    return null;
  }

  // 初始状态：显示查看评论按钮
  if (!hasStartedLoading) {
    return (
      <div className='flex flex-col items-center justify-center py-12'>
        <div className='mb-4 text-gray-500 dark:text-gray-400'>
          <svg
            className='mx-auto mb-4 h-16 w-16 opacity-50'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={1.5}
              d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
            />
          </svg>
          <p className='text-center'>点击查看豆瓣评论</p>
        </div>
        <button
          onClick={startLoading}
          className='flex items-center gap-2 rounded-lg bg-green-500 px-6 py-2 text-white transition-colors hover:bg-green-600'
        >
          <svg
            className='h-4 w-4'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
            />
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
            />
          </svg>
          查看评论
        </button>
      </div>
    );
  }

  if (loading && comments.length === 0) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='h-8 w-8 animate-spin rounded-full border-b-2 border-green-500'></div>
        <span className='ml-3 text-gray-600 dark:text-gray-400'>
          加载评论中...
        </span>
      </div>
    );
  }

  if (error && comments.length === 0) {
    return (
      <div className='py-12 text-center'>
        <div className='mb-2 text-red-500'>❌</div>
        <p className='text-gray-600 dark:text-gray-400'>{error}</p>
        <button
          onClick={startLoading}
          className='mt-4 rounded-lg bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600'
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* 头部统计 */}
      {total > 0 && (
        <div className='text-sm text-gray-600 dark:text-gray-400'>
          {total > comments.length
            ? `共 ${total} 条短评`
            : `已加载 ${comments.length} 条短评`}
        </div>
      )}

      {/* 评论列表 */}
      <div className='space-y-4'>
        {comments.map((comment) => (
          <div
            key={comment.id}
            className='rounded-lg bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800'
          >
            {/* 用户信息 */}
            <div className='mb-3 flex items-start gap-3'>
              {/* 头像 */}
              <a
                href={comment.userUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='flex-shrink-0'
              >
                <img
                  src={comment.userAvatar}
                  alt={comment.userName}
                  className='h-10 w-10 rounded-full'
                  onError={(e) => {
                    e.currentTarget.src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ccc"%3E%3Cpath d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/%3E%3C/svg%3E';
                  }}
                />
              </a>

              {/* 用户名和评分 */}
              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <a
                    href={comment.userUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='font-medium text-gray-900 hover:text-green-600 dark:text-white dark:hover:text-green-400'
                  >
                    {comment.userName}
                  </a>
                  {renderStars(comment.rating)}
                </div>

                {/* 时间 */}
                <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                  {comment.time}
                </div>
              </div>

              {/* 有用数 */}
              {comment.votes > 0 && (
                <div className='flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400'>
                  <svg
                    className='h-4 w-4'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='2'
                      d='M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5'
                    />
                  </svg>
                  <span>{comment.votes}</span>
                </div>
              )}
            </div>

            {/* 评论内容 */}
            <div className='whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300'>
              {comment.content}
            </div>
          </div>
        ))}
      </div>

      {/* 加载更多按钮 */}
      {hasMore && (
        <div className='flex justify-center pt-4'>
          <button
            onClick={loadMore}
            disabled={loading}
            className='rounded-lg bg-green-500 px-6 py-2 text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-gray-400'
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}

      {/* 没有更多了 */}
      {!hasMore && comments.length > 0 && (
        <div className='py-4 text-center text-sm text-gray-500 dark:text-gray-400'>
          没有更多评论了
        </div>
      )}
    </div>
  );
}
