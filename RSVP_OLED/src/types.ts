export type AppState = 'HOME' | 'READER' | 'SETTINGS' | 'BOOKS';

export interface Book {
  id: string;
  title: string;
  content: string;
}

export interface Settings {
  wpm: number;
  fontSize: 'small' | 'medium' | 'large';
  showPivot: boolean;
  theme: 'white' | 'amber' | 'green';
}

export interface ReaderState {
  currentBookId: string | null;
  currentWordIndex: number;
  isPlaying: boolean;
  autoplayLocked: boolean;
  stopAtSentenceEnd: boolean;
}
