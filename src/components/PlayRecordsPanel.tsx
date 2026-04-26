'use client';

import { AlertTriangle, History, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { PlayRecord } from '@/lib/db.client';
import {
  clearAllPlayRecords,
  getAllPlayRecords,
  subscribeToDataUpdates,
} from '@/lib/db.client';

import VideoCard from '@/components/VideoCard';

import { logger } from '../lib/logger';

type PlayRecordItem = PlayRecord & {
  key: string;
};

interface PlayRecordsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const parseKey = (key: string) => {
  const [source, id] = key.split('+');
  return { source, id };
};

const getProgress = (record: PlayRecord) => {
  if (record.total_time === 0) return 0;
  return (record.play_time / record.total_time) * 100;
};

export default function PlayRecordsPanel({
  isOpen,
  onClose,
}: PlayRecordsPanelProps) {
  const [playRecords, setPlayRecords] = useState<PlayRecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const loadPlayRecords = async () => {
    setLoading(true);
    try {
      const allRecords = await getAllPlayRecords();
      const sorted = Object.entries(allRecords)
        .map(([key, record]) => ({
          ...record,
          key,
        }))
        .sort((a, b) => b.save_time - a.save_time);
      setPlayRecords(sorted);
    } catch (error) {
      logger.error('加载播放记录失败:', error);
      setPlayRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllPlayRecords();
      setPlayRecords([]);
      setShowConfirmDialog(false);
    } catch (error) {
      logger.error('清空播放记录失败:', error);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadPlayRecords();
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = subscribeToDataUpdates(
      'playRecordsUpdated',
      (newRecords: Record<string, PlayRecord>) => {
        if (!isOpen) return;
        const sorted = Object.entries(newRecords)
          .map(([key, record]) => ({
            ...record,
            key,
          }))
          .sort((a, b) => b.save_time - a.save_time);
        setPlayRecords(sorted);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  return (
    <>
      <div
        className='fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm'
        onClick={onClose}
      />

      <div className='fixed left-1/2 top-1/2 z-[1001] flex max-h-[85vh] w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900'>
        <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700'>
          <div className='flex items-center gap-2'>
            <History className='h-5 w-5 text-sky-500' />
            <h3 className='text-lg font-bold text-gray-800 dark:text-gray-200'>
              播放记录
            </h3>
            {playRecords.length > 0 && (
              <span className='rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900/30 dark:text-sky-300'>
                {playRecords.length} 项
              </span>
            )}
          </div>
          <div className='flex items-center gap-2'>
            {playRecords.length > 0 && (
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

        <div className='flex-1 overflow-y-auto p-6'>
          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent'></div>
            </div>
          ) : playRecords.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400'>
              <History className='mb-3 h-12 w-12 opacity-30' />
              <p className='text-sm'>暂无播放记录</p>
            </div>
          ) : (
            <div className='grid grid-cols-3 gap-x-2 gap-y-14 px-0 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8 sm:gap-y-20 sm:px-2'>
              {playRecords.map((record) => {
                const { source, id } = parseKey(record.key);

                return (
                  <div key={record.key} className='w-full'>
                    <VideoCard
                      id={id}
                      title={record.title}
                      poster={record.cover}
                      year={record.year}
                      source={source}
                      source_name={record.source_name}
                      progress={getProgress(record)}
                      episodes={record.total_episodes}
                      currentEpisode={record.index}
                      query={record.search_title}
                      from='playrecord'
                      onDelete={() =>
                        setPlayRecords((prev) =>
                          prev.filter((item) => item.key !== record.key),
                        )
                      }
                      type={record.total_episodes > 1 ? 'tv' : ''}
                      origin={record.origin}
                      playTime={record.play_time}
                      totalTime={record.total_time}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
                <div className='mb-4 flex items-start gap-4'>
                  <div className='flex-shrink-0'>
                    <AlertTriangle className='h-8 w-8 text-red-500' />
                  </div>
                  <div className='flex-1'>
                    <h3 className='mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100'>
                      清空播放记录
                    </h3>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      确定要清空所有播放记录吗？此操作不可恢复。
                    </p>
                  </div>
                </div>

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
}
