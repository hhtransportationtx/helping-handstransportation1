import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  label?: string;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label = 'Date Range'
}: DateRangePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectingEnd, setSelectingEnd] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getNextMonth = () => {
    if (currentMonth === 11) {
      return { month: 0, year: currentYear + 1 };
    }
    return { month: currentMonth + 1, year: currentYear };
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    }

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  const formatDate = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateShort = (date: string) => {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    return `${parseInt(month)}/${parseInt(day)}/${year}`;
  };

  const formatDateForInput = (year: number, month: number, day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateClick = (day: number, month: number, year: number) => {
    const selectedDate = formatDateForInput(year, month, day);

    if (!startDate || (startDate && endDate) || selectingEnd) {
      if (!selectingEnd) {
        onStartDateChange(selectedDate);
        onEndDateChange('');
        setSelectingEnd(true);
      } else {
        const start = new Date(startDate);
        const selected = new Date(selectedDate);

        if (selected >= start) {
          onEndDateChange(selectedDate);
          setSelectingEnd(false);
          setShowPicker(false);
        } else {
          onStartDateChange(selectedDate);
          onEndDateChange('');
        }
      }
    } else {
      const start = new Date(startDate);
      const selected = new Date(selectedDate);

      if (selected >= start) {
        onEndDateChange(selectedDate);
        setShowPicker(false);
      } else {
        onStartDateChange(selectedDate);
        onEndDateChange('');
      }
    }
  };

  const handleQuickSelect = (range: 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth') => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    let start: Date, end: Date;

    switch (range) {
      case 'today':
        start = end = today;
        break;
      case 'yesterday':
        start = end = new Date(year, month, day - 1);
        break;
      case 'week':
        start = new Date(year, month, day - 6);
        end = today;
        break;
      case 'month':
        start = new Date(year, month, 1);
        end = today;
        break;
      case 'lastMonth':
        start = new Date(year, month - 1, 1);
        end = new Date(year, month, 0);
        break;
    }

    const formatForInput = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    onStartDateChange(formatForInput(start));
    onEndDateChange(formatForInput(end));
    setSelectingEnd(false);
    setShowPicker(false);
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const isDateInRange = (day: number, month: number, year: number) => {
    if (!startDate || !endDate) return false;
    const date = new Date(year, month, day);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return date >= start && date <= end;
  };

  const isStartDate = (day: number, month: number, year: number) => {
    if (!startDate) return false;
    const date = formatDateForInput(year, month, day);
    return date === startDate;
  };

  const isEndDate = (day: number, month: number, year: number) => {
    if (!endDate) return false;
    const date = formatDateForInput(year, month, day);
    return date === endDate;
  };

  const renderCalendar = (month: number, year: number) => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const inRange = isDateInRange(day, month, year);
      const isStart = isStartDate(day, month, year);
      const isEnd = isEndDate(day, month, year);
      const isToday = new Date().getDate() === day &&
                      new Date().getMonth() === month &&
                      new Date().getFullYear() === year;

      let className = 'h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all relative ';

      if (isStart || isEnd) {
        className += 'bg-blue-600 text-white hover:bg-blue-700 z-10 shadow-md';
      } else if (inRange) {
        className += 'bg-blue-100 text-blue-900 hover:bg-blue-200';
      } else if (isToday) {
        className += 'border-2 border-blue-600 text-blue-600 hover:bg-gray-50';
      } else {
        className += 'text-gray-700 hover:bg-gray-100';
      }

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day, month, year)}
          className={className}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="relative" ref={pickerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <Calendar className="w-4 h-4 inline mr-1" />
        {label}
      </label>

      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left bg-white hover:bg-gray-50 transition-all flex items-center justify-between"
      >
        <span>
          {startDate && endDate ? (
            <span className="text-gray-900 font-medium">
              {formatDateShort(startDate)} - {formatDateShort(endDate)}
            </span>
          ) : startDate ? (
            <span className="text-gray-600">
              {formatDateShort(startDate)} - <span className="text-gray-400">Select end date</span>
            </span>
          ) : (
            <span className="text-gray-400">Select date range</span>
          )}
        </span>
        <Calendar className="w-4 h-4 text-gray-400" />
      </button>

      {showPicker && (
        <div className="absolute z-50 mt-2 bg-white rounded-lg shadow-2xl border border-gray-300">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={() => handleQuickSelect('today')}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect('yesterday')}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect('week')}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect('month')}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect('lastMonth')}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Last Month
              </button>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => changeMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-base font-semibold text-gray-900">
                {months[currentMonth]} {currentYear} - {months[getNextMonth().month]} {getNextMonth().year}
              </span>
              <button
                type="button"
                onClick={() => changeMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 gap-6">
              {/* First Month */}
              <div>
                <div className="text-center mb-3 font-semibold text-gray-700">
                  {months[currentMonth]} {currentYear}
                </div>
                <div className="grid grid-cols-7 gap-2 mb-3">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="h-8 flex items-center justify-center text-xs font-semibold text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {renderCalendar(currentMonth, currentYear)}
                </div>
              </div>

              {/* Second Month */}
              <div>
                <div className="text-center mb-3 font-semibold text-gray-700">
                  {months[getNextMonth().month]} {getNextMonth().year}
                </div>
                <div className="grid grid-cols-7 gap-2 mb-3">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={`next-${day}`} className="h-8 flex items-center justify-center text-xs font-semibold text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {renderCalendar(getNextMonth().month, getNextMonth().year)}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">From:</div>
                <div className="text-sm font-medium text-gray-900">
                  {startDate ? formatDate(startDate) : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">To:</div>
                <div className="text-sm font-medium text-gray-900">
                  {endDate ? formatDate(endDate) : selectingEnd ? 'Select date...' : '-'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
