import { NextRequest } from 'next/server';

import { apiSuccess } from '@/lib/api-response';
import { handleServiceError, validateAuthenticatedUser } from '@/services/auth.service';
import { getAllFavorites, getAllPlayRecords } from '@/services/playrecord.service';

import { logger } from '../../../lib/logger';

export const runtime = 'nodejs';

const MOVIE_COMPLETION_THRESHOLD = 0.9;

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

interface StatsResponse {
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

export async function GET(request: NextRequest) {
  try {
    const username = await validateAuthenticatedUser(request);

    const [playRecords, favorites] = await Promise.all([
      getAllPlayRecords(username),
      getAllFavorites(username),
    ]);

    const records = Object.values(playRecords);
    const favs = Object.values(favorites);

    let totalWatchTime = 0;
    let completedCount = 0;
    const monthlyMap = new Map<string, { count: number; duration: number }>();
    const yearlyMap = new Map<string, { count: number; duration: number }>();
    const typeMap = new Map<string, { count: number; duration: number }>();
    const sourceMap = new Map<string, number>();
    const yearMap = new Map<string, number>();

    for (const record of records) {
      const watchTime = record.play_time || 0;
      totalWatchTime += watchTime;

      if (record.total_episodes > 1 && record.index >= record.total_episodes) {
        completedCount++;
      } else if (record.total_episodes <= 1 && watchTime > 0 && record.total_time > 0 && watchTime / record.total_time > MOVIE_COMPLETION_THRESHOLD) {
        completedCount++;
      }

      const date = new Date(record.save_time);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const yearKey = `${date.getFullYear()}`;
      const monthData = monthlyMap.get(monthKey) || { count: 0, duration: 0 };
      monthData.count++;
      monthData.duration += watchTime;
      monthlyMap.set(monthKey, monthData);

      const yearData = yearlyMap.get(yearKey) || { count: 0, duration: 0 };
      yearData.count++;
      yearData.duration += watchTime;
      yearlyMap.set(yearKey, yearData);

      const type = record.total_episodes <= 1 ? '电影' : '剧集';
      const typeData = typeMap.get(type) || { count: 0, duration: 0 };
      typeData.count++;
      typeData.duration += watchTime;
      typeMap.set(type, typeData);

      const srcCount = sourceMap.get(record.source_name) || 0;
      sourceMap.set(record.source_name, srcCount + 1);
    }

    for (const fav of favs) {
      const year = fav.year;
      if (year) {
        const y = parseInt(year);
        if (!isNaN(y)) {
          const decade = `${Math.floor(y / 10) * 10}s`;
          yearMap.set(decade, (yearMap.get(decade) || 0) + 1);
        }
      }

      const type = fav.total_episodes <= 1 ? '电影' : '剧集';
      if (!typeMap.has(type)) {
        typeMap.set(type, { count: 0, duration: 0 });
      }
      const typeData = typeMap.get(type)!;
      typeData.count++;
    }

    const sortedMonths = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({ month, ...data }));

    const sortedYears = Array.from(yearlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, data]) => ({ year, ...data }));

    const typeDistribution = Array.from(typeMap.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([type, data]) => ({ type, ...data }));

    const sourceDistribution = Array.from(sourceMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([source, count]) => ({ source, count }));

    const yearDistribution = Array.from(yearMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([decade, count]) => ({ decade, count }));

    const recentWatched = records
      .sort((a, b) => b.save_time - a.save_time)
      .slice(0, 10)
      .map((r) => ({
        title: r.title,
        cover: r.cover,
        duration: r.play_time,
        saveTime: r.save_time,
      }));

    const stats: StatsResponse = {
      totalWatchTime,
      totalWatchCount: records.length,
      completedCount,
      favoritesCount: favs.length,
      monthlyData: sortedMonths,
      yearlyData: sortedYears,
      typeDistribution,
      sourceDistribution,
      yearDistribution,
      recentWatched,
    };

    return apiSuccess(stats);
  } catch (err) {
    logger.error('获取统计数据失败', err);
    return handleServiceError(err);
  }
}
