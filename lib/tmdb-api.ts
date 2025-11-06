import { MediaItem } from './types';

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_KEY || '';
const OMDB_KEY = process.env.NEXT_PUBLIC_OMDB_KEY || '';
const TMDB_BASE = 'https://api.themoviedb.org/3';

// Clean provider map - ONLY ONE ID per service name
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

export async function getTMDBStreaming(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  if (!TMDB_KEY) {
    console.error('❌ TMDB API key not found!');
    return [];
  }
  
  try {
    const endpoint = mediaType === 'movie' ? 'movie/popular' : 'tv/popular';
    const allItems: MediaItem[] = [];
    const unknownProviders = new Set<number>();
    
    console.log('📡 Fetching streaming from TMDB...');
    
    for (let page = 1; page <= 5; page++) {
      const url = `${TMDB_BASE}/${endpoint}?api_key=${TMDB_KEY}&language=en-US&page=${page}`;
      const response = await fetch(url, { cache: 'no-store' });
      
      if (!response.ok) {
        console.error(`❌ TMDB page ${page} error: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      const results = data.results || [];
      
      for (const item of results) {
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
            ...(usProviders.ads || [])
          ];
          
          allProviders.forEach((p: any) => {
            if (!PROVIDER_MAP[p.provider_id]) {
              unknownProviders.add(p.provider_id);
              console.log(`🔍 Unknown provider ID ${p.provider_id}: ${p.provider_name}`);
            }
          });
          
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
          console.error('Error processing item:', err);
        }
      }
    }
    
    console.log(`🎬 Total TMDB streaming items: ${allItems.length}`);
    if (unknownProviders.size > 0) {
      console.log(`📊 Unknown provider IDs found: ${Array.from(unknownProviders).join(', ')}`);
    }
    return allItems;
  } catch (error) {
    console.error('❌ TMDB error:', error);
    return [];
  }
}

export async function getTMDBUpcoming(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  if (!TMDB_KEY) {
    console.error('❌ TMDB API key not found!');
    return [];
  }
  
  try {
    const allItems: MediaItem[] = [];
    
    console.log('📡 Fetching upcoming streaming releases...');
    
    const today = new Date();
    const threeMonthsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sixMonthsFromNow = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000);
    
    const startDate = threeMonthsAgo.toISOString().split('T')[0];
    const endDate = sixMonthsFromNow.toISOString().split('T')[0];
    
    for (let page = 1; page <= 10; page++) {
      const endpoint = mediaType === 'movie' ? 'discover/movie' : 'discover/tv';
      const dateParam = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date';
      
      const url = `${TMDB_BASE}/${endpoint}?api_key=${TMDB_KEY}&language=en-US&sort_by=popularity.desc&${dateParam}.gte=${startDate}&${dateParam}.lte=${endDate}&watch_region=US&page=${page}`;
      
      const response = await fetch(url, { cache: 'no-store' });
      
      if (!response.ok) {
        console.error(`❌ Page ${page} error: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      const results = data.results || [];
      
      console.log(`📄 Page ${page}: ${results.length} results`);
      
      for (const item of results) {
        try {
          const providerUrl = `${TMDB_BASE}/${mediaType}/${item.id}/watch/providers?api_key=${TMDB_KEY}`;
          const providerRes = await fetch(providerUrl, { cache: 'no-store' });
          
          let services: string[] = [];
          let serviceName = 'Coming Soon';
          
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
          
          const releaseDate = item.release_date || item.first_air_date;
          if (!releaseDate) continue;
          
          const relDate = new Date(releaseDate);
          const isUpcoming = relDate > today;
          
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
          
          if (serviceName !== 'Coming Soon' || isUpcoming) {
            allItems.push({
              id: `tmdb-${item.id}`,
              title: item.title || item.name,
              overview: item.overview || 'No description available',
              poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
              release_date: releaseDate,
              vote_average: item.vote_average || 0,
              genre_ids: genreIds,
              media_type: mediaType,
              providers: services.length > 0 ? services : ['Coming Soon'],
              service: serviceName,
              availableDate: `${isUpcoming ? 'Coming ' : 'Added '}${formattedDate}`,
              imdbRating,
              imdbId,
              year: releaseDate.split('-')[0]
            });
            
            console.log(`✓ ${item.title || item.name} - ${serviceName} on ${formattedDate}`);
          }
        } catch (err) {
          console.error('Error processing item:', err);
        }
      }
    }
    
    const uniqueItems = Array.from(
      new Map(allItems.map(item => [item.id, item])).values()
    ).sort((a, b) => {
      const dateA = new Date(a.release_date).getTime();
      const dateB = new Date(b.release_date).getTime();
      return dateB - dateA;
    });
    
    console.log(`🎬 Total upcoming items: ${uniqueItems.length}`);
    return uniqueItems;
  } catch (error) {
    console.error('❌ TMDB upcoming error:', error);
    return [];
  }
}
