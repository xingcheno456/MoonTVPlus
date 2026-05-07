'use client';
 

import React, { useMemo, useState } from 'react';

interface DownloadEpisodeSelectorProps {
  /** 是否显示弹窗 */
  isOpen: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 总集数 */
  totalEpisodes: number;
  /** 剧集标题 */
  episodesTitles?: string[];
  /** 视频标题 */
  videoTitle: string;
  /** 当前集数索引（0开始） */
  currentEpisodeIndex: number;
  /** 下载回调 - 支持批量下载 */
  onDownload: (episodeIndexes: number[], offlineMode: boolean) => void;
  /** 是否启用离线下载功能 */
  enableOfflineDownload?: boolean;
  /** 是否有离线下载权限（管理员或站长） */
  hasOfflinePermission?: boolean;
}

/**
 * 下载选集面板组件
 */
const DownloadEpisodeSelector: React.FC<DownloadEpisodeSelectorProps> = ({
  isOpen,
  onClose,
  totalEpisodes,
  episodesTitles = [],
  videoTitle,
  currentEpisodeIndex,
  onDownload,
  enableOfflineDownload = false,
  hasOfflinePermission = false,
}) => {
  // 多选状态 - 使用 Set 存储选中的集数索引
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<number>>(
    new Set([currentEpisodeIndex]),
  );

  // 离线下载模式
  const [offlineMode, setOfflineMode] = useState(false);

  // 每页显示的集数
  const episodesPerPage = 50;
  const pageCount = Math.ceil(totalEpisodes / episodesPerPage);

  // 当前分页索引（0 开始）
  const initialPage = Math.floor(currentEpisodeIndex / episodesPerPage);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);

  // 是否倒序显示
  const [descending, setDescending] = useState<boolean>(false);

  // 根据 descending 状态计算实际显示的分页索引
  const displayPage = useMemo(() => {
    if (descending) {
      return pageCount - 1 - currentPage;
    }
    return currentPage;
  }, [currentPage, descending, pageCount]);

  // 升序分页标签
  const categoriesAsc = useMemo(() => {
    return Array.from({ length: pageCount }, (_, i) => {
      const start = i * episodesPerPage + 1;
      const end = Math.min(start + episodesPerPage - 1, totalEpisodes);
      return { start, end };
    });
  }, [pageCount, episodesPerPage, totalEpisodes]);

  // 根据 descending 状态决定分页标签的排序和内容
  const categories = useMemo(() => {
    if (descending) {
      return [...categoriesAsc]
        .reverse()
        .map(({ start, end }) => `${end}-${start}`);
    }
    return categoriesAsc.map(({ start, end }) => `${start}-${end}`);
  }, [categoriesAsc, descending]);

  const handleCategoryClick = (index: number) => {
    if (descending) {
      setCurrentPage(pageCount - 1 - index);
    } else {
      setCurrentPage(index);
    }
  };

  const handleEpisodeClick = (episodeIndex: number) => {
    setSelectedEpisodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(episodeIndex)) {
        newSet.delete(episodeIndex);
      } else {
        newSet.add(episodeIndex);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allEpisodes = Array.from({ length: totalEpisodes }, (_, i) => i);
    setSelectedEpisodes(new Set(allEpisodes));
  };

  const handleClearAll = () => {
    setSelectedEpisodes(new Set());
  };

  const handleDownload = () => {
    const episodeIndexes = Array.from(selectedEpisodes).sort((a, b) => a - b);
    onDownload(episodeIndexes, offlineMode);
    onClose();
  };

  const currentStart = currentPage * episodesPerPage;
  const currentEnd = Math.min(
    currentStart + episodesPerPage - 1,
    totalEpisodes - 1,
  );

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm'>
      <div className='flex max-h-[80vh] w-[90vw] max-w-4xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800'>
        {/* 标题栏 */}
        <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700'>
          <div className='flex-1'>
            <h2 className='text-xl font-bold text-gray-900 dark:text-gray-100'>
              选择要下载的集数
            </h2>
            <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
              {videoTitle}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={handleSelectAll}
              className='rounded-md px-3 py-1.5 text-xs font-medium text-green-600 transition-colors hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-900/20 dark:hover:text-green-300'
            >
              全选
            </button>
            <button
              onClick={handleClearAll}
              className='rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300'
            >
              清空
            </button>
            <button
              onClick={onClose}
              className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
            >
              <svg
                className='h-5 w-5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>
        </div>

        {/* 离线下载开关 - 仅管理员和站长可见 */}
        {enableOfflineDownload && hasOfflinePermission && (
          <div className='flex items-center justify-between border-b border-blue-100 bg-blue-50 px-6 py-3 dark:border-blue-900/30 dark:bg-blue-900/10'>
            <div className='flex items-center gap-3'>
              {/* 服务器图标 */}
              <div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30'>
                <svg
                  className='h-5 w-5 text-blue-600 dark:text-blue-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01'
                  />
                </svg>
              </div>
              <div className='flex-1'>
                <div className='flex items-center gap-2'>
                  <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                    服务器离线下载
                  </h3>
                  {offlineMode && (
                    <span className='rounded bg-blue-500 px-2 py-0.5 text-xs font-medium text-white'>
                      已启用
                    </span>
                  )}
                </div>
                <p className='mt-0.5 text-xs text-gray-600 dark:text-gray-400'>
                  开启后将在服务器端下载视频文件，支持断点续传和后台下载
                </p>
              </div>
            </div>
            {/* 开关 */}
            <button
              onClick={() => setOfflineMode(!offlineMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                offlineMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  offlineMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )}

        {/* 分页标签 */}
        {pageCount > 1 && (
          <div className='flex items-center gap-4 border-b border-gray-200 px-6 py-3 dark:border-gray-700'>
            <div className='flex-1 overflow-x-auto'>
              <div className='flex min-w-max gap-2'>
                {categories.map((label, idx) => {
                  const isActive = idx === displayPage;
                  return (
                    <button
                      key={label}
                      onClick={() => handleCategoryClick(idx)}
                      className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      } `.trim()}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* 向上/向下按钮 */}
            <button
              className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-gray-700 transition-colors hover:bg-gray-100 hover:text-green-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-green-400'
              onClick={() => setDescending((prev) => !prev)}
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
                  strokeWidth='2'
                  d='M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4'
                />
              </svg>
            </button>
          </div>
        )}

        {/* 集数网格 */}
        <div className='flex-1 overflow-y-auto px-6 py-4'>
          <div className='flex flex-wrap gap-3'>
            {(() => {
              const len = currentEnd - currentStart + 1;
              const episodes = Array.from({ length: len }, (_, i) =>
                descending ? currentEnd - i : currentStart + i,
              );
              return episodes;
            })().map((episodeIndex) => {
              const isSelected = selectedEpisodes.has(episodeIndex);
              const isCurrent = episodeIndex === currentEpisodeIndex;
              const episodeNumber = episodeIndex + 1;
              return (
                <button
                  key={episodeIndex}
                  onClick={() => handleEpisodeClick(episodeIndex)}
                  className={`relative flex h-10 min-w-10 items-center justify-center whitespace-nowrap rounded-md px-3 py-2 font-mono text-sm font-medium transition-all duration-200 ${
                    isSelected
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/25 dark:bg-green-600'
                      : 'bg-gray-200 text-gray-700 hover:scale-105 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  } `.trim()}
                >
                  {(() => {
                    const title = episodesTitles?.[episodeIndex];
                    if (!title) {
                      return episodeNumber;
                    }
                    // 如果是 OVA 格式，直接返回完整标题
                    if (title.match(/^OVA\s+\d+/i)) {
                      return title;
                    }
                    // 如果匹配"第X集"、"第X话"、"X集"、"X话"格式，提取中间的数字
                    const match = title.match(/(?:第)?(\d+)(?:集|话)/);
                    if (match) {
                      return match[1];
                    }
                    return title;
                  })()}
                  {isCurrent && (
                    <span className='absolute -right-1 -top-1 h-2 w-2 rounded-full bg-blue-500'></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className='flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900'>
          <div className='text-sm text-gray-600 dark:text-gray-400'>
            已选择：
            {selectedEpisodes.size === 0 ? (
              <span className='text-red-500 dark:text-red-400'>
                未选择任何集数
              </span>
            ) : selectedEpisodes.size === 1 ? (
              <>
                第 {Array.from(selectedEpisodes)[0] + 1} 集
                {Array.from(selectedEpisodes)[0] === currentEpisodeIndex && (
                  <span className='ml-2 text-blue-500 dark:text-blue-400'>
                    (当前播放)
                  </span>
                )}
              </>
            ) : (
              <span className='font-medium text-green-600 dark:text-green-400'>
                {selectedEpisodes.size} 集
              </span>
            )}
          </div>
          <div className='flex gap-3'>
            <button
              onClick={onClose}
              className='rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            >
              取消
            </button>
            <button
              onClick={handleDownload}
              disabled={selectedEpisodes.size === 0}
              className={`rounded-md px-4 py-2 text-sm font-medium text-white shadow-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                offlineMode && enableOfflineDownload && hasOfflinePermission
                  ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'
                  : 'bg-green-500 hover:bg-green-600 disabled:hover:bg-green-500 dark:bg-green-600 dark:hover:bg-green-700'
              }`}
            >
              {offlineMode && enableOfflineDownload && hasOfflinePermission
                ? '离线'
                : ''}
              下载 {selectedEpisodes.size > 0 && `(${selectedEpisodes.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadEpisodeSelector;
