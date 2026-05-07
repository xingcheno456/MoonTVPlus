export interface PlayUrlParams {
  origin: 'vod' | 'live';
  from: string;
  isUpcoming: boolean;
  source: string | undefined;
  id: string | undefined;
  title: string;
  year: string | undefined;
  isAggregate: boolean;
  query: string;
  searchType: string;
  isCurrentlyOnPlayPage: boolean;
}

export function buildPlayUrl(params: PlayUrlParams): string {
  const {
    origin,
    from,
    isUpcoming,
    source,
    id,
    title,
    year,
    isAggregate,
    query,
    searchType,
    isCurrentlyOnPlayPage,
  } = params;

  if (isUpcoming) return '';

  if (origin === 'live' && source && id) {
    return `/live?source=${source.replace('live_', '')}&id=${id.replace('live_', '')}`;
  }

  if (
    from === 'douban' ||
    from === 'tmdb' ||
    (isAggregate && !source && !id)
  ) {
    let url = `/play?title=${encodeURIComponent(title.trim())}${
      year ? `&year=${year}` : ''
    }${searchType ? `&stype=${searchType}` : ''}${
      isAggregate ? '&prefer=true' : ''
    }${query ? `&stitle=${encodeURIComponent(query.trim())}` : ''}`;

    if (isCurrentlyOnPlayPage) {
      url += `&_reload=${Date.now()}`;
    }
    return url;
  }

  if (source && id) {
    let url = `/play?source=${source}&id=${id}&title=${encodeURIComponent(title)}${
      year ? `&year=${year}` : ''
    }${isAggregate ? '&prefer=true' : ''}${
      query ? `&stitle=${encodeURIComponent(query.trim())}` : ''
    }${searchType ? `&stype=${searchType}` : ''}`;

    if (isCurrentlyOnPlayPage) {
      url += `&_reload=${Date.now()}`;
    }
    return url;
  }

  return '';
}
