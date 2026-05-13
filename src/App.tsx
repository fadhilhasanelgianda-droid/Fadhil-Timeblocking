'use client';

import React, { useState, useEffect } from 'react';
import { TimeBlock } from './types';
import * as api from './api';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import DailyView from './components/DailyView';
import WeeklyView from './components/WeeklyView';
import TaskForm from './components/TaskForm';
import { Plus, LayoutList, CalendarDays, Settings as SettingsIcon } from 'lucide-react';
import { StatusType } from './types';

dayjs.extend(isSameOrAfter);

export default function App() {
  const [currentView, setCurrentView] = useState<'daily' | 'weekly' | 'settings'>('daily');
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | undefined>(undefined);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchTimeBlocks();
      setBlocks(data);
    } catch (err) {
      console.error(err);
      alert('Gagal memuat data dari Google Sheets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBlock = async (data: Partial<TimeBlock>) => {
    try {
      if (editingBlock) {
        const updated = await api.updateTimeBlock(editingBlock.id, data);
        setBlocks(blocks.map(b => b.id === editingBlock.id ? updated : b));
      } else {
        const created = await api.createTimeBlock(data);
        setBlocks([...blocks, created]);
      }
    } catch (err) {
      console.error(err);
      throw err; // let taskform handle error state
    }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      await api.deleteTimeBlock(id);
      setBlocks(blocks.filter(b => b.id !== id));
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const block = blocks.find(b => b.id === id);
      if(!block) return;
      const updated = await api.updateTimeBlock(id, { ...block, status: newStatus as StatusType });
      setBlocks(blocks.map(b => b.id === id ? updated : b));
    } catch (err) {
      alert('Gagal mengubah status');
    }
  };

  const openForm = (block?: TimeBlock) => {
    setEditingBlock(block);
    setShowTaskForm(true);
  };

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-white shadow-2xl relative overflow-hidden">
      
      {/* Main Area */}
      <div className="flex-1 overflow-hidden relative">
        {currentView === 'daily' && (
          <DailyView 
            date={selectedDate}
            onChangeDate={setSelectedDate}
            timeBlocks={blocks}
            isLoading={isLoading}
            onEdit={openForm}
            onStatusChange={handleStatusChange}
          />
        )}
        {currentView === 'weekly' && (
          <WeeklyView 
            date={selectedDate}
            onChangeDate={setSelectedDate}
            timeBlocks={blocks}
            isLoading={isLoading}
            onEdit={openForm}
          />
        )}
        {currentView === 'settings' && (
          <div className="p-6 text-center space-y-4">
             <div className="w-20 h-20 bg-gray-100 rounded-full flex flex-col items-center justify-center mx-auto mb-4">
               <SettingsIcon size={32} className="text-gray-400" />
             </div>
             <h2 className="text-2xl font-bold">Pengaturan</h2>
             <p className="text-gray-600 text-sm">
                Untuk sinkronisasi ke Google Sheets, isi tiga variabel berikut di file <code className="bg-gray-100 px-1 rounded">.env</code>:
             </p>
             <ul className="text-left text-xs text-gray-500 bg-gray-50 rounded-xl p-4 space-y-1 font-mono">
               <li>GOOGLE_SERVICE_ACCOUNT_EMAIL</li>
               <li>GOOGLE_PRIVATE_KEY</li>
               <li>GOOGLE_SPREADSHEET_ID</li>
             </ul>
             <p className="text-gray-500 text-xs">
               Lihat <code className="bg-gray-100 px-1 rounded">.env.example</code> untuk panduan lengkap.
             </p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {currentView !== 'settings' && (
        <button 
          onClick={() => openForm()}
          className="absolute right-6 bottom-24 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30 text-white hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all z-20"
        >
          <Plus size={28} />
        </button>
      )}

      {/* Bottom Nav */}
      <div className="bg-white border-t border-gray-200 px-6 py-3 pb-safe flex justify-between items-center z-20">
        <button 
          onClick={() => setCurrentView('daily')} 
          className={`flex flex-col items-center p-2 rounded-xl transition ${currentView === 'daily' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <LayoutList size={22} className="mb-1" />
          <span className="text-[10px] font-bold">Daily</span>
        </button>
        <button 
          onClick={() => setCurrentView('weekly')} 
          className={`flex flex-col items-center p-2 rounded-xl transition ${currentView === 'weekly' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <CalendarDays size={22} className="mb-1" />
          <span className="text-[10px] font-bold">Weekly</span>
        </button>
        <button 
          onClick={() => setCurrentView('settings')} 
          className={`flex flex-col items-center p-2 rounded-xl transition ${currentView === 'settings' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <SettingsIcon size={22} className="mb-1" />
          <span className="text-[10px] font-bold">Settings</span>
        </button>
      </div>

      {/* Modals */}
      {showTaskForm && (
        <TaskForm 
          initialData={editingBlock}
          selectedDate={selectedDate}
          onClose={() => setShowTaskForm(false)}
          onSave={handleSaveBlock}
          onDelete={handleDeleteBlock}
        />
      )}
    </div>
  );
}
