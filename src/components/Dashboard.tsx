'use client';

import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { TimeBlock, Project } from '../types';
import { colorClassFor } from '../constants';
import { Flame, CheckCircle2, Clock, FolderKanban } from 'lucide-react';

dayjs.extend(isoWeek);

// =====================================================================
// Types
// =====================================================================

type Period = '7d' | '30d' | 'month' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  '7d':   '7 Hari',
  '30d':  '30 Hari',
  'month': 'Bulan Ini',
  'all':  'Semua',
};

interface BarItem {
  key: string;
  label: string;         // short label (day/week)
  sublabel?: string;     // secondary label (date range)
  hours: number;
  isToday: boolean;
}

interface Stats {
  doneCount: number;
  totalCount: number;
  totalHours: number;
  streakDays: number;
  bars: BarItem[];
  projectBreakdown: { name: string; color: string; hours: number; taskCount: number }[];
}

// =====================================================================
// Component
// =====================================================================

interface DashboardProps {
  blocks: TimeBlock[];
  projects: Project[];
  isLoading: boolean;
}

export default function Dashboard({ blocks, projects, isLoading }: DashboardProps) {
  const [period, setPeriod] = useState<Period>('7d');

  const filteredBlocks = useMemo(() => filterByPeriod(blocks, period), [blocks, period]);
  const stats = useMemo(
    () => computeStats(filteredBlocks, blocks, projects, period),
    [filteredBlocks, blocks, projects, period],
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl h-36 border border-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header + Period selector */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{dayjs().format('DD MMM YYYY')}</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Streak + Completion */}
      <div className="grid grid-cols-2 gap-3">
        <StreakCard days={stats.streakDays} />
        <CompletionCard done={stats.doneCount} total={stats.totalCount} />
      </div>

      {/* Bar chart */}
      <BarChart bars={stats.bars} period={period} totalHours={stats.totalHours} />

      {/* Project breakdown */}
      <ProjectBreakdown items={stats.projectBreakdown} totalHours={stats.totalHours} />
    </div>
  );
}

// =====================================================================
// Period filter
// =====================================================================

function filterByPeriod(blocks: TimeBlock[], period: Period): TimeBlock[] {
  const today = dayjs().startOf('day');
  if (period === 'all') return blocks;
  let start: dayjs.Dayjs;
  if (period === '7d')    start = today.subtract(6, 'day');
  else if (period === '30d') start = today.subtract(29, 'day');
  else start = today.startOf('month');
  const startStr = start.format('YYYY-MM-DD');
  return blocks.filter(b => b.date >= startStr);
}

// =====================================================================
// Stats computation
// =====================================================================

function computeStats(
  filtered: TimeBlock[],
  allBlocks: TimeBlock[],
  projects: Project[],
  period: Period,
): Stats {
  const today = dayjs().startOf('day');

  const doneCount  = filtered.filter(b => b.status === 'Done').length;
  const totalCount = filtered.length;
  const totalHours = filtered.reduce((s, b) => s + (b.duration_hrs || 0), 0);

  // Streak always uses ALL blocks (period filter shouldn't reset streak counter)
  const doneDates = new Set(allBlocks.filter(b => b.status === 'Done').map(b => b.date));
  let streakDays = 0;
  let cursor = today;
  if (!doneDates.has(cursor.format('YYYY-MM-DD'))) cursor = cursor.subtract(1, 'day');
  while (doneDates.has(cursor.format('YYYY-MM-DD'))) {
    streakDays++;
    cursor = cursor.subtract(1, 'day');
  }

  // Determine bar chart grouping
  const bars = buildBars(filtered, period, today);

  // Project breakdown from filtered blocks
  const projectColorMap = new Map(projects.map(p => [p.name, p.color]));
  const byProject = new Map<string, { hours: number; taskCount: number }>();
  for (const b of filtered) {
    const cur = byProject.get(b.project) || { hours: 0, taskCount: 0 };
    cur.hours    += b.duration_hrs || 0;
    cur.taskCount += 1;
    byProject.set(b.project, cur);
  }
  const projectBreakdown = Array.from(byProject.entries())
    .map(([name, v]) => ({ name, color: projectColorMap.get(name) || 'gray', ...v }))
    .sort((a, b) => b.hours - a.hours);

  return { doneCount, totalCount, totalHours, streakDays, bars, projectBreakdown };
}

