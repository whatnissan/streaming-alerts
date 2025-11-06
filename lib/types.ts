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
  imdbRating?: string;
  imdbId?: string;
  year?: string;
}

export const STREAMING_SERVICES = {
  'netflix': 'Netflix',
  'prime': 'Amazon Prime Video',
  'hulu': 'Hulu',
  'paramount': 'Paramount+',
  'hbo': 'HBO Max',
  'disney': 'Disney+',
  'apple': 'Apple TV+',
  'peacock': 'Peacock',
  'showtime': 'Showtime',
  'starz': 'Starz',
  'tubi': 'Tubi',
  'pluto': 'Pluto TV',
  'crackle': 'Crackle',
  'vudu': 'Vudu',
  'max': 'Max',
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

export interface AIRecommendation {
  title: string;
  reason: string;
  genres: string[];
  service: string;
}
