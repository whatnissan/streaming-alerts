'use client';

import { useState } from 'react';
import { MediaItem } from '@/lib/types';
import { getAIRecommendations } from '@/lib/ai';
import MediaCard from './MediaCard';

interface AIRecommendationsProps {
  likedItems: MediaItem[];
  allContent: MediaItem[];
}

export default function AIRecommendations({ likedItems, allContent }: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRecommendations = async () => {
    if (likedItems.length === 0) {
      setError('Please select at least one show you like!');
      return;
    }
    
    setLoading(true);
    setError('');
    setRecommendations([]);
    
    // Add timeout
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('Request timed out. Please try again with fewer selections.');
    }, 30000); // 30 second timeout
    
    try {
      console.log('Fetching recommendations for:', likedItems.map(i => i.title));
      
      const aiRecs = await getAIRecommendations(likedItems, allContent);
      
      clearTimeout(timeoutId);
      
      console.log('Got AI recommendations:', aiRecs);
      
      if (!aiRecs || aiRecs.length === 0) {
        setError('No recommendations found. Try different selections!');
        setLoading(false);
        return;
      }
      
      // Find the actual media items that match the AI recommendations
      const matchedItems = aiRecs
        .map(rec => {
          const found = allContent.find(item => 
            item.title.toLowerCase() === rec.title.toLowerCase() ||
            item.title.toLowerCase().includes(rec.title.toLowerCase()) ||
            rec.title.toLowerCase().includes(item.title.toLowerCase())
          );
          console.log(`Matching "${rec.title}":`, found ? 'Found' : 'Not found');
          return found;
        })
        .filter((item): item is MediaItem => item !== undefined);
      
      console.log('Matched items:', matchedItems.length);
      
      if (matchedItems.length === 0) {
        setError('Could not match recommendations. Try again!');
      } else {
        setRecommendations(matchedItems);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Recommendation error:', err);
      setError(err.message || 'Failed to get recommendations. Please try again!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-8">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">
          🤖 AI-Powered Recommendations
        </h2>
        <p className="text-white text-opacity-90 mb-4">
          Click on shows you like below, then get personalized AI suggestions!
        </p>
        
        {likedItems.length > 0 && (
          <div className="mb-3">
            <p className="text-white text-sm mb-2 font-semibold">You selected {likedItems.length} show{likedItems.length > 1 ? 's' : ''}:</p>
            <div className="flex flex-wrap gap-2">
              {likedItems.map((item) => (
                <span
                  key={item.id}
                  className="bg-white bg-opacity-20 text-white text-sm px-3 py-1 rounded-full backdrop-blur"
                >
                  {item.title}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <button
          onClick={fetchRecommendations}
          disabled={likedItems.length === 0 || loading}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            likedItems.length === 0 || loading
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-white text-purple-600 hover:bg-opacity-90 hover:scale-105'
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              AI is thinking...
            </span>
          ) : (
            `✨ Get AI Recommendations ${likedItems.length > 0 ? `(${likedItems.length} selected)` : ''}`
          )}
        </button>
        
        {error && (
          <div className="mt-3 bg-red-500 bg-opacity-90 text-white px-4 py-3 rounded-lg">
            <p className="font-semibold">⚠️ {error}</p>
          </div>
        )}
        
        {likedItems.length === 0 && !error && (
          <p className="text-white text-opacity-75 text-sm mt-3">
            💡 Tip: Scroll down and click on 2-5 shows you enjoy watching
          </p>
        )}
      </div>

      {recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            ✨ AI Recommends for You:
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {recommendations.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
