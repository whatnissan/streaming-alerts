export interface StreamingShow {
  id: string;
  title: string;
  overview: string;
  imageSet?: {
    verticalPoster?: {
      w240?: string;
      w360?: string;
      w480?: string;
      w600?: string;
      w720?: string;
    };
  };
  releaseYear?: number;
  genres?: Array<{ id: string; name: string }>;
  rating?: number;
  streamingInfo?: {
    [country: string]: {
      [service: string]: Array<{
        type: string;
        streamingType: string;
        availableSince?: number;
      }>;
    };
  };
  showType: 'movie' | 'series';
}

export interface MediaItem {
  id: string;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: string[];
  media_type: 'movie' | 'tv';
  providers?: string[];
  service?: string;
  availableDate?: string;
}

export const STREAMING_SERVICES = {
  'netflix': 'Netflix',
  'prime': 'Amazon Prime Video',
  'hulu': 'Hulu',
  'paramount': 'Paramount+',
  'hbo': 'HBO Max',
  'disney': 'Disney+',
  'apple': 'Apple TV+',
} as const;

export const GENRES = {
  'action': 'Action',
  'adventure': 'Adventure',
  'animation': 'Animation',
  'comedy': 'Comedy',
  'crime': 'Crime',
  'documentary': 'Documentary',
  'drama': 'Drama',
  'family': 'Family',
  'fantasy': 'Fantasy',
  'history': 'History',
  'horror': 'Horror',
  'music': 'Music',
  'mystery': 'Mystery',
  'romance': 'Romance',
  'scifi': 'Science Fiction',
  'thriller': 'Thriller',
  'war': 'War',
  'western': 'Western',
} as const;
