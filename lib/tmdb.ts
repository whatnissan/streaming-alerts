import { MediaItem } from './types';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || 'YOUR_API_KEY_HERE';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function getUpcomingContent(mediaType: 'movie' | 'tv', page: number = 1): Promise<MediaItem[]> {
  try {
    const endpoint = mediaType === 'movie' ? `${TMDB_BASE_URL}/movie/upcoming` : `${TMDB_BASE_URL}/tv/on_the_air`;
    const response = await fetch(`${endpoint}?api_key=${TMDB_API_KEY}&page=${page}&region=US`, { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    return data.results.map((item: any) => ({ ...item, media_type: mediaType }));
  } catch (error) {
    console.error('Error fetching content:', error);
    return [];
  }
}

export async function searchContent(query: string): Promise<MediaItem[]> {
  if (!query.trim()) return [];
  try {
    const response = await fetch(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1`, { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error('Failed to search');
    const data = await response.json();
    return data.results.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv').map((item: any) => ({ ...item, media_type: item.media_type }));
  } catch (error) {
    console.error('Error searching content:', error);
    return [];
  }
}

export function getImageUrl(path: string | null, size: 'w500' | 'original' = 'w500'): string {
  if (!path) return '/placeholder.png';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function getTitle(item: MediaItem): string {
  return 'title' in item ? item.title : item.name;
}

export function getReleaseDate(item: MediaItem): string {
  return 'release_date' in item ? item.release_date : item.first_air_date;
}

export function formatDate(dateString: string): string {
  if (!dateString) return 'TBA';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function filterByDate(items: MediaItem[], filter: string): MediaItem[] {
  const now = new Date();
  const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  return items.filter((item) => {
    const releaseDate = new Date(getReleaseDate(item));
    switch (filter) {
      case 'this-week': return releaseDate >= now && releaseDate <= oneWeek;
      case 'this-month': return releaseDate >= now && releaseDate <= oneMonth;
      case 'coming-soon': return releaseDate > oneMonth;
      default: return true;
    }
  });
}
