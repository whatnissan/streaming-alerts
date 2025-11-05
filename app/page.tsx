'use client';

import { useState, useEffect } from 'react';
import MediaCard from '@/components/MediaCard';
import FilterBar from '@/components/FilterBar';
import SearchBar from '@/components/SearchBar';
import { MediaItem } from '@/lib/types';
import { getUpcomingContent, searchContent, filterByDate, getReleaseDate } from '@/lib/tmdb';

export default function Home() {
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [content, setContent] = useState<MediaItem[]>([]);
  const [filteredContent, setFilteredContent] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedService, setSelectedService] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setSearchQuery('');
      const data = await getUpcomingContent(mediaType, 1);
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
      const genreId = parseInt(selectedGenre);
      filtered = filtered.filter((item) => item.genre_ids?.includes(genreId));
    }
    filtered.sort((a, b) => {
      const dateA = new Date(getReleaseDate(a)).getTime();
      const dateB = new Date(getReleaseDate(b)).getTime();
      return dateA - dateB;
    });
    setFilteredContent(filtered);
  }, [content, dateFilter, selectedGenre, selectedService, searchQuery]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredContent(content);
      return;
    }
    setLoading(true);
    const results = await searchContent(query);
    let filtered = results.filter((item) => item.media_type === mediaType);
    if (selectedGenre !== 'all') {
      const genreId = parseInt(selectedGenre);
      filtered = filtered.filter((item) => item.genre_ids?.includes(genreId));
    }
    setFilteredContent(filtered);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
            🎬 Streaming Alerts
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Discover upcoming movies and TV shows across all streaming platforms
          </p>
        </header>

        <SearchBar onSearch={handleSearch} />

        <FilterBar
          selectedService={selectedService}
          setSelectedService={setSelectedService}
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
              <p>Showing {filteredContent.length} upcoming {mediaType === 'movie' ? 'movies' : 'TV shows'}</p>
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
              <MediaCard key={item.id} item={item} />
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
              {searchQuery ? "Try adjusting your search or filters" : "Try adjusting your filters or check back later"}
            </p>
          </div>
        )}

        <footer className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-8">
          <p>Data provided by TMDb (The Movie Database)</p>
        </footer>
      </div>
    </div>
  );
}
