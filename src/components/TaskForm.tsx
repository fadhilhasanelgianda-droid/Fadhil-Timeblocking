'use client';

import React, { useState, useEffect } from 'react';
import { TimeBlock, ProjectType, PriorityType, StatusType } from '../types';
import { PROJECTS, PRIORITIES, STATUSES } from '../constants';
import dayjs from 'dayjs';
import { X, Trash2 } from 'lucide-react';

interface TaskFormProps {
  initialData?: TimeBlock;
  selectedDate: string;
  onSave: (data: Partial<TimeBlock>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
}

export default function TaskForm({ initialData, selectedDate, onSave, onDelete, onClose }: TaskFormProps) {
  const [formData, setFormData] = useState<Partial<TimeBlock>>({
    task_name: '',
    project: 'Personal',
    priority: '🟡 Medium',
    status: 'Todo',
    date: selectedDate,
    start_time: '09:00',
    end_time: '10:00',
    notes: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData(prev => ({ ...prev, date: selectedDate }));
    }
  }, [initialData, selectedDate]);

  const calcDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    return ((eH * 60 + eM) - (sH * 60 + sM)) / 60;
  };

  const handleSave = async () => {
    try {
      setError('');
      if (!formData.task_name) throw new Error('Nama tugas wajib diisi');
      
      const dur = calcDuration(formData.start_time!, formData.end_time!);
      if (dur <= 0) throw new Error('Waktu selesai harus setelah waktu mulai');
      
      setLoading(true);
      await onSave({
        ...formData,
        day: dayjs(formData.date).format('dddd'),
        duration_hrs: parseFloat(dur.toFixed(2))
      });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center p-4 bg-black/40 backdrop-blur-sm"
         onClick={onClose}>
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-xl font-bold bg-clip-text">
            {initialData ? 'Edit Time Block' : 'Tambah Time Block'}
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto w-full space-y-4">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm mb-2 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Task Name</label>
            <input 
              type="text" 
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={formData.task_name || ''}
              onChange={e => setFormData({ ...formData, task_name: e.target.value })}
              placeholder="e.g. Design UI"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Project</label>
              <select 
                className="w-full p-3 border border-gray-200 rounded-xl bg-white"
                value={formData.project}
                onChange={e => setFormData({ ...formData, project: e.target.value as ProjectType })}
              >
                {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
              <select 
                className="w-full p-3 border border-gray-200 rounded-xl bg-white"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as StatusType })}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
              <input 
                type="date" 
                className="w-full p-3 border border-gray-200 rounded-xl"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
              <select 
                className="w-full p-3 border border-gray-200 rounded-xl bg-white"
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value as PriorityType })}
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
              <input 
                type="time" 
                step="1800"
                className="w-full p-3 border border-gray-200 rounded-xl"
                value={formData.start_time}
                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">End Time</label>
              <input 
                type="time" 
                step="1800"
                className="w-full p-3 border border-gray-200 rounded-xl"
                value={formData.end_time}
                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>
          
          <div className="text-right text-xs text-gray-500 font-medium px-1">
            Duration: {calcDuration(formData.start_time || '00:00', formData.end_time || '00:00').toFixed(2)} hrs
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
            <textarea 
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes here..."
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50">
          {initialData && onDelete && (
            <button 
              disabled={loading}
              className="px-4 py-3 bg-red-100 text-red-700 rounded-xl font-bold flex items-center justify-center disabled:opacity-50"
              onClick={async () => {
                if(window.confirm('Yakin ingin menghapus time block ini?')) {
                  setLoading(true);
                  try {
                    await onDelete(initialData.id);
                    onClose();
                  } catch (e: any) {
                    setError(e.message);
                    setLoading(false);
                  }
                }
              }}
            >
              <Trash2 size={20} />
            </button>
          )}
          <button 
            disabled={loading}
            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold disabled:opacity-50"
            onClick={onClose}
          >
            Batal
          </button>
          <button 
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50 relative"
            onClick={handleSave}
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}