// =====================================================================
// Bar data builder (daily for ≤14 days, weekly for >14)
// =====================================================================

function buildBars(blocks: TimeBlock[], period: Period, today: dayjs.Dayjs): BarItem[] {
  const todayStr = today.format('YYYY-MM-DD');

  if (period === '7d') {
    // 7 daily bars
    return Array.from({ length: 7 }).map((_, i) => {
      const day     = today.subtract(6 - i, 'day');
      const dateStr = day.format('YYYY-MM-DD');
      const hours   = blocks.filter(b => b.date === dateStr).reduce((s, b) => s + (b.duration_hrs || 0), 0);
      return { key: dateStr, label: day.format('dd')[0], hours, isToday: dateStr === todayStr };
    });
  }

  if (period === '30d') {
    // Group into ~10 bars: 3-day buckets
    const bars: BarItem[] = [];
    for (let i = 0; i < 10; i++) {
      // bucket: days [startOffset, startOffset+2]
      const endDay   = today.subtract(i * 3, 'day');
      const startDay = endDay.subtract(2, 'day');
      const hours = blocks
        .filter(b => b.date >= startDay.format('YYYY-MM-DD') && b.date <= endDay.format('YYYY-MM-DD'))
        .reduce((s, b) => s + (b.duration_hrs || 0), 0);
      const isActive = todayStr >= startDay.format('YYYY-MM-DD') && todayStr <= endDay.format('YYYY-MM-DD');
      bars.unshift({
        key:      `${startDay.format('YYYY-MM-DD')}_3d`,
        label:    endDay.format('D/M'),
        sublabel: startDay.format('D') + '-' + endDay.format('D MMM'),
        hours,
        isToday: isActive,
      });
    }
    return bars;
  }

  if (period === 'month') {
    // Weekly bars within current month (Mon–Sun)
    const startOfMonth = today.startOf('month');
    const bars: BarItem[] = [];
    let weekStart = startOfMonth.startOf('isoWeek');
    while (weekStart.isBefore(today.add(1, 'day'))) {
      const weekEnd = weekStart.endOf('isoWeek');
      const clampedStart = weekStart.isBefore(startOfMonth) ? startOfMonth : weekStart;
      const clampedEnd   = weekEnd.isAfter(today) ? today : weekEnd;
      const hours = blocks
        .filter(b => b.date >= clampedStart.format('YYYY-MM-DD') && b.date <= clampedEnd.format('YYYY-MM-DD'))
        .reduce((s, b) => s + (b.duration_hrs || 0), 0);
      const isActive = todayStr >= clampedStart.format('YYYY-MM-DD') && todayStr <= clampedEnd.format('YYYY-MM-DD');
      bars.push({
        key:      weekStart.format('YYYY-MM-DD') + '_w',
        label:    'W' + weekStart.isoWeek(),
        sublabel: clampedStart.format('D') + '-' + clampedEnd.format('D MMM'),
        hours,
        isToday: isActive,
      });
      weekStart = weekStart.add(1, 'week');
    }
    return bars;
  }

  // 'all' — last 8 weeks grouped by week
  const bars: BarItem[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekEnd   = today.subtract(i, 'week').endOf('isoWeek');
    const weekStart = weekEnd.startOf('isoWeek');
    const cEnd   = weekEnd.isAfter(today) ? today : weekEnd;
    const hours = blocks
      .filter(b => b.date >= weekStart.format('YYYY-MM-DD') && b.date <= cEnd.format('YYYY-MM-DD'))
      .reduce((s, b) => s + (b.duration_hrs || 0), 0);
    const isActive = todayStr >= weekStart.format('YYYY-MM-DD') && todayStr <= cEnd.format('YYYY-MM-DD');
    bars.push({
      key:      weekStart.format('YYYY-MM-DD') + '_w',
      label:    'W' + weekStart.isoWeek(),
      sublabel: weekStart.format('D MMM'),
      hours,
      isToday: isActive,
    });
  }
  return bars;
}

