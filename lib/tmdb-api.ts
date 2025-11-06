import { MediaItem } from './types';

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_KEY || '';
const OMDB_KEY = process.env.NEXT_PUBLIC_OMDB_KEY || '';
const TMDB_BASE = 'https://api.themoviedb.org/3';

const PROVIDER_MAP: { [key: number]: string } = {
  8: 'Netflix',
  9: 'Amazon Prime',
  15: 'Hulu',
  531: 'Paramount+',
  384: 'HBO Max',
  1899: 'Max',
  337: 'Disney+',
  350: 'Apple TV+',
  386: 'Peacock',
  73: 'Tubi',
  43: 'Showtime',
  47: 'Showtime',
  37: 'Showtime',
  1853: 'Paramount+ with Showtime',
  300: 'Pluto TV',
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
    
    console.log('📡 Fetching from TMDB...');
    
    for (let page = 1; page <= 5; page++) {
      const url = `${TMDB_BASE}/${endpoint}?api_key=${TMDB_KEY}&language=en-US&page=${page}`;
      const response = await fetch(url, { cache: 'no-store' });
      
      if (!response.ok) {
        console.error(`❌ TMDB page ${page} error: ${response.status} - ${response.statusText}`);
        if (response.status === 401) {
          console.error('🔑 Invalid TMDB API key! Check Railway variables.');
        }
        continue;
      }
      
      const data = await response.json();
      const results = data.results || [];
      
      console.log(`✅ TMDB page ${page}: ${results.length} items`);
      
      for (const item of results) {
        try {
          const providerUrl = `${TMDB_BASE}/${mediaType}/${item.id}/watch/providers?api_key=${TMDB_KEY}`;
          const providerRes = await fetch(providerUrl, { cache: 'no-store' });
          
          if (!providerRes.ok) continue;
          
          const providerData = await providerRes.json();
          const usProviders = providerData.results?.US;
          
          if (!usProviders) continue;
          
          // Collect providers from all sources: flatrate (subscription), buy, rent, ads
          const allProviders = [
            ...(usProviders.flatrate || []),
            ...(usProviders.free || []),
            ...(usProviders.ads || [])
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
          
          if (allItems.length % 20 === 0) {
            console.log(`✓ Processed ${allItems.length} items...`);
          }
        } catch (err) {
          console.error('Error processing item:', err);
        }
      }
    }
    
    console.log(`🎬 Total TMDB items: ${allItems.length}`);
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
    const endpoint = mediaType === 'movie' ? 'movie/upcoming' : 'tv/on_the_air';
    const allItems: MediaItem[] = [];
    
    console.log('📡 Fetching upcoming from TMDB...');
    
    for (let page = 1; page <= 5; page++) {
      const url = `${TMDB_BASE}/${endpoint}?api_key=${TMDB_KEY}&language=en-US&page=${page}&region=US`;
      const response = await fetch(url, { cache: 'no-store' });
      
      if (!response.ok) {
        console.error(`❌ TMDB upcoming page ${page} error: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      const results = data.results || [];
      
      console.log(`✅ TMDB upcoming page ${page}: ${results.length} items`);
      
      for (const item of results) {
        try {
          const providerUrl = `${TMDB_BASE}/${mediaType}/${item.id}/watch/providers?api_key=${TMDB_KEY}`;
          const providerRes = await fetch(providerUrl, { cache: 'no-store' });
          
          let services: string[] = ['TBA'];
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
          
          const releaseDate = item.release_date || item.first_air_date;
          const formattedDate = releaseDate 
            ? new Date(releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'TBA';
          
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
            release_date: releaseDate || '',
            vote_average: item.vote_average || 0,
            genre_ids: genreIds,
            media_type: mediaType,
            providers: services,
            service: serviceName,
            availableDate: formattedDate,
            imdbRating,
            imdbId,
            year: releaseDate?.split('-')[0]
          });
        } catch (err) {
          console.error('Error processing upcoming item:', err);
        }
      }
    }
    
    console.log(`🎬 Total TMDB upcoming: ${allItems.length}`);
    return allItems;
  } catch (error) {
    console.error('❌ TMDB upcoming error:', error);
    return [];
  }
}
