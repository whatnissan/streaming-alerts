import { MediaItem } from './types';
import { findCuratedRelease } from './curated-releases';

const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_KEY || '';

interface StreamingInfo {
  service: string;
  date: string;
}

async function searchWebForRelease(title: string, year: string): Promise<StreamingInfo | null> {
  if (!OPENAI_KEY) return null;
  
  try {
    // Use OpenAI with web search capability
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: 'You search the web for streaming release announcements. Return ONLY this JSON format: {"service":"Netflix|Amazon Prime|Hulu|Disney+|Max|Apple TV+|Paramount+|Peacock|TBA","date":"YYYY-MM-DD or TBA","confidence":"high|medium|low"}. Only return high confidence results from official announcements.'
        }, {
          role: 'user',
          content: `Search: Has "${title}" (${year}) officially announced which streaming service it will premiere on? What is the confirmed date?`
        }],
        temperature: 0.1,
        max_tokens: 100
      }),
      cache: 'no-store'
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    
    const jsonMatch = content.match(/\{[^}]+\}/);
    if (!jsonMatch) return null;
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Only use high confidence results
    if (parsed.confidence !== 'high' || parsed.service === 'TBA') {
      return null;
    }
    
    console.log(`🤖 AI found: ${title} → ${parsed.service} (${parsed.date})`);
    return { service: parsed.service, date: parsed.date };
    
  } catch (error) {
    return null;
  }
}

export async function enhanceUpcomingWithAI(items: MediaItem[]): Promise<MediaItem[]> {
  const enhanced = [...items];
  
  // Filter TBA items, sort by popularity
  const tbaItems = enhanced
    .filter(item => item.service === 'TBA')
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 10); // Limit to top 10
  
  if (tbaItems.length === 0) {
    console.log('✅ No TBA items to enhance');
    return enhanced;
  }
  
  console.log(`🔍 Checking ${tbaItems.length} items...`);
  
  let enhancedCount = 0;
  
  for (const item of tbaItems) {
    // First check curated list
    const curated = findCuratedRelease(item.title, item.year || '');
    
    if (curated) {
      console.log(`📋 Curated: ${item.title} → ${curated.service}`);
      item.service = curated.service;
      item.providers = [curated.service];
      item.release_date = curated.date;
      item.availableDate = new Date(curated.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      enhancedCount++;
      continue;
    }
    
    // Then try AI search (only for very popular items)
    if (item.vote_average > 7.0 && OPENAI_KEY) {
      const aiResult = await searchWebForRelease(item.title, item.year || '');
      
      if (aiResult && aiResult.service !== 'TBA') {
        item.service = aiResult.service;
        item.providers = [aiResult.service];
        
        if (aiResult.date !== 'TBA') {
          item.release_date = aiResult.date;
          item.availableDate = new Date(aiResult.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        }
        
        enhancedCount++;
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`✅ Enhanced ${enhancedCount} items (${enhancedCount} from curated data)`);
  
  return enhanced;
}
