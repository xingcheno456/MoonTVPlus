/**
 * Pansou 搜索组件占位实现
 * TODO: 实现完整的 Pansou 搜索功能
 */

'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';

export interface PansouSearchProps {
  onResultSelect?: (result: unknown) => void;
}

export default function PansouSearch({ onResultSelect }: PansouSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      // TODO: 实现 Pansou 搜索逻辑
      console.log('Pansou search:', query);
    } catch (error) {
      console.error('Pansou search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
