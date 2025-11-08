import { MediaItem } from './types';

const WATCHMODE_KEY = process.env.NEXT_PUBLIC_WATCHMODE_KEY || '';

// Watchmode source IDs for streaming services
const SERVICE_MAP: { [key: string]: number } = {
  'Netflix': 203,
  'Amazon Prime': 26,
  'Hulu': 157,
  'Disney+': 372,
  'Max': 387,
  'Apple TV+': 371,
  'Paramount+': 444,
  'Peacock': 389,
  'Showtime': 37,
};

export async function getWatchmodeNewReleases(service: string): Promise<MediaItem[]> {
  if (!WATCHMODE_KEY) {
    console.error('❌ Watchmode API key not found!');
    return [];
  }

  const sourceId = SERVICE_MAP[service];
  if (!sourceId) {
    console.error(`❌ Unknown service: ${service}`);
    return [];
  }

  try {
    // Get titles added in the last 30 days
    const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_KEY}&source_ids=${sourceId}&sort_by=relevance_desc&limit=100`;
    
    console.log(`📡 Fetching new releases for ${service}...`);
    
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      console.error(`❌ Watchmode error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const titles = data.titles || [];
    
    console.log(`✅ Found ${titles.length} titles for ${service}`);
    
    const items: MediaItem[] = titles.map((item: any) => ({
      id: `wm-${item.id}`,
      title: item.title,
      overview: item.plot_overview || 'No description available',
      poster_path: item.poster || null,
      release_date: item.year?.toString() || '',
      vote_average: item.tmdb_rating || item.imdb_rating || 0,
      genre_ids: [],
      media_type: item.type === 'movie' ? 'movie' : 'tv',
      providers: [service],
      service: service,
      availableDate: 'Streaming Now',
      imdbRating: item.imdb_rating?.toString() || '',
      imdbId: item.imdb_id || '',
      year: item.year?.toString() || ''
    }));
    
    return items;
  } catch (error) {
    console.error('❌ Watchmode error:', error);
    return [];
  }
}

export async function getWatchmodeUpcoming(service: string): Promise<MediaItem[]> {
  if (!WATCHMODE_KEY) {
    console.error('❌ Watchmode API key not found!');
    return [];
  }

  const sourceId = SERVICE_MAP[service];
  if (!sourceId) {
    console.error(`❌ Unknown service: ${service}`);
    return [];
  }

  try {
    // Get upcoming titles for this service
    const today = new Date().toISOString().split('T')[0];
    const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_KEY}&source_ids=${sourceId}&release_date_start=${today}&sort_by=release_date_asc&limit=100`;
    
    console.log(`📡 Fetching upcoming for ${service}...`);
    
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      console.error(`❌ Watchmode error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const titles = data.titles || [];
    
    console.log(`✅ Found ${titles.length} upcoming titles for ${service}`);
    
    const items: MediaItem[] = titles.map((item: any) => {
      const releaseDate = item.us_release_date || item.release_date || '';
      const formattedDate = releaseDate 
        ? new Date(releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'TBA';
      
      return {
        id: `wm-${item.id}`,
        title: item.title,
        overview: item.plot_overview || 'No description available',
        poster_path: item.poster || null,
        release_date: releaseDate,
        vote_average: item.tmdb_rating || item.imdb_rating || 0,
        genre_ids: [],
        media_type: item.type === 'movie' ? 'movie' : 'tv',
        providers: [service],
        service: service,
        availableDate: `Coming ${formattedDate}`,
        imdbRating: item.imdb_rating?.toString() || '',
        imdbId: item.imdb_id || '',
        year: item.year?.toString() || ''
      };
    });
    
    return items;
  } catch (error) {
    console.error('❌ Watchmode error:', error);
    return [];
  }
}
