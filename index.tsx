import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

type Loan = {
  id: string;
  borrower: string;
  balance: number;
  dpd: number;
  last_payment_date: string;
  scheduled_payment: number;
  last_payment_amount: number;
  risk_score: number;
};

type Task = {
  id: string;
  loan_id: string;
  title: string;
  assignee: string;
  due_date: string;
  status: string;
  priority: string;
  created_at: string;
};

declare global {
  interface Window {
    api: {
      importCSV: (filePath: string) => Promise<{ imported: number }>;
      getLoans: () => Promise<Loan[]>;
      getTasks: () => Promise<Task[]>;
    };
  }
}

function ImportScreen({ onImported }: { onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };
  const importFile = async () => {
    if (!file) return;
    const path = (file as any).path || '';
    const res = await window.api.importCSV(path);
    setStatus(`Imported ${res.imported}`);
    onImported();
  };
  return (
    <div style={{ padding: 16 }}>
      <h2>Import CSV</h2>
      <input type="file" accept=".csv" onChange={pick} />
      <button onClick={importFile} style={{ marginLeft: 8 }}>Import</button>
      <div style={{ marginTop: 8 }}>{status}</div>
    </div>
  );
}

function Dashboard() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const refresh = async () => {
    const l = await window.api.getLoans();
    const t = await window.api.getTasks();
    setLoans(l);
    setTasks(t);
  };
  useEffect(() => {
    refresh();
  }, []);
  const sorted = useMemo(() => [...loans].sort((a, b) => b.risk_score - a.risk_score), [loans]);
  return (
    <div style={{ padding: 16 }}>
      <h2>Dashboard</h2>
      <div style={{ marginBottom: 12 }}>At-risk loans</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Loan</th>
            <th style={{ textAlign: 'left' }}>Borrower</th>
            <th style={{ textAlign: 'right' }}>Balance</th>
            <th style={{ textAlign: 'right' }}>DPD</th>
            <th style={{ textAlign: 'right' }}>Risk</th>
            <th style={{ textAlign: 'left' }}>Suggested Task</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(l => {
            const sug = tasks.find(t => t.loan_id === l.id);
            return (
              <tr key={l.id}>
                <td>{l.id}</td>
                <td>{l.borrower}</td>
                <td style={{ textAlign: 'right' }}>{l.balance.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>{l.dpd}</td>
                <td style={{ textAlign: 'right' }}>{l.risk_score.toFixed(3)}</td>
                <td>{sug ? sug.title : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button onClick={refresh} style={{ marginTop: 12 }}>Refresh</button>
    </div>
  );
}

function App() {
  const [imported, setImported] = useState(false);
  return (
    <div>
      <ImportScreen onImported={() => setImported(true)} />
      <Dashboard />
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
