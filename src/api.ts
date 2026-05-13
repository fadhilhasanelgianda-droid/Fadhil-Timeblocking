import { TimeBlock } from './types';

function authHeaders(): HeadersInit {
  const secret = process.env.NEXT_PUBLIC_API_SECRET;
  return {
    'Content-Type': 'application/json',
    ...(secret ? { 'x-api-secret': secret } : {}),
  };
}

export async function fetchTimeBlocks(): Promise<TimeBlock[]> {
  const res = await fetch('/api/timeblocks', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch time blocks');
  return res.json();
}

export async function createTimeBlock(data: Partial<TimeBlock>): Promise<TimeBlock> {
  const res = await fetch('/api/timeblocks', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create time block');
  return res.json();
}

export async function updateTimeBlock(id: string, data: Partial<TimeBlock>): Promise<TimeBlock> {
  const res = await fetch(`/api/timeblocks/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update time block');
  return res.json();
}

export async function deleteTimeBlock(id: string): Promise<void> {
  const res = await fetch(`/api/timeblocks/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete time block');
}
