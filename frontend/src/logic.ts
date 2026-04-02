import { jsPDF } from 'jspdf';

export type LogType = 'paste' | 'timing' | 'deletion' | 'system';

export interface LogEvent {
  id: string;
  type: LogType;
  message: string;
  timestamp: string;
}

export interface WritingStats {
  lastKeyTime: number | null;
  intervals: number[];
  pauseCount: number;
  deletionCount: number;
  pasteCount: number;
  pastedCharCount: number;
}

export const calculateAuthenticityScore = (stats: WritingStats): number => {
  const { intervals, pastedCharCount, deletionCount, pauseCount, pasteCount } = stats;
  
  const typedCount = intervals.length;
  const totalChars = typedCount + pastedCharCount;

  if (totalChars === 0) return 100;

  // Base Score
  const humanRatio = typedCount / totalChars;
  let score = humanRatio * 85; 

  // Rhythm and Variance Analysis
  if (typedCount >= 5) {
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / typedCount;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / typedCount;

    // Consistency check
    if (variance < 60) {
      score -= 20;
    } else if (variance > 250) {
      score += 15;
    }
  }

  //Bonuses
  const revisionBonus = Math.min(15, deletionCount * 4);
  const thinkingBonus = Math.min(10, pauseCount * 5);
  score += revisionBonus + thinkingBonus;


  if (pasteCount > 0) {
    const pastePenalty = (pasteCount * 20) * (1 - humanRatio);
    score -= pastePenalty;
  }
  
  if (pastedCharCount > totalChars * 0.4) {
    const magnitudePenalty = 30 * (1 - humanRatio);
    score -= magnitudePenalty;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

export const generateAuthorshipPDF = async (
  stats: WritingStats,
  logs: LogEvent[],
  confidence: number,
  wordCount: number
) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // Document styles
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, 0, 210, 297, 'F');
  
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(24);
  pdf.text('Authorship Certificate', 25, 30);
  
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`ID: ${Math.random().toString(36).substring(7).toUpperCase()}`, 25, 38);
  pdf.text(`Date: ${new Date().toLocaleString()}`, 25, 43);
  
  pdf.setDrawColor(226, 232, 240);
  pdf.line(25, 52, 185, 52);
  
  // Scoring section
  pdf.setFontSize(14);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Confidence Score:', 25, 70);
  
  pdf.setFontSize(36);
  pdf.setTextColor(99, 102, 241);
  pdf.text(`${confidence}% Human Confidence`, 25, 85);
  
  // Metrics grid
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Behavioral Metrics:', 25, 110);
  
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  const metrics = [
    `• Pause Count: ${stats.pauseCount}`,
    `• Revision Count: ${stats.deletionCount}`,
    `• Paste Events: ${stats.pasteCount}`,
    `• Word Count: ${wordCount}`
  ];
  
  metrics.forEach((text, i) => pdf.text(text, 25, 120 + (i * 8)));
  
  // Recent activity log
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Activity Insight:', 25, 165);
  
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  logs.slice(0, 8).forEach((log, i) => {
    pdf.text(`[${log.timestamp}] ${log.message}`, 25, 175 + (i * 7));
  });

  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text('This document verifies human authorship by analyzing typing rhythm and behavioral patterns.', 25, 275);
  
  pdf.save(`ViNotes_Certificate_${Date.now()}.pdf`);
};
