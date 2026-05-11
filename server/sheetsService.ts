import { google } from 'googleapis';
import { TimeBlock } from '../src/types.js';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!email || !privateKey) {
    throw new Error('Google Sheets Service Account credentials are missing in env vars.');
  }

  return new google.auth.JWT(email, undefined, privateKey, SCOPES);
}

const getSpreadsheetId = () => {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) throw new Error('GOOGLE_SPREADSHEET_ID is missing in env vars.');
  return id;
};

// Fallback in-memory database if Google Sheets API is not configured.
// This is to ensure the app functions and can be UI tested even without the env variables fully populated.
let mockData: TimeBlock[] = [];
let useMock = false;

try {
  getAuthClient();
  getSpreadsheetId();
} catch (error) {
  console.warn('⚠️ Google Sheets credentials not fully configured. Using IN-MEMORY MOCK database for MVP development.');
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
    }
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
    // Handling numeric time formats from Sheets if they are decimal (e.g. 0.375)
    let startTime = row[6] || '';
    let endTime = row[7] || '';
    
    // Quick parser if it's a decimal number between 0 and 1
    if (!isNaN(parseFloat(startTime)) && !startTime.includes(':')) {
      const startFloat = parseFloat(startTime);
      const hours = Math.floor(startFloat * 24);
      const mins = Math.round((startFloat * 24 - hours) * 60);
      startTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }
    if (!isNaN(parseFloat(endTime)) && !endTime.includes(':')) {
      const endFloat = parseFloat(endTime);
      const hours = Math.floor(endFloat * 24);
      const mins = Math.round((endFloat * 24 - hours) * 60);
      endTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    return {
      id: row[0] || `row_${index + 2}`, // Create a pseudo-ID if missing
      date: row[1] || '',
      day: row[2] || '',
      project: row[3] as any,
      task_name: row[4] || '',
      priority: row[5] as any,
      start_time: startTime,
      end_time: endTime,
      duration_hrs: parseFloat(row[8]) || 0,
      status: row[9] || 'Todo',
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

  const rowData = [
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
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: 'Task Log!A:M',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [rowData],
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
  
  // We need to find the row to update. Optimization: in a real big app we might index, here we just fetch all to find the row.
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: SPREADSHEET_RANGE,
  });

  const rows = response.data.values || [];
  const rowIndex = rows.findIndex(row => row[0] === id);
  
  if (rowIndex === -1) {
    throw new Error('Time block not found in Google Sheets.');
  }

  const exactRowNumber = rowIndex + 2; // Offset by header to actual row

  // Re-build updated row data. We merge old and new values.
  const oldRow = rows[rowIndex];
  const updatedRowData = [
    id,
    data.date !== undefined ? data.date : oldRow[1] || '',
    data.day !== undefined ? data.day : oldRow[2] || '',
    data.project !== undefined ? data.project : oldRow[3] || '',
    data.task_name !== undefined ? data.task_name : oldRow[4] || '',
    data.priority !== undefined ? data.priority : oldRow[5] || '',
    data.start_time !== undefined ? data.start_time : oldRow[6] || '',
    data.end_time !== undefined ? data.end_time : oldRow[7] || '',
    data.duration_hrs !== undefined ? data.duration_hrs.toString() : oldRow[8] || '',
    data.status !== undefined ? data.status : oldRow[9] || '',
    data.notes !== undefined ? data.notes : oldRow[10] || '',
    oldRow[11] || '', // created_at conceptually doesn't change
    data.updated_at,
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `Task Log!A${exactRowNumber}:M${exactRowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [updatedRowData],
    },
  });

  // Reconstruct full block to return
  return {
    id: updatedRowData[0],
    date: updatedRowData[1],
    day: updatedRowData[2],
    project: updatedRowData[3] as any,
    task_name: updatedRowData[4],
    priority: updatedRowData[5] as any,
    start_time: updatedRowData[6],
    end_time: updatedRowData[7],
    duration_hrs: parseFloat(updatedRowData[8]),
    status: updatedRowData[9] as any,
    notes: updatedRowData[10],
    created_at: updatedRowData[11],
    updated_at: updatedRowData[12],
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
  
  if (rowIndex === -1) {
    return false;
  }

  const exactRowNumber = rowIndex + 2;

  // Clear data instead of shifting rows up (simplest and safest operation vs deleting row entirely)
  // or we can use batchUpdate to actually delete the row. Deleting row is cleaner.
  // We need the sheetId for the Task Log sheet to use batchUpdate. Let's just find it.
  
  const sheetMeta = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
  });
  
  const taskLogSheet = sheetMeta.data.sheets?.find(s => s.properties?.title === 'Task Log');
  if (!taskLogSheet?.properties?.sheetId) {
    throw new Error('Task Log sheet not found');
  }
  
  const sheetId = taskLogSheet.properties.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: exactRowNumber - 1, // 0-indexed
              endIndex: exactRowNumber,       // exclusive
            }
          }
        }
      ]
    }
  });

  return true;
}