// =====================================================================
// UI Sub-components
// =====================================================================

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5 flex-shrink-0">
      {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            value === p
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

function StreakCard({ days }: { days: number }) {
  const active = days > 0;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-gray-500 text-xs font-semibold uppercase tracking-wide">
        <Flame size={13} className={active ? 'text-orange-500' : 'text-gray-300'} />
        Streak
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={`text-4xl font-extrabold ${active ? 'text-orange-500' : 'text-gray-300'}`}>
          {days}
        </span>
        <span className="text-sm text-gray-500 font-medium">hari</span>
      </div>
      <p className="text-xs text-gray-400 mt-1 leading-tight">
        {active ? 'Berturut-turut selesai' : 'Mulai streak hari ini 🚀'}
      </p>
    </div>
  );
}

function CompletionCard({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const radius       = 28;
  const circumference = 2 * Math.PI * radius;
  const offset       = circumference - (pct / 100) * circumference;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-gray-500 text-xs font-semibold uppercase tracking-wide">
        <CheckCircle2 size={13} className="text-green-500" />
        Selesai
      </div>
      <div className="mt-2 flex items-center gap-3">
        <svg width="64" height="64" viewBox="0 0 72 72" className="-rotate-90 flex-shrink-0">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle
            cx="36" cy="36" r={radius} fill="none" stroke="#22c55e" strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 400ms ease' }}
          />
        </svg>
        <div>
          <div className="text-2xl font-extrabold text-gray-900 leading-tight">{pct}%</div>
          <div className="text-xs text-gray-500 mt-0.5">{done}/{total} done</div>
        </div>
      </div>
    </div>
  );
}

function BarChart({ bars, period, totalHours }: { bars: BarItem[]; period: Period; totalHours: number }) {
  const max         = Math.max(...bars.map(d => d.hours), 1);
  const showNumbers = period === '7d';

  const chartTitle: Record<Period, string> = {
    '7d':   'Jam per Hari (7 hari terakhir)',
    '30d':  'Jam per 3 Hari (30 hari terakhir)',
    'month':'Jam per Minggu (bulan ini)',
    'all':  'Jam per Minggu (8 minggu terakhir)',
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-gray-500 text-xs font-semibold uppercase tracking-wide">
          <Clock size={13} className="text-blue-500" />
          {chartTitle[period]}
        </div>
        <div className="text-xs text-gray-500 font-semibold">{totalHours.toFixed(1)}h</div>
      </div>

      <div className="flex items-end gap-1.5 h-32">
        {bars.map(d => {
          const heightPct = (d.hours / max) * 100;
          return (
            <div key={d.key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              {showNumbers && (
                <div className="text-[9px] font-bold text-gray-500 leading-none h-3 text-center">
                  {d.hours > 0 ? d.hours.toFixed(1) : ''}
                </div>
              )}
              <div className="w-full flex-1 flex items-end">
                <div
                  className={`w-full rounded-t-md transition-all ${
                    d.isToday ? 'bg-blue-600' : 'bg-blue-200'
                  }`}
                  style={{ height: `${Math.max(heightPct, d.hours > 0 ? 5 : 0)}%` }}
                />
              </div>
              <div className={`text-[9px] font-semibold text-center leading-tight ${
                d.isToday ? 'text-blue-600' : 'text-gray-400'
              }`}>
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProjectBreakdown({
  items,
  totalHours,
}: {
  items: Stats['projectBreakdown'];
  totalHours: number;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-gray-500 text-xs font-semibold uppercase tracking-wide mb-3">
        <FolderKanban size={13} className="text-purple-500" />
        Project Breakdown
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">Belum ada data di periode ini</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const pct = totalHours > 0 ? (item.hours / totalHours) * 100 : 0;
            return (
              <div key={item.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorClassFor(item.color)}`} />
                    <span className="font-semibold text-gray-800 truncate">{item.name}</span>
                    <span className="text-xs text-gray-400 font-medium flex-shrink-0">
                      · {item.taskCount} task
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-700 flex-shrink-0 ml-2">
                    {item.hours.toFixed(1)}h
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${colorClassFor(item.color)} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
