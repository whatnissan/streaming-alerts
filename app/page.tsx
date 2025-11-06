'use client';

import { useState, useEffect } from 'react';
import MediaCard from '@/components/MediaCard';
import FilterBar from '@/components/FilterBar';
import SearchBar from '@/components/SearchBar';
import AIRecommendations from '@/components/AIRecommendations';
import { MediaItem } from '@/lib/types';
import { getUpcomingContent, searchContent, filterByDate, getReleaseDate } from '@/lib/tmdb';

export default function Home() {
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [content, setContent] = useState<MediaItem[]>([]);
  const [filteredContent, setFilteredContent] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [likedItems, setLikedItems] = useState<MediaItem[]>([]);
  
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setSearchQuery('');
      const data = await getUpcomingContent(mediaType);
      setContent(data);
      setLoading(false);
    };
    fetchContent();
  }, [mediaType]);

  useEffect(() => {
    let filtered = [...content];
    if (searchQuery) return;
    if (dateFilter !== 'all') filtered = filterByDate(filtered, dateFilter);
    if (selectedGenre !== 'all') {
      filtered = filtered.filter((item) => item.genre_ids?.includes(selectedGenre));
    }
    filtered.sort((a, b) => {
      const dateA = new Date(getReleaseDate(a)).getTime();
      const dateB = new Date(getReleaseDate(b)).getTime();
      return dateA - dateB;
    });
    setFilteredContent(filtered);
  }, [content, dateFilter, selectedGenre, searchQuery]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredContent(content);
      return;
    }
    setLoading(true);
    const results = await searchContent(query, mediaType);
    let filtered = results;
    if (selectedGenre !== 'all') {
      filtered = filtered.filter((item) => item.genre_ids?.includes(selectedGenre));
    }
    setFilteredContent(filtered);
    setLoading(false);
  };

  const handleCardClick = (item: MediaItem) => {
    setLikedItems(prev => {
      const isLiked = prev.some(i => i.id === item.id);
      if (isLiked) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const isLiked = (itemId: string) => likedItems.some(i => i.id === itemId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
            🎬 Streaming Alerts
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            New & upcoming on Netflix, Prime, Disney+, HBO Max, Hulu, Paramount+ & Apple TV+
          </p>
        </header>

        {/* AI Recommendations Section */}
        <AIRecommendations likedItems={likedItems} allContent={content} />

        <SearchBar onSearch={handleSearch} />

        <FilterBar
          selectedGenre={selectedGenre}
          setSelectedGenre={setSelectedGenre}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          mediaType={mediaType}
          setMediaType={setMediaType}
        />

        {!loading && (
          <div className="mb-4 text-gray-600 dark:text-gray-400">
            {searchQuery ? (
              <p>Found {filteredContent.length} results for "{searchQuery}"</p>
            ) : (
              <>
                <p>Showing {filteredContent.length} {mediaType === 'movie' ? 'movies' : 'TV shows'}</p>
                <p className="text-sm mt-1">💡 Click on shows you like to get AI recommendations!</p>
              </>
            )}
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && filteredContent.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {filteredContent.map((item) => (
              <div key={item.id} className="relative">
                {isLiked(item.id) && (
                  <div className="absolute -top-2 -right-2 z-10 bg-pink-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
                    ❤️
                  </div>
                )}
                <MediaCard item={item} onClick={() => handleCardClick(item)} />
              </div>
            ))}
          </div>
        )}

        {!loading && filteredContent.length === 0 && (
          <div className="text-center py-20">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              No results found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ? "Try a different search" : "Try adjusting your filters"}
            </p>
          </div>
        )}

        <footer className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-8">
          <p>Data provided by Streaming Availability API & OMDb</p>
          <p className="mt-1">AI recommendations powered by OpenAI</p>
        </footer>
      </div>
    </div>
  );
}
