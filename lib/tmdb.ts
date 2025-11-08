import { MediaItem } from './types';
import { getStreamingAvailability, getNewReleases } from './streaming-availability-api';
import { getTMDBStreamingFallback, getTMDBUpcomingFallback } from './tmdb-fallback';

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_KEY || '';

export async function getStreamingContent(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  try {
    console.log('🎬 Fetching streaming content...');
    console.log('Trying Streaming Availability API first...');
    
    const services = ['netflix', 'prime', 'hulu', 'disney', 'hbo', 'apple', 'paramount', 'peacock', 'showtime'];
    
    // Try Streaming Availability API
    const streamingPromises = services.map(service => 
      getStreamingAvailability(service).catch(err => {
        console.error(`Failed ${service}:`, err.message);
        return [];
      })
    );
    
    const streamingResults = await Promise.all(streamingPromises);
    const streamingItems = streamingResults.flat();
    
    console.log(`📊 Streaming Availability API: ${streamingItems.length} items`);
    
    // If we got good data from Streaming API, use it
    if (streamingItems.length >= 100) {
      const filtered = streamingItems.filter(item => 
        mediaType === 'movie' ? item.media_type === 'movie' : item.media_type === 'tv'
      );
      
      const serviceCounts: {[key: string]: number} = {};
      filtered.forEach(item => {
        const service = item.service || 'Unknown';
        serviceCounts[service] = (serviceCounts[service] || 0) + 1;
      });
      
      console.log('📊 Streaming API results by service:');
      Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]).forEach(([service, count]) => {
        console.log(`  ${service}: ${count}`);
      });
      
      console.log(`✅ Using Streaming API: ${filtered.length} items`);
      return filtered;
    }
    
    // Fallback to TMDB
    console.log('⚠️  Streaming API returned insufficient data, using TMDB...');
    const tmdbItems = await getTMDBStreamingFallback(mediaType);
    
    // Combine both sources if we got some from Streaming API
    const combined = [...streamingItems, ...tmdbItems];
    const seen = new Set<string>();
    const deduplicated = combined.filter(item => {
      const key = `${item.title.toLowerCase()}-${item.year}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    const filtered = deduplicated.filter(item => 
      mediaType === 'movie' ? item.media_type === 'movie' : item.media_type === 'tv'
    );
    
    const serviceCounts: {[key: string]: number} = {};
    filtered.forEach(item => {
      const service = item.service || 'Unknown';
      serviceCounts[service] = (serviceCounts[service] || 0) + 1;
    });
    
    console.log('📊 Combined results by service:');
    Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]).forEach(([service, count]) => {
      console.log(`  ${service}: ${count}`);
    });
    
    console.log(`✅ Total: ${filtered.length} items (${streamingItems.length} from Streaming API, ${tmdbItems.length} from TMDB)`);
    
    return filtered;
    
  } catch (error) {
    console.error('❌ Fatal error, using TMDB only:', error);
    return getTMDBStreamingFallback(mediaType);
  }
}

export async function getUpcomingContent(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  try {
    console.log('🎬 Fetching upcoming content...');
    
    // Try to get new releases from Streaming API first
    const newReleases = await getNewReleases().catch(() => []);
    
    console.log(`📊 Streaming API new releases: ${newReleases.length}`);
    
    // Always get TMDB upcoming for more comprehensive data
    const tmdbUpcoming = await getTMDBUpcomingFallback(mediaType);
    
    console.log(`📊 TMDB upcoming: ${tmdbUpcoming.length}`);
    
    // Combine both sources
    const combined = [...newReleases, ...tmdbUpcoming];
    const seen = new Set<string>();
    const deduplicated = combined.filter(item => {
      const key = `${item.title.toLowerCase()}-${item.year}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    const filtered = deduplicated.filter(item => 
      mediaType === 'movie' ? item.media_type === 'movie' : item.media_type === 'tv'
    );
    
    const serviceCounts: {[key: string]: number} = {};
    filtered.forEach(item => {
      const service = item.service || 'Unknown';
      serviceCounts[service] = (serviceCounts[service] || 0) + 1;
    });
    
    console.log('📊 Upcoming by service:');
    Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]).forEach(([service, count]) => {
      console.log(`  ${service}: ${count}`);
    });
    
    console.log(`✅ Total upcoming: ${filtered.length} items`);
    
    return filtered.sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime());
    
  } catch (error) {
    console.error('❌ Error:', error);
    return getTMDBUpcomingFallback(mediaType);
  }
}

export async function searchContent(query: string, mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  if (!query.trim()) return [];
  
  try {
    const TMDB_BASE = 'https://api.themoviedb.org/3';
    const type = mediaType === 'movie' ? 'movie' : 'tv';
    const url = `${TMDB_BASE}/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=en-US`;
    
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return [];
    
    const data = await response.json();
    const results = data.results || [];
    
    return results.slice(0, 20).map((item: any) => ({
      id: `tmdb-${item.id}`,
      title: item.title || item.name,
      overview: item.overview || 'No description available',
      poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      release_date: item.release_date || item.first_air_date || '',
      vote_average: item.vote_average || 0,
      genre_ids: (item.genre_ids || []).map((id: number) => id.toString()),
      media_type: mediaType,
      providers: ['Available'],
      service: 'Available',
      year: (item.release_date || item.first_air_date)?.split('-')[0]
    }));
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
