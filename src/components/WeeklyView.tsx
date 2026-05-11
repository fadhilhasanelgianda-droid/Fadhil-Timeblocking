'use client';

import React from 'react';
import { TimeBlock } from '../types';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PROJECT_COLORS } from '../constants';

interface WeeklyViewProps {
  date: string;
  onChangeDate: (date: string) => void;
  timeBlocks: TimeBlock[];
  isLoading: boolean;
  onEdit: (block: TimeBlock) => void;
}

export default function WeeklyView({ date, onChangeDate, timeBlocks, isLoading, onEdit }: WeeklyViewProps) {
  // Start config for week (taking Monday as start of week)
  const startOfWeek = dayjs(date).startOf('week').add(1, 'day'); // Simple adjusting for Monday as start
  const weekDays = Array.from({ length: 7 }).map((_, i) => startOfWeek.add(i, 'day'));
  
  const handlePrevWeek = () => onChangeDate(dayjs(date).subtract(1, 'week').format('YYYY-MM-DD'));
  const handleNextWeek = () => onChangeDate(dayjs(date).add(1, 'week').format('YYYY-MM-DD'));

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white px-4 py-4 border-b border-gray-100 flex-shrink-0 z-10 sticky top-0">
        <div className="flex items-center justify-between">
          <button onClick={handlePrevWeek} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          
          <div className="flex flex-col items-center">
            <div className="text-lg font-extrabold text-gray-900 tracking-tight">
              {startOfWeek.format('D MMM')} - {startOfWeek.add(6, 'day').format('D MMM YYYY')}
            </div>
            <div className="text-sm font-medium text-gray-500">
              Weekly Summary
            </div>
          </div>
          
          <button onClick={handleNextWeek} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition">
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto pb-24 snap-x">
        <div className="flex w-max min-w-full h-full">
          {weekDays.map(day => {
            const dateStr = day.format('YYYY-MM-DD');
            const blocks = timeBlocks.filter(b => b.date === dateStr).sort((a, b) => a.start_time.localeCompare(b.start_time));
            const totalHours = blocks.reduce((sum, b) => sum + (b.duration_hrs || 0), 0);
            
            return (
              <div key={dateStr} className="w-[85vw] sm:w-[300px] flex-shrink-0 border-r border-gray-200 snap-center flex flex-col pt-4 pb-8 space-y-3 px-3">
                <div className="text-center pb-2 border-b border-gray-200 mb-2">
                  <div className={`font-bold text-lg ${day.isSame(dayjs(), 'day') ? 'text-blue-600' : 'text-gray-700'}`}>
                    {day.format('dddd')}
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    {day.format('D MMM')} • {totalHours.toFixed(1)}h
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {blocks.length === 0 ? (
                    <div className="text-center text-sm text-gray-400 py-10">Kosong</div>
                  ) : (
                    blocks.map(block => (
                      <div 
                        key={block.id} 
                        className={`p-3 rounded-xl border border-gray-100 shadow-sm bg-white cursor-pointer hover:border-blue-300 transition relative overflow-hidden`}
                        onClick={() => onEdit(block)}
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${PROJECT_COLORS[block.project] || 'bg-gray-300'}`} />
                        <div className="pl-2">
                          <div className="flex justify-between items-start mb-1 text-xs font-semibold text-gray-500">
                            <span>{block.start_time} - {block.end_time}</span>
                            <span className={block.status === 'Done' ? 'text-green-500' : ''}>{block.status}</span>
                          </div>
                          <div className="font-bold text-gray-800 text-sm leading-tight truncate">
                            {block.task_name}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
