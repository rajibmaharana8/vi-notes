import type { WritingStats } from '../types/index';

/**
 * Advanced Dynamic Analysis Engine for Vi-Notes.
 * Implements a 'Dilution and Recovery' model where human behavior (typing) 
 * can eventually overcome penalties from suspicious behavior (pasting).
 */
export const calculateAuthenticityScore = (
  stats: WritingStats,
  _currentScore: number 
): number => {
  const manualTypedCount = stats.intervals.length;
  const totalVolume = manualTypedCount + stats.pastedCharCount;

  // Default to 100 if no data yet
  if (totalVolume === 0) return 100;

  /**
   * 1. HUMAN RATIO (Base Confidence)
   * This is the strongest signal. Every manual character 'dilutes' previous pasted content.
   */
  const humanRatio = manualTypedCount / totalVolume;
  let score = humanRatio * 90; // Up to 90% purely from manual vs. pasted ratio

  /**
   * 2. BEHAVIOR BONUSES (Recovery Mechanism)
   * Humans fix mistakes and think. These behaviors prove human presence 
   * and allow a score to climb back even after pasting.
   */
  const revisionBonus = Math.min(10, stats.deletionCount * 3);
  const thinkingBonus = Math.min(10, stats.pauseCount * 4);
  score += (revisionBonus + thinkingBonus);

  /**
   * 3. RHYTHM & VARIANCE
   * Typing rhythm (variance) adds a final layer of confidence.
   */
  if (manualTypedCount > 15) {
    const sum = stats.intervals.reduce((a, b) => a + b, 0);
    const avg = sum / manualTypedCount;
    
    const variance = stats.intervals
      .map(x => Math.pow(x - avg, 2))
      .reduce((a, b) => a + b, 0) / manualTypedCount;
    
    // Extremely low variance usually indicates bots. 
    // Human variance is usually > 150.
    if (variance < 70) {
      score -= 25; // Drastic penalty for bot-like consistency
    } else if (variance > 450) {
      score += 5; // Reward for natural human jitter
    }
  }

  /**
   * 4. PASTE EVENT PENALTY
   * Small penalty for the 'act' of pasting, regardless of size.
   */
  score -= (stats.pasteCount * 8);

  // Ensure result stays within 0-100%
  return Math.max(0, Math.min(100, Math.round(score)));
};
