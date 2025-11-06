import { MediaItem } from './types';

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_KEY || '';
const OMDB_KEY = process.env.NEXT_PUBLIC_OMDB_KEY || '';
const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_KEY || '';
const TMDB_BASE = 'https://api.themoviedb.org/3';

const PROVIDER_MAP: { [key: number]: string } = {
  8: 'Netflix',
  9: 'Amazon Prime',
  10: 'Amazon Prime',
  119: 'Amazon Prime',
  15: 'Hulu',
  531: 'Paramount+',
  582: 'Paramount+',
  384: 'HBO Max',
  1899: 'Max',
  387: 'HBO',
  31: 'HBO Max',
  118: 'HBO Max',
  337: 'Disney+',
  390: 'Disney+',
  350: 'Apple TV+',
  2: 'Apple TV+',
  386: 'Peacock',
  73: 'Tubi',
  283: 'Tubi',
  43: 'Showtime',
  37: 'Showtime',
  1853: 'Showtime',
  642: 'Showtime',
  300: 'Pluto TV',
  279: 'Pluto TV',
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

// Predict service based on patterns (no AI needed for most)
function predictServiceFromPatterns(title: string, overview: string): string {
  const text = (title + ' ' + overview).toLowerCase();
  
  // Netflix patterns
  if (text.includes('netflix') || text.includes('stranger things') || text.includes('bridgerton')) {
    return 'Netflix';
  }
  
  // Disney+ patterns
  if (text.includes('marvel') || text.includes('star wars') || text.includes('disney') || 
      text.includes('pixar') || text.includes('mandalorian')) {
    return 'Disney+';
  }
  
  // Amazon Prime patterns
  if (text.includes('amazon') || text.includes('prime video') || text.includes('rings of power')) {
    return 'Amazon Prime';
  }
  
  // Apple TV+ patterns
  if (text.includes('apple') || text.includes('apple tv')) {
    return 'Apple TV+';
  }
  
  // HBO/Max patterns
  if (text.includes('hbo') || text.includes('max') || text.includes('game of thrones') || 
      text.includes('house of the dragon')) {
    return 'Max';
  }
  
  // Paramount+ patterns
  if (text.includes('paramount') || text.includes('star trek')) {
    return 'Paramount+';
  }
  
  return 'TBA';
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
    
    console.log('📡 Fetching from TMDB...');
    
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
    
    console.log(`🎬 Total TMDB items: ${allItems.length}`);
    if (unknownProviders.size > 0) {
      console.log(`📊 Unknown provider IDs: ${Array.from(unknownProviders).join(', ')}`);
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
      
      for (const item of results) {
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
          
          // If no service found, try pattern matching
          if (serviceName === 'TBA') {
            serviceName = predictServiceFromPatterns(
              item.title || item.name,
              item.overview || ''
            );
            if (serviceName !== 'TBA') {
              services = [serviceName];
            }
          }
          
          // Format the release date
          const releaseDate = item.release_date || item.first_air_date;
          let formattedDate = 'TBA';
          
          if (releaseDate) {
            const date = new Date(releaseDate);
            formattedDate = date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric' 
            });
          }
          
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
            providers: services.length > 0 ? services : ['TBA'],
            service: serviceName,
            availableDate: formattedDate,
            imdbRating,
            imdbId,
            year: releaseDate?.split('-')[0]
          });
          
          console.log(`✓ ${item.title || item.name} - ${serviceName} on ${formattedDate}`);
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
