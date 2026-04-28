'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */


import { AlertTriangle, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  clearAllFavorites,
  getAllFavorites,
  getAllPlayRecords,
  subscribeToDataUpdates,
} from '@/lib/db.client';

import VideoCard from '@/components/VideoCard';

import { logger } from '../lib/logger';

interface FavoriteItem {
  id: string;
  source: string;
  title: string;
  year: string;
  poster: string;
  episodes?: number;
  source_name?: string;
  currentEpisode?: number;
  search_title?: string;
  origin?: 'vod' | 'live';
}

interface FavoritesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FavoritesPanel: React.FC<FavoritesPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // 加载收藏数据
  const loadFavorites = async () => {
    setLoading(true);
    try {
      const allFavorites = await getAllFavorites();
      const allPlayRecords = await getAllPlayRecords();

      // 根据保存时间排序（从近到远）
      const sorted = Object.entries(allFavorites)
        .sort(([, a], [, b]) => b.save_time - a.save_time)
        .map(([key, fav]) => {
          const plusIndex = key.indexOf('+');
          const source = key.slice(0, plusIndex);
          const id = key.slice(plusIndex + 1);

          // 查找对应的播放记录，获取当前集数
          const playRecord = allPlayRecords[key];
          const currentEpisode = playRecord?.index;

          return {
            id,
            source,
            title: fav.title,
            year: fav.year,
            poster: fav.cover,
            episodes: fav.total_episodes,
            source_name: fav.source_name,
            currentEpisode,
            search_title: fav?.search_title,
            origin: fav?.origin,
          } as FavoriteItem;
        });
      setFavoriteItems(sorted);
    } catch (error) {
      logger.error('加载收藏失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 清空所有收藏
  const handleClearAll = async () => {
    try {
      await clearAllFavorites();
      setFavoriteItems([]);
      setShowConfirmDialog(false);
    } catch (error) {
      logger.error('清空收藏失败:', error);
    }
  };

  // 打开面板时加载收藏
  useEffect(() => {
    if (isOpen) {
      loadFavorites();
    }
  }, [isOpen]);

  // 监听收藏变化,实时移除已取消收藏的项目
  useEffect(() => {
    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      async (newFavorites: Record<string, any>) => {
        if (isOpen) {
          // 获取最新的收藏列表的键
          const currentKeys = Object.keys(newFavorites);

          // 过滤掉已经不在收藏中的项目
          setFavoriteItems((prevItems) =>
            prevItems.filter((item) => {
              const key = `${item.source}+${item.id}`;
              return currentKeys.includes(key);
            }),
          );
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className='fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm'
        onClick={onClose}
      />

      {/* 收藏面板 */}
      <div className='fixed left-1/2 top-1/2 z-[1001] flex max-h-[85vh] w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900'>
        {/* 标题栏 */}
        <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700'>
          <div className='flex items-center gap-2'>
            <Star className='h-5 w-5 text-yellow-500' />
            <h3 className='text-lg font-bold text-gray-800 dark:text-gray-200'>
              我的收藏
            </h3>
            {favoriteItems.length > 0 && (
              <span className='rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'>
                {favoriteItems.length} 项
              </span>
            )}
          </div>
          <div className='flex items-center gap-2'>
            {favoriteItems.length > 0 && (
              <button
                onClick={() => setShowConfirmDialog(true)}
                className='text-xs text-red-500 transition-colors hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
              >
                清空全部
              </button>
            )}
            <button
              onClick={onClose}
              className='flex h-8 w-8 items-center justify-center rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800'
              aria-label='Close'
            >
              <X className='h-full w-full' />
            </button>
          </div>
        </div>

        {/* 收藏列表 */}
        <div className='flex-1 overflow-y-auto p-6'>
          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent'></div>
            </div>
          ) : favoriteItems.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400'>
              <Star className='mb-3 h-12 w-12 opacity-30' />
              <p className='text-sm'>暂无收藏内容</p>
            </div>
          ) : (
            <div className='grid grid-cols-3 gap-x-2 gap-y-14 px-0 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8 sm:gap-y-20 sm:px-2'>
              {favoriteItems.map((item) => (
                <div key={item.id + item.source} className='w-full'>
                  <VideoCard
                    query={item.search_title}
                    {...item}
                    from='favorite'
                    type={item.episodes && item.episodes > 1 ? 'tv' : ''}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 确认对话框 */}
      {showConfirmDialog &&
        createPortal(
          <div
            className='fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4 transition-opacity duration-300'
            onClick={() => setShowConfirmDialog(false)}
          >
            <div
              className='w-full max-w-md rounded-lg border border-red-200 bg-white shadow-xl transition-all duration-300 dark:border-red-800 dark:bg-gray-800'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='p-6'>
                {/* 图标和标题 */}
                <div className='mb-4 flex items-start gap-4'>
                  <div className='flex-shrink-0'>
                    <AlertTriangle className='h-8 w-8 text-red-500' />
                  </div>
                  <div className='flex-1'>
                    <h3 className='mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100'>
                      清空收藏
                    </h3>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      确定要清空所有收藏吗？此操作不可恢复。
                    </p>
                  </div>
                </div>

                {/* 按钮组 */}
                <div className='mt-6 flex gap-3'>
                  <button
                    onClick={() => setShowConfirmDialog(false)}
                    className='flex-1 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  >
                    取消
                  </button>
                  <button
                    onClick={handleClearAll}
                    className='flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700'
                  >
                    确定清空
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
