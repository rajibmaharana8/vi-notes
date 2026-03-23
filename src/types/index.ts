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
