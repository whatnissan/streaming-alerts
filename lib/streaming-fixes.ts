// Test different catalog types for services that aren't working

const RAPID_API_KEY = '7da4fc2c3amsh140b819649305f3p15dd22jsn89b71a3586d5';

export async function testServiceCatalogs(service: string): Promise<string[]> {
  const catalogTypes = ['subscription', 'free', 'rent', 'buy', 'addon'];
  const working: string[] = [];
  
  for (const type of catalogTypes) {
    try {
      const url = `https://streaming-availability.p.rapidapi.com/shows/search/filters?country=us&catalogs=${service}.${type}&order_by=popularity_1month`;
      
      const response = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': RAPID_API_KEY,
          'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.shows && data.shows.length > 0) {
          working.push(type);
          console.log(`✅ ${service}.${type}: ${data.shows.length} shows`);
        }
      }
    } catch (e) {
      // silent
    }
  }
  
  return working;
}
