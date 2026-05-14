/**
 * 多级选择器组件占位实现
 * TODO: 实现完整的多级选择器功能
 */

'use client';

import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

export interface MultiLevelSelectorProps {
  levels: string[];
  onSelect?: (selection: Record<string, string>) => void;
}

export default function MultiLevelSelector({
  levels,
  onSelect,
}: MultiLevelSelectorProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});

  const handleSelect = (level: string, value: string) => {
    const newSelections = { ...selections, [level]: value };
    setSelections(newSelections);
    onSelect?.(newSelections);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {levels.map((level, index) => (
        <div key={level} className="flex items-center gap-2">
          <select
            value={selections[level] || ''}
            onChange={(e) => handleSelect(level, e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="">{level}</option>
          </select>
          {index < levels.length - 1 && <ChevronRight className="h-4 w-4" />}
        </div>
      ))}
    </div>
  );
}
