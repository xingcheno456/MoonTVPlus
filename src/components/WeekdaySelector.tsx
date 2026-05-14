/**
 * 周几选择器组件占位实现
 * TODO: 实现完整的周几选择器功能
 */

'use client';

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

export interface WeekdaySelectorProps {
  selected?: number[];
  onChange?: (selected: number[]) => void;
}

export default function WeekdaySelector({
  selected = [],
  onChange,
}: WeekdaySelectorProps) {
  const toggleDay = (day: number) => {
    const newSelected = selected.includes(day)
      ? selected.filter((d) => d !== day)
      : [...selected, day];
    onChange?.(newSelected);
  };

  return (
    <div className="flex gap-1">
      {WEEKDAYS.map((day, index) => (
        <button
          key={day}
          onClick={() => toggleDay(index)}
          className={`rounded px-2 py-1 text-sm ${
            selected.includes(index)
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          {day}
        </button>
      ))}
    </div>
  );
}
