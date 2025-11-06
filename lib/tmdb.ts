import { MediaItem } from './types';
import { getTMDBStreaming, getTMDBUpcoming } from './tmdb-api';
import { getTraktTrending, getTraktAnticipated } from './trakt-api';

export async function getStreamingContent(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  try {
    console.log('Fetching from multiple sources...');
    
    // Fetch from both TMDB and Trakt in parallel
    const [tmdbContent, traktContent] = await Promise.all([
      getTMDBStreaming(mediaType),
      getTraktTrending(mediaType)
    ]);
    
    console.log(`TMDB: ${tmdbContent.length}, Trakt: ${traktContent.length}`);
    
    // Combine and remove duplicates by title
    const allContent = [...tmdbContent, ...traktContent];
    const uniqueContent = Array.from(
      new Map(allContent.map(item => [item.title.toLowerCase(), item])).values()
    );
    
    console.log(`Total unique streaming items: ${uniqueContent.length}`);
    return uniqueContent;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

export async function getUpcomingContent(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  try {
    console.log('Fetching upcoming from multiple sources...');
    
    const [tmdbContent, traktContent] = await Promise.all([
      getTMDBUpcoming(mediaType),
      getTraktAnticipated(mediaType)
    ]);
    
    console.log(`TMDB upcoming: ${tmdbContent.length}, Trakt anticipated: ${traktContent.length}`);
    
    const allContent = [...tmdbContent, ...traktContent];
    const uniqueContent = Array.from(
      new Map(allContent.map(item => [item.title.toLowerCase(), item])).values()
    );
    
    console.log(`Total unique upcoming items: ${uniqueContent.length}`);
    return uniqueContent;
  } catch (error) {
    console.error('Error:', error);
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
