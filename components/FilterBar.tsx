'use client';

import { GENRES } from '@/lib/types';

interface FilterBarProps {
  selectedGenre: string;
  setSelectedGenre: (genre: string) => void;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  mediaType: 'movie' | 'tv';
  setMediaType: (type: 'movie' | 'tv') => void;
}

export default function FilterBar({
  selectedGenre, setSelectedGenre, dateFilter, setDateFilter, mediaType, setMediaType,
}: FilterBarProps) {
  const genres = Object.entries(GENRES);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6 space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setMediaType('movie')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            mediaType === 'movie' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Movies
        </button>
        <button
          onClick={() => setMediaType('tv')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            mediaType === 'tv' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          TV Shows
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Release Time</label>
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="all">All Upcoming</option>
          <option value="this-week">This Week</option>
          <option value="this-month">This Month</option>
          <option value="coming-soon">Later</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Genre</label>
        <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="all">All Genres</option>
          {genres.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>

      {(selectedGenre !== 'all' || dateFilter !== 'all') && (
        <button
          onClick={() => { setSelectedGenre('all'); setDateFilter('all'); }}
          className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
}
