import { google } from 'googleapis';
import { TimeBlock, Project } from '@/src/types';
import { DEFAULT_PROJECTS } from '@/src/constants';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

function getAuthClient() {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google OAuth2 credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN) are missing.');
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost');
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

const getSpreadsheetId = () => {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) throw new Error('GOOGLE_SPREADSHEET_ID is missing in env vars.');
  return id;
};

// --- Mock / local fallback (active when Google Sheets creds are absent) ---

let useMock = false;

try {
  getAuthClient();
  getSpreadsheetId();
} catch {
  console.warn('⚠️ Google Sheets credentials not fully configured. Using file-based mock database.');
  useMock = true;
}

const MOCK_DB_PATH = path.join(process.cwd(), '.mock-db.json');

const defaultMockData = (): TimeBlock[] => [
  {
    id: 'tb_123456789_abcd',
    date: dayjs().format('YYYY-MM-DD'),
    day: dayjs().format('dddd'),
    project: 'Boleh Belajar',
    task_name: 'Meeting pegadaian',
    priority: '🔴 High',
    start_time: '09:00',
    end_time: '10:00',
    duration_hrs: 1,
    status: 'Done',
    notes: 'Follow up besok',
    created_at: dayjs().toISOString(),
    updated_at: dayjs().toISOString(),
  },
  {
    id: 'tb_123456789_efgh',
    date: dayjs().format('YYYY-MM-DD'),
    day: dayjs().format('dddd'),
    project: 'Personal',
    task_name: 'Lunch Break',
    priority: '🟢 Low',
    start_time: '12:00',
    end_time: '13:00',
    duration_hrs: 1,
    status: 'Done',
    notes: '',
    created_at: dayjs().toISOString(),
    updated_at: dayjs().toISOString(),
  },
];

function readMockDb(): TimeBlock[] {
  try {
    return JSON.parse(fs.readFileSync(MOCK_DB_PATH, 'utf-8')) as TimeBlock[];
  } catch {
    // File doesn't exist yet — seed with defaults and persist immediately
    const seed = defaultMockData();
    writeMockDb(seed);
    return seed;
  }
}

function writeMockDb(data: TimeBlock[]): void {
  fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// --- Projects mock storage ---

const MOCK_PROJECTS_PATH = path.join(process.cwd(), '.mock-projects-db.json');

const defaultProjectSeed = (): Project[] =>
  DEFAULT_PROJECTS.map((p, i) => ({
    id: `prj_${Date.now()}_${i}`,
    name: p.name,
    color: p.color,
    created_at: new Date().toISOString(),
  }));

function readMockProjects(): Project[] {
  try {
    return JSON.parse(fs.readFileSync(MOCK_PROJECTS_PATH, 'utf-8')) as Project[];
  } catch {
    const seed = defaultProjectSeed();
    writeMockProjects(seed);
    return seed;
  }
}

function writeMockProjects(data: Project[]): void {
  fs.writeFileSync(MOCK_PROJECTS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// --- Google Sheets helpers ---

const SPREADSHEET_RANGE = 'Task Log!A2:M';

/**
 * Find a row by id. Returns -1 if not found.
 *
 * Supports two formats:
 *   - Real IDs (e.g. "tb_123_abcd") match against column A
 *   - Synthetic IDs ("row_N") returned by getTimeBlocks() for rows with
 *     blank column A — parse the row number out
 */
function findRowIndex(rows: string[][], id: string): number {
  if (id.startsWith('row_')) {
    const targetSheetRow = parseInt(id.slice(4), 10);
    if (Number.isFinite(targetSheetRow) && targetSheetRow >= 2) {
      // rows[] starts at sheet row 2, so subtract 2 to get the array index
      const idx = targetSheetRow - 2;
      return idx >= 0 && idx < rows.length ? idx : -1;
    }
  }
  return rows.findIndex(row => row[0] === id);
}

/**
 * Look up a sheet's numeric sheetId by its title (case-insensitive, trimmed).
 * Throws with a helpful list of actual sheet titles if not found.
 */
async function getSheetIdByTitle(
  sheets: ReturnType<typeof google.sheets>,
  title: string,
): Promise<number> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: 'sheets.properties(sheetId,title)',
  });
  const all = meta.data.sheets || [];
  const normalized = title.trim().toLowerCase();
  const match = all.find(s => (s.properties?.title || '').trim().toLowerCase() === normalized);
  if (!match?.properties?.sheetId && match?.properties?.sheetId !== 0) {
    const available = all.map(s => `"${s.properties?.title}"`).join(', ') || '(none)';
    throw new Error(
      `Sheet "${title}" not found. Available sheets: ${available}`,
    );
  }
  return match.properties!.sheetId!;
}

