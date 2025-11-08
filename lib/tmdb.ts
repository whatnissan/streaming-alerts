import { MediaItem } from './types';
import { getTMDBStreaming, getTMDBUpcoming } from './tmdb-api';
import { getWatchmodeNewReleases, getWatchmodeUpcoming } from './watchmode-api';

const SERVICES = ['Netflix', 'Amazon Prime', 'Hulu', 'Disney+', 'Max', 'Apple TV+', 'Paramount+', 'Peacock'];

export async function getStreamingContent(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  try {
    console.log('🎬 Fetching streaming content...');
    
    // Try Watchmode first for all services
    const watchmodePromises = SERVICES.map(service => getWatchmodeNewReleases(service));
    const watchmodeResults = await Promise.all(watchmodePromises);
    const watchmodeContent = watchmodeResults.flat();
    
    console.log(`📊 Watchmode total: ${watchmodeContent.length}`);
    
    // Filter by media type if needed
    const filtered = mediaType === 'movie' || mediaType === 'tv'
      ? watchmodeContent.filter(item => item.media_type === mediaType)
      : watchmodeContent;
    
    // If we got good data from Watchmode, use it
    if (filtered.length > 50) {
      console.log(`✅ Using Watchmode data: ${filtered.length} items`);
      return filtered;
    }
    
    // Fallback to TMDB if Watchmode fails
    console.log('⚠️ Watchmode insufficient, falling back to TMDB...');
    const tmdbContent = await getTMDBStreaming(mediaType);
    console.log(`📊 TMDB total: ${tmdbContent.length}`);
    
    return tmdbContent;
  } catch (error) {
    console.error('❌ Error fetching streaming:', error);
    return [];
  }
}

export async function getUpcomingContent(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  try {
    console.log('🎬 Fetching upcoming content...');
    
    // Try Watchmode first
    const watchmodePromises = SERVICES.map(service => getWatchmodeUpcoming(service));
    const watchmodeResults = await Promise.all(watchmodePromises);
    const watchmodeContent = watchmodeResults.flat();
    
    console.log(`📊 Watchmode upcoming total: ${watchmodeContent.length}`);
    
    // Filter by media type and ensure it's actually upcoming
    const today = new Date();
    const filtered = watchmodeContent.filter(item => {
      const matchesType = mediaType === 'movie' || mediaType === 'tv' ? item.media_type === mediaType : true;
      const isUpcoming = item.release_date ? new Date(item.release_date) > today : false;
      return matchesType && isUpcoming;
    });
    
    if (filtered.length > 20) {
      console.log(`✅ Using Watchmode upcoming: ${filtered.length} items`);
      return filtered;
    }
    
    // Fallback to TMDB
    console.log('⚠️ Watchmode insufficient, falling back to TMDB...');
    const tmdbContent = await getTMDBUpcoming(mediaType);
    
    // Filter out past dates
    const upcomingOnly = tmdbContent.filter(item => {
      if (!item.release_date) return false;
      return new Date(item.release_date) > today;
    });
    
    console.log(`📊 TMDB upcoming total: ${upcomingOnly.length}`);
    return upcomingOnly;
  } catch (error) {
    console.error('❌ Error fetching upcoming:', error);
    return [];
  }
}

export async function searchContent(query: string, mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  if (!query.trim()) return [];
  
  try {
    const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_KEY || '';
    const type = mediaType === 'movie' ? 'movie' : 'tv';
    const url = `https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=en-US`;
    
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const results = data.results || [];
    
    return results.slice(0, 20).map((item: any) => {
      const genreIds: string[] = Array.isArray(item.genre_ids) 
        ? item.genre_ids.map((id: number) => id.toString()) 
        : [];
      
      return {
        id: `tmdb-${item.id}`,
        title: item.title || item.name,
        overview: item.overview || 'No description available',
        poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        release_date: item.release_date || item.first_air_date || '',
        vote_average: item.vote_average || 0,
        genre_ids: genreIds,
        media_type: mediaType,
        providers: ['Available'],
        service: 'Available',
        year: (item.release_date || item.first_air_date)?.split('-')[0]
      };
    });
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

export function getImageUrl(path: string | null): string {
  return path || '/placeholder.png';
}

export function getTitle(item: MediaItem): string {
  return item.title;
}

export function getReleaseDate(item: MediaItem): string {
  return item.release_date;
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
    const releaseDate = new Date(item.release_date);
    switch (filter) {
      case 'this-week': return releaseDate >= now && releaseDate <= oneWeek;
      case 'this-month': return releaseDate >= now && releaseDate <= oneMonth;
      case 'coming-soon': return releaseDate > oneMonth;
      default: return true;
    }
  });
}
