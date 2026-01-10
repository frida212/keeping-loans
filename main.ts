import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import Store from 'electron-store';
import fs from 'fs';
import Papa from 'papaparse';

const store = new Store<{ loans: any[]; tasks: any[] }>({ name: 'keeptrack', defaults: { loans: [], tasks: [] } });

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('getLoans', () => {
  const loans = store.get('loans', []);
  return loans;
});

ipcMain.handle('getTasks', () => {
  const tasks = store.get('tasks', []);
  return tasks;
});

function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x));
}

function computeRisk(row: any) {
  const dpd = Number(row.dpd || 0);
  const scheduled = Number(row.scheduled_payment || 0);
  const last = Number(row.last_payment_amount || 0);
  const ratio = scheduled > 0 ? last / scheduled : 1;
  const z = -2 + 0.06 * dpd + -1.5 * ratio;
  const p = sigmoid(z);
  return p;
}

function suggestTaskForLoan(loan: any) {
  if (loan.risk_score >= 0.4) {
    return { id: `${loan.id}-task-1`, loan_id: loan.id, title: 'Send late-payment notice', assignee: 'Unassigned', due_date: new Date().toISOString(), status: 'open', priority: 'high', created_at: new Date().toISOString() };
  }
  return null;
}

ipcMain.handle('importCSV', async (_e, filePath: string) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = Papa.parse(content, { header: true, dynamicTyping: true });
  const rows = parsed.data as any[];
  const loans = rows.filter(r => r && r.loan_id).map(r => {
    const risk = computeRisk(r);
    return {
      id: String(r.loan_id),
      borrower: String(r.borrower || ''),
      balance: Number(r.balance || 0),
      dpd: Number(r.dpd || 0),
      last_payment_date: String(r.last_payment_date || ''),
      scheduled_payment: Number(r.scheduled_payment || 0),
      last_payment_amount: Number(r.last_payment_amount || 0),
      risk_score: risk
    };
  });
  const existing = store.get('loans', []);
  const merged = [...existing.filter((e: any) => !loans.find(l => l.id === e.id)), ...loans];
  store.set('loans', merged);
  const tasks = store.get('tasks', []);
  const newTasks = loans.map(suggestTaskForLoan).filter(Boolean) as any[];
  const mergedTasks = [...tasks, ...newTasks.filter(t => !tasks.find(x => x.id === t.id))];
  store.set('tasks', mergedTasks);
  return { imported: loans.length };
});
