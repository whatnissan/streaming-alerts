'use client';

import { useState, useEffect } from 'react';
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
    if (likedItems.length === 0) return;
    
    setLoading(true);
    setError('');
    
    try {
      const aiRecs = await getAIRecommendations(likedItems, allContent);
      
      // Find the actual media items that match the AI recommendations
      const matchedItems = aiRecs
        .map(rec => allContent.find(item => item.title === rec.title))
        .filter((item): item is MediaItem => item !== undefined);
      
      setRecommendations(matchedItems);
    } catch (err) {
      setError('Failed to get recommendations. Try again!');
      console.error('Recommendation error:', err);
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
          Click on shows you like, and I'll suggest similar content!
        </p>
        
        {likedItems.length > 0 && (
          <div className="mb-3">
            <p className="text-white text-sm mb-2">You like:</p>
            <div className="flex flex-wrap gap-2">
              {likedItems.map((item) => (
                <span
                  key={item.id}
                  className="bg-white bg-opacity-20 text-white text-sm px-3 py-1 rounded-full"
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
          className={`px-6 py-2 rounded-lg font-semibold transition-all ${
            likedItems.length === 0 || loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-white text-purple-600 hover:bg-opacity-90'
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Getting recommendations...
            </span>
          ) : (
            `Get AI Recommendations ${likedItems.length > 0 ? `(${likedItems.length} selected)` : ''}`
          )}
        </button>
        
        {error && (
          <p className="text-white text-sm mt-2 bg-red-500 bg-opacity-50 px-3 py-2 rounded">
            {error}
          </p>
        )}
      </div>

      {recommendations.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            ✨ Recommended for you:
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {recommendations.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
