import React, { useState, useEffect, useRef } from 'react';
import { IconCalendar, IconCalendarEvent, IconX } from '@tabler/icons-react';

export interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
  className?: string;
}

export const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
};

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleApply = () => {
    if (!tempStart || !tempEnd) return;
    if (tempStart > tempEnd) {
      onChange(tempEnd, tempStart);
    } else {
      onChange(tempStart, tempEnd);
    }
    setIsOpen(false);
  };

  const displayStart = formatDateDisplay(startDate);
  const displayEnd = formatDateDisplay(endDate);

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Trigger Button Matching Reference Image */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 px-4 py-2 bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-slate-300 rounded-2xl shadow-2xs transition-all flex items-center gap-2.5 cursor-pointer text-xs font-semibold select-none group"
        title="Click to select date range"
      >
        <IconCalendarEvent className="w-4 h-4 text-indigo-600 shrink-0 group-hover:scale-105 transition-transform" />
        <span className="font-bold text-indigo-700 tracking-wider text-[11px]">RANGE:</span>
        <span className="font-bold text-slate-900 tracking-tight font-mono">
          {displayStart}
        </span>
        <IconCalendar className="w-3.5 h-3.5 text-slate-700 shrink-0" />
        <span className="text-slate-400 font-bold">→</span>
        <span className="font-bold text-slate-900 tracking-tight font-mono">
          {displayEnd}
        </span>
        <IconCalendar className="w-3.5 h-3.5 text-slate-700 shrink-0" />
      </button>

      {/* Floating Date Range Selector Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-4 w-72 sm:w-80 animate-in fade-in zoom-in-95 duration-150">
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
                <IconCalendar className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Select Date Range</h4>
                <p className="text-[11px] text-slate-500 font-medium">Filter records by date span</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <IconX className="w-4 h-4" />
            </button>
          </div>

          {/* Date Range Inputs */}
          <div className="mt-3.5 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={tempStart}
                  onChange={(e) => setTempStart(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={tempEnd}
                  onChange={(e) => setTempEnd(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              Apply Range
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;

