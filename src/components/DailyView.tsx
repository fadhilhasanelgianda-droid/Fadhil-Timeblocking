'use client';

import React from 'react';
import { TimeBlock, Project } from '../types';
import TaskCard from './TaskCard';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DailyViewProps {
  date: string;
  onChangeDate: (date: string) => void;
  timeBlocks: TimeBlock[];
  projects: Project[];
  onEdit: (block: TimeBlock) => void;
  onStatusChange: (id: string, newStatus: string) => void;
  onDelete: (id: string) => void | Promise<void>;
  isLoading: boolean;
}

export default function DailyView({ date, onChangeDate, timeBlocks, projects, onEdit, onStatusChange, onDelete, isLoading }: DailyViewProps) {
  const blocksForDate = timeBlocks.filter(b => b.date === date).sort((a, b) => a.start_time.localeCompare(b.start_time));
  
  const totalHours = blocksForDate.reduce((acc, b) => acc + (b.duration_hrs || 0), 0);
  const doneCount = blocksForDate.filter(b => b.status === 'Done').length;
  const totalCount = blocksForDate.length;

  const handlePrevDay = () => onChangeDate(dayjs(date).subtract(1, 'day').format('YYYY-MM-DD'));
  const handleNextDay = () => onChangeDate(dayjs(date).add(1, 'day').format('YYYY-MM-DD'));
  const handleToday = () => onChangeDate(dayjs().format('YYYY-MM-DD'));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header section with Date Navigation */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 flex-shrink-0 z-10 sticky top-0">
        <div className="flex items-center justify-between">
          <button onClick={handlePrevDay} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          
          <div className="flex flex-col items-center">
            <div className="text-lg font-extrabold text-gray-900 tracking-tight">
              {dayjs(date).format('DD MMM YYYY')}
            </div>
            <div className="text-sm font-medium text-gray-500">
              {dayjs(date).format('dddd')}
            </div>
          </div>
          
          <button onClick={handleNextDay} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition">
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="mt-4 flex justify-between items-center text-sm font-semibold text-gray-600 px-2 py-3 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center gap-2">
             <span className="text-blue-600 text-lg">⏱</span>
             <span>{totalHours.toFixed(1)} hrs total</span>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-green-600 text-lg">✓</span>
             <span>{doneCount}/{totalCount} done</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 pb-24">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl h-28 border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : blocksForDate.length > 0 ? (
          <div className="space-y-2">
             {blocksForDate.map(block => (
               <TaskCard
                 key={block.id}
                 block={block}
                 projects={projects}
                 onEdit={onEdit}
                 onStatusChange={onStatusChange}
                 onDelete={onDelete}
               />
             ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
               <Calendar size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Belum Ada Jadwal</h3>
            <p className="text-gray-500 mb-6 text-sm max-w-xs">
              Buat time block baru untuk mulai merencanakan aktivitasmu hari ini.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
