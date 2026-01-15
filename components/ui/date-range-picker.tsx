'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  startDate: number | null | undefined;
  endDate: number | null | undefined;
  onDateChange: (startDate: number | null, endDate: number | null) => void;
  className?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  startDate,
  endDate,
  onDateChange,
  className,
  disabled = false,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedRange, setSelectedRange] = React.useState<DateRange | undefined>(
    startDate && endDate
      ? {
          from: new Date(startDate),
          to: new Date(endDate),
        }
      : startDate
      ? {
          from: new Date(startDate),
          to: undefined,
        }
      : undefined
  );

  React.useEffect(() => {
    if (startDate && endDate) {
      setSelectedRange({
        from: new Date(startDate),
        to: new Date(endDate),
      });
    } else if (startDate) {
      setSelectedRange({
        from: new Date(startDate),
        to: undefined,
      });
    } else {
      setSelectedRange(undefined);
    }
  }, [startDate, endDate]);

  const handleSelect = (range: DateRange | undefined) => {
    setSelectedRange(range);
    if (range?.from) {
      const start = range.from.getTime();
      const end = range?.to ? range.to.getTime() : null;
      onDateChange(start, end);
    } else {
      onDateChange(null, null);
    }
  };

  const handleClear = () => {
    setSelectedRange(undefined);
    onDateChange(null, null);
    setIsOpen(false);
  };

  const formatDateRange = () => {
    if (!startDate && !endDate) return '기간 선택';
    if (startDate && endDate) {
      return `${format(new Date(startDate), 'yyyy.MM.dd', { locale: ko })} - ${format(new Date(endDate), 'yyyy.MM.dd', { locale: ko })}`;
    }
    if (startDate) {
      return `${format(new Date(startDate), 'yyyy.MM.dd', { locale: ko })} - 진행중`;
    }
    return '기간 선택';
  };

  return (
    <div className={cn('relative', className)}>
      <Button
        type="button"
        variant="outline"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full justify-start text-left font-normal h-10',
          !startDate && !endDate && 'text-gray-500 dark:text-[#606060]'
        )}
      >
        <Calendar className="mr-2 h-4 w-4" />
        <span className="flex-1">{formatDateRange()}</span>
        {startDate && (
          <X
            className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          />
        )}
      </Button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 mt-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg shadow-lg p-4">
            <DayPicker
              mode="range"
              selected={selectedRange}
              onSelect={handleSelect}
              locale={ko}
              className="rdp"
              classNames={{
                months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                month: 'space-y-4',
                caption: 'flex justify-center pt-1 relative items-center',
                caption_label: 'text-sm font-medium text-gray-900 dark:text-[#e5e5e5]',
                nav: 'space-x-1 flex items-center',
                nav_button: cn(
                  'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-gray-600 dark:text-[#a0a0a0]'
                ),
                nav_button_previous: 'absolute left-1',
                nav_button_next: 'absolute right-1',
                table: 'w-full border-collapse space-y-1',
                head_row: 'flex',
                head_cell: 'text-gray-500 dark:text-[#606060] rounded-md w-9 font-normal text-[0.8rem]',
                row: 'flex w-full mt-2',
                cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-100/50 dark:bg-[#2a2a2a]/50 [&:has([aria-selected])]:bg-gray-100 dark:[&:has([aria-selected])]:bg-[#2a2a2a] first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                day: cn(
                  'h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-md'
                ),
                day_range_end: 'day-range-end',
                day_selected: 'bg-[#5B6EFF] text-white hover:bg-[#4B5EEF] hover:text-white focus:bg-[#5B6EFF] focus:text-white',
                day_today: 'bg-gray-100 dark:bg-[#2a2a2a] font-semibold',
                day_outside: 'day-outside text-gray-400 dark:text-[#606060] opacity-50 aria-selected:bg-gray-100/50 dark:aria-selected:bg-[#2a2a2a]/50 aria-selected:text-gray-500 dark:aria-selected:text-[#606060] aria-selected:opacity-30',
                day_disabled: 'text-gray-400 dark:text-[#606060] opacity-50',
                day_range_middle: 'aria-selected:bg-gray-100 dark:aria-selected:bg-[#2a2a2a] aria-selected:text-gray-900 dark:aria-selected:text-[#e5e5e5]',
                day_hidden: 'invisible',
              }}
              styles={{
                months: { display: 'flex', gap: '1rem' },
                month: { margin: 0 },
                caption: { display: 'flex', justifyContent: 'center', position: 'relative', paddingBottom: '0.5rem' },
                nav: { display: 'flex', gap: '0.25rem' },
              }}
            />
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-[#2a2a2a]">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
              >
                초기화
              </Button>
              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
                className="bg-[#5B6EFF] hover:bg-[#4B5EEF] text-white"
              >
                적용
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
