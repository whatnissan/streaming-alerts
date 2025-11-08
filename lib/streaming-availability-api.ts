import { MediaItem } from './types';

const RAPID_API_KEY = '7da4fc2c3amsh140b819649305f3p15dd22jsn89b71a3586d5';
const BASE_URL = 'https://streaming-availability.p.rapidapi.com';

const SERVICE_MAP: { [key: string]: string } = {
  'netflix': 'Netflix',
  'prime': 'Amazon Prime',
  'hulu': 'Hulu',
  'disney': 'Disney+',
  'hbo': 'Max',
  'apple': 'Apple TV+',
  'paramount': 'Paramount+',
  'peacock': 'Peacock',
  'showtime': 'Showtime',
};

async function makeRequest(endpoint: string) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'x-rapidapi-host': 'streaming-availability.p.rapidapi.com',
      'x-rapidapi-key': RAPID_API_KEY
    },
    cache: 'no-store'
  });
  
  if (!response.ok) {
    console.error(`API Error: ${response.status}`);
    return null;
  }
  
  return response.json();
}

export async function getStreamingAvailability(service: string): Promise<MediaItem[]> {
  try {
    console.log(`📡 Fetching from ${service}...`);
    
    // Get shows by service
    const data = await makeRequest(`/shows/search/filters?country=us&services=${service}&show_type=movie,series&order_by=popularity_1week`);
    
    if (!data || !data.shows) {
      console.log(`No data for ${service}`);
      return [];
    }
    
    const items: MediaItem[] = data.shows.slice(0, 50).map((show: any) => ({
      id: `sa-${show.id}`,
      title: show.title,
      overview: show.overview || 'No description available',
      poster_path: show.imageSet?.verticalPoster?.w480 || null,
      release_date: show.releaseYear?.toString() || '',
      vote_average: show.rating || 0,
      genre_ids: show.genres?.map((g: any) => g.id) || [],
      media_type: show.showType === 'movie' ? 'movie' : 'tv',
      providers: [SERVICE_MAP[service] || service],
      service: SERVICE_MAP[service] || service,
      availableDate: 'Streaming Now',
      imdbRating: show.imdbRating?.toString() || '',
      imdbId: show.imdbId || '',
      year: show.releaseYear?.toString() || ''
    }));
    
    console.log(`✓ Found ${items.length} items on ${SERVICE_MAP[service]}`);
    return items;
  } catch (error) {
    console.error(`Error fetching ${service}:`, error);
    return [];
  }
}

export async function getUpcomingFromStreaming(service: string): Promise<MediaItem[]> {
  try {
    console.log(`📡 Fetching upcoming from ${service}...`);
    
    const data = await makeRequest(`/shows/search/filters?country=us&services=${service}&show_type=movie,series&order_by=upcoming`);
    
    if (!data || !data.shows) {
      return [];
    }
    
    const today = new Date();
    
    const items: MediaItem[] = data.shows
      .filter((show: any) => {
        const releaseDate = show.firstAirYear || show.releaseYear;
        return releaseDate && new Date(releaseDate) > today;
      })
      .slice(0, 30)
      .map((show: any) => {
        const releaseDate = show.firstAirYear || show.releaseYear || '';
        const formattedDate = releaseDate 
          ? new Date(releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'TBA';
        
        return {
          id: `sa-${show.id}`,
          title: show.title,
          overview: show.overview || 'No description available',
          poster_path: show.imageSet?.verticalPoster?.w480 || null,
          release_date: releaseDate,
          vote_average: show.rating || 0,
          genre_ids: show.genres?.map((g: any) => g.id) || [],
          media_type: show.showType === 'movie' ? 'movie' : 'tv',
          providers: [SERVICE_MAP[service] || service],
          service: SERVICE_MAP[service] || service,
          availableDate: formattedDate,
          imdbRating: show.imdbRating?.toString() || '',
          imdbId: show.imdbId || '',
          year: releaseDate
        };
      });
    
    console.log(`✓ Found ${items.length} upcoming items on ${SERVICE_MAP[service]}`);
    return items;
  } catch (error) {
    console.error(`Error fetching upcoming ${service}:`, error);
    return [];
  }
}
