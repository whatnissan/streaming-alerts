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

export async function getStreamingContent(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  try {
    const type = mediaType === 'movie' ? 'movie' : 'tv_series';
    
    const services = [
      { id: 203, name: 'Netflix' },
      { id: 26, name: 'Amazon Prime' },
      { id: 157, name: 'Hulu' },
      { id: 444, name: 'Paramount+' },
      { id: 387, name: 'HBO Max' },
      { id: 372, name: 'Disney+' },
      { id: 371, name: 'Apple TV+' }
    ];
    
    const allItems: MediaItem[] = [];
    
    for (const service of services) {
      try {
        const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_KEY}&types=${type}&source_ids=${service.id}&sort_by=popularity_desc&limit=20`;
        
        console.log(`Fetching from ${service.name}...`);
        const response = await fetch(url, { cache: 'no-store' });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        const titles = data.titles || [];
        console.log(`${service.name}: ${titles.length} titles`);
        
        for (let i = 0; i < Math.min(5, titles.length); i++) {
          const title = titles[i];
          try {
            const detailRes = await fetch(`https://api.watchmode.com/v1/title/${title.id}/details/?apiKey=${WATCHMODE_KEY}`, { cache: 'no-store' });
            
            if (!detailRes.ok) continue;
            
            const details = await detailRes.json();
            
            // If we got it from this source query, we know it's on this service
            // Don't filter - just use the service we queried
            const imdbRating = details.imdb_id ? await getOMDbRating(details.imdb_id) : '';
            const genreNames: string[] = Array.isArray(details.genre_names) ? details.genre_names : [];
            
            allItems.push({
              id: details.id.toString(),
              title: details.title,
              overview: details.plot_overview || 'No description available',
              poster_path: details.poster || null,
              release_date: details.year ? `${details.year}-01-01` : '',
              vote_average: details.user_rating || 0,
              genre_ids: genreNames,
              media_type: mediaType,
              providers: [service.name],
              service: service.name,
              availableDate: 'Streaming Now',
              imdbRating,
              imdbId: details.imdb_id,
              year: details.year?.toString()
            });
            
            console.log(`✓ ${details.title} on ${service.name}`);
          } catch (err) {
            console.error('Error processing title:', err);
          }
        }
      } catch (err) {
        console.error(`Error fetching ${service.name}:`, err);
      }
    }
    
    const uniqueItems = Array.from(
      new Map(allItems.map(item => [item.id, item])).values()
    );
    
    console.log(`Total streaming items: ${uniqueItems.length}`);
    return uniqueItems;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

export async function getUpcomingContent(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  try {
    const type = mediaType === 'movie' ? 'movie' : 'tv_series';
    const nextYear = new Date().getFullYear() + 1;
    const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_KEY}&types=${type}&release_date_start=20250101&release_date_end=${nextYear}1231&sort_by=popularity_desc&limit=100`;
    
    console.log('Fetching upcoming releases...');
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const titles = data.titles || [];
    console.log(`Got ${titles.length} upcoming titles`);
    
    return await processWatchmodeTitles(titles, mediaType, 50, 'Coming Soon', true);
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

async function processWatchmodeTitles(
  titles: any[], 
  mediaType: 'movie' | 'tv', 
  limit: number,
  defaultAvailability: string,
  allowNoSources: boolean = false
): Promise<MediaItem[]> {
  const items: MediaItem[] = [];
  
  for (let i = 0; i < titles.length && items.length < limit; i++) {
    const title = titles[i];
    try {
      const detailRes = await fetch(`https://api.watchmode.com/v1/title/${title.id}/details/?apiKey=${WATCHMODE_KEY}`, { cache: 'no-store' });
      
      if (!detailRes.ok) continue;
      
      const details = await detailRes.json();
      
      let uniqueServices: string[] = [];
      
      if (details.sources && details.sources.length > 0) {
        const serviceNames: string[] = details.sources
          .filter((s: any) => SERVICE_MAP[s.source_id])
          .map((s: any) => SERVICE_MAP[s.source_id]);
        uniqueServices = Array.from(new Set(serviceNames));
      }
      
      if (!allowNoSources && uniqueServices.length === 0) {
        continue;
      }
      
      const imdbRating = details.imdb_id ? await getOMDbRating(details.imdb_id) : '';
      const genreNames: string[] = Array.isArray(details.genre_names) ? details.genre_names : [];
      
      items.push({
        id: details.id.toString(),
        title: details.title,
        overview: details.plot_overview || 'No description available',
        poster_path: details.poster || null,
        release_date: details.release_date || (details.year ? `${details.year}-01-01` : ''),
        vote_average: details.user_rating || 0,
        genre_ids: genreNames,
        media_type: mediaType,
        providers: uniqueServices.length > 0 ? uniqueServices : ['TBA'],
        service: uniqueServices.length > 0 ? uniqueServices[0] : 'TBA',
        availableDate: details.release_date ? new Date(details.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : defaultAvailability,
        imdbRating,
        imdbId: details.imdb_id,
        year: details.year?.toString()
      });
      
      console.log(`✓ ${details.title}`);
    } catch (err) {
      console.error(`Error:`, err);
    }
  }
  
  return items;
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
      providers: ['Available'],
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
