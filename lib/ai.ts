import { MediaItem, AIRecommendation } from './types';

const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_KEY || '';

export async function getAIRecommendations(
  likedItems: MediaItem[],
  availableItems: MediaItem[]
): Promise<AIRecommendation[]> {
  if (!likedItems.length || !availableItems.length) return [];
  
  try {
    const likedTitles = likedItems.slice(0, 3).map(item => ({
      title: item.title,
      genres: item.genre_ids.join(', '),
      service: item.service
    }));
    
    const availableTitles = availableItems.slice(0, 30).map(item => ({
      title: item.title,
      genres: item.genre_ids.join(', '),
      service: item.service || 'Streaming'
    }));

    const prompt = `You are a streaming content recommendation expert. Based on what the user likes, recommend 3 shows/movies from the available list.

User likes these:
${likedTitles.map(item => `- ${item.title} (${item.genres}) on ${item.service}`).join('\n')}

Available content:
${availableTitles.map(item => `- ${item.title} (${item.genres}) on ${item.service}`).join('\n')}

Return ONLY a JSON array with 3 recommendations in this exact format, no other text:
[
  {
    "title": "exact title from available list",
    "reason": "brief reason why they'd like it (max 15 words)",
    "genres": "genres as string",
    "service": "streaming service name"
  }
]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful streaming recommendation assistant. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      return [];
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '[]';
    
    // Parse the JSON response
    const recommendations = JSON.parse(content);
    return recommendations;
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    return [];
  }
}

export async function getGenreBasedRecommendation(
  currentItem: MediaItem,
  availableItems: MediaItem[]
): Promise<string> {
  try {
    const similarItems = availableItems
      .filter(item => 
        item.id !== currentItem.id && 
        item.genre_ids.some(g => currentItem.genre_ids.includes(g))
      )
      .slice(0, 5);

    if (similarItems.length === 0) return '';

    const prompt = `Based on someone watching "${currentItem.title}", recommend ONE show/movie from this list in 10 words or less:

${similarItems.map(item => `- ${item.title} on ${item.service}`).join('\n')}

Respond with ONLY: "Watch [title] on [service]" - nothing else.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a concise recommendation assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 30,
      }),
    });

    if (!response.ok) return '';

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error getting genre recommendation:', error);
    return '';
  }
}
