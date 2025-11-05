import { MediaItem, STREAMING_SERVICES } from './types';

const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '';
const API_HOST = 'streaming-availability.p.rapidapi.com';

interface StreamingChange {
  itemType: string;
  showType: string;
  showId: string;
  title: string;
  overview: string;
  firstAirYear?: number;
  releaseYear?: number;
  imageSet?: {
    verticalPoster?: {
      w240?: string;
    };
  };
  service: string;
  streamingType: string;
  changeType: string;
  timestamp: number;
  genres?: Array<{ id: string; name: string }>;
  rating?: number;
}

export async function getUpcomingContent(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  try {
    const services = ['netflix', 'prime', 'disney', 'hbo', 'apple'];
    const allContent: MediaItem[] = [];
    
    for (const service of services) {
      try {
        const response = await fetch(
          `https://${API_HOST}/changes?change_type=upcoming&item_type=show&catalogs=${service}&show_type=${mediaType === 'movie' ? 'movie' : 'series'}&country=us&output_language=en`,
          {
            headers: {
              'X-RapidAPI-Key': RAPIDAPI_KEY,
              'X-RapidAPI-Host': API_HOST,
            },
            next: { revalidate: 3600 }
          }
        );

        if (!response.ok) continue;
        
        const data = await response.json();
        const changes: StreamingChange[] = data.changes || [];
        
        const items = changes.map((change) => ({
          id: change.showId,
          title: change.title,
          overview: change.overview || 'No description available',
          poster_path: change.imageSet?.verticalPoster?.w240 || null,
          release_date: new Date(change.timestamp * 1000).toISOString().split('T')[0],
          vote_average: change.rating || 0,
          genre_ids: change.genres?.map(g => g.id) || [],
          media_type: mediaType,
          providers: [STREAMING_SERVICES[service as keyof typeof STREAMING_SERVICES]],
          service: STREAMING_SERVICES[service as keyof typeof STREAMING_SERVICES],
          availableDate: new Date(change.timestamp * 1000).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })
        }));
        
        allContent.push(...items);
      } catch (err) {
        console.error(`Error fetching ${service}:`, err);
      }
    }
    
    return allContent.sort((a, b) => 
      new Date(a.release_date).getTime() - new Date(b.release_date).getTime()
    );
  } catch (error) {
    console.error('Error fetching content:', error);
    return [];
  }
}

export async function searchContent(query: string, mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  if (!query.trim()) return [];
  
  try {
    const response = await fetch(
      `https://${API_HOST}/shows/search/title?title=${encodeURIComponent(query)}&country=us&show_type=${mediaType === 'movie' ? 'movie' : 'series'}&output_language=en`,
      {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': API_HOST,
        },
        next: { revalidate: 3600 }
      }
    );

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
        service: services[0] || 'Multiple Services'
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
