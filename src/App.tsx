import React, { useState, useCallback, useRef } from 'react';
import type { LogEvent, WritingStats } from './types/index';
import { generateAuthorshipPDF } from './utils/pdfGenerator';
import { calculateAuthenticityScore } from './utils/analysisEngine';
import './index.css';

const App: React.FC = () => {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [confidence, setConfidence] = useState(100);
  const [statusText, setStatusText] = useState('• SECURE SESSION ACTIVE');
  const [isGenerating, setIsGenerating] = useState(false);

  // Core behavioral data storage (Persists across re-renders)
  const statsRef = useRef<WritingStats>({
    lastKeyTime: null,
    intervals: [],
    pauseCount: 0,
    deletionCount: 0,
    pasteCount: 0,
    pastedCharCount: 0,
  });

  /**
   * Logs behavioral events for forensic verification.
   */
  const addLog = useCallback((type: LogEvent['type'], message: string) => {
    const newLog: LogEvent = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      message,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setLogs((prev) => [newLog, ...prev].slice(0, 12));
  }, []);

  /**
   * Resets all session data when the editor is cleared manually.
   */
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
    addLog('system', 'Session reset. Behavior analysis restarted.');
  }, [addLog]);

  /**
   * Primary input change handler for content statistics.
   */
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    
    // Auto-reset stats if the user manually clears the text box
    if (text.length === 0) {
      resetSession();
      setCharCount(0);
      setWordCount(0);
      return;
    }

    setCharCount(text.length);
    setWordCount(text.trim() === '' ? 0 : text.trim().split(/\s+/).length);
    
    // Immediate Re-Analysis
    const newConfidence = calculateAuthenticityScore(statsRef.current, confidence);
    setConfidence(newConfidence);
  };

  /**
   * Low-level event listener for keystroke behaviors.
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const now = Date.now();
    const stats = statsRef.current;
    
    // Capture Iterative Revisions
    if (e.key === 'Backspace' || e.key === 'Delete') {
      stats.deletionCount++;
      addLog('deletion', 'Revision behavior detected.');
    }

    // Capture Inter-Key Intervals
    if (stats.lastKeyTime) {
      const diff = now - stats.lastKeyTime;
      stats.intervals.push(diff);
      
      // Capture Significant Cognitive Thinking Pauses
      if (diff > 2500) {
        stats.pauseCount++;
        addLog('timing', `Thinking pause: ${(diff/1000).toFixed(1)}s`);
      }
    }
    
    stats.lastKeyTime = now;
  }, [addLog]);

  /**
   * Detects non-sequential content injection.
   */
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const stats = statsRef.current;
    const pastedText = e.clipboardData.getData('text');
    
    stats.pasteCount++;
    stats.pastedCharCount += pastedText.length;
    
    addLog('paste', `BLOCK INSERTED: ${pastedText.length} chars.`);
    
    const newConfidence = calculateAuthenticityScore(statsRef.current, confidence);
    setConfidence(newConfidence);
  }, [addLog, confidence]);

  /**
   * Official Certificate Export
   */
  const handleExport = async () => {
    setIsGenerating(true);
    setStatusText('• PREPARING CERTIFICATE...');
    
    await generateAuthorshipPDF(statsRef.current, logs, confidence, wordCount);
    
    setIsGenerating(false);
    setStatusText('• SECURE SESSION ACTIVE');
  };

  return (
    <>
      <header className="app-header glass">
        <div className="logo">
          <div className="logo-icon">V</div>
          <span>ViNote<b>s</b></span>
        </div>
        <nav>
          <ul className="nav-links">
            <li><a href="#" className="active">Writing Lab</a></li>
            <li><a href="#">Analysis</a></li>
            <li><a href="#">Privacy</a></li>
          </ul>
        </nav>
        <button className="btn-primary" onClick={handleExport} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Download Certificate'}
        </button>
      </header>

      <main className="main-wrapper">
        <div className="editor-layout">
          <div className="editor-section">
            <div className="editor-card glass">
              <textarea
                placeholder="Type naturally. Every pause and rhythmic variance builds your unique 'Human Signature'."
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onChange={handleTextChange}
              />
              <div className="editor-toolbar">
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="stat-badge"><span>{wordCount}</span> Words</div>
                  <div className="stat-badge"><span>{charCount}</span> Characters</div>
                </div>
                <div style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 600 }}>{statusText}</div>
              </div>
            </div>
          </div>

          <aside className="sidebar-section">
            <div className="sidebar-card glass">
              <h3 className="card-title">Authenticity Shield</h3>
              <div style={{ padding: '0.5rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Confidence</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: confidence > 70 ? '#38bdf8' : '#fb7185' }}>{confidence}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${confidence}%`, height: '100%', background: confidence > 70 ? 'linear-gradient(to right, #38bdf8, #818cf8)' : '#fb7185', transition: 'width 0.4s ease-out' }} />
                </div>
                <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1rem', lineHeight: 1.4 }}>
                  Biological fingerprint: <b>{statsRef.current.intervals.length} signals</b> captured.
                </p>
                <button 
                  onClick={resetSession}
                  style={{ background: 'transparent', border: '1px solid #334155', borderRadius: '4px', color: '#64748b', fontSize: '0.65rem', padding: '0.25rem 0.5rem', marginTop: '1rem', cursor: 'pointer' }}>
                  Reset Session Data
                </button>
              </div>
            </div>

            <div className="sidebar-card glass">
              <h3 className="card-title">Behavior Logs</h3>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {logs.length === 0 ? <p style={{ color: '#475569', fontSize: '0.8rem' }}>Monitoring signals...</p> : 
                  logs.map((log) => (
                    <div key={log.id} className={`log-entry ${log.type}`}>
                      <span style={{ opacity: 0.5 }}>{log.timestamp}</span> {log.message}
                    </div>
                  ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="app-footer"><p className="copyright">© 2024 Vi-Notes. Official Prototype for Human Content Verification.</p></footer>
    </>
  );
};

export default App;
