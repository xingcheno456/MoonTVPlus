'use client';

import { useCallback, useEffect, useState } from 'react';

import { logger } from '../lib/logger';

interface AIComment {
  id: string;
  userName: string;
  userAvatar: string;
  rating: number | null;
  content: string;
  time: string;
  votes: number;
  isAiGenerated: true;
}

interface AICommentsProps {
  movieName: string;
  movieInfo?: string;
}

export default function AIComments({ movieName, movieInfo }: AICommentsProps) {
  const [comments, setComments] = useState<AIComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStartedLoading, setHasStartedLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      logger.info('正在生成AI评论...');
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        name: movieName,
        count: '10',
        _t: Date.now().toString(), // 添加时间戳防止缓存
      });

      if (movieInfo) {
        params.append('info', movieInfo);
      }

      const response = await fetch(`/api/ai-comments?${params.toString()}`, {
        cache: 'no-store', // 禁用缓存
      });

      if (!response.ok) {
        const _apiRes_data = await response.json(); const data = _apiRes_data.success === true ? _apiRes_data.data : _apiRes_data;
        throw new Error(data.error || '生成AI评论失败');
      }

      const _apiRes_data = await response.json(); const data = _apiRes_data.success === true ? _apiRes_data.data : _apiRes_data;
      logger.info('AI评论生成成功:', data.comments.length);

      setComments(data.comments);
    } catch (err) {
      logger.error('生成AI评论失败:', err);
      setError(err instanceof Error ? err.message : '生成AI评论失败');
    } finally {
      setLoading(false);
    }
  }, [movieName, movieInfo]);

  useEffect(() => {
    // 重置状态当 movieName 变化时
    setHasStartedLoading(false);
    setComments([]);
    setLoading(false);
    setError(null);
  }, [movieName]);

  const startLoading = () => {
    logger.info('开始生成AI评论');
    setHasStartedLoading(true);
    fetchComments();
  };

  const regenerate = () => {
    logger.info('重新生成AI评论');
    fetchComments();
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
            fill={star <= rating ? '#3b82f6' : '#e0e0e0'}
            viewBox='0 0 24 24'
          >
            <path d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' />
          </svg>
        ))}
      </div>
    );
  };

  // 初始状态：显示生成按钮
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
              d='M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
            />
          </svg>
          <p className='text-center'>点击生成AI评论</p>
          <p className='mt-2 text-center text-xs text-gray-400'>
            基于影片信息和网络资料生成
          </p>
        </div>
        <button
          onClick={startLoading}
          className='flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-2 text-white transition-colors hover:bg-blue-600'
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
              d='M13 10V3L4 14h7v7l9-11h-7z'
            />
          </svg>
          生成AI评论
        </button>
      </div>
    );
  }

  if (loading && comments.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-12'>
        <div className='mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500'></div>
        <span className='text-gray-600 dark:text-gray-400'>
          AI正在生成评论...
        </span>
        <span className='mt-2 text-xs text-gray-500 dark:text-gray-500'>
          这可能需要几秒钟
        </span>
      </div>
    );
  }

  if (error && comments.length === 0) {
    return (
      <div className='py-12 text-center'>
        <div className='mb-2 text-red-500'>❌</div>
        <p className='mb-1 text-gray-600 dark:text-gray-400'>{error}</p>
        <p className='mb-4 text-xs text-gray-500 dark:text-gray-500'>
          请检查管理面板的AI配置是否正确
        </p>
        <button
          onClick={startLoading}
          className='rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600'
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* 头部统计和操作 */}
      <div className='flex items-center justify-between'>
        <div className='text-sm text-gray-600 dark:text-gray-400'>
          已生成 {comments.length} 条AI评论
        </div>
        <button
          onClick={regenerate}
          disabled={loading}
          className='flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1 text-sm text-blue-600 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30'
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
              d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
            />
          </svg>
          {loading ? '生成中...' : '重新生成'}
        </button>
      </div>

      {/* 评论列表 */}
      <div className='space-y-4'>
        {comments.map((comment) => (
          <div
            key={comment.id}
            className='rounded-lg border border-blue-100 bg-blue-50/50 p-4 transition-colors hover:bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/10 dark:hover:bg-blue-900/20'
          >
            {/* 用户信息 */}
            <div className='mb-3 flex items-start gap-3'>
              {/* 头像 */}
              <div className='flex-shrink-0'>
                <img
                  src={comment.userAvatar}
                  alt={comment.userName}
                  className='h-10 w-10 rounded-full'
                />
              </div>

              {/* 用户名和评分 */}
              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='font-medium text-gray-900 dark:text-white'>
                    {comment.userName}
                  </span>
                  {renderStars(comment.rating)}
                  {/* AI标识 */}
                  <span className='inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'>
                    <svg
                      className='h-3 w-3'
                      fill='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path d='M13 10V3L4 14h7v7l9-11h-7z' />
                    </svg>
                    AI生成
                  </span>
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

      {/* 提示信息 */}
      <div className='border-t border-gray-200 py-2 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400'>
        以上评论由AI基于影片信息和网络资料生成，仅供参考
      </div>
    </div>
  );
}
