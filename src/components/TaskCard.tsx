'use client';

import React, { useState } from 'react';
import { TimeBlock } from '../types';
import { PROJECT_COLORS, STATUS_COLORS, STATUSES } from '../constants';

interface TaskCardProps {
  block: TimeBlock;
  onEdit: (block: TimeBlock) => void;
  onStatusChange: (id: string, newStatus: string) => void;
}

export default function TaskCard({ block, onEdit, onStatusChange }: TaskCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3 relative flex items-stretch">
      {/* Visual left bar for project */}
      <div className={`w-1.5 rounded-full mr-3 ${PROJECT_COLORS[block.project] || 'bg-gray-300'}`} />
      
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <div className="text-sm font-medium text-gray-500">
            {block.start_time} - {block.end_time} <span className="opacity-75">({block.duration_hrs}h)</span>
          </div>
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowStatusMenu(!showStatusMenu);
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold text-white ${STATUS_COLORS[block.status] || 'bg-gray-400'}`}
            >
              {block.status}
            </button>
            {showStatusMenu && (
              <div 
                className="absolute right-0 top-full mt-1 bg-white shadow-xl border border-gray-100 rounded-lg p-1 z-10 min-w-32"
                onClick={(e) => e.stopPropagation()}
              >
                {STATUSES.map(status => (
                  <button
                    key={status}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(block.id, status);
                      setShowStatusMenu(false);
                    }}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="cursor-pointer" onClick={() => onEdit(block)}>
          <h3 className="font-semibold text-gray-800 text-lg leading-tight mb-2">
            {block.task_name}
          </h3>
          
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">
              {block.project}
            </span>
            <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">
              {block.priority}
            </span>
          </div>
          
          {block.notes && (
            <div className="mt-2 text-sm text-gray-500 italic line-clamp-2">
              {block.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