export async function getTimeBlocks(): Promise<TimeBlock[]> {
  if (useMock) return readMockDb();

  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: SPREADSHEET_RANGE,
  });

  const rows = response.data.values || [];

  return rows.map((row, index) => {
    let startTime = row[6] || '';
    let endTime = row[7] || '';

    // Parse decimal time format from Sheets (e.g. 0.375 → "09:00")
    if (!isNaN(parseFloat(startTime)) && !startTime.includes(':')) {
      const h = Math.floor(parseFloat(startTime) * 24);
      const m = Math.round((parseFloat(startTime) * 24 - h) * 60);
      startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    if (!isNaN(parseFloat(endTime)) && !endTime.includes(':')) {
      const h = Math.floor(parseFloat(endTime) * 24);
      const m = Math.round((parseFloat(endTime) * 24 - h) * 60);
      endTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    return {
      id: row[0] || `row_${index + 2}`,
      date: row[1] || '',
      day: row[2] || '',
      project: row[3] as TimeBlock['project'],
      task_name: row[4] || '',
      priority: row[5] as TimeBlock['priority'],
      start_time: startTime,
      end_time: endTime,
      duration_hrs: parseFloat(row[8]) || 0,
      status: (row[9] || 'Todo') as TimeBlock['status'],
      notes: row[10] || '',
      created_at: row[11] || '',
      updated_at: row[12] || '',
    };
  });
}

export async function createTimeBlock(data: Partial<TimeBlock>): Promise<TimeBlock> {
  const newBlock: TimeBlock = {
    ...data,
    id: `tb_${Math.floor(Date.now() / 1000)}_${uuidv4().substring(0, 4)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as TimeBlock;

  if (useMock) {
    const mockData = readMockDb();
    mockData.push(newBlock);
    writeMockDb(mockData);
    return newBlock;
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: 'Task Log!A:M',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        newBlock.id,
        newBlock.date,
        newBlock.day,
        newBlock.project,
        newBlock.task_name,
        newBlock.priority,
        newBlock.start_time,
        newBlock.end_time,
        newBlock.duration_hrs.toString(),
        newBlock.status,
        newBlock.notes || '',
        newBlock.created_at,
        newBlock.updated_at,
      ]],
    },
  });

  return newBlock;
}

export async function updateTimeBlock(id: string, data: Partial<TimeBlock>): Promise<TimeBlock | null> {
  const updatedAt = new Date().toISOString();

  if (useMock) {
    const mockData = readMockDb();
    const index = mockData.findIndex(b => b.id === id);
    if (index === -1) return null;
    mockData[index] = { ...mockData[index], ...data, updated_at: updatedAt };
    writeMockDb(mockData);
    return mockData[index];
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: SPREADSHEET_RANGE,
  });

  const rows = (response.data.values || []) as string[][];
  const rowIndex = findRowIndex(rows, id);

  if (rowIndex === -1) return null;

  const exactRowNumber = rowIndex + 2;
  const old = rows[rowIndex];

  // If the row had no persistent id (synthetic "row_N"), assign a real one now
  // so subsequent updates can find it reliably.
  const persistentId =
    id.startsWith('row_') && !old[0]
      ? `tb_${Math.floor(Date.now() / 1000)}_${uuidv4().substring(0, 4)}`
      : id;

  const updatedRow = [
    persistentId,
    data.date ?? old[1] ?? '',
    data.day ?? old[2] ?? '',
    data.project ?? old[3] ?? '',
    data.task_name ?? old[4] ?? '',
    data.priority ?? old[5] ?? '',
    data.start_time ?? old[6] ?? '',
    data.end_time ?? old[7] ?? '',
    data.duration_hrs !== undefined ? data.duration_hrs.toString() : old[8] ?? '',
    data.status ?? old[9] ?? '',
    data.notes ?? old[10] ?? '',
    old[11] ?? '',
    updatedAt,
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `Task Log!A${exactRowNumber}:M${exactRowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [updatedRow] },
  });

  return {
    id: updatedRow[0],
    date: updatedRow[1],
    day: updatedRow[2],
    project: updatedRow[3] as TimeBlock['project'],
    task_name: updatedRow[4],
    priority: updatedRow[5] as TimeBlock['priority'],
    start_time: updatedRow[6],
    end_time: updatedRow[7],
    duration_hrs: parseFloat(updatedRow[8]),
    status: updatedRow[9] as TimeBlock['status'],
    notes: updatedRow[10],
    created_at: updatedRow[11],
    updated_at: updatedRow[12] ?? '',
  };
}

