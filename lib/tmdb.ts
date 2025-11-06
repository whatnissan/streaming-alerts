import { MediaItem } from './types';

const WATCHMODE_KEY = process.env.NEXT_PUBLIC_WATCHMODE_KEY || '';
const OMDB_KEY = process.env.NEXT_PUBLIC_OMDB_KEY || '';

const SERVICE_MAP: { [key: number]: string } = {
  203: 'Netflix',
  26: 'Amazon Prime',
  157: 'Hulu',
  444: 'Paramount+',
  387: 'HBO Max',
  372: 'Disney+',
  371: 'Apple TV+',
  389: 'Peacock',
  43: 'Showtime',
  201: 'Tubi',
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

export async function getUpcomingContent(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  try {
    const type = mediaType === 'movie' ? 'movie' : 'tv_series';
    const sources = '203,26,157,444,387,372,371'; // Major services
    
    const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_KEY}&types=${type}&source_ids=${sources}&limit=50`;
    
    console.log('Fetching from Watchmode...');
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      console.error('Watchmode error:', response.status);
      return [];
    }
    
    const data = await response.json();
    const titles = data.titles || [];
    console.log(`Got ${titles.length} titles from list`);
    
    // Get details for first 20 only
    const detailedItems: MediaItem[] = [];
    
    for (let i = 0; i < Math.min(20, titles.length); i++) {
      const title = titles[i];
      try {
        console.log(`Fetching details for: ${title.title}`);
        const detailRes = await fetch(`https://api.watchmode.com/v1/title/${title.id}/details/?apiKey=${WATCHMODE_KEY}`, { cache: 'no-store' });
        
        if (!detailRes.ok) {
          console.error(`Failed to get details for ${title.title}`);
          continue;
        }
        
        const details = await detailRes.json();
        const sources = details.sources || [];
        const services = sources
          .filter((s: any) => SERVICE_MAP[s.source_id])
          .map((s: any) => SERVICE_MAP[s.source_id]);
        
        if (services.length === 0) {
          console.log(`No streaming services for ${title.title}`);
          continue;
        }
        
        const imdbRating = details.imdb_id ? await getOMDbRating(details.imdb_id) : '';
        
        detailedItems.push({
          id: details.id.toString(),
          title: details.title,
          overview: details.plot_overview || 'No description available',
          poster_path: details.poster || null,
          release_date: details.release_date || (details.year ? `${details.year}-01-01` : ''),
          vote_average: details.user_rating || 0,
          genre_ids: details.genre_names || [],
          media_type: mediaType,
          providers: services,
          service: services[0],
          availableDate: 'Available Now',
          imdbRating,
          imdbId: details.imdb_id,
          year: details.year?.toString()
        });
        
        console.log(`Added: ${details.title} on ${services[0]}`);
      } catch (err) {
        console.error(`Error processing ${title.title}:`, err);
      }
    }
    
    console.log(`Total items with details: ${detailedItems.length}`);
    return detailedItems;
  } catch (error) {
    console.error('Error in getUpcomingContent:', error);
    return [];
  }
}

export async function searchContent(query: string, mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  if (!query.trim()) return [];
  
  try {
    const response = await fetch(
      `https://api.watchmode.com/v1/autocomplete-search/?apiKey=${WATCHMODE_KEY}&search_value=${encodeURIComponent(query)}&search_type=2`,
      { cache: 'no-store' }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const results = (data.results || []).filter((r: any) => 
      (mediaType === 'movie' && r.type === 'movie') || (mediaType === 'tv' && r.type === 'tv_series')
    );
    
    return results.slice(0, 20).map((r: any) => ({
      id: r.id.toString(),
      title: r.name,
      overview: 'Search result',
      poster_path: r.image_url || null,
      release_date: r.year ? `${r.year}-01-01` : '',
      vote_average: 0,
      genre_ids: [],
      media_type: mediaType,
      providers: ['Streaming'],
      service: 'Available',
      year: r.year?.toString()
    }));
  } catch { return []; }
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
