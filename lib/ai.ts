import { MediaItem, AIRecommendation } from './types';

const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_KEY || '';

export async function getAIRecommendations(
  likedItems: MediaItem[],
  availableItems: MediaItem[]
): Promise<AIRecommendation[]> {
  if (!likedItems.length || !availableItems.length) {
    throw new Error('Need items to recommend from');
  }
  
  if (!OPENAI_KEY || OPENAI_KEY === '') {
    throw new Error('OpenAI API key not configured');
  }
  
  try {
    const likedTitles = likedItems.slice(0, 3).map(item => ({
      title: item.title,
      genres: item.genre_ids.slice(0, 2).join(', '),
      service: item.service
    }));
    
    const availableTitles = availableItems.slice(0, 50).map(item => ({
      title: item.title,
      genres: item.genre_ids.slice(0, 2).join(', '),
      service: item.service || 'Streaming'
    }));

    const prompt = `Based on these liked shows:
${likedTitles.map(item => `- ${item.title} (${item.genres})`).join('\n')}

Recommend 3 shows from this list:
${availableTitles.map(item => `- ${item.title} (${item.genres}) on ${item.service}`).join('\n')}

Return ONLY valid JSON array, no markdown, no other text:
[{"title":"exact title","reason":"short reason","genres":"genres","service":"service"}]`;

    console.log('Calling OpenAI...');
    
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
            content: 'You respond only with valid JSON arrays, no markdown formatting, no code blocks.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', data);
    
    let content = data.choices[0]?.message?.content || '[]';
    
    // Remove markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log('Cleaned content:', content);
    
    const recommendations = JSON.parse(content);
    console.log('Parsed recommendations:', recommendations);
    
    return recommendations;
  } catch (error) {
    console.error('Error in getAIRecommendations:', error);
    throw error;
  }
}
