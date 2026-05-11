import { TimeBlock } from './types';

export async function fetchTimeBlocks(): Promise<TimeBlock[]> {
  const res = await fetch('/api/timeblocks');
  if (!res.ok) throw new Error('Failed to fetch time blocks');
  return res.json();
}

export async function createTimeBlock(data: Partial<TimeBlock>): Promise<TimeBlock> {
  const res = await fetch('/api/timeblocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create time block');
  return res.json();
}

export async function updateTimeBlock(id: string, data: Partial<TimeBlock>): Promise<TimeBlock> {
  const res = await fetch(`/api/timeblocks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update time block');
  return res.json();
}

export async function deleteTimeBlock(id: string): Promise<void> {
  const res = await fetch(`/api/timeblocks/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete time block');
}
