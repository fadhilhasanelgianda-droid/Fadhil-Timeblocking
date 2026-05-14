'use client';

import React, { useState, useEffect } from 'react';
import { TimeBlock, Project } from './types';
import * as api from './api';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import DailyView from './components/DailyView';
import WeeklyView from './components/WeeklyView';
import TaskForm from './components/TaskForm';
import ProjectsManager from './components/ProjectsManager';
import Dashboard from './components/Dashboard';
import { Plus, LayoutList, CalendarDays, BarChart3, Settings as SettingsIcon } from 'lucide-react';
import { StatusType } from './types';

dayjs.extend(isSameOrAfter);

export default function App() {
  const [currentView, setCurrentView] = useState<'daily' | 'weekly' | 'dashboard' | 'settings'>('daily');
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | undefined>(undefined);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [blocksData, projectsData] = await Promise.all([
        api.fetchTimeBlocks(),
        api.fetchProjects(),
      ]);
      setBlocks(blocksData);
      setProjects(projectsData);
    } catch (err) {
      console.error(err);
      alert('Gagal memuat data dari Google Sheets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (name: string, color: string) => {
    const created = await api.createProject(name, color);
    setProjects(prev => [...prev, created]);
  };

  const handleDeleteProject = async (id: string, force = false) => {
    await api.deleteProject(id, force);
    setProjects(prev => prev.filter(p => p.id !== id));
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
      console.error('Delete failed:', err);
      const message = err instanceof Error ? err.message : String(err);
      alert(`Gagal menghapus task:\n${message}`);
      throw err;
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const block = blocks.find(b => b.id === id);
      if (!block) return;
      // Only send the fields the server needs — avoid sending `created_at` and other
      // metadata back, which can trigger validation failures.
      const updated = await api.updateTimeBlock(id, { status: newStatus as StatusType });
      setBlocks(blocks.map(b => (b.id === id ? updated : b)));
    } catch (err) {
      console.error('Status change failed:', err);
      const message = err instanceof Error ? err.message : String(err);
      alert(`Gagal mengubah status:\n${message}`);
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
            projects={projects}
            isLoading={isLoading}
            onEdit={openForm}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteBlock}
          />
        )}
        {currentView === 'weekly' && (
          <WeeklyView
            date={selectedDate}
            onChangeDate={setSelectedDate}
            timeBlocks={blocks}
            projects={projects}
            isLoading={isLoading}
            onEdit={openForm}
          />
        )}
        {currentView === 'dashboard' && (
          <div className="h-full overflow-y-auto bg-gray-50/50">
            <Dashboard blocks={blocks} projects={projects} isLoading={isLoading} />
          </div>
        )}
        {currentView === 'settings' && (
          <div className="h-full overflow-y-auto pb-24">
            <ProjectsManager
              projects={projects}
              onCreate={handleCreateProject}
              onDelete={handleDeleteProject}
            />
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {currentView !== 'settings' && currentView !== 'dashboard' && (
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
          onClick={() => setCurrentView('dashboard')}
          className={`flex flex-col items-center p-2 rounded-xl transition ${currentView === 'dashboard' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <BarChart3 size={22} className="mb-1" />
          <span className="text-[10px] font-bold">Dashboard</span>
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
          projects={projects}
          onClose={() => setShowTaskForm(false)}
          onSave={handleSaveBlock}
          onDelete={handleDeleteBlock}
        />
      )}
    </div>
  );
}
