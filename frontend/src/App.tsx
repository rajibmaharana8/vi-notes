import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { LogEvent, WritingStats } from './types/index';
import { generateAuthorshipPDF } from './utils/pdfGenerator';
import { calculateAuthenticityScore } from './utils/analysisEngine';
import { 
  Search, Moon, Sun, Monitor, FileText, 
  Trash2, Play, Download,
  ShieldCheck, Activity, Clock, ShieldAlert,
  Globe, Bell
} from 'lucide-react';
import './index.css';

const API_URL = 'http://localhost:5000/api';

const App: React.FC = () => {
  // Navigation & UI States
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [confidence, setConfidence] = useState(100);
  const [statusText, setStatusText] = useState('Secure Session Active');
  const [isGenerating, setIsGenerating] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<'lab' | 'reports' | 'auth'>('auth');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [highlightConfidence, setHighlightConfidence] = useState(false);
  const [text, setText] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // User States
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load existing session
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';

    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
      setActiveTab('lab');
    }

    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setActiveTab('auth');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Auth failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setActiveTab('lab');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const statsRef = useRef<WritingStats>({
    lastKeyTime: null,
    intervals: [],
    pauseCount: 0,
    deletionCount: 0,
    pasteCount: 0,
    pastedCharCount: 0,
  });

  const addLog = useCallback((type: LogEvent['type'], message: string) => {
    const newLog: LogEvent = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      message,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setLogs((prev) => [newLog, ...prev].slice(0, 15));
  }, []);

  const resetSession = useCallback(() => {
    statsRef.current = {
      lastKeyTime: null,
      intervals: [],
      pauseCount: 0,
      deletionCount: 0,
      pasteCount: 0,
      pastedCharCount: 0,
    };
    setText('');
    setWordCount(0);
    setCharCount(0);
    setConfidence(100);
    setLogs([]);
    setStatusText('Workspace cleared.');
    addLog('system', 'Behavior analysis restarted.');
  }, [addLog]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    if (newText.length === 0) {
      resetSession();
      return;
    }
    setCharCount(newText.length);
    setWordCount(newText.trim() === '' ? 0 : newText.trim().split(/\s+/).length);
    const newConfidence = calculateAuthenticityScore(statsRef.current, confidence);
    setConfidence(newConfidence);
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const now = Date.now();
    const stats = statsRef.current;
    if (e.key === 'Backspace' || e.key === 'Delete') {
      stats.deletionCount++;
      addLog('deletion', 'Modification detected.');
    }
    if (stats.lastKeyTime) {
      const diff = now - stats.lastKeyTime;
      stats.intervals.push(diff);
      if (diff > 2500) {
        stats.pauseCount++;
        addLog('timing', `Pause: ${(diff/1000).toFixed(1)}s`);
      }
    }
    stats.lastKeyTime = now;
  }, [addLog]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const stats = statsRef.current;
    const pastedText = e.clipboardData.getData('text');
    stats.pasteCount++;
    stats.pastedCharCount += pastedText.length;
    addLog('paste', `Pasted ${pastedText.length} characters.`);
    const newConfidence = calculateAuthenticityScore(statsRef.current, confidence);
    setConfidence(newConfidence);
  }, [addLog, confidence]);

  const handleExport = async () => {
    setIsGenerating(true);
    setStatusText('Preparing Certificate...');
    await generateAuthorshipPDF(statsRef.current, logs, confidence, wordCount);
    setIsGenerating(false);
    setStatusText('Secure Session Active');
  };

  const handleAnalyzeClick = () => {
    setHighlightConfidence(true);
    setTimeout(() => setHighlightConfidence(false), 2000);
    const sidebar = document.querySelector('.sidebar-section');
    if (sidebar) {
      sidebar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    addLog('system', 'Manual analysis triggered.');
  };

  return (
    <>
      <header className="app-header">
        <div className="logo-section" onClick={() => setActiveTab('lab')}>
          <img src="/logo.png" alt="VN Logo" />
          <span className="logo-text">ViNote<b>s</b></span>
        </div>

        <div className="search-container-udemy">
          <Search className="search-icon-udemy" size={18} />
          <input className="search-input-udemy" type="text" placeholder="Search report data..." />
        </div>

        <nav className="header-main-nav">
          <span className={`nav-link ${activeTab === 'lab' ? 'active' : ''}`} onClick={() => setActiveTab('lab')}>
            Writing Lab
          </span>
          <span className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            My Reports
          </span>
        </nav>

        <div className="header-actions-udemy">
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle DarkMode">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          
          <div className="icon-wrapper-udemy">
            <Bell size={20} />
          </div>

          {user ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <div 
                className="user-badge-udemy" 
                title="Profile" 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                {user.name.substring(0, 2).toUpperCase()}
              </div>
              {isProfileOpen && (
                <div className="profile-dropdown">
                  <div className="dropdown-header">
                    <b>{user.name}</b>
                    <span>{user.email}</span>
                  </div>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item" onClick={() => { setStatusText('Profile coming soon...'); setIsProfileOpen(false); }}>Manage Profile</button>
                  <button className="dropdown-item" onClick={() => { setActiveTab('reports'); setIsProfileOpen(false); }}>My Reports</button>
                  <button className="dropdown-item" onClick={() => { setStatusText('Settings coming soon...'); setIsProfileOpen(false); }}>Workspace Settings</button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item logout" onClick={() => { handleLogout(); setIsProfileOpen(false); }}>Logout</button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-outline btn-sm" onClick={() => { setActiveTab('auth'); setAuthMode('login'); }}>Log in</button>
              <button className="btn btn-primary btn-sm" onClick={() => { setActiveTab('auth'); setAuthMode('register'); }}>Sign up</button>
            </div>
          )}
        </div>
      </header>

      <main className="main-wrapper">
        {activeTab === 'auth' && !user ? (
          <div className="auth-container">
            <h2>{authMode === 'login' ? 'Login to your account' : 'Sign up and start writing'}</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleAuth}>
              {authMode === 'register' && (
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" required placeholder="John Doe" value={authForm.name} onChange={(e) => setAuthForm({...authForm, name: e.target.value})} />
                </div>
              )}
              <div className="form-group">
                <label>Email</label>
                <input type="email" required placeholder="email@example.com" value={authForm.email} onChange={(e) => setAuthForm({...authForm, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" required placeholder="********" value={authForm.password} onChange={(e) => setAuthForm({...authForm, password: e.target.value})} />
              </div>
              <button className="btn btn-primary btn-full" type="submit">
                {authMode === 'login' ? 'Login' : 'Create Account'}
              </button>
            </form>
            <button className="btn-link" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
              {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Login'}
            </button>
          </div>
        ) : activeTab === 'lab' ? (
          <>
            <section className="hero-section">
              <h1>Verification Environment</h1>
              <p>Analyze writing behavior in real-time to generate your Human Authorship Certificate.</p>
            </section>

            <div className="editor-layout">
              <div className="editor-main">
                <div className="editor-card">
                  <div className="editor-card-header">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Monitor size={16} /> Writing Workspace
                    </h2>
                    <div className="editor-toolbar">
                      <button onClick={resetSession} className="toolbar-btn" title="Clear All Workspace content">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <textarea
                    placeholder="Start typing your content here. Our behavioral engine analyzes rhythmic variance, cognitive pauses, and revision patterns to verify human authorship."
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onChange={handleTextChange}
                    value={text}
                  />
                  <div className="editor-footer">
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                      <span><b>{wordCount}</b> Words</span>
                      <span><b>{charCount}</b> Characters</span>
                      <span style={{ marginLeft: '12px', fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600 }}>
                        <Activity size={12} style={{ marginRight: '4px' }} /> {statusText}
                      </span>
                    </div>
                    <div className="editor-actions">
                      <button className="btn btn-outline btn-sm" onClick={handleAnalyzeClick}>
                        <Play size={16} /> Analyze Behavior
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={handleExport} disabled={isGenerating}>
                        <Download size={16} /> {isGenerating ? 'Generating...' : 'Get Certificate'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="sidebar-section">
                <div className={`card ${highlightConfidence ? 'highlighted' : ''}`}>
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldCheck size={20} className="icon" color="var(--primary-color)" /> Authorship Status
                  </h3>
                  <div className="confidence-meter">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Human Confidence</span>
                      <span style={{ fontWeight: 700, color: confidence > 70 ? 'var(--primary-color)' : '#e74c3c' }}>{confidence}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${confidence}%`, background: confidence > 70 ? 'var(--primary-color)' : '#e74c3c' }} />
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={14} /> <b>{statsRef.current.intervals.length}</b> rhythmic data points.
                    </p>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    A high score confirms content was generated iteratively by a human, rather than being pasted or synthetically generated.
                  </p>
                </div>

                <div className="card">
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Clock size={20} className="icon" /> Behavioral Logs
                  </h3>
                  <div className="log-container">
                    {logs.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Waiting for interaction...
                      </div>
                    ) : (
                      logs.map((log) => (
                        <div key={log.id} className="log-entry">
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="log-type" style={{ color: log.type === 'paste' ? '#e74c3c' : 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {log.type === 'paste' ? <ShieldAlert size={12} /> : <Activity size={12} />} {log.type}
                            </span>
                            <span className="log-time">{log.timestamp}</span>
                          </div>
                          <span className="log-message">{log.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </>
        ) : (
          <div className="reports-view">
             <section className="hero-section">
              <h1>Authorship Reports</h1>
              <p>View your previously generated certificates and authorship analytics.</p>
            </section>
            <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
              <FileText size={64} style={{ marginBottom: '16px', color: 'var(--border-color)' }} />
              <h3>No Reports Found</h3>
              <p style={{ color: 'var(--text-secondary)' }}>You haven't generated any authorship certificates yet.</p>
              <button className="btn btn-primary" style={{ marginTop: '24px' }} onClick={() => setActiveTab('lab')}>Start Writing</button>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-inner-udemy">
          <div className="footer-branding-udemy">
            <div className="footer-brand-logo">ViNote<b>s</b></div>
            <span className="footer-copyright-udemy">© 2024 Vi-Notes, Inc.</span>
          </div>
          <div className="footer-links-udemy">
            <a href="#" className="footer-link-udemy" onClick={() => setStatusText('Settings coming soon...')}>Cookie settings</a>
            <a href="#" className="footer-link-udemy" onClick={() => setStatusText('Contact form coming soon...')}>Contact Us</a>
          </div>
          <div className="language-selector-udemy">
            <button className="language-btn-udemy">
              <Globe size={18} />
              <span>English</span>
            </button>
          </div>
        </div>
      </footer>
    </>
  );
};

export default App;
