import { MediaItem } from './types';

const WATCHMODE_KEY = process.env.NEXT_PUBLIC_WATCHMODE_KEY || '';
const OMDB_KEY = process.env.NEXT_PUBLIC_OMDB_KEY || '';
const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '';

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
  82: 'Pluto TV',
};

const SERVICE_TO_SA_MAP: { [key: string]: string } = {
  'Netflix': 'netflix',
  'Amazon Prime': 'prime',
  'Hulu': 'hulu',
  'Paramount+': 'paramount',
  'HBO Max': 'hbo',
  'Disney+': 'disney',
  'Apple TV+': 'apple',
  'Peacock': 'peacock',
  'Showtime': 'showtime',
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

// Try Streaming Availability API for upcoming content
async function getStreamingAvailabilityUpcoming(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  if (!RAPIDAPI_KEY) return [];
  
  try {
    const showType = mediaType === 'movie' ? 'movie' : 'series';
    const services = ['netflix', 'prime', 'disney', 'hbo', 'hulu', 'paramount', 'apple'];
    const allContent: MediaItem[] = [];
    
    console.log('Trying Streaming Availability API for upcoming...');
    
    for (const service of services) {
      try {
        const url = `https://streaming-availability.p.rapidapi.com/changes?change_type=upcoming&item_type=show&catalogs=${service}&show_type=${showType}&country=us&output_language=en`;
        
        const response = await fetch(url, {
          headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com',
          },
          cache: 'no-store'
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        
        if (!data.changes || data.changes.length === 0) continue;
        
        console.log(`${service}: ${data.changes.length} upcoming`);
        
        for (const change of data.changes.slice(0, 5)) {
          try {
            const detailUrl = `https://streaming-availability.p.rapidapi.com/shows/${change.showId}?output_language=en`;
            const detailRes = await fetch(detailUrl, {
              headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com',
              },
              cache: 'no-store'
            });
            
            if (!detailRes.ok) continue;
            
            const details = await detailRes.json();
            
            const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
            const releaseDate = change.timestamp ? new Date(change.timestamp * 1000).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            }) : 'TBA';
            
            allContent.push({
              id: `sa-${details.id}`,
              title: details.title,
              overview: details.overview || 'No description available',
              poster_path: details.imageSet?.verticalPoster?.w240 || null,
              release_date: change.timestamp ? new Date(change.timestamp * 1000).toISOString().split('T')[0] : '',
              vote_average: details.rating || 0,
              genre_ids: details.genres?.map((g: any) => g.id) || [],
              media_type: mediaType,
              providers: [serviceName],
              service: serviceName,
              availableDate: releaseDate,
              imdbRating: '',
              imdbId: details.imdbId,
              year: details.releaseYear?.toString() || details.firstAirYear?.toString()
            });
            
            console.log(`✓ ${details.title} coming to ${serviceName} on ${releaseDate}`);
          } catch (err) {
            console.error('Error getting SA details:', err);
          }
        }
      } catch (err) {
        console.error(`Error with ${service}:`, err);
      }
    }
    
    return allContent;
  } catch (error) {
    console.error('SA API error:', error);
    return [];
  }
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
      { id: 371, name: 'Apple TV+' },
      { id: 389, name: 'Peacock' },
      { id: 201, name: 'Tubi' },
      { id: 43, name: 'Showtime' }
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
        
        for (let i = 0; i < Math.min(5, titles.length); i++) {
          const title = titles[i];
          try {
            const detailRes = await fetch(`https://api.watchmode.com/v1/title/${title.id}/details/?apiKey=${WATCHMODE_KEY}`, { cache: 'no-store' });
            
            if (!detailRes.ok) continue;
            
            const details = await detailRes.json();
            
            let addedDate = 'Now';
            const source = details.sources?.find((s: any) => s.source_id === service.id);
            if (source?.date_added) {
              const date = new Date(source.date_added * 1000);
              addedDate = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            }
            
            const imdbRating = details.imdb_id ? await getOMDbRating(details.imdb_id) : '';
            const genreNames: string[] = Array.isArray(details.genre_names) ? details.genre_names : [];
            
            allItems.push({
              id: `wm-${details.id}`,
              title: details.title,
              overview: details.plot_overview || 'No description available',
              poster_path: details.poster || null,
              release_date: details.year ? `${details.year}-01-01` : '',
              vote_average: details.user_rating || 0,
              genre_ids: genreNames,
              media_type: mediaType,
              providers: [service.name],
              service: service.name,
              availableDate: addedDate !== 'Now' ? `Since ${addedDate}` : 'Streaming Now',
              imdbRating,
              imdbId: details.imdb_id,
              year: details.year?.toString()
            });
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
    // Try Streaming Availability API first (has better upcoming data)
    const saContent = await getStreamingAvailabilityUpcoming(mediaType);
    
    if (saContent.length > 20) {
      console.log(`Got ${saContent.length} from SA API`);
      return saContent;
    }
    
    // Fallback to Watchmode
    console.log('Using Watchmode for upcoming...');
    const type = mediaType === 'movie' ? 'movie' : 'tv_series';
    const nextYear = new Date().getFullYear() + 1;
    const url = `https://api.watchmode.com/v1/list-titles/?apiKey=${WATCHMODE_KEY}&types=${type}&release_date_start=20250101&release_date_end=${nextYear}1231&sort_by=popularity_desc&limit=100`;
    
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) return saContent;
    
    const data = await response.json();
    const titles = data.titles || [];
    const items: MediaItem[] = [...saContent];
    
    for (let i = 0; i < titles.length && items.length < 50; i++) {
      const title = titles[i];
      try {
        const detailRes = await fetch(`https://api.watchmode.com/v1/title/${title.id}/details/?apiKey=${WATCHMODE_KEY}`, { cache: 'no-store' });
        
        if (!detailRes.ok) continue;
        
        const details = await detailRes.json();
        
        let uniqueServices: string[] = [];
        let releaseDate = '';
        
        if (details.sources && details.sources.length > 0) {
          const serviceNames: string[] = details.sources
            .filter((s: any) => SERVICE_MAP[s.source_id])
            .map((s: any) => SERVICE_MAP[s.source_id]);
          uniqueServices = Array.from(new Set(serviceNames));
          
          const upcomingSource = details.sources.find((s: any) => s.date_added);
          if (upcomingSource?.date_added) {
            const date = new Date(upcomingSource.date_added * 1000);
            releaseDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          }
        }
        
        if (!releaseDate && details.release_date) {
          const date = new Date(details.release_date);
          releaseDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        
        const serviceName = uniqueServices.length > 0 ? uniqueServices[0] : 'TBA';
        const dateInfo = releaseDate || 'TBA';
        
        const genreNames: string[] = Array.isArray(details.genre_names) ? details.genre_names : [];
        
        items.push({
          id: `wm-${details.id}`,
          title: details.title,
          overview: details.plot_overview || 'No description available',
          poster_path: details.poster || null,
          release_date: details.release_date || (details.year ? `${details.year}-01-01` : ''),
          vote_average: details.user_rating || 0,
          genre_ids: genreNames,
          media_type: mediaType,
          providers: uniqueServices.length > 0 ? uniqueServices : ['TBA'],
          service: serviceName,
          availableDate: dateInfo !== 'TBA' ? dateInfo : 'Coming Soon',
          imdbRating: '',
          imdbId: details.imdb_id,
          year: details.year?.toString()
        });
      } catch (err) {
        console.error(`Error:`, err);
      }
    }
    
    // Remove duplicates by title
    const uniqueItems = Array.from(
      new Map(items.map(item => [item.title.toLowerCase(), item])).values()
    );
    
    return uniqueItems;
  } catch (error) {
    console.error('Error:', error);
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
