import type { WritingStats } from '../types/index';

/**
 * Core Analysis Engine for Vi-Notes.
 * This determines the 'Human Confidence Score' based on:
 * 1. Revision frequency (deletions)
 * 2. Thinking pauses (significant intervals)
 * 3. Input rhythm (variance in keystroke timings)
 * 4. Paste frequency (penalty)
 */
export const calculateAuthenticityScore = (
  stats: WritingStats,
  _currentScore: number // Prefix with underscore as it is intentionally unused for this heuristic
): number => {
  let score = 85; // Starting base level

  // 1. Reward Revision: Humans fix things.
  score += Math.min(10, stats.deletionCount * 2);

  // 2. Reward Thinking: Significant thinking pauses.
  score += Math.min(5, stats.pauseCount * 2);

  // 3. Reward Volume: Consistency in manual input.
  if (stats.intervals.length > 50) score += 5;

  // 4. Penalize Pasting: Large chunks are suspicious.
  score -= (stats.pasteCount * 25);
  if (stats.pastedCharCount > 20) score -= 30;

  // 5. Check Timing Variance (Rhythm):
  if (stats.intervals.length > 15) {
    const sum = stats.intervals.reduce((a, b) => a + b, 0);
    const avg = sum / stats.intervals.length;
    
    // Variance calculation
    const variance = stats.intervals
      .map(x => Math.pow(x - avg, 2))
      .reduce((a, b) => a + b, 0) / stats.intervals.length;
    
    // Extremely low variance usually indicates simulated input (bots).
    if (variance < 80) {
      score -= 20;
    } else if (variance > 500) {
      // Natural jitter in human typing boosts confidence.
      score += 5;
    }
  }

  // Ensure result stays within 0-100%
  return Math.max(0, Math.min(100, score));
};
