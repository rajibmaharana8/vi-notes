import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { LogEvent, WritingStats } from './types/index';
import { generateAuthorshipPDF } from './utils/pdfGenerator';
import { calculateAuthenticityScore } from './utils/analysisEngine';
import './index.css';

const App: React.FC = () => {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [confidence, setConfidence] = useState(100);
  const [statusText, setStatusText] = useState('• Secure Session Active');
  const [isGenerating, setIsGenerating] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<'lab' | 'reports'>('lab');
  const [highlightConfidence, setHighlightConfidence] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
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
    setConfidence(100);
    setLogs([]);
    addLog('system', 'Behavior analysis restarted.');
  }, [addLog]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length === 0) {
      resetSession();
      setCharCount(0);
      setWordCount(0);
      return;
    }
    setCharCount(text.length);
    setWordCount(text.trim() === '' ? 0 : text.trim().split(/\s+/).length);
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
    setStatusText('• Preparing Certificate...');
    await generateAuthorshipPDF(statsRef.current, logs, confidence, wordCount);
    setIsGenerating(false);
    setStatusText('• Secure Session Active');
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
        <div className="logo" onClick={() => setActiveTab('lab')}>
          <img src="/logo.png" alt="VN Logo" style={{ borderRadius: '4px' }} />
          <span className="logo-text">ViNote<b>s</b></span>
        </div>
        
        <div className="search-bar-placeholder">
          <span style={{ marginRight: '8px' }}>🔍</span> Search for reports or authors...
        </div>

        <nav>
          <ul className="nav-links">
            <li>
              <a href="#" className={`nav-item ${activeTab === 'lab' ? 'active' : ''}`} onClick={() => setActiveTab('lab')}>
                Writing Lab
              </a>
            </li>
            <li>
              <a href="#" className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
                My Reports
              </a>
            </li>
            <li>
              <a href="#" className="nav-item">Verification Hub</a>
            </li>
          </ul>
        </nav>

        <button className="theme-toggle" onClick={toggleTheme} title="Toggle Dark/Light Mode">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        <div style={{ display: 'flex', gap: '12px', marginLeft: '12px' }}>
          <button className="btn btn-outline" onClick={handleAnalyzeClick}>Analyze Text</button>
          <button className="btn btn-primary" onClick={handleExport} disabled={isGenerating}>
            {isGenerating ? 'Exporting...' : 'Get Certificate'}
          </button>
        </div>
      </header>

      <main className="main-wrapper">
        <section className="hero-section">
          <h1>{activeTab === 'lab' ? 'Verification Environment' : 'Authorship Reports'}</h1>
          <p>{activeTab === 'lab' ? 'Analyze writing behavior in real-time to generate your Human Authorship Certificate.' : 'View your previously generated certificates and authorship analytics.'}</p>
        </section>

        {activeTab === 'lab' ? (
          <div className="editor-layout">
            <div className="editor-main">
              <div className="editor-card">
                <div className="editor-card-header">
                  <h2>Writing Workspace</h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={resetSession} className="btn btn-outline" style={{ height: '32px', fontSize: '0.8rem' }}>Clear All</button>
                  </div>
                </div>
                <textarea
                  placeholder="Start typing your content here. Our behavioral engine analyzes rhythmic variance, cognitive pauses, and revision patterns to verify human authorship."
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  onChange={handleTextChange}
                />
                <div className="editor-footer">
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span><b>{wordCount}</b> Words</span>
                    <span><b>{charCount}</b> Characters</span>
                  </div>
                  <div>{statusText}</div>
                </div>
              </div>
            </div>

            <aside className="sidebar-section">
              <div className={`card ${highlightConfidence ? 'highlighted' : ''}`}>
                <h3 className="card-title">Authorship Status</h3>
                <div className="confidence-meter">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Human Confidence</span>
                    <span style={{ fontWeight: 700, color: confidence > 70 ? 'var(--primary-color)' : '#e74c3c' }}>{confidence}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${confidence}%`, background: confidence > 70 ? 'var(--primary-color)' : '#e74c3c' }} />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '16px' }}>
                    Behavioral fingerprint: <b>{statsRef.current.intervals.length} rhythmic data points</b> collected.
                  </p>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  A high score confirms content was generated iteratively by a human, rather than being pasted or synthetically generated.
                </p>
              </div>

              <div className="card">
                <h3 className="card-title">Live Behavioral Logs</h3>
                <div className="log-container">
                  {logs.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Waiting for interaction...
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="log-entry">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span className="log-type" style={{ color: log.type === 'paste' ? '#e74c3c' : 'var(--primary-color)' }}>
                            {log.type}
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
        ) : (
          <div className="reports-view">
            <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📄</div>
              <h3>No Reports Found</h3>
              <p style={{ color: 'var(--text-secondary)' }}>You haven't generated any authorship certificates yet.</p>
              <button className="btn btn-primary" style={{ marginTop: '24px' }} onClick={() => setActiveTab('lab')}>Start Writing</button>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-logo">ViNote<b>s</b></div>
          <p className="copyright">© 2024 Vi-Notes, Inc. All rights reserved. Intellectual Property Verification Platform.</p>
          <div style={{ display: 'flex', gap: '24px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Help Center</a>
          </div>
        </div>
      </footer>
    </>
  );
};

export default App;
