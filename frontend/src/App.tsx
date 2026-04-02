import React, { useState, useCallback, useRef, useEffect } from 'react';
import { calculateAuthenticityScore, generateAuthorshipPDF } from './logic';
import type { LogEvent, WritingStats } from './logic';
import './index.css';

const API_URL = 'http://localhost:5000/api';

const App: React.FC = () => {
  const [text, setText] = useState('');
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [confidence, setConfidence] = useState(100);
  const [tab, setTab] = useState<'editor' | 'reports' | 'auth'>('auth');
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  // Behavioral metrics state
  const statsRef = useRef<WritingStats>({
    lastKeyTime: null,
    intervals: [],
    pauseCount: 0,
    deletionCount: 0,
    pasteCount: 0,
    pastedCharCount: 0,
  });

  // Session persistence
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
      setTab('editor');
    }
  }, []);

  // Fetch reports from database
  const fetchReports = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/reports`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  }, []);

  useEffect(() => {
    if (tab === 'reports') {
      fetchReports();
    }
  }, [tab, fetchReports]);

  // UI Event logger
  const addLog = useCallback((type: LogEvent['type'], message: string) => {
    const newLog: LogEvent = {
      id: Math.random().toString(36).substring(7),
      type,
      message,
      timestamp: new Date().toLocaleTimeString(),
    };
    setLogs(prev => [newLog, ...prev].slice(0, 15));
  }, []);

  // Authentication logic
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const path = authMode === 'login' ? '/auth/login' : '/auth/register';

    try {
      const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Auth failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setTab('editor');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setTab('auth');
  };

  const resetEditor = () => {
    statsRef.current = {
      lastKeyTime: null,
      intervals: [],
      pauseCount: 0,
      deletionCount: 0,
      pasteCount: 0,
      pastedCharCount: 0,
    };
    setText('');
    setConfidence(100);
    setLogs([]);
  };

  // Tracking keystroke rhythms
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const now = Date.now();
    const s = statsRef.current;

    if (text.length === 0 && s.intervals.length === 0) {
      addLog('system', 'Session recording started.');
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      s.deletionCount++;
      addLog('deletion', 'Modification detected.');
    }

    if (s.lastKeyTime) {
      const diff = now - s.lastKeyTime;
      s.intervals.push(diff);
      if (diff > 2500) {
        s.pauseCount++;
        addLog('timing', `Pause: ${(diff/1000).toFixed(1)}s`);
      }
    }
    s.lastKeyTime = now;
  };

  // Paste behavior tracking
  const handlePaste = (e: React.ClipboardEvent) => {
    const s = statsRef.current;
    const pastedText = e.clipboardData.getData('text');
    s.pasteCount++;
    s.pastedCharCount += pastedText.length;
    addLog('paste', `Pasted ${pastedText.length} characters.`);
    setConfidence(calculateAuthenticityScore(s));
  };

  const onTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    if (!val) {
      resetEditor();
      return;
    }
    setConfidence(calculateAuthenticityScore(statsRef.current));
  };

  // Export report to PDF and DB
  const exportReport = async () => {
    if (!text.trim()) return;
    setIsExporting(true);
    const wordCount = text.trim().split(/\s+/).length;
    
    try {
      await generateAuthorshipPDF(statsRef.current, logs, confidence, wordCount);
      
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
          score: confidence,
          wordCount
        })
      });
      
      addLog('system', 'Report exported and saved to database.');
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Render Logic
  if (tab === 'auth') {
    return (
      <div className="container">
        <div className="auth-box">
          <h2 style={{ marginBottom: '24px' }}>{authMode === 'login' ? 'Login' : 'Sign Up'}</h2>
          {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
          <form onSubmit={handleAuth}>
            {authMode === 'register' && (
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }}>
              {authMode === 'login' ? 'Continue' : 'Create Account'}
            </button>
          </form>
          <button className="nav-item" style={{ border: 'none', background: 'none', padding: 0, marginTop: '16px' }} onClick={() => setAuthMode(m => m === 'login' ? 'register' : 'login')}>
            {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="header">
        <div className="logo" onClick={() => setTab('editor')}>ViNotes</div>
        <nav className="nav">
          <span className={`nav-item ${tab === 'editor' ? 'active' : ''}`} onClick={() => setTab('editor')}>Workspace</span>
          <span className={`nav-item ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>Reports</span>
          
          {user && (
            <div className="profile-container">
              <div 
                className="user-badge" 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                title={user.name}
              >
                {user.name.substring(0, 2).toUpperCase()}
              </div>
              
              {isProfileOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-header">
                    <b>{user.name}</b>
                    <span>{user.email}</span>
                  </div>
                  <button className="dropdown-item" onClick={() => { setIsProfileOpen(false); alert('Manage profile coming soon'); }}>Manage Profile</button>
                  <button className="dropdown-item logout" onClick={() => { setIsProfileOpen(false); handleLogout(); }}>Logout</button>
                </div>
              )}
            </div>
          )}
        </nav>
      </header>

      <main className="container">
        {tab === 'editor' ? (
          <div className="layout">
            <div className="editor-pane">
              <textarea
                value={text}
                onChange={onTextChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Start writing here to verify your authorship behavior..."
              />
              <div className="status-bar">
                <span>{text.length} characters | {text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn" onClick={resetEditor}>Clear</button>
                  <button className="btn btn-primary" onClick={exportReport} disabled={isExporting}>
                    {isExporting ? 'Exporting...' : 'Export Certificate'}
                  </button>
                </div>
              </div>
            </div>

            <aside>
              <div className="card">
                <span className="card-title">Authenticity</span>
                <div className="score-display">
                  <div className="score-value">{confidence}%</div>
                  <div className="meter"><div className="meter-fill" style={{ width: `${confidence}%` }} /></div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    Based on {statsRef.current.intervals.length} behavioral samples.
                  </p>
                </div>
              </div>

              <div className="card">
                <span className="card-title">Event Log</span>
                <div className="logs">
                  {logs.length === 0 ? (
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Waiting for input...</div>
                  ) : (
                    logs.map(log => (
                      <div key={log.id} className="log-item">
                        <span style={{ fontWeight: 600 }}>{log.type.toUpperCase()}:</span> {log.message}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <div className="reports-view">
            <div className="reports-header" style={{ marginBottom: '32px' }}>
              <h2>My Authorship Certificates</h2>
              <p style={{ color: 'var(--text-dim)' }}>View and manage your verified writing reports.</p>
            </div>
            
            {reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '120px 24px', opacity: 0.6 }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📄</div>
                <h3>No saved reports yet</h3>
                <p>Reports will appear here once you export and save your authorship certificates.</p>
                <button className="btn btn-primary" style={{ marginTop: '24px' }} onClick={() => setTab('editor')}>Go to Workspace</button>
              </div>
            ) : (
              <div className="reports-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {reports.map((report: any) => (
                  <div key={report._id} className="card report-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{new Date(report.createdAt).toLocaleDateString()}</span>
                      <span className="badge" style={{ background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{report.score}% Authenticity</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {report.text}
                    </p>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      {report.wordCount} words
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
};

export default App;
