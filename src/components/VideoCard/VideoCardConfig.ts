import { VideoCardProps } from '../VideoCard';

export interface VideoCardUIConfig {
  showSourceName: boolean;
  showProgress: boolean;
  showPlayButton: boolean;
  showHeart: boolean;
  showCheckCircle: boolean;
  showDoubanLink: boolean;
  showRating: boolean;
  showYear: boolean;
}

export function getVideoCardConfig(
  from: VideoCardProps['from'],
  isAggregate: boolean,
  douban_id: number | undefined,
  rate: string | undefined,
  isUpcoming: boolean,
): VideoCardUIConfig {
  const configs: Record<string, VideoCardUIConfig> = {
    playrecord: {
      showSourceName: true,
      showProgress: true,
      showPlayButton: true,
      showHeart: true,
      showCheckCircle: true,
      showDoubanLink: false,
      showRating: false,
      showYear: false,
    },
    favorite: {
      showSourceName: true,
      showProgress: false,
      showPlayButton: true,
      showHeart: true,
      showCheckCircle: false,
      showDoubanLink: false,
      showRating: false,
      showYear: false,
    },
    search: {
      showSourceName: true,
      showProgress: false,
      showPlayButton: true,
      showHeart: true,
      showCheckCircle: false,
      showDoubanLink: true,
      showRating: !!rate,
      showYear: true,
    },
    douban: {
      showSourceName: false,
      showProgress: false,
      showPlayButton: !isUpcoming,
      showHeart: false,
      showCheckCircle: false,
      showDoubanLink: false,
      showRating: !!rate,
      showYear: false,
    },
    tmdb: {
      showSourceName: false,
      showProgress: false,
      showPlayButton: !isUpcoming,
      showHeart: false,
      showCheckCircle: false,
      showDoubanLink: false,
      showRating: !!rate,
      showYear: false,
    },
    'source-search': {
      showSourceName: false,
      showProgress: false,
      showPlayButton: true,
      showHeart: true,
      showCheckCircle: false,
      showDoubanLink: true,
      showRating: !!rate,
      showYear: true,
    },
  };
  return configs[from] || configs.search;
}
