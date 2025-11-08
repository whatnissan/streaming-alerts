import { MediaItem } from './types';

const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_KEY || '';

interface StreamingInfo {
  service: string;
  date: string;
}

export async function getStreamingInfoWithAI(title: string, year: string, releaseDate: string): Promise<StreamingInfo | null> {
  if (!OPENAI_KEY) {
    console.warn('OpenAI API key not configured');
    return null;
  }
  
  try {
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
          content: 'You are a streaming service expert. Return ONLY valid JSON: {"service":"ServiceName","date":"YYYY-MM-DD"}. Service must be one of: Netflix, Amazon Prime, Hulu, Disney+, Max, Apple TV+, Paramount+, Peacock, or TBA if unknown. Date must be YYYY-MM-DD format or TBA.'
        }, {
          role: 'user',
          content: `Movie/Show: "${title}" (${year}), releasing ${releaseDate}. Which streaming service will have it and when? Reply with JSON only.`
        }],
        temperature: 0.2,
        max_tokens: 60
      }),
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error(`OpenAI error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) return null;
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[^}]+\}/);
    if (!jsonMatch) return null;
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!parsed.service || parsed.service === 'TBA') return null;
    
    console.log(`🤖 AI: ${title} → ${parsed.service} (${parsed.date})`);
    return parsed;
    
  } catch (error) {
    console.error(`AI error for ${title}:`, error);
    return null;
  }
}

export async function enhanceUpcomingWithAI(items: MediaItem[]): Promise<MediaItem[]> {
  const enhanced = [...items];
  
  // Only enhance TBA items with high ratings (most popular)
  const tbaItems = enhanced
    .filter(item => item.service === 'TBA')
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 15); // Only top 15 to save API costs
  
  if (tbaItems.length === 0) {
    console.log('✅ No TBA items to enhance');
    return enhanced;
  }
  
  console.log(`🤖 Enhancing ${tbaItems.length} TBA items with AI...`);
  
  let enhancedCount = 0;
  
  for (const item of tbaItems) {
    try {
      const aiResult = await getStreamingInfoWithAI(
        item.title,
        item.year || '',
        item.availableDate
      );
      
      if (aiResult && aiResult.service !== 'TBA') {
        item.service = aiResult.service;
        item.providers = [aiResult.service];
        
        if (aiResult.date !== 'TBA') {
          const date = new Date(aiResult.date);
          item.release_date = aiResult.date;
          item.availableDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        }
        
        enhancedCount++;
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`Failed to enhance ${item.title}:`, error);
    }
  }
  
  console.log(`✅ AI enhanced ${enhancedCount} items`);
  
  return enhanced;
}
