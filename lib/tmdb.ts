import { MediaItem } from './types';

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_KEY || '';
const OMDB_KEY = process.env.NEXT_PUBLIC_OMDB_KEY || '';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const RAPID_API_KEY = '7da4fc2c3amsh140b819649305f3p15dd22jsn89b71a3586d5';

const PROVIDER_MAP: { [key: number]: string } = {
  2: 'Apple TV+',
  8: 'Netflix',
  9: 'Amazon Prime',
  15: 'Hulu',
  31: 'Max',
  37: 'Showtime',
  73: 'Tubi',
  279: 'Pluto TV',
  337: 'Disney+',
  386: 'Peacock',
  531: 'Paramount+',
};

const SERVICE_MAP: { [key: string]: string } = {
  'netflix': 'Netflix',
  'prime': 'Amazon Prime',
  'hulu': 'Hulu',
  'disney': 'Disney+',
  'hbo': 'Max',
  'apple': 'Apple TV+',
  'paramount': 'Paramount+',
  'peacock': 'Peacock',
};

async function getOMDbRating(imdbId: string): Promise<string> {
  if (!imdbId || !OMDB_KEY) return '';
  try {
    const response = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}`, { cache: 'force-cache' });
    if (!response.ok) return '';
    const data = await response.json();
    return data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : '';
  } catch { return ''; }
}

async function getStreamingAvailability(service: string): Promise<MediaItem[]> {
  try {
    const url = `https://streaming-availability.p.rapidapi.com/shows/search/filters?country=us&catalogs=${service}.subscription&order_by=popularity_1month&output_language=en&show_original_language=en`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPID_API_KEY,
        'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    
    if (!data || !data.shows || data.shows.length === 0) {
      return [];
    }
    
    const items: MediaItem[] = data.shows.map((show: any) => {
      let posterPath = null;
      if (show.imageSet?.verticalPoster?.w480) {
        posterPath = show.imageSet.verticalPoster.w480;
      } else if (show.imageSet?.horizontalPoster?.w480) {
        posterPath = show.imageSet.horizontalPoster.w480;
      }
      
      return {
        id: `sa-${show.id}`,
        title: show.title,
        overview: show.overview || 'No description available',
        poster_path: posterPath,
        release_date: show.releaseYear?.toString() || show.firstAirYear?.toString() || '',
        vote_average: (show.rating || 0) * 10,
        genre_ids: (show.genres || []).map((g: any) => g.id?.toString() || g.name || ''),
        media_type: show.showType === 'movie' ? 'movie' : 'tv',
        providers: [SERVICE_MAP[service] || service],
        service: SERVICE_MAP[service] || service,
        availableDate: 'Streaming Now',
        imdbRating: show.rating?.toString() || '',
        imdbId: show.imdbId || '',
        year: show.releaseYear?.toString() || show.firstAirYear?.toString() || ''
      };
    });
    
    return items;
    
  } catch (error: any) {
    return [];
  }
}

async function getTMDBStreamingFallback(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  if (!TMDB_KEY) return [];
  
  try {
    const endpoint = mediaType === 'movie' ? 'movie/popular' : 'tv/popular';
    const allItems: MediaItem[] = [];
    const seenIds = new Set<string>();
    
    for (let page = 1; page <= 5; page++) {
      const url = `${TMDB_BASE}/${endpoint}?api_key=${TMDB_KEY}&language=en-US&page=${page}`;
      const response = await fetch(url, { cache: 'no-store' });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const results = data.results || [];
      
      for (const item of results) {
        const itemId = `${mediaType}-${item.id}`;
        if (seenIds.has(itemId)) continue;
        seenIds.add(itemId);
        
        try {
          const providerUrl = `${TMDB_BASE}/${mediaType}/${item.id}/watch/providers?api_key=${TMDB_KEY}`;
          const providerRes = await fetch(providerUrl, { cache: 'no-store' });
          
          if (!providerRes.ok) continue;
          
          const providerData = await providerRes.json();
          const usProviders = providerData.results?.US;
          
          if (!usProviders) continue;
          
          const allProviders = [
            ...(usProviders.flatrate || []),
            ...(usProviders.free || []),
            ...(usProviders.ads || []),
          ];
          
          const serviceList = allProviders
            .filter((p: any) => PROVIDER_MAP[p.provider_id])
            .map((p: any) => PROVIDER_MAP[p.provider_id] as string);
          
          if (serviceList.length === 0) continue;
          
          const uniqueServices: string[] = Array.from(new Set(serviceList));
          
          const detailUrl = `${TMDB_BASE}/${mediaType}/${item.id}/external_ids?api_key=${TMDB_KEY}`;
          const detailRes = await fetch(detailUrl, { cache: 'no-store' });
          let imdbId = '';
          let imdbRating = '';
          
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            imdbId = detailData.imdb_id || '';
            if (imdbId) {
              imdbRating = await getOMDbRating(imdbId);
            }
          }
          
          const genreIds: string[] = Array.isArray(item.genre_ids) 
            ? item.genre_ids.map((id: number) => id.toString()) 
            : [];
          
          allItems.push({
            id: `tmdb-${item.id}`,
            title: item.title || item.name,
            overview: item.overview || 'No description available',
            poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
            release_date: item.release_date || item.first_air_date || '',
            vote_average: item.vote_average || 0,
            genre_ids: genreIds,
            media_type: mediaType,
            providers: uniqueServices,
            service: uniqueServices[0],
            availableDate: 'Streaming Now',
            imdbRating,
            imdbId,
            year: (item.release_date || item.first_air_date)?.split('-')[0]
          });
        } catch (err) {
          // Silent
        }
      }
    }
    
    return allItems;
  } catch (error) {
    return [];
  }
}

