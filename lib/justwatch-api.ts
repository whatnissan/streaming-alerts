import { MediaItem } from './types';

export async function getJustWatchUpcoming(): Promise<MediaItem[]> {
  try {
    console.log('📡 Fetching from JustWatch...');
    
    // JustWatch doesn't have a simple public API
    // We'll skip this for now and focus on AI enhancement
    return [];
    
  } catch (error) {
    console.error('JustWatch error:', error);
    return [];
  }
}
