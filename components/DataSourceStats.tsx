'use client';

import { MediaItem } from '@/lib/types';

interface DataSourceStatsProps {
  content: MediaItem[];
}

export default function DataSourceStats({ content }: DataSourceStatsProps) {
  const watchmodeCount = content.filter(item => item.id.startsWith('wm-')).length;
  const streamingAvailCount = content.filter(item => item.id.startsWith('sa-')).length;
  const total = content.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        📊 Data Sources
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{streamingAvailCount}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Streaming Avail API</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{watchmodeCount}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Watchmode API</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{total}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Unique</div>
        </div>
      </div>
    </div>
  );
}
