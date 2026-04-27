'use client';

import React, { useEffect,useState } from 'react';

import { useDownload } from '@/contexts/DownloadContext';

export function DownloadBubble() {
  const { tasks, downloadingCount, setShowDownloadPanel } = useDownload();

  // 拖动状态
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 初始化位置（右下角）
  useEffect(() => {
    const initPosition = () => {
      setPosition({
        x: window.innerWidth - 80,
        y: window.innerHeight - 80,
      });
    };

    initPosition();
    window.addEventListener('resize', initPosition);
    return () => window.removeEventListener('resize', initPosition);
  }, []);

  // 处理拖动
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // 限制在视口范围内
      const maxX = window.innerWidth - 64;
      const maxY = window.innerHeight - 64;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();

      const touch = e.touches[0];
      const newX = touch.clientX - dragOffset.x;
      const newY = touch.clientY - dragOffset.y;

      // 限制在视口范围内
      const maxX = window.innerWidth - 64;
      const maxY = window.innerHeight - 64;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove, {
        passive: false,
      });
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    setIsDragging(true);
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
  };

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9998,
      }}
    >
      <button
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={(e) => {
          if (!isDragging) {
            setShowDownloadPanel(true);
          }
        }}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        className='group relative transform rounded-full bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:from-blue-600 hover:to-purple-700 hover:shadow-xl'
      >
        {/* 下载图标 */}
        <svg
          className='h-6 w-6'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='2'
            d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'
          />
        </svg>

        {/* 下载中数量徽章 */}
        {downloadingCount > 0 && (
          <div className='absolute -right-1 -top-1 flex h-6 w-6 animate-pulse items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white'>
            {downloadingCount}
          </div>
        )}

        {/* 悬停提示 */}
        <div className='absolute bottom-full right-0 mb-2 hidden group-hover:block'>
          <div className='whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white'>
            {downloadingCount > 0
              ? `${downloadingCount} 个任务下载中`
              : '查看下载任务'}
            <div className='absolute right-4 top-full h-0 w-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900'></div>
          </div>
        </div>
      </button>
    </div>
  );
}
