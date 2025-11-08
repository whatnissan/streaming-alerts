import { MediaItem } from './types';

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_KEY || '';
const OMDB_KEY = process.env.NEXT_PUBLIC_OMDB_KEY || '';
const TMDB_BASE = 'https://api.themoviedb.org/3';

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

async function getOMDbRating(imdbId: string): Promise<string> {
  if (!imdbId || !OMDB_KEY) return '';
  try {
    const response = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}`, { cache: 'force-cache' });
    if (!response.ok) return '';
    const data = await response.json();
    return data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : '';
  } catch { return ''; }
}

export async function getStreamingContent(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  if (!TMDB_KEY) {
    console.error('❌ TMDB API key not found!');
    return [];
  }
  
  try {
    const endpoint = mediaType === 'movie' ? 'movie/popular' : 'tv/popular';
    const allItems: MediaItem[] = [];
    const seenIds = new Set<string>();
    
    console.log('📡 Fetching streaming content...');
    
    for (let page = 1; page <= 10; page++) {
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
          // Silent fail
        }
      }
    }
    
    const serviceCounts: {[key: string]: number} = {};
    allItems.forEach(item => {
      const service = item.service || 'Unknown';
      serviceCounts[service] = (serviceCounts[service] || 0) + 1;
    });
    
    console.log('📊 Streaming by service:');
    Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]).forEach(([service, count]) => {
      console.log(`  ${service}: ${count}`);
    });
    
    return allItems;
  } catch (error) {
    console.error('❌ Error:', error);
    return [];
  }
}

export async function getUpcomingContent(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  if (!TMDB_KEY) {
    console.error('❌ TMDB API key not found!');
    return [];
  }
  
  try {
    const allItems: MediaItem[] = [];
    const today = new Date();
    const seenIds = new Set<string>();
    
    console.log('📡 Fetching upcoming...');
    
    const threeMonths = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    const startDate = today.toISOString().split('T')[0];
    const endDate = threeMonths.toISOString().split('T')[0];
    
    for (let page = 1; page <= 10; page++) {
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
    
    const serviceCounts: {[key: string]: number} = {};
    allItems.forEach(item => {
      const service = item.service || 'Unknown';
      serviceCounts[service] = (serviceCounts[service] || 0) + 1;
    });
    
    console.log('📊 Upcoming by service:');
    Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]).forEach(([service, count]) => {
      console.log(`  ${service}: ${count}`);
    });
    
    return allItems.sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime());
  } catch (error) {
    console.error('❌ Error:', error);
    return [];
  }
}

export async function searchContent(query: string, mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  if (!query.trim()) return [];
  
  try {
    const type = mediaType === 'movie' ? 'movie' : 'tv';
    const url = `https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=en-US`;
    
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
