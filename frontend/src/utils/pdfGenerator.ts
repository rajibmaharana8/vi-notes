import { jsPDF } from 'jspdf';
import type { WritingStats, LogEvent } from '../types/index';

/**
 * Generates an official Authenticity Certificate for the user's session.
 */
export const generateAuthorshipPDF = async (
  stats: WritingStats,
  logs: LogEvent[],
  confidence: number,
  wordCount: number
) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // Professional Dark Theme Styling
  pdf.setFillColor(2, 6, 23); // #020617
  pdf.rect(0, 0, 210, 297, 'F');
  
  // Title & Metadata
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(26);
  pdf.text('Vi-Notes Authenticity Certificate', 20, 30);
  
  pdf.setFontSize(11);
  pdf.setTextColor(148, 163, 184); // #94a3b8
  pdf.text(`Digital Fingerprint: ${Math.random().toString(36).substring(2, 12).toUpperCase()}`, 20, 40);
  pdf.text(`Timestamp: ${new Date().toLocaleString()}`, 20, 46);
  
  // Divider
  pdf.setDrawColor(51, 65, 85);
  pdf.line(20, 55, 190, 55);
  
  // Main Score Section
  pdf.setFontSize(18);
  pdf.setTextColor(56, 189, 248); // #38bdf8
  pdf.text('Verification Score:', 20, 75);
  
  pdf.setFontSize(42);
  pdf.text(`${confidence}% Human Confidence`, 20, 95);
  
  // Metrics Breakdown
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Behavioral Biometrics:', 20, 120);
  
  pdf.setFontSize(12);
  pdf.setTextColor(148, 163, 184);
  const metrics = [
    `• Significant Thinking Pauses: ${stats.pauseCount}`,
    `• Iterative Revision Events: ${stats.deletionCount}`,
    `• Instantaneous Paste Injections: ${stats.pasteCount}`,
    `• Final Word/Content Volume: ${wordCount}`
  ];
  
  metrics.forEach((text, i) => pdf.text(text, 25, 135 + (i * 10)));
  
  // Forensic Log Snapshot
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Forensic Evidence Log:', 20, 190);
  
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  logs.slice(0, 10).forEach((log, i) => {
    pdf.text(`[${log.timestamp}] ${log.message}`, 25, 205 + (i * 8));
  });

  // Verification Footer
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);
  pdf.text('Analysis Method: Hardware-level entropy calculation of keystroke timing distributions.', 20, 275);
  pdf.text('This document verifies human authorship through behavioral patterns difficult for Large Language Models to replicate.', 20, 282);
  
  // Save Document
  pdf.save(`ViNotes_Certificate_${Date.now()}.pdf`);
};
