import { MediaItem, STREAMING_SERVICES } from './types';

const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '';
const API_HOST = 'streaming-availability.p.rapidapi.com';

export async function getUpcomingContent(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  try {
    const showType = mediaType === 'movie' ? 'movie' : 'series';
    const services = ['netflix', 'prime', 'disney', 'hbo', 'apple'];
    const allContent: MediaItem[] = [];
    
    for (const service of services) {
      try {
        const url = `https://${API_HOST}/changes?change_type=upcoming&item_type=show&catalogs=${service}&show_type=${showType}&country=us&output_language=en`;
        
        console.log('Fetching:', url);
        
        const response = await fetch(url, {
          headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': API_HOST,
          },
          cache: 'no-store'
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const error = await response.text();
          console.error(`Error from ${service}:`, error);
          continue;
        }
        
        const data = await response.json();
        console.log(`Data from ${service}:`, data);
        
        if (!data.changes || data.changes.length === 0) {
          console.log(`No upcoming content for ${service}`);
          continue;
        }
        
        const items = data.changes.map((change: any) => ({
          id: change.showId || Math.random().toString(),
          title: change.title || 'Untitled',
          overview: change.overview || 'No description available',
          poster_path: change.imageSet?.verticalPoster?.w240 || change.imageSet?.verticalPoster?.w360 || null,
          release_date: change.timestamp ? new Date(change.timestamp * 1000).toISOString().split('T')[0] : '',
          vote_average: change.rating || 0,
          genre_ids: change.genres?.map((g: any) => g.id) || [],
          media_type: mediaType,
          providers: [STREAMING_SERVICES[service as keyof typeof STREAMING_SERVICES]],
          service: STREAMING_SERVICES[service as keyof typeof STREAMING_SERVICES],
          availableDate: change.timestamp ? new Date(change.timestamp * 1000).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }) : 'TBA'
        }));
        
        allContent.push(...items);
        console.log(`Added ${items.length} items from ${service}`);
      } catch (err) {
        console.error(`Error fetching ${service}:`, err);
      }
    }
    
    console.log(`Total items: ${allContent.length}`);
    
    // If no upcoming content, fetch current popular content instead
    if (allContent.length === 0) {
      console.log('No upcoming content found, fetching popular content...');
      return await getPopularContent(mediaType);
    }
    
    return allContent.sort((a, b) => 
      new Date(a.release_date).getTime() - new Date(b.release_date).getTime()
    );
  } catch (error) {
    console.error('Error in getUpcomingContent:', error);
    return await getPopularContent(mediaType);
  }
}

async function getPopularContent(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  try {
    const showType = mediaType === 'movie' ? 'movie' : 'series';
    const services = ['netflix', 'prime', 'disney', 'hbo', 'apple'];
    const allContent: MediaItem[] = [];
    
    for (const service of services) {
      try {
        const url = `https://${API_HOST}/shows/search/filters?country=us&catalogs=${service}&show_type=${showType}&order_by=popularity_1year&output_language=en`;
        
        const response = await fetch(url, {
          headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': API_HOST,
          },
          cache: 'no-store'
        });

        if (!response.ok) continue;
        
        const data = await response.json();
        const shows = data.shows || data || [];
        
        const items = shows.slice(0, 10).map((show: any) => ({
          id: show.id,
          title: show.title,
          overview: show.overview || 'No description available',
          poster_path: show.imageSet?.verticalPoster?.w240 || null,
          release_date: show.releaseYear ? `${show.releaseYear}-01-01` : '',
          vote_average: show.rating || 0,
          genre_ids: show.genres?.map((g: any) => g.id) || [],
          media_type: mediaType,
          providers: [STREAMING_SERVICES[service as keyof typeof STREAMING_SERVICES]],
          service: STREAMING_SERVICES[service as keyof typeof STREAMING_SERVICES],
          availableDate: 'Available Now'
        }));
        
        allContent.push(...items);
      } catch (err) {
        console.error(`Error fetching popular from ${service}:`, err);
      }
    }
    
    return allContent;
  } catch (error) {
    console.error('Error in getPopularContent:', error);
    return [];
  }
}

export async function searchContent(query: string, mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  if (!query.trim()) return [];
  
  try {
    const showType = mediaType === 'movie' ? 'movie' : 'series';
    const url = `https://${API_HOST}/shows/search/title?title=${encodeURIComponent(query)}&country=us&show_type=${showType}&output_language=en`;
    
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': API_HOST,
      },
      cache: 'no-store'
    });

    if (!response.ok) return [];
    
    const shows = await response.json();
    
    return shows.slice(0, 20).map((show: any) => {
      const usStreaming = show.streamingInfo?.us || {};
      const services = Object.keys(usStreaming)
        .filter(s => STREAMING_SERVICES[s as keyof typeof STREAMING_SERVICES])
        .map(s => STREAMING_SERVICES[s as keyof typeof STREAMING_SERVICES]);

      return {
        id: show.id,
        title: show.title,
        overview: show.overview || 'No description available',
        poster_path: show.imageSet?.verticalPoster?.w240 || null,
        release_date: show.releaseYear ? `${show.releaseYear}-01-01` : '',
        vote_average: show.rating || 0,
        genre_ids: show.genres?.map((g: any) => g.id) || [],
        media_type: mediaType,
        providers: services,
        service: services[0] || 'Available on streaming'
      };
    });
  } catch (error) {
    console.error('Error searching:', error);
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
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

export function filterByDate(items: MediaItem[], filter: string): MediaItem[] {
  const now = new Date();
  const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  return items.filter((item) => {
    const releaseDate = new Date(item.release_date);
    
    switch (filter) {
      case 'this-week':
        return releaseDate >= now && releaseDate <= oneWeek;
      case 'this-month':
        return releaseDate >= now && releaseDate <= oneMonth;
      case 'coming-soon':
        return releaseDate > oneMonth;
      default:
        return true;
    }
  });
}
