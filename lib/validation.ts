import { PROJECTS, PRIORITIES, STATUSES } from '@/src/constants';

const TIME_RE = /^\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ValidationError = { field: string; message: string };

function err(field: string, message: string): ValidationError {
  return { field, message };
}

export function validateCreatePayload(data: unknown): ValidationError[] {
  if (!data || typeof data !== 'object') return [err('body', 'Request body must be a JSON object')];
  const d = data as Record<string, unknown>;
  const errors: ValidationError[] = [];

  if (!d.task_name || typeof d.task_name !== 'string' || !d.task_name.trim()) {
    errors.push(err('task_name', 'task_name is required'));
  }
  if (!d.project || !PROJECTS.includes(d.project as string)) {
    errors.push(err('project', `project must be one of: ${PROJECTS.join(', ')}`));
  }
  if (!d.priority || !PRIORITIES.includes(d.priority as string)) {
    errors.push(err('priority', `priority must be one of: ${PRIORITIES.join(', ')}`));
  }
  if (!d.status || !STATUSES.includes(d.status as string)) {
    errors.push(err('status', `status must be one of: ${STATUSES.join(', ')}`));
  }
  if (!d.date || typeof d.date !== 'string' || !DATE_RE.test(d.date)) {
    errors.push(err('date', 'date must be in YYYY-MM-DD format'));
  }
  if (!d.start_time || typeof d.start_time !== 'string' || !TIME_RE.test(d.start_time)) {
    errors.push(err('start_time', 'start_time must be in HH:mm format'));
  }
  if (!d.end_time || typeof d.end_time !== 'string' || !TIME_RE.test(d.end_time)) {
    errors.push(err('end_time', 'end_time must be in HH:mm format'));
  }

  return errors;
}

export function validateUpdatePayload(data: unknown): ValidationError[] {
  if (!data || typeof data !== 'object') return [err('body', 'Request body must be a JSON object')];
  const d = data as Record<string, unknown>;
  const errors: ValidationError[] = [];

  if ('task_name' in d && (typeof d.task_name !== 'string' || !d.task_name.trim())) {
    errors.push(err('task_name', 'task_name must be a non-empty string'));
  }
  if ('project' in d && !PROJECTS.includes(d.project as string)) {
    errors.push(err('project', `project must be one of: ${PROJECTS.join(', ')}`));
  }
  if ('priority' in d && !PRIORITIES.includes(d.priority as string)) {
    errors.push(err('priority', `priority must be one of: ${PRIORITIES.join(', ')}`));
  }
  if ('status' in d && !STATUSES.includes(d.status as string)) {
    errors.push(err('status', `status must be one of: ${STATUSES.join(', ')}`));
  }
  if ('date' in d && (typeof d.date !== 'string' || !DATE_RE.test(d.date))) {
    errors.push(err('date', 'date must be in YYYY-MM-DD format'));
  }
  if ('start_time' in d && (typeof d.start_time !== 'string' || !TIME_RE.test(d.start_time))) {
    errors.push(err('start_time', 'start_time must be in HH:mm format'));
  }
  if ('end_time' in d && (typeof d.end_time !== 'string' || !TIME_RE.test(d.end_time))) {
    errors.push(err('end_time', 'end_time must be in HH:mm format'));
  }

  return errors;
}
