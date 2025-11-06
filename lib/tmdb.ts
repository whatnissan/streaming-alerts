import { MediaItem, STREAMING_SERVICES } from './types';

const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '';
const OMDB_KEY = process.env.NEXT_PUBLIC_OMDB_KEY || '';
const API_HOST = 'streaming-availability.p.rapidapi.com';

async function getIMDbRating(imdbId: string): Promise<string> {
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
    const services = ['netflix', 'prime', 'hulu', 'disney', 'hbo', 'apple', 'paramount'];
    const allContent: MediaItem[] = [];
    
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
        
        for (const change of data.changes.slice(0, 3)) {
          try {
            const showDetails = await getShowDetails(change.showId);
            
            if (showDetails) {
              const imdbRating = showDetails.imdbId ? await getIMDbRating(showDetails.imdbId) : '';
              
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
                }) : 'TBA',
                imdbRating,
                imdbId: showDetails.imdbId,
                year: showDetails.releaseYear?.toString() || showDetails.firstAirYear?.toString()
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
    
    const recentContent = await getRecentlyAddedContent(mediaType);
    allContent.push(...recentContent);
    
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
    const services = ['netflix', 'prime', 'hulu', 'disney', 'hbo', 'apple', 'paramount'];
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
        
        for (const change of data.changes.slice(0, 4)) {
          try {
            const showDetails = await getShowDetails(change.showId);
            
            if (showDetails) {
              const imdbRating = showDetails.imdbId ? await getIMDbRating(showDetails.imdbId) : '';
              
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
                }) : 'Recently Added',
                imdbRating,
                imdbId: showDetails.imdbId,
                year: showDetails.releaseYear?.toString() || showDetails.firstAirYear?.toString()
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
    
    const results = await Promise.all(
      shows.slice(0, 20).map(async (show: any) => {
        const usStreaming = show.streamingInfo?.us || {};
        const services = Object.keys(usStreaming)
          .filter(s => STREAMING_SERVICES[s as keyof typeof STREAMING_SERVICES])
          .map(s => STREAMING_SERVICES[s as keyof typeof STREAMING_SERVICES]);

        const imdbRating = show.imdbId ? await getIMDbRating(show.imdbId) : '';

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
          service: services.length > 0 ? services.join(', ') : 'Available on streaming',
          imdbRating,
          imdbId: show.imdbId,
          year: show.releaseYear?.toString() || show.firstAirYear?.toString()
        };
      })
    );
    
    return results;
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
