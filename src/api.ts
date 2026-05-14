import { TimeBlock, Project } from './types';

function authHeaders(): HeadersInit {
  const secret = process.env.NEXT_PUBLIC_API_SECRET;
  return {
    'Content-Type': 'application/json',
    ...(secret ? { 'x-api-secret': secret } : {}),
  };
}

async function extractError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (body?.errors?.[0]?.message) return body.errors[0].message;
    if (body?.message) return body.message;
    if (body?.error) return String(body.error);
  } catch {
    /* not JSON */
  }
  return `${fallback} (HTTP ${res.status})`;
}

export async function fetchTimeBlocks(): Promise<TimeBlock[]> {
  const res = await fetch('/api/timeblocks', { headers: authHeaders() });
  if (!res.ok) throw new Error(await extractError(res, 'Failed to fetch time blocks'));
  return res.json();
}

export async function createTimeBlock(data: Partial<TimeBlock>): Promise<TimeBlock> {
  const res = await fetch('/api/timeblocks', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await extractError(res, 'Failed to create time block'));
  return res.json();
}

export async function updateTimeBlock(id: string, data: Partial<TimeBlock>): Promise<TimeBlock> {
  const res = await fetch(`/api/timeblocks/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await extractError(res, 'Failed to update time block'));
  return res.json();
}

export async function deleteTimeBlock(id: string): Promise<void> {
  const res = await fetch(`/api/timeblocks/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await extractError(res, 'Failed to delete time block'));
}

// --- Projects ---

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function createProject(name: string, color: string): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.errors?.[0]?.message || body?.error || 'Failed to create project';
    throw new Error(msg);
  }
  return res.json();
}

export interface DeleteProjectBlockedError extends Error {
  blocked: true;
  activeCount: number;
  projectName: string;
}

export async function deleteProject(id: string, force = false): Promise<void> {
  const res = await fetch(`/api/projects/${id}${force ? '?force=true' : ''}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (res.status === 409) {
    const body = await res.json();
    const err = new Error(body.message || 'Project has active tasks') as DeleteProjectBlockedError;
    err.blocked = true;
    err.activeCount = body.activeCount;
    err.projectName = body.projectName;
    throw err;
  }
  if (!res.ok) throw new Error('Failed to delete project');
}
