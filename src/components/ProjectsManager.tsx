'use client';

import React, { useState } from 'react';
import { Plus, Trash2, X, AlertTriangle, FolderOpen } from 'lucide-react';
import { Project } from '../types';
import { COLOR_PALETTE, colorClassFor } from '../constants';
import type { DeleteProjectBlockedError } from '../api';

interface ProjectsManagerProps {
  projects: Project[];
  onCreate: (name: string, color: string) => Promise<void>;
  onDelete: (id: string, force?: boolean) => Promise<void>;
}

export default function ProjectsManager({ projects, onCreate, onDelete }: ProjectsManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{
    project: Project;
    activeCount?: number;
    needsForce?: boolean;
  } | null>(null);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-bold text-gray-900">Projects</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <FolderOpen size={28} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">Belum ada project. Klik &quot;New Project&quot; untuk membuat.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map(p => (
            <div
              key={p.id}
              className="group flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm"
            >
              <div className={`w-3 h-10 rounded-full ${colorClassFor(p.color)}`} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 truncate">{p.name}</div>
                <div className="text-xs text-gray-400 capitalize">{p.color}</div>
              </div>
              <button
                onClick={() => setConfirmDelete({ project: p })}
                aria-label="Hapus project"
                title="Hapus project"
                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <NewProjectModal
          onClose={() => setShowForm(false)}
          onSubmit={async (name, color) => {
            await onCreate(name, color);
            setShowForm(false);
          }}
        />
      )}

      {confirmDelete && (
        <DeleteProjectModal
          project={confirmDelete.project}
          activeCount={confirmDelete.activeCount}
          needsForce={confirmDelete.needsForce}
          onClose={() => setConfirmDelete(null)}
          onConfirm={async force => {
            try {
              await onDelete(confirmDelete.project.id, force);
              setConfirmDelete(null);
            } catch (err) {
              const e = err as DeleteProjectBlockedError;
              if (e?.blocked) {
                setConfirmDelete({
                  project: confirmDelete.project,
                  activeCount: e.activeCount,
                  needsForce: true,
                });
                return;
              }
              throw err;
            }
          }}
        />
      )}
    </div>
  );
}

// ---------------- Sub-modals ----------------

function NewProjectModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (name: string, color: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0].key);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Nama project wajib diisi');
      return;
    }
    try {
      setLoading(true);
      await onSubmit(trimmed, color);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membuat project');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-end sm:items-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-xl font-bold">New Project</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium">{error}</div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Project</label>
            <input
              type="text"
              autoFocus
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Marketing Campaign"
              maxLength={60}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Warna Label</label>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_PALETTE.map(c => {
                const active = c.key === color;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setColor(c.key)}
                    aria-label={c.label}
                    title={c.label}
                    className={`w-full aspect-square rounded-xl ${c.bg} transition-transform ${
                      active ? 'ring-2 ring-offset-2 ring-gray-900 scale-95' : 'hover:scale-105'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50">
          <button
            disabled={loading}
            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold disabled:opacity-50"
            onClick={onClose}
          >
            Batal
          </button>
          <button
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
            onClick={handleSave}
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteProjectModal({
  project,
  activeCount,
  needsForce,
  onClose,
  onConfirm,
}: {
  project: Project;
  activeCount?: number;
  needsForce?: boolean;
  onClose: () => void;
  onConfirm: (force: boolean) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setError('');
    try {
      setLoading(true);
      await onConfirm(needsForce === true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus project');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-end sm:items-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <AlertTriangle size={22} className={needsForce ? 'text-red-600' : 'text-amber-600'} />
            <h2 className="text-lg font-bold">
              {needsForce ? 'Project punya task aktif' : 'Hapus Project?'}
            </h2>
          </div>
        </div>

        <div className="p-4 space-y-3 text-sm text-gray-700">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg font-medium">{error}</div>
          )}

          {needsForce ? (
            <>
              <p>
                Project <strong>&quot;{project.name}&quot;</strong> masih punya{' '}
                <strong className="text-red-600">{activeCount}</strong> task aktif (Todo / In Progress).
              </p>
              <p>
                Kalau dihapus, task tersebut tidak hilang — tapi label warna project-nya akan hilang dan
                project tidak bisa dipilih lagi untuk task baru.
              </p>
            </>
          ) : (
            <p>
              Yakin ingin menghapus project <strong>&quot;{project.name}&quot;</strong>? Tindakan ini tidak bisa dibatalkan.
            </p>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50">
          <button
            disabled={loading}
            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold disabled:opacity-50"
            onClick={onClose}
          >
            Batal
          </button>
          <button
            disabled={loading}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold disabled:opacity-50"
            onClick={handleConfirm}
          >
            {loading ? 'Menghapus...' : needsForce ? 'Tetap Hapus' : 'Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}
