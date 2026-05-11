export type ProjectType =
  | 'Boleh Belajar'
  | 'Faith Industries'
  | 'Auffan'
  | 'Toko AC BDG'
  | 'Suga Coat'
  | 'Personal';

export type PriorityType = '🔴 High' | '🟡 Medium' | '🟢 Low';

export type StatusType = 'Todo' | 'In Progress' | 'Done' | 'Cancelled';

export interface TimeBlock {
  id: string; // tb_timestamp_random generated
  date: string; // YYYY-MM-DD
  day: string; // Monday, Tuesday, etc.
  project: ProjectType;
  task_name: string;
  priority: PriorityType;
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  duration_hrs: number; // calculated decimal
  status: StatusType;
  notes?: string;
  created_at?: string; // ISO String
  updated_at?: string; // ISO String
}
