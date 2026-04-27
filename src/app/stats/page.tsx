'use client';

import {
  BarChart3,
  Clock,
  Film,
  Heart,
  Loader2,
  TrendingUp,
  Tv,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import PageLayout from '@/components/PageLayout';

import { logger } from '../../lib/logger';

interface MonthlyData {
  month: string;
  count: number;
  duration: number;
}

interface YearlyData {
  year: string;
  count: number;
  duration: number;
}

interface TypeDistribution {
  type: string;
  count: number;
  duration: number;
}

interface SourceDistribution {
  source: string;
  count: number;
}

interface YearDistribution {
  decade: string;
  count: number;
}

interface StatsData {
  totalWatchTime: number;
  totalWatchCount: number;
  completedCount: number;
  favoritesCount: number;
  monthlyData: MonthlyData[];
  yearlyData: YearlyData[];
  typeDistribution: TypeDistribution[];
  sourceDistribution: SourceDistribution[];
  yearDistribution: YearDistribution[];
  recentWatched: Array<{
    title: string;
    cover: string;
    duration: number;
    saveTime: number;
  }>;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`;
  }
  return `${minutes}分钟`;
}

function formatMonthLabel(month: string): string {
  const parts = month.split('-');
  if (parts.length === 2) {
    return `${parseInt(parts[1])}月`;
  }
  return month;
}

const TYPE_COLORS: Record<string, string> = {
  '电影': 'bg-blue-500',
  '剧集': 'bg-purple-500',
};

const TYPE_BG_COLORS: Record<string, string> = {
  '电影': 'bg-blue-50 dark:bg-blue-900/20',
  '剧集': 'bg-purple-50 dark:bg-purple-900/20',
};

const TYPE_TEXT_COLORS: Record<string, string> = {
  '电影': 'text-blue-700 dark:text-blue-300',
  '剧集': 'text-purple-700 dark:text-purple-300',
};

const TYPE_ICONS: Record<string, typeof Film> = {
  '电影': Film,
  '剧集': Tv,
};

type ReportPeriod = 'monthly' | 'yearly';

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('monthly');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/stats');
        if (!res.ok) throw new Error('获取统计数据失败');
        const json = await res.json();
        const data = json.success ? json.data : json;
        setStats(data);
      } catch (err) {
        logger.error('获取统计数据失败:', err);
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <PageLayout activePath='/stats'>
        <div className='flex min-h-[60vh] items-center justify-center'>
          <div className='flex flex-col items-center gap-3'>
            <Loader2 className='h-8 w-8 animate-spin text-green-600' />
            <span className='text-sm text-gray-500 dark:text-gray-400'>
              正在加载统计数据...
            </span>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error || !stats) {
    return (
      <PageLayout activePath='/stats'>
        <div className='flex min-h-[60vh] items-center justify-center'>
          <div className='text-center'>
            <p className='text-gray-500 dark:text-gray-400'>
              {error || '暂无统计数据'}
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  const maxMonthlyDuration = Math.max(
    ...stats.monthlyData.map((d) => d.duration),
    1,
  );
  const maxMonthlyCount = Math.max(
    ...stats.monthlyData.map((d) => d.count),
    1,
  );
  const maxYearlyDuration = Math.max(
    ...stats.yearlyData.map((d) => d.duration),
    1,
  );
  const maxYearlyCount = Math.max(
    ...stats.yearlyData.map((d) => d.count),
    1,
  );
  const maxSourceCount = Math.max(
    ...stats.sourceDistribution.map((d) => d.count),
    1,
  );
  const maxDecadeCount = Math.max(
    ...stats.yearDistribution.map((d) => d.count),
    1,
  );
  const totalTypeCount = stats.typeDistribution.reduce(
    (sum, d) => sum + d.count,
    0,
  );

  const reportData =
    reportPeriod === 'monthly' ? stats.monthlyData : stats.yearlyData;
  const maxReportDuration =
    reportPeriod === 'monthly' ? maxMonthlyDuration : maxYearlyDuration;
  const maxReportCount =
    reportPeriod === 'monthly' ? maxMonthlyCount : maxYearlyCount;

  return (
    <PageLayout activePath='/stats'>
      <div className='mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6'>
        <div className='mb-6 flex items-center gap-3'>
          <BarChart3 className='h-7 w-7 text-green-600' />
          <h1 className='text-2xl font-bold text-gray-800 dark:text-gray-100'>
            统计面板
          </h1>
        </div>

        {/* 概览卡片 */}
        <div className='mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4'>
          <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800'>
            <div className='mb-2 flex items-center gap-2'>
              <Clock className='h-5 w-5 text-green-500' />
              <span className='text-xs text-gray-500 dark:text-gray-400'>
                观看时长
              </span>
            </div>
            <p className='text-lg font-bold text-gray-800 dark:text-gray-100 sm:text-xl'>
              {formatDuration(stats.totalWatchTime)}
            </p>
          </div>
          <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800'>
            <div className='mb-2 flex items-center gap-2'>
              <Film className='h-5 w-5 text-blue-500' />
              <span className='text-xs text-gray-500 dark:text-gray-400'>
                观看数量
              </span>
            </div>
            <p className='text-lg font-bold text-gray-800 dark:text-gray-100 sm:text-xl'>
              {stats.totalWatchCount} 部
            </p>
          </div>
          <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800'>
            <div className='mb-2 flex items-center gap-2'>
              <TrendingUp className='h-5 w-5 text-purple-500' />
              <span className='text-xs text-gray-500 dark:text-gray-400'>
                已看完
              </span>
            </div>
            <p className='text-lg font-bold text-gray-800 dark:text-gray-100 sm:text-xl'>
              {stats.completedCount} 部
            </p>
          </div>
          <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800'>
            <div className='mb-2 flex items-center gap-2'>
              <Heart className='h-5 w-5 text-red-500' />
              <span className='text-xs text-gray-500 dark:text-gray-400'>
                收藏数量
              </span>
            </div>
            <p className='text-lg font-bold text-gray-800 dark:text-gray-100 sm:text-xl'>
              {stats.favoritesCount} 部
            </p>
          </div>
        </div>

        {/* 观看时长统计 */}
        <section className='mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6'>
          <h2 className='mb-4 flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-gray-100'>
            <Clock className='h-5 w-5 text-green-500' />
            观看时长统计
          </h2>
          {stats.monthlyData.length > 0 ? (
            <div>
              <div className='mb-4 flex items-end gap-1 sm:gap-2' style={{ height: '200px' }}>
                {stats.monthlyData.map((d) => (
                  <div
                    key={d.month}
                    className='group relative flex flex-1 flex-col items-center justify-end'
                    style={{ height: '100%' }}
                  >
                    <div
                      className='w-full rounded-t-md bg-green-400 transition-all duration-300 group-hover:bg-green-500 dark:bg-green-600 dark:group-hover:bg-green-500'
                      style={{
                        height: `${Math.max((d.duration / maxMonthlyDuration) * 100, 2)}%`,
                        minHeight: '4px',
                      }}
                    />
                    <div className='pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-700'>
                      {formatDuration(d.duration)} / {d.count}部
                    </div>
                    <span className='mt-2 text-[10px] text-gray-400 sm:text-xs'>
                      {formatMonthLabel(d.month)}
                    </span>
                  </div>
                ))}
              </div>
              <div className='mt-3 flex items-center justify-between text-xs text-gray-400'>
                <span>近12个月观看时长分布</span>
                <span>
                  月均 {formatDuration(stats.totalWatchTime / Math.max(stats.monthlyData.length, 1))}
                </span>
              </div>
            </div>
          ) : (
            <p className='py-8 text-center text-sm text-gray-400'>暂无观看记录</p>
          )}
        </section>

        {/* 最爱类型分析 */}
        <section className='mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6'>
          <h2 className='mb-4 flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-gray-100'>
            <Heart className='h-5 w-5 text-red-500' />
            最爱类型分析
          </h2>

          {stats.typeDistribution.length > 0 ? (
            <div className='space-y-6'>
              {/* 类型分布 */}
              <div>
                <h3 className='mb-3 text-sm font-medium text-gray-600 dark:text-gray-300'>
                  类型分布
                </h3>
                <div className='flex gap-3'>
                  {stats.typeDistribution.map((d) => {
                    const Icon = TYPE_ICONS[d.type] || Film;
                    const pct = totalTypeCount > 0 ? Math.round((d.count / totalTypeCount) * 100) : 0;
                    return (
                      <div
                        key={d.type}
                        className={`flex-1 rounded-xl p-4 ${TYPE_BG_COLORS[d.type] || 'bg-gray-50 dark:bg-gray-700'}`}
                      >
                        <div className='mb-2 flex items-center gap-2'>
                          <Icon className={`h-5 w-5 ${TYPE_TEXT_COLORS[d.type] || 'text-gray-600'}`} />
                          <span className={`text-sm font-semibold ${TYPE_TEXT_COLORS[d.type] || 'text-gray-600 dark:text-gray-300'}`}>
                            {d.type}
                          </span>
                        </div>
                        <p className='text-2xl font-bold text-gray-800 dark:text-gray-100'>
                          {pct}%
                        </p>
                        <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                          {d.count} 部 · {formatDuration(d.duration)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 来源分布 */}
              {stats.sourceDistribution.length > 0 && (
                <div>
                  <h3 className='mb-3 text-sm font-medium text-gray-600 dark:text-gray-300'>
                    来源分布 Top 10
                  </h3>
                  <div className='space-y-2'>
                    {stats.sourceDistribution.map((d) => (
                      <div key={d.source} className='flex items-center gap-3'>
                        <span className='w-20 shrink-0 truncate text-sm text-gray-600 dark:text-gray-300 sm:w-28'>
                          {d.source}
                        </span>
                        <div className='flex-1'>
                          <div className='h-6 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700'>
                            <div
                              className='flex h-full items-center rounded-full bg-green-400 px-2 dark:bg-green-600'
                              style={{
                                width: `${Math.max((d.count / maxSourceCount) * 100, 8)}%`,
                              }}
                            >
                              <span className='text-xs font-medium text-white'>
                                {d.count}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 年代分布 */}
              {stats.yearDistribution.length > 0 && (
                <div>
                  <h3 className='mb-3 text-sm font-medium text-gray-600 dark:text-gray-300'>
                    年代偏好
                  </h3>
                  <div className='space-y-2'>
                    {stats.yearDistribution.map((d) => (
                      <div key={d.decade} className='flex items-center gap-3'>
                        <span className='w-16 shrink-0 text-sm text-gray-600 dark:text-gray-300'>
                          {d.decade}
                        </span>
                        <div className='flex-1'>
                          <div className='h-6 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700'>
                            <div
                              className='flex h-full items-center rounded-full bg-blue-400 px-2 dark:bg-blue-600'
                              style={{
                                width: `${Math.max((d.count / maxDecadeCount) * 100, 8)}%`,
                              }}
                            >
                              <span className='text-xs font-medium text-white'>
                                {d.count}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className='py-8 text-center text-sm text-gray-400'>暂无数据</p>
          )}
        </section>

        {/* 月度/年度观影报告 */}
        <section className='mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-gray-100'>
              <TrendingUp className='h-5 w-5 text-purple-500' />
              观影报告
            </h2>
            <div className='flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-600 dark:bg-gray-700'>
              <button
                onClick={() => setReportPeriod('monthly')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  reportPeriod === 'monthly'
                    ? 'bg-white text-green-600 shadow-sm dark:bg-gray-600 dark:text-green-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                月度
              </button>
              <button
                onClick={() => setReportPeriod('yearly')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  reportPeriod === 'yearly'
                    ? 'bg-white text-green-600 shadow-sm dark:bg-gray-600 dark:text-green-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                年度
              </button>
            </div>
          </div>

          {reportData.length > 0 ? (
            <div>
              <div className='mb-4 flex items-end gap-1 sm:gap-2' style={{ height: '200px' }}>
                {reportData.map((d) => {
                  const key = reportPeriod === 'monthly' ? (d as MonthlyData).month : (d as YearlyData).year;
                  const label =
                    reportPeriod === 'monthly'
                      ? formatMonthLabel((d as MonthlyData).month)
                      : (d as YearlyData).year;
                  return (
                    <div
                      key={key}
                      className='group relative flex flex-1 flex-col items-center justify-end'
                      style={{ height: '100%' }}
                    >
                      <div
                        className='w-full rounded-t-md bg-purple-400 transition-all duration-300 group-hover:bg-purple-500 dark:bg-purple-600 dark:group-hover:bg-purple-500'
                        style={{
                          height: `${Math.max((d.duration / maxReportDuration) * 100, 2)}%`,
                          minHeight: '4px',
                        }}
                      />
                      <div className='pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-700'>
                        {formatDuration(d.duration)} / {d.count}部
                      </div>
                      <span className='mt-2 text-[10px] text-gray-400 sm:text-xs'>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* 详细数据表格 */}
              <div className='mt-4 overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='border-b border-gray-200 dark:border-gray-700'>
                      <th className='pb-2 text-left font-medium text-gray-500 dark:text-gray-400'>
                        {reportPeriod === 'monthly' ? '月份' : '年份'}
                      </th>
                      <th className='pb-2 text-right font-medium text-gray-500 dark:text-gray-400'>
                        观看数量
                      </th>
                      <th className='pb-2 text-right font-medium text-gray-500 dark:text-gray-400'>
                        观看时长
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...reportData].reverse().map((d) => {
                      const key =
                        reportPeriod === 'monthly'
                          ? (d as MonthlyData).month
                          : (d as YearlyData).year;
                      return (
                        <tr
                          key={key}
                          className='border-b border-gray-100 dark:border-gray-700/50'
                        >
                          <td className='py-2 text-gray-700 dark:text-gray-300'>
                            {key}
                          </td>
                          <td className='py-2 text-right text-gray-700 dark:text-gray-300'>
                            {d.count} 部
                          </td>
                          <td className='py-2 text-right text-gray-700 dark:text-gray-300'>
                            {formatDuration(d.duration)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className='py-8 text-center text-sm text-gray-400'>暂无数据</p>
          )}
        </section>

        {/* 最近观看 */}
        {stats.recentWatched.length > 0 && (
          <section className='mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6'>
            <h2 className='mb-4 flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-gray-100'>
              <Film className='h-5 w-5 text-blue-500' />
              最近观看
            </h2>
            <div className='space-y-3'>
              {stats.recentWatched.map((item, idx) => (
                <div
                  key={idx}
                  className='flex items-center gap-3 rounded-lg border border-gray-100 p-2 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50'
                >
                  <div className='h-12 w-9 shrink-0 overflow-hidden rounded'>
                    {item.cover ? (
                      <img
                        src={item.cover}
                        alt={item.title}
                        className='h-full w-full object-cover'
                      />
                    ) : (
                      <div className='flex h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-600'>
                        <Film className='h-4 w-4 text-gray-400' />
                      </div>
                    )}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-medium text-gray-800 dark:text-gray-200'>
                      {item.title}
                    </p>
                    <p className='text-xs text-gray-400'>
                      {formatDuration(item.duration)}
                    </p>
                  </div>
                  <span className='shrink-0 text-xs text-gray-400'>
                    {new Date(item.saveTime).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </PageLayout>
  );
}