export async function deleteTimeBlock(id: string): Promise<boolean> {
  if (useMock) {
    const mockData = readMockDb();
    const filtered = mockData.filter(b => b.id !== id);
    if (filtered.length === mockData.length) return false;
    writeMockDb(filtered);
    return true;
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: SPREADSHEET_RANGE,
  });

  const rows = (response.data.values || []) as string[][];
  const rowIndex = findRowIndex(rows, id);

  if (rowIndex === -1) return false;

  const exactRowNumber = rowIndex + 2;

  const sheetId = await getSheetIdByTitle(sheets, 'Task Log');

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: exactRowNumber - 1,
            endIndex: exactRowNumber,
          },
        },
      }],
    },
  });

  return true;
}

// =====================================================================
// PROJECTS — list/create/delete
// Sheet "Projects" columns: A=id, B=name, C=color, D=created_at
// =====================================================================

const PROJECTS_RANGE = 'Projects!A2:D';

async function ensureProjectsSheet(sheets: ReturnType<typeof google.sheets>) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: getSpreadsheetId() });
  const exists = meta.data.sheets?.some(s => s.properties?.title === 'Projects');
  if (exists) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      requests: [{ addSheet: { properties: { title: 'Projects' } } }],
    },
  });
  // Write header + seed defaults
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: 'Projects!A1:D1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [['id', 'name', 'color', 'created_at']] },
  });
  const seed = defaultProjectSeed();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: 'Projects!A:D',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: seed.map(p => [p.id, p.name, p.color, p.created_at || '']),
    },
  });
}

export async function getProjects(): Promise<Project[]> {
  if (useMock) return readMockProjects();

  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  await ensureProjectsSheet(sheets);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: PROJECTS_RANGE,
  });
  const rows = response.data.values || [];
  return rows
    .filter(r => r[0])
    .map(row => ({
      id: row[0],
      name: row[1] || '',
      color: row[2] || 'gray',
      created_at: row[3] || '',
    }));
}

export async function createProject(name: string, color: string): Promise<Project> {
  const newProject: Project = {
    id: `prj_${Math.floor(Date.now() / 1000)}_${uuidv4().substring(0, 4)}`,
    name: name.trim(),
    color,
    created_at: new Date().toISOString(),
  };

  if (useMock) {
    const projects = readMockProjects();
    if (projects.some(p => p.name.toLowerCase() === newProject.name.toLowerCase())) {
      throw new Error('Project dengan nama yang sama sudah ada');
    }
    projects.push(newProject);
    writeMockProjects(projects);
    return newProject;
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  await ensureProjectsSheet(sheets);

  // Dedupe check
  const existing = await getProjects();
  if (existing.some(p => p.name.toLowerCase() === newProject.name.toLowerCase())) {
    throw new Error('Project dengan nama yang sama sudah ada');
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: 'Projects!A:D',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[newProject.id, newProject.name, newProject.color, newProject.created_at || '']] },
  });
  return newProject;
}

export async function countActiveTasksForProject(projectName: string): Promise<number> {
  const blocks = await getTimeBlocks();
  return blocks.filter(b => b.project === projectName && b.status !== 'Done' && b.status !== 'Cancelled').length;
}

export async function deleteProject(id: string): Promise<boolean> {
  if (useMock) {
    const projects = readMockProjects();
    const filtered = projects.filter(p => p.id !== id);
    if (filtered.length === projects.length) return false;
    writeMockProjects(filtered);
    return true;
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  await ensureProjectsSheet(sheets);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: PROJECTS_RANGE,
  });
  const rows = response.data.values || [];
  const rowIndex = rows.findIndex(r => r[0] === id);
  if (rowIndex === -1) return false;

  const exactRowNumber = rowIndex + 2;

  const sheetId = await getSheetIdByTitle(sheets, 'Projects');

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: exactRowNumber - 1,
            endIndex: exactRowNumber,
          },
        },
      }],
    },
  });
  return true;
}