async function getTMDBUpcomingFallback(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  if (!TMDB_KEY) return [];
  
  try {
    const allItems: MediaItem[] = [];
    const today = new Date();
    const seenIds = new Set<string>();
    
    const threeMonths = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    const startDate = today.toISOString().split('T')[0];
    const endDate = threeMonths.toISOString().split('T')[0];
    
    for (let page = 1; page <= 5; page++) {
      const endpoint = mediaType === 'movie' ? 'discover/movie' : 'discover/tv';
      const dateParam = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date';
      
      const url = `${TMDB_BASE}/${endpoint}?api_key=${TMDB_KEY}&language=en-US&sort_by=popularity.desc&${dateParam}.gte=${startDate}&${dateParam}.lte=${endDate}&watch_region=US&page=${page}`;
      
      const response = await fetch(url, { cache: 'no-store' });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const results = data.results || [];
      
      for (const item of results) {
        const itemId = `${mediaType}-${item.id}`;
        if (seenIds.has(itemId)) continue;
        seenIds.add(itemId);
        
        const releaseDate = item.release_date || item.first_air_date;
        if (!releaseDate) continue;
        
        const relDate = new Date(releaseDate);
        if (relDate <= today) continue;
        
        try {
          const providerUrl = `${TMDB_BASE}/${mediaType}/${item.id}/watch/providers?api_key=${TMDB_KEY}`;
          const providerRes = await fetch(providerUrl, { cache: 'no-store' });
          
          let services: string[] = [];
          let serviceName = 'TBA';
          
          if (providerRes.ok) {
            const providerData = await providerRes.json();
            const usProviders = providerData.results?.US;
            
            if (usProviders) {
              const allProviders = [
                ...(usProviders.flatrate || []),
                ...(usProviders.free || []),
                ...(usProviders.ads || [])
              ];
              
              const providerServices = allProviders
                .filter((p: any) => PROVIDER_MAP[p.provider_id])
                .map((p: any) => PROVIDER_MAP[p.provider_id] as string);
              
              if (providerServices.length > 0) {
                services = Array.from(new Set(providerServices));
                serviceName = services[0];
              }
            }
          }
          
          const formattedDate = relDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric' 
          });
          
          const detailUrl = `${TMDB_BASE}/${mediaType}/${item.id}/external_ids?api_key=${TMDB_KEY}`;
          const detailRes = await fetch(detailUrl, { cache: 'no-store' });
          let imdbId = '';
          let imdbRating = '';
          
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            imdbId = detailData.imdb_id || '';
            if (imdbId) {
              imdbRating = await getOMDbRating(imdbId);
            }
          }
          
          const genreIds: string[] = Array.isArray(item.genre_ids) 
            ? item.genre_ids.map((id: number) => id.toString()) 
            : [];
          
          allItems.push({
            id: `tmdb-${item.id}`,
            title: item.title || item.name,
            overview: item.overview || 'No description available',
            poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
            release_date: releaseDate,
            vote_average: item.vote_average || 0,
            genre_ids: genreIds,
            media_type: mediaType,
            providers: services.length > 0 ? services : ['TBA'],
            service: serviceName,
            availableDate: formattedDate,
            imdbRating,
            imdbId,
            year: releaseDate.split('-')[0]
          });
        } catch (err) {
          // Silent
        }
      }
    }
    
    return allItems.sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime());
  } catch (error) {
    return [];
  }
}

export async function getStreamingContent(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  try {
    console.log('🎬 Fetching streaming content...');
    
    const services = ['netflix', 'prime', 'hulu', 'disney', 'hbo', 'apple', 'paramount', 'peacock'];
    
    // Get from Streaming API
    const streamingPromises = services.map(service => 
      getStreamingAvailability(service).catch(() => [])
    );
    
    const streamingResults = await Promise.all(streamingPromises);
    const streamingItems = streamingResults.flat();
    
    console.log(`Streaming API: ${streamingItems.length} items`);
    
    // Get from TMDB
    const tmdbItems = await getTMDBStreamingFallback(mediaType);
    console.log(`TMDB: ${tmdbItems.length} items`);
    
    // Combine and deduplicate
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
    
    console.log(`✅ Total: ${filtered.length} items`);
    return filtered;
    
  } catch (error) {
    console.error('❌ Error:', error);
    return getTMDBStreamingFallback(mediaType);
  }
}

export async function getUpcomingContent(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  // Streaming API doesn't have a working upcoming endpoint
  // Use TMDB only for now
  return getTMDBUpcomingFallback(mediaType);
}

export async function searchContent(query: string, mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  if (!query.trim()) return [];
  
  try {
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
