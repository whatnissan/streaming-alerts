'use client';

import { MediaItem, GENRES } from '@/lib/types';
import { getImageUrl, formatDate } from '@/lib/tmdb';
import { useState } from 'react';

interface MediaCardProps {
  item: MediaItem;
}

export default function MediaCard({ item }: MediaCardProps) {
  const [imageError, setImageError] = useState(false);
  const posterUrl = getImageUrl(item.poster_path);
  
  const genres = item.genre_ids
    ?.slice(0, 2)
    .map((id) => GENRES[id as keyof typeof GENRES])
    .filter(Boolean)
    .join(', ');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="relative aspect-[2/3] bg-gray-200 dark:bg-gray-700">
        {!imageError && item.poster_path ? (
          <img
            src={posterUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        
        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          {item.media_type === 'movie' ? 'Movie' : 'TV Show'}
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2 min-h-[3.5rem]">
          {item.title}
        </h3>
        
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="flex items-center text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              {item.availableDate || formatDate(item.release_date)}
            </span>
            
            {item.vote_average > 0 && (
              <span className="flex items-center text-gray-600 dark:text-gray-400">
                <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {(item.vote_average * 10).toFixed(0)}%
              </span>
            )}
          </div>

          {item.service && (
            <div className="mb-2">
              <span className="inline-block text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                Coming to {item.service}
              </span>
            </div>
          )}
        </div>
        
        {genres && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {genres}
          </p>
        )}
        
        {item.overview && (
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
            {item.overview}
          </p>
        )}
      </div>
    </div>
  );
}
