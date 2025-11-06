import { MediaItem, STREAMING_SERVICES } from './types';

const WATCHMODE_KEY = process.env.NEXT_PUBLIC_WATCHMODE_KEY || '';
const WATCHMODE_BASE = 'https://api.watchmode.com/v1';

// Map Watchmode source IDs to our service names
const WATCHMODE_SOURCES: { [key: number]: string } = {
  203: 'Netflix',
  26: 'Amazon Prime Video', 
  157: 'Hulu',
  444: 'Paramount+',
  387: 'HBO Max',
  372: 'Disney+',
  371: 'Apple TV+',
};

async function getOMDbRating(imdbId: string): Promise<string> {
  const OMDB_KEY = process.env.NEXT_PUBLIC_OMDB_KEY || '';
  if (!imdbId || !OMDB_KEY) return '';
  
  try {
    const response = await fetch(
      `https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}`,
      { cache: 'force-cache' }
    );
    
    if (!response.ok) return '';
    const data = await response.json();
    return data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : '';
  } catch (error) {
    return '';
  }
}

export async function getWatchmodeUpcoming(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  if (!WATCHMODE_KEY) {
    console.error('Watchmode API key not configured');
    return [];
  }

  try {
    const types = mediaType === 'movie' ? 'movie' : 'tv_series';
    const sourceIds = Object.keys(WATCHMODE_SOURCES).join(',');
    
    // Get list of upcoming titles
    const listUrl = `${WATCHMODE_BASE}/list-titles/?apiKey=${WATCHMODE_KEY}&types=${types}&source_ids=${sourceIds}&limit=50`;
    
    console.log('Fetching Watchmode upcoming...');
    
    const response = await fetch(listUrl, { cache: 'no-store' });
    
    if (!response.ok) {
      console.error('Watchmode API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    const titles = data.titles || [];
    
    console.log(`Got ${titles.length} titles from Watchmode`);
    
    // Get detailed info for each title (limit to save API calls)
    const detailedTitles = await Promise.all(
      titles.slice(0, 20).map(async (title: any) => {
        try {
          const detailUrl = `${WATCHMODE_BASE}/title/${title.id}/details/?apiKey=${WATCHMODE_KEY}`;
          const detailResponse = await fetch(detailUrl, { cache: 'no-store' });
          
          if (!detailResponse.ok) return null;
          
          const details = await detailResponse.json();
          
          // Get streaming sources for this title
          const sources = details.sources || [];
          const availableServices = sources
            .filter((s: any) => WATCHMODE_SOURCES[s.source_id])
            .map((s: any) => WATCHMODE_SOURCES[s.source_id]);
          
          if (availableServices.length === 0) return null;
          
          // Get IMDb rating
          const imdbRating = details.imdb_id ? await getOMDbRating(details.imdb_id) : '';
          
          return {
            id: `wm-${details.id}`,
            title: details.title,
            overview: details.plot_overview || 'No description available',
            poster_path: details.poster || null,
            release_date: details.release_date || details.year ? `${details.year}-01-01` : '',
            vote_average: details.user_rating || 0,
            genre_ids: details.genre_names || [],
            media_type: mediaType,
            providers: availableServices,
            service: availableServices[0],
            availableDate: details.release_date || 'Available Now',
            imdbRating,
            imdbId: details.imdb_id,
            year: details.year?.toString()
          };
        } catch (err) {
          console.error('Error fetching Watchmode details:', err);
          return null;
        }
      })
    );
    
    return detailedTitles.filter((t): t is MediaItem => t !== null);
  } catch (error) {
    console.error('Error in getWatchmodeUpcoming:', error);
    return [];
  }
}

export async function searchWatchmode(query: string, mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  if (!WATCHMODE_KEY || !query.trim()) return [];
  
  try {
    const types = mediaType === 'movie' ? 'movie' : 'tv_series';
    const searchUrl = `${WATCHMODE_BASE}/autocomplete-search/?apiKey=${WATCHMODE_KEY}&search_value=${encodeURIComponent(query)}&search_type=2`;
    
    const response = await fetch(searchUrl, { cache: 'no-store' });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const results = data.results || [];
    
    // Filter by media type and get details
    const filtered = results.filter((r: any) => 
      (mediaType === 'movie' && r.type === 'movie') ||
      (mediaType === 'tv' && r.type === 'tv_series')
    );
    
    const detailed = await Promise.all(
      filtered.slice(0, 10).map(async (result: any) => {
        try {
          const detailUrl = `${WATCHMODE_BASE}/title/${result.id}/details/?apiKey=${WATCHMODE_KEY}`;
          const detailResponse = await fetch(detailUrl, { cache: 'no-store' });
          
          if (!detailResponse.ok) return null;
          
          const details = await detailResponse.json();
          
          const sources = details.sources || [];
          const availableServices = sources
            .filter((s: any) => WATCHMODE_SOURCES[s.source_id])
            .map((s: any) => WATCHMODE_SOURCES[s.source_id]);
          
          const imdbRating = details.imdb_id ? await getOMDbRating(details.imdb_id) : '';
          
          return {
            id: `wm-${details.id}`,
            title: details.title,
            overview: details.plot_overview || 'No description available',
            poster_path: details.poster || null,
            release_date: details.release_date || details.year ? `${details.year}-01-01` : '',
            vote_average: details.user_rating || 0,
            genre_ids: details.genre_names || [],
            media_type: mediaType,
            providers: availableServices,
            service: availableServices.length > 0 ? availableServices.join(', ') : 'Streaming',
            imdbRating,
            imdbId: details.imdb_id,
            year: details.year?.toString()
          };
        } catch (err) {
          return null;
        }
      })
    );
    
    return detailed.filter((t): t is MediaItem => t !== null);
  } catch (error) {
    console.error('Error searching Watchmode:', error);
    return [];
  }
}
