import { MediaItem, STREAMING_SERVICES } from './types';

const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '';
const API_HOST = 'streaming-availability.p.rapidapi.com';

async function getShowDetails(showId: string): Promise<any> {
  try {
    const response = await fetch(
      `https://${API_HOST}/shows/${showId}?output_language=en`,
      {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': API_HOST,
        },
        cache: 'no-store'
      }
    );
    
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
}

export async function getUpcomingContent(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  try {
    const showType = mediaType === 'movie' ? 'movie' : 'series';
    const services = ['netflix', 'prime', 'disney', 'hbo', 'apple'];
    const allContent: MediaItem[] = [];
    
    // Try to get upcoming content first
    for (const service of services) {
      try {
        const url = `https://${API_HOST}/changes?change_type=upcoming&item_type=show&catalogs=${service}&show_type=${showType}&country=us&output_language=en`;
        
        const response = await fetch(url, {
          headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': API_HOST,
          },
          cache: 'no-store'
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        
        if (!data.changes || data.changes.length === 0) continue;
        
        // Fetch details for upcoming shows
        for (const change of data.changes.slice(0, 3)) {
          try {
            const showDetails = await getShowDetails(change.showId);
            
            if (showDetails) {
              allContent.push({
                id: showDetails.id,
                title: showDetails.title,
                overview: showDetails.overview || 'No description available',
                poster_path: showDetails.imageSet?.verticalPoster?.w240 || showDetails.imageSet?.verticalPoster?.w360 || null,
                release_date: change.timestamp ? new Date(change.timestamp * 1000).toISOString().split('T')[0] : '',
                vote_average: showDetails.rating || 0,
                genre_ids: showDetails.genres?.map((g: any) => g.id) || [],
                media_type: mediaType,
                providers: [STREAMING_SERVICES[service as keyof typeof STREAMING_SERVICES]],
                service: STREAMING_SERVICES[service as keyof typeof STREAMING_SERVICES],
                availableDate: change.timestamp ? new Date(change.timestamp * 1000).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                }) : 'TBA'
              });
            }
          } catch (err) {
            console.error('Error processing show:', err);
          }
        }
      } catch (err) {
        console.error(`Error fetching ${service}:`, err);
      }
    }
    
    // If we have some upcoming content, also get recent additions
    const recentContent = await getRecentlyAddedContent(mediaType);
    allContent.push(...recentContent);
    
    // Remove duplicates
    const uniqueContent = Array.from(
      new Map(allContent.map(item => [item.id, item])).values()
    );
    
    return uniqueContent.sort((a, b) => 
      new Date(a.release_date).getTime() - new Date(b.release_date).getTime()
    );
  } catch (error) {
    console.error('Error in getUpcomingContent:', error);
    return await getRecentlyAddedContent(mediaType);
  }
}

async function getRecentlyAddedContent(mediaType: 'movie' | 'tv'): Promise<MediaItem[]> {
  try {
    const showType = mediaType === 'movie' ? 'movie' : 'series';
    const services = ['netflix', 'prime', 'disney', 'hbo', 'apple'];
    const allContent: MediaItem[] = [];
    
    for (const service of services) {
      try {
        const url = `https://${API_HOST}/changes?change_type=new&item_type=show&catalogs=${service}&show_type=${showType}&country=us&output_language=en`;
        
        const response = await fetch(url, {
          headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': API_HOST,
          },
          cache: 'no-store'
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        
        if (!data.changes || data.changes.length === 0) continue;
        
        // Get recently added shows (last 5 per service)
        for (const change of data.changes.slice(0, 5)) {
          try {
            const showDetails = await getShowDetails(change.showId);
            
            if (showDetails) {
              allContent.push({
                id: showDetails.id,
                title: showDetails.title,
                overview: showDetails.overview || 'No description available',
                poster_path: showDetails.imageSet?.verticalPoster?.w240 || showDetails.imageSet?.verticalPoster?.w360 || null,
                release_date: change.timestamp ? new Date(change.timestamp * 1000).toISOString().split('T')[0] : '',
                vote_average: showDetails.rating || 0,
                genre_ids: showDetails.genres?.map((g: any) => g.id) || [],
                media_type: mediaType,
                providers: [STREAMING_SERVICES[service as keyof typeof STREAMING_SERVICES]],
                service: STREAMING_SERVICES[service as keyof typeof STREAMING_SERVICES],
                availableDate: change.timestamp ? 'Added ' + new Date(change.timestamp * 1000).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric'
                }) : 'Recently Added'
              });
            }
          } catch (err) {
            console.error('Error processing recent show:', err);
          }
        }
      } catch (err) {
        console.error(`Error fetching recent from ${service}:`, err);
      }
    }
    
    return allContent;
  } catch (error) {
    console.error('Error in getRecentlyAddedContent:', error);
    return [];
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
        const shows = data.shows || [];
        
        const items = shows.slice(0, 10).map((show: any) => ({
          id: show.id,
          title: show.title,
          overview: show.overview || 'No description available',
          poster_path: show.imageSet?.verticalPoster?.w240 || show.imageSet?.verticalPoster?.w360 || null,
          release_date: show.releaseYear ? `${show.releaseYear}-01-01` : show.firstAirYear ? `${show.firstAirYear}-01-01` : '',
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
        poster_path: show.imageSet?.verticalPoster?.w240 || show.imageSet?.verticalPoster?.w360 || null,
        release_date: show.releaseYear ? `${show.releaseYear}-01-01` : show.firstAirYear ? `${show.firstAirYear}-01-01` : '',
        vote_average: show.rating || 0,
        genre_ids: show.genres?.map((g: any) => g.id) || [],
        media_type: mediaType,
        providers: services,
        service: services.length > 0 ? services.join(', ') : 'Available on streaming'
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
