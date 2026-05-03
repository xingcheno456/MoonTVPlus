export interface TMDBItem {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  overview: string;
  vote_average: number;
  media_type: 'movie' | 'tv';
  genre_ids: number[];
  popularity: number;
  original_language: string;
  video_key?: string | null;
}

export function getTMDBImageUrl(path: string | null, size = 'w500'): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const baseUrl =
    typeof window !== 'undefined'
      ? localStorage.getItem('tmdbImageBaseUrl') || 'https://image.tmdb.org'
      : 'https://image.tmdb.org';
  return `${baseUrl}/t/p/${size}${path}`;
}

export const TMDB_GENRES: Record<number, string> = {
  28: '动作',
  12: '冒险',
  16: '动画',
  35: '喜剧',
  80: '犯罪',
  99: '纪录',
  18: '剧情',
  10751: '家庭',
  14: '奇幻',
  36: '历史',
  27: '恐怖',
  10402: '音乐',
  9648: '悬疑',
  10749: '爱情',
  878: '科幻',
  10770: '电视电影',
  53: '惊悚',
  10752: '战争',
  37: '西部',
  10759: '动作冒险',
  10762: '儿童',
  10763: '新闻',
  10764: '真人秀',
  10765: '科幻奇幻',
  10766: '肥皂剧',
  10767: '脱口秀',
  10768: '战争政治',
};

export function getGenreNames(genreIds: number[] = [], limit = 2): string[] {
  return genreIds
    .map((id) => TMDB_GENRES[id])
    .filter(Boolean)
    .slice(0, limit);
}
