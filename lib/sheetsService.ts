import { google } from 'googleapis';
import { TimeBlock } from '@/src/types';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Google Sheets Service Account credentials are missing in env vars.');
  }

  return new google.auth.JWT({ email, key: privateKey, scopes: SCOPES });
}

const getSpreadsheetId = () => {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) throw new Error('GOOGLE_SPREADSHEET_ID is missing in env vars.');
  return id;
};

// Fallback in-memory database if Google Sheets API is not configured.
let mockData: TimeBlock[] = [];
let useMock = false;

try {
  getAuthClient();
  getSpreadsheetId();
} catch {
  console.warn('⚠️ Google Sheets credentials not fully configured. Using IN-MEMORY MOCK database.');
  useMock = true;
  mockData = [
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
}

const SPREADSHEET_RANGE = 'Task Log!A2:M';

export async function getTimeBlocks(): Promise<TimeBlock[]> {
  if (useMock) return mockData;

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
    mockData.push(newBlock);
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
  data.updated_at = new Date().toISOString();

  if (useMock) {
    const index = mockData.findIndex(b => b.id === id);
    if (index === -1) return null;
    mockData[index] = { ...mockData[index], ...data };
    return mockData[index];
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: SPREADSHEET_RANGE,
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex(row => row[0] === id);

  if (rowIndex === -1) return null;

  const exactRowNumber = rowIndex + 2;
  const old = rows[rowIndex];

  const updatedRow = [
    id,
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
    data.updated_at,
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
    const initialLen = mockData.length;
    mockData = mockData.filter(b => b.id !== id);
    return mockData.length < initialLen;
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: SPREADSHEET_RANGE,
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex(row => row[0] === id);

  if (rowIndex === -1) return false;

  const exactRowNumber = rowIndex + 2;

  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: getSpreadsheetId() });
  const taskLogSheet = sheetMeta.data.sheets?.find(s => s.properties?.title === 'Task Log');
  if (!taskLogSheet?.properties?.sheetId) throw new Error('Task Log sheet not found');

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: taskLogSheet.properties.sheetId,
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
