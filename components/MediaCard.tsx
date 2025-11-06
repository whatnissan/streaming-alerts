import Image from 'next/image';
import { MediaItem } from '@/lib/types';
import { getImageUrl } from '@/lib/tmdb';

interface MediaCardProps {
  item: MediaItem;
  onClick?: () => void;
}

export default function MediaCard({ item, onClick }: MediaCardProps) {
  const imageUrl = getImageUrl(item.poster_path);
  const hasValidPoster = item.poster_path && item.poster_path !== '/placeholder.png';

  return (
    <div 
      onClick={onClick}
      className="group relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
    >
      <div className="relative aspect-[2/3] bg-gray-200 dark:bg-gray-700">
        {hasValidPoster ? (
          <Image
            src={imageUrl}
            alt={item.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600">
            <div className="text-center p-4">
              <svg className="w-16 h-16 mx-auto mb-2 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{item.title}</p>
            </div>
          </div>
        )}
        
        {/* Service badge */}
        {item.service && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-lg">
            {item.service}
          </div>
        )}
        
        {/* Rating badge */}
        {item.vote_average > 0 && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold shadow-lg">
            ⭐ {item.vote_average.toFixed(1)}
          </div>
        )}

        {/* IMDb Rating */}
        {item.imdbRating && (
          <div className="absolute top-10 right-2 bg-amber-600 text-white px-2 py-1 rounded text-xs font-bold shadow-lg">
            IMDb {item.imdbRating}
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-sm mb-1 text-gray-900 dark:text-white line-clamp-2">
          {item.title}
        </h3>
        
        {/* Release/Available Date */}
        {item.availableDate && (
          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mb-2">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {item.availableDate}
          </div>
        )}

        {item.year && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {item.year}
          </p>
        )}

        {/* Multiple providers display */}
        {item.providers && item.providers.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.providers.slice(0, 3).map((provider, idx) => (
              <span key={idx} className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                {provider}
              </span>
            ))}
            {item.providers.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{item.providers.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="text-white text-center p-4">
          <p className="text-xs line-clamp-4">{item.overview}</p>
        </div>
      </div>
    </div>
  );
}
