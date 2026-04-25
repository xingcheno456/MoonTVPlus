'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { BarChart3, Clock, List, Target, Tv } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { formatTimeToHHMM, parseCustomTimeFormat } from '@/lib/time';

interface EpgProgram {
  start: string;
  end: string;
  title: string;
}

interface EpgScrollableRowProps {
  programs: EpgProgram[];
  currentTime?: Date;
  isLoading?: boolean;
}

type ViewMode = 'list' | 'timeline';

export default function EpgScrollableRow({
  programs,
  currentTime = new Date(),
  isLoading = false,
}: EpgScrollableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineHorizontalRef = useRef<HTMLDivElement>(null);
  const timelineVerticalRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number>(-1);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // 处理滚轮事件，实现横向滚动
  const handleWheel = (e: WheelEvent) => {
    if (isHovered && containerRef.current) {
      e.preventDefault(); // 阻止默认的竖向滚动

      const container = containerRef.current;
      const scrollAmount = e.deltaY * 4; // 增加滚动速度

      // 根据滚轮方向进行横向滚动
      container.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // 阻止页面竖向滚动
  const preventPageScroll = (e: WheelEvent) => {
    if (isHovered) {
      e.preventDefault();
    }
  };

  // 自动滚动到正在播放的节目（列表视图）
  const scrollToCurrentProgram = () => {
    if (containerRef.current) {
      const currentProgramIndex = programs.findIndex((program) =>
        isCurrentlyPlaying(program),
      );
      if (currentProgramIndex !== -1) {
        const programElement = containerRef.current.children[
          currentProgramIndex
        ] as HTMLElement;
        if (programElement) {
          const container = containerRef.current;
          const programLeft = programElement.offsetLeft;
          const containerWidth = container.clientWidth;
          const programWidth = programElement.offsetWidth;

          // 计算滚动位置，使正在播放的节目居中显示
          const scrollLeft =
            programLeft - containerWidth / 2 + programWidth / 2;

          container.scrollTo({
            left: Math.max(0, scrollLeft),
            behavior: 'smooth',
          });
        }
      }
    }
  };

  // 自动滚动到正在播放的节目（时间线视图）
  const scrollToCurrentProgramTimeline = () => {
    const currentProgramIndex = programs.findIndex((program) =>
      isCurrentlyPlaying(program),
    );
    if (currentProgramIndex === -1) return;

    // 横向时间线
    if (timelineHorizontalRef.current && window.innerWidth >= 768) {
      const programElement = timelineHorizontalRef.current.children[
        currentProgramIndex
      ] as HTMLElement;
      if (programElement) {
        const container = timelineHorizontalRef.current;
        const programLeft = programElement.offsetLeft;
        const containerWidth = container.clientWidth;
        const programWidth = programElement.offsetWidth;

        const scrollLeft = programLeft - containerWidth / 2 + programWidth / 2;

        container.scrollTo({
          left: Math.max(0, scrollLeft),
          behavior: 'smooth',
        });
      }
    }
    // 竖向时间线
    else if (timelineVerticalRef.current) {
      const programElement = timelineVerticalRef.current.children[
        currentProgramIndex
      ] as HTMLElement;
      if (programElement) {
        // 找到包含滚动的父容器
        const scrollContainer = timelineVerticalRef.current.parentElement;
        if (scrollContainer) {
          const programTop = programElement.offsetTop;
          const containerHeight = scrollContainer.clientHeight;
          const programHeight = programElement.offsetHeight;

          const scrollTop =
            programTop - containerHeight / 2 + programHeight / 2;

          scrollContainer.scrollTo({
            top: Math.max(0, scrollTop),
            behavior: 'smooth',
          });
        }
      }
    }
  };

  useEffect(() => {
    if (isHovered) {
      // 鼠标悬停时阻止页面滚动
      document.addEventListener('wheel', preventPageScroll, { passive: false });
      document.addEventListener('wheel', handleWheel, { passive: false });
    } else {
      // 鼠标离开时恢复页面滚动
      document.removeEventListener('wheel', preventPageScroll);
      document.removeEventListener('wheel', handleWheel);
    }

    return () => {
      document.removeEventListener('wheel', preventPageScroll);
      document.removeEventListener('wheel', handleWheel);
    };
  }, [isHovered]);

  // 组件加载后自动滚动到正在播放的节目
  useEffect(() => {
    // 延迟执行，确保DOM完全渲染
    const timer = setTimeout(() => {
      // 初始化当前正在播放的节目索引
      const initialPlayingIndex = programs.findIndex((program) =>
        isCurrentlyPlaying(program),
      );
      setCurrentPlayingIndex(initialPlayingIndex);
      scrollToCurrentProgram();
    }, 100);

    return () => clearTimeout(timer);
  }, [programs, currentTime]);

  // 定时刷新正在播放状态
  useEffect(() => {
    // 每分钟刷新一次正在播放状态
    const interval = setInterval(() => {
      // 更新当前正在播放的节目索引
      const newPlayingIndex = programs.findIndex((program) => {
        try {
          const start = parseCustomTimeFormat(program.start);
          const end = parseCustomTimeFormat(program.end);
          return currentTime >= start && currentTime < end;
        } catch {
          return false;
        }
      });

      if (newPlayingIndex !== currentPlayingIndex) {
        setCurrentPlayingIndex(newPlayingIndex);
        // 如果正在播放的节目发生变化，自动滚动到新位置
        scrollToCurrentProgram();
      }
    }, 60000); // 60秒 = 1分钟

    return () => clearInterval(interval);
  }, [programs, currentTime, currentPlayingIndex]);

  // 切换视图时自动跳转到当前播放位置
  useEffect(() => {
    // 延迟执行，确保DOM完全渲染
    const timer = setTimeout(() => {
      if (viewMode === 'list') {
        scrollToCurrentProgram();
      } else if (viewMode === 'timeline') {
        scrollToCurrentProgramTimeline();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [viewMode]);

  // 格式化时间显示
  const formatTime = (timeString: string) => {
    return formatTimeToHHMM(timeString);
  };

  // 判断节目是否正在播放
  const isCurrentlyPlaying = (program: EpgProgram) => {
    try {
      const start = parseCustomTimeFormat(program.start);
      const end = parseCustomTimeFormat(program.end);
      return currentTime >= start && currentTime < end;
    } catch {
      return false;
    }
  };

  // 计算节目时长（分钟）
  const getProgramDuration = (program: EpgProgram) => {
    try {
      const start = parseCustomTimeFormat(program.start);
      const end = parseCustomTimeFormat(program.end);
      return (end.getTime() - start.getTime()) / (1000 * 60); // 转换为分钟
    } catch {
      return 30; // 默认30分钟
    }
  };

  // 计算当前时间在时间线上的位置百分比
  const getCurrentTimePosition = () => {
    if (programs.length === 0) return 0;

    try {
      const firstProgram = programs[0];
      const lastProgram = programs[programs.length - 1];
      const startTime = parseCustomTimeFormat(firstProgram.start).getTime();
      const endTime = parseCustomTimeFormat(lastProgram.end).getTime();
      const currentTimeMs = currentTime.getTime();

      if (currentTimeMs < startTime) return 0;
      if (currentTimeMs > endTime) return 100;

      return ((currentTimeMs - startTime) / (endTime - startTime)) * 100;
    } catch {
      return 0;
    }
  };

  // 加载中状态
  if (isLoading) {
    return (
      <div className='pt-4'>
        <div className='mb-3 flex items-center justify-between'>
          <h4 className='flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 sm:text-sm'>
            <Clock className='h-3 w-3 sm:h-4 sm:w-4' />
            今日节目单
          </h4>
          <div className='w-16 sm:w-20'></div>
        </div>
        <div className='flex min-h-[100px] items-center justify-center sm:min-h-[120px]'>
          <div className='flex items-center gap-3 text-gray-500 dark:text-gray-400 sm:gap-4'>
            <div className='h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500 sm:h-6 sm:w-6'></div>
            <span className='text-sm sm:text-base'>加载节目单...</span>
          </div>
        </div>
      </div>
    );
  }

  // 无节目单状态
  if (!programs || programs.length === 0) {
    return (
      <div className='pt-4'>
        <div className='mb-3 flex items-center justify-between'>
          <h4 className='flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 sm:text-sm'>
            <Clock className='h-3 w-3 sm:h-4 sm:w-4' />
            今日节目单
          </h4>
          <div className='w-16 sm:w-20'></div>
        </div>
        <div className='flex min-h-[100px] items-center justify-center sm:min-h-[120px]'>
          <div className='flex items-center gap-2 text-gray-400 dark:text-gray-500 sm:gap-3'>
            <Tv className='h-4 w-4 sm:h-5 sm:w-5' />
            <span className='text-sm sm:text-base'>暂无节目单数据</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='mt-2 pt-4'>
      <div className='mb-3 flex items-center justify-between'>
        <h4 className='flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 sm:text-sm'>
          <Clock className='h-3 w-3 sm:h-4 sm:w-4' />
          今日节目单
        </h4>
        <div className='flex items-center gap-2'>
          {/* 视图切换按钮 */}
          <div className='flex items-center gap-1 rounded-lg bg-gray-200 p-0.5 dark:bg-gray-800'>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              }`}
              title='列表视图'
            >
              <List className='h-3 w-3' />
              <span className='hidden sm:inline'>列表</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-all duration-200 ${
                viewMode === 'timeline'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              }`}
              title='时间线视图'
            >
              <BarChart3 className='h-3 w-3' />
              <span className='hidden sm:inline'>时间线</span>
            </button>
          </div>

          {/* 当前播放按钮 */}
          {currentPlayingIndex !== -1 && (
            <button
              onClick={
                viewMode === 'list'
                  ? scrollToCurrentProgram
                  : scrollToCurrentProgramTimeline
              }
              className='flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-300/50 px-2 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 hover:border-green-300 hover:bg-green-50 hover:text-green-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-green-700 dark:hover:bg-green-900/20 dark:hover:text-green-400 sm:gap-1.5 sm:px-2.5 sm:py-2'
              title='滚动到当前播放位置'
            >
              <Target className='h-2.5 w-2.5 sm:h-3 sm:w-3' />
              <span className='hidden sm:inline'>当前播放</span>
              <span className='sm:hidden'>当前</span>
            </button>
          )}
        </div>
      </div>

      {/* 列表视图 */}
      {viewMode === 'list' && (
        <div
          className='relative'
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            ref={containerRef}
            className='scrollbar-hide flex min-h-[100px] overflow-x-auto px-2 py-2 pb-4 sm:min-h-[120px] sm:px-4'
          >
            {programs.map((program, index) => {
              // 使用 currentPlayingIndex 来判断播放状态，确保样式能正确更新
              const isPlaying = index === currentPlayingIndex;
              const isFinishedProgram = index < currentPlayingIndex;
              const isUpcomingProgram = index > currentPlayingIndex;

              return (
                <div
                  key={index}
                  className={`flex min-h-[100px] w-36 flex-shrink-0 flex-col rounded-lg border p-2 transition-all duration-200 sm:min-h-[120px] sm:w-48 sm:p-3 ${
                    isPlaying
                      ? 'border-green-500/30 bg-green-500/10 dark:bg-green-500/20'
                      : isFinishedProgram
                        ? 'border-gray-300 bg-gray-300/50 dark:border-gray-700 dark:bg-gray-800'
                        : isUpcomingProgram
                          ? 'border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/20'
                          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
                  }`}
                >
                  {/* 时间显示在顶部 */}
                  <div className='mb-2 flex flex-shrink-0 items-center justify-between sm:mb-3'>
                    <span
                      className={`text-xs font-medium ${
                        isPlaying
                          ? 'text-green-600 dark:text-green-400'
                          : isFinishedProgram
                            ? 'text-gray-500 dark:text-gray-400'
                            : isUpcomingProgram
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {formatTime(program.start)}
                    </span>
                    <span className='text-xs text-gray-400 dark:text-gray-500'>
                      {formatTime(program.end)}
                    </span>
                  </div>

                  {/* 标题在中间，占据剩余空间 */}
                  <div
                    className={`flex-1 text-xs font-medium sm:text-sm ${
                      isPlaying
                        ? 'text-green-900 dark:text-green-100'
                        : isFinishedProgram
                          ? 'text-gray-600 dark:text-gray-400'
                          : isUpcomingProgram
                            ? 'text-blue-900 dark:text-blue-100'
                            : 'text-gray-900 dark:text-gray-100'
                    }`}
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: '1.4',
                      maxHeight: '2.8em',
                    }}
                    title={program.title}
                  >
                    {program.title}
                  </div>

                  {/* 正在播放状态在底部 */}
                  {isPlaying && (
                    <div className='mt-auto flex flex-shrink-0 items-center gap-1 pt-1 sm:gap-1.5 sm:pt-2'>
                      <div className='h-1.5 w-1.5 animate-pulse rounded-full bg-green-500 sm:h-2 sm:w-2'></div>
                      <span className='text-xs font-medium text-green-600 dark:text-green-400'>
                        正在播放
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 时间线视图 */}
      {viewMode === 'timeline' && (
        <div className='relative'>
          {/* 电脑端：横向时间线 */}
          <div className='hidden md:block'>
            <div className='rounded-lg bg-gray-100 p-4 dark:bg-gray-800'>
              {/* 时间线容器 - 可横向滚动 */}
              <div
                className='relative'
                onMouseEnter={(e) => {
                  const container = timelineHorizontalRef.current;
                  if (container) {
                    const handleWheel = (e: WheelEvent) => {
                      if (container.scrollWidth > container.clientWidth) {
                        e.preventDefault();
                        container.scrollLeft += e.deltaY * 4;
                      }
                    };
                    container.addEventListener('wheel', handleWheel, {
                      passive: false,
                    });
                    (container as any)._wheelHandler = handleWheel;
                  }
                }}
                onMouseLeave={(e) => {
                  const container = timelineHorizontalRef.current;
                  if (container && (container as any)._wheelHandler) {
                    container.removeEventListener(
                      'wheel',
                      (container as any)._wheelHandler,
                    );
                    delete (container as any)._wheelHandler;
                  }
                }}
              >
                <div
                  ref={timelineHorizontalRef}
                  className='scrollbar-hide flex max-h-[400px] overflow-x-auto px-2 pb-2 sm:px-4'
                >
                  {programs.map((program, index) => {
                    const isPlaying = index === currentPlayingIndex;
                    const isFinished = index < currentPlayingIndex;
                    const duration = getProgramDuration(program);

                    return (
                      <div
                        key={index}
                        className='flex flex-shrink-0 flex-col items-center'
                      >
                        {/* 节目信息卡片 */}
                        <div
                          className={`mb-3 flex h-[110px] w-48 flex-col rounded-lg border p-3 transition-all duration-200 ${
                            isPlaying
                              ? 'border-green-500/30 bg-green-500/10 dark:bg-green-500/20'
                              : isFinished
                                ? 'border-gray-300 bg-gray-300/50 dark:border-gray-700 dark:bg-gray-800'
                                : 'border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/20'
                          }`}
                        >
                          <div className='mb-2 flex flex-shrink-0 items-start justify-between'>
                            <span
                              className={`text-xs font-medium ${
                                isPlaying
                                  ? 'text-green-600 dark:text-green-400'
                                  : isFinished
                                    ? 'text-gray-500 dark:text-gray-400'
                                    : 'text-blue-600 dark:text-blue-400'
                              }`}
                            >
                              {formatTime(program.start)}
                            </span>
                            <span className='text-xs text-gray-400 dark:text-gray-500'>
                              {Math.round(duration)}分钟
                            </span>
                          </div>
                          <div
                            className={`flex-1 text-sm font-medium ${
                              isPlaying
                                ? 'text-green-900 dark:text-green-100'
                                : isFinished
                                  ? 'text-gray-600 dark:text-gray-400'
                                  : 'text-blue-900 dark:text-blue-100'
                            }`}
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: '1.4',
                            }}
                          >
                            {program.title}
                          </div>
                          {isPlaying && (
                            <div className='mt-auto flex flex-shrink-0 items-center gap-1.5 pt-2'>
                              <div className='h-1.5 w-1.5 animate-pulse rounded-full bg-green-500'></div>
                              <span className='text-xs font-medium text-green-600 dark:text-green-400'>
                                正在播放
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 时间线轴 */}
                        <div className='flex flex-shrink-0 items-center'>
                          {/* 时间点 */}
                          <div
                            className={`h-3 w-3 flex-shrink-0 rounded-full border-2 ${
                              isPlaying
                                ? 'animate-pulse border-green-500 bg-green-500'
                                : isFinished
                                  ? 'border-gray-400 bg-gray-400'
                                  : 'border-blue-500 bg-blue-500'
                            }`}
                          ></div>

                          {/* 右侧连接线 */}
                          {index < programs.length - 1 && (
                            <div
                              className={`h-0.5 w-48 ${
                                isFinished
                                  ? 'bg-gray-300 dark:bg-gray-600'
                                  : isPlaying
                                    ? 'bg-green-300 dark:bg-green-700'
                                    : 'bg-blue-300 dark:bg-blue-700'
                              }`}
                            ></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 手机端：竖向时间线 */}
          <div className='md:hidden'>
            <div className='relative max-h-[500px] overflow-y-auto rounded-lg bg-gray-100 p-4 dark:bg-gray-800'>
              {/* 时间线容器 */}
              <div ref={timelineVerticalRef} className='relative'>
                {programs.map((program, index) => {
                  const isPlaying = index === currentPlayingIndex;
                  const isFinished = index < currentPlayingIndex;
                  const duration = getProgramDuration(program);

                  return (
                    <div
                      key={index}
                      className='relative mb-3 flex gap-3 last:mb-0'
                    >
                      {/* 时间线轴 */}
                      <div
                        className='relative flex flex-shrink-0 flex-col items-center'
                        style={{ paddingTop: '0.375rem' }}
                      >
                        {/* 时间点 */}
                        <div
                          className={`z-10 h-3 w-3 rounded-full border-2 ${
                            isPlaying
                              ? 'animate-pulse border-green-500 bg-green-500'
                              : isFinished
                                ? 'border-gray-400 bg-gray-400'
                                : 'border-blue-500 bg-blue-500'
                          }`}
                        ></div>

                        {/* 连接线 - 根据状态显示不同颜色 */}
                        {index < programs.length - 1 && (
                          <div
                            className={`absolute w-0.5 ${
                              isFinished
                                ? 'bg-gray-300 dark:bg-gray-600'
                                : isPlaying
                                  ? 'bg-green-300 dark:bg-green-700'
                                  : 'bg-blue-300 dark:bg-blue-700'
                            }`}
                            style={{
                              top: '0.375rem',
                              bottom: 'calc(-0.75rem - 100%)',
                              left: '50%',
                              transform: 'translateX(-50%)',
                            }}
                          ></div>
                        )}
                      </div>

                      {/* 节目信息 */}
                      <div
                        className={`flex-1 rounded-lg border p-3 transition-all duration-200 ${
                          isPlaying
                            ? 'border-green-500/30 bg-green-500/10 dark:bg-green-500/20'
                            : isFinished
                              ? 'border-gray-300 bg-gray-300/50 dark:border-gray-700 dark:bg-gray-800'
                              : 'border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/20'
                        }`}
                      >
                        <div className='mb-2 flex items-start justify-between'>
                          <span
                            className={`text-xs font-medium ${
                              isPlaying
                                ? 'text-green-600 dark:text-green-400'
                                : isFinished
                                  ? 'text-gray-500 dark:text-gray-400'
                                  : 'text-blue-600 dark:text-blue-400'
                            }`}
                          >
                            {formatTime(program.start)}
                          </span>
                          <span className='text-xs text-gray-400 dark:text-gray-500'>
                            {Math.round(duration)}分钟
                          </span>
                        </div>
                        <div
                          className={`text-sm font-medium ${
                            isPlaying
                              ? 'text-green-900 dark:text-green-100'
                              : isFinished
                                ? 'text-gray-600 dark:text-gray-400'
                                : 'text-blue-900 dark:text-blue-100'
                          }`}
                        >
                          {program.title}
                        </div>
                        {isPlaying && (
                          <div className='mt-2 flex items-center gap-1.5'>
                            <div className='h-1.5 w-1.5 animate-pulse rounded-full bg-green-500'></div>
                            <span className='text-xs font-medium text-green-600 dark:text-green-400'>
                              正在播放
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
