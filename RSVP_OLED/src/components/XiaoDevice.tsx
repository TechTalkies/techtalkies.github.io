import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Power, Settings as SettingsIcon, BookOpen, ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Upload, FileUp, Download } from 'lucide-react';
import { AppState, Book, Settings, ReaderState } from '../types';
import { processText, WordInfo } from '../utils/rsvp';
import JSZip from 'jszip';

const DEFAULT_SETTINGS: Settings = {
  wpm: 300,
  fontSize: 'medium',
  showPivot: true,
  theme: 'white',
};

const SAMPLE_BOOK: Book = {
  id: '1',
  title: 'Welcome',
  content: 'Welcome to Xiao RSVP Nano. This is a speed reading port inspired by rsvpnano. Use the buttons to navigate. Select a book from the menu and start reading at high speeds. Happy reading!',
};

export default function XiaoDevice() {
  const [appState, setAppState] = useState<AppState>('HOME');
  const [books, setBooks] = useState<Book[]>([SAMPLE_BOOK]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [readerState, setReaderState] = useState<ReaderState>({
    currentBookId: null,
    currentWordIndex: 0,
    isPlaying: false,
    autoplayLocked: false,
    stopAtSentenceEnd: false,
  });
  
  const [menuIndex, setMenuIndex] = useState(0);
  const [words, setWords] = useState<WordInfo[]>([]);
  const [isHoldingSelect, setIsHoldingSelect] = useState(false);
  const [isHoldingLeft, setIsHoldingLeft] = useState(false);
  const [isHoldingRight, setIsHoldingRight] = useState(false);
  const [lastActionTime, setLastActionTime] = useState(0);

  // Helper: Find start of current sentence
  const findSentenceStart = (index: number) => {
    for (let i = index - 1; i >= 0; i--) {
      if (words[i].word.match(/[.!?]$/)) return i + 1;
    }
    return 0;
  };

  const findPreviousSentenceStart = (index: number) => {
    const startOfCurrent = findSentenceStart(index);
    if (index > startOfCurrent) return startOfCurrent;
    return findSentenceStart(startOfCurrent - 1);
  };

  const isEndOfSentence = (index: number) => {
    return words[index]?.word.match(/[.!?]$/);
  };

  // Keyboard mapping for buttons
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft') handleButtonAction('LEFT', 'DOWN');
      if (e.key === 'ArrowRight') handleButtonAction('RIGHT', 'DOWN');
      if (e.key === 'Enter' || e.key === ' ') handleButtonAction('SELECT', 'DOWN');
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleButtonAction('LEFT', 'UP');
      if (e.key === 'ArrowRight') handleButtonAction('RIGHT', 'UP');
      if (e.key === 'Enter' || e.key === ' ') handleButtonAction('SELECT', 'UP');
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [appState, menuIndex, readerState, words, settings]);

  // Reader Loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (readerState.isPlaying && words.length > 0 && readerState.currentWordIndex < words.length - 1) {
      const currentWord = words[readerState.currentWordIndex];
      const baseDelay = (60 * 1000) / settings.wpm;
      const delay = baseDelay * (currentWord?.delayFactor || 1);
      
      timer = setTimeout(() => {
        const finishedSentence = isEndOfSentence(readerState.currentWordIndex);
        
        setReaderState(prev => {
          const nextIndex = prev.currentWordIndex + 1;
          const shouldStop = prev.stopAtSentenceEnd && finishedSentence;
          
          return { 
            ...prev, 
            currentWordIndex: nextIndex,
            isPlaying: shouldStop ? false : prev.isPlaying,
            autoplayLocked: shouldStop ? false : prev.autoplayLocked,
            stopAtSentenceEnd: shouldStop ? false : prev.stopAtSentenceEnd
          };
        });
      }, delay);
    } else if (readerState.currentWordIndex >= words.length - 1) {
      setReaderState(prev => ({ ...prev, isPlaying: false, autoplayLocked: false }));
    }
    return () => clearTimeout(timer);
  }, [readerState.isPlaying, readerState.currentWordIndex, words, settings.wpm, readerState.stopAtSentenceEnd]);

  // Scrubbing / Hold timers
  useEffect(() => {
    let scrubTimer: NodeJS.Timeout;
    const interval = 80;

    if (appState === 'READER' && !readerState.isPlaying) {
      if (isHoldingLeft && !isHoldingSelect) {
        scrubTimer = setInterval(() => {
          setReaderState(prev => ({ 
            ...prev, 
            currentWordIndex: Math.max(0, prev.currentWordIndex - 1) 
          }));
        }, interval);
      } else if (isHoldingRight && !isHoldingSelect) {
        scrubTimer = setInterval(() => {
          setReaderState(prev => ({ 
            ...prev, 
            currentWordIndex: Math.min(words.length - 1, prev.currentWordIndex + 1) 
          }));
        }, interval);
      }
    }
    return () => clearInterval(scrubTimer);
  }, [appState, readerState.isPlaying, isHoldingLeft, isHoldingRight, isHoldingSelect, words.length]);

  const handleButtonAction = (btn: 'LEFT' | 'SELECT' | 'RIGHT', action: 'DOWN' | 'UP' | 'DOUBLE' | 'LONG') => {
    const now = Date.now();
    
    if (appState === 'HOME') {
      if (action === 'DOWN') {
        if (btn === 'LEFT') setMenuIndex(prev => (prev > 0 ? prev - 1 : 3));
        if (btn === 'RIGHT') setMenuIndex(prev => (prev < 3 ? prev + 1 : 0));
        if (btn === 'SELECT') {
          if (menuIndex === 0) { // Resume
            if (readerState.currentBookId) setAppState('READER');
          }
          if (menuIndex === 1) setAppState('BOOKS');
          if (menuIndex === 2) setAppState('SETTINGS');
        }
      }
    } else if (appState === 'BOOKS') {
      if (action === 'DOWN') {
        if (btn === 'LEFT') setMenuIndex(prev => (prev > 0 ? prev - 1 : books.length - 1));
        if (btn === 'RIGHT') setMenuIndex(prev => (prev < books.length - 1 ? prev + 1 : 0));
        if (btn === 'SELECT') {
          const book = books[menuIndex];
          setWords(processText(book.content));
          setReaderState({ 
            currentBookId: book.id, 
            currentWordIndex: 0, 
            isPlaying: false, 
            autoplayLocked: false, 
            stopAtSentenceEnd: false 
          });
          setAppState('READER');
        }
      }
    } else if (appState === 'READER') {
      if (btn === 'SELECT') {
        if (action === 'LONG') {
          setReaderState(prev => ({ ...prev, isPlaying: false, autoplayLocked: false }));
          setAppState('HOME');
          setMenuIndex(0);
        } else if (action === 'DOWN') {
          // Single Click: Play one sentence
          setReaderState(prev => ({ ...prev, isPlaying: true, stopAtSentenceEnd: true, autoplayLocked: false }));
        } else if (action === 'DOUBLE') {
          // Double Click: Lock continuous play
          setReaderState(prev => ({ ...prev, isPlaying: true, autoplayLocked: true, stopAtSentenceEnd: false }));
        }
      }

      if (btn === 'LEFT' && action === 'DOWN') {
        if (readerState.isPlaying) {
          setSettings(prev => ({ ...prev, wpm: Math.max(50, prev.wpm - 25) }));
        } else {
          setReaderState(prev => ({ 
            ...prev, 
            currentWordIndex: Math.max(0, prev.currentWordIndex - 1) 
          }));
        }
      }

      if (btn === 'RIGHT' && action === 'DOWN') {
        if (readerState.isPlaying) {
          setSettings(prev => ({ ...prev, wpm: Math.min(1000, prev.wpm + 25) }));
        } else {
          setReaderState(prev => ({ 
            ...prev, 
            currentWordIndex: Math.min(words.length - 1, prev.currentWordIndex + 1) 
          }));
        }
      }
    } else if (appState === 'SETTINGS') {
      if (action === 'DOWN') {
        if (btn === 'LEFT') setSettings(prev => ({ ...prev, wpm: Math.max(100, prev.wpm - 50) }));
        if (btn === 'RIGHT') setSettings(prev => ({ ...prev, wpm: Math.min(1000, prev.wpm + 50) }));
        if (btn === 'SELECT') setAppState('HOME');
      }
    }
  };

  const handleBack = () => {
    if (appState === 'READER') {
      setReaderState(prev => ({ ...prev, isPlaying: false, autoplayLocked: false }));
      setAppState('BOOKS');
    } else {
      setAppState('HOME');
    }
  };

  const addCustomBook = (title: string, content: string) => {
    const newBook: Book = { id: Date.now().toString(), title, content };
    setBooks(prev => [...prev, newBook]);
  };

  const handleEpubUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const zip = new JSZip();
    try {
      const contents = await zip.loadAsync(file);
      let fullText = '';
      
      // Look for html/xhtml files in the epub zip
      const htmlFiles = Object.keys(contents.files).filter(name => name.endsWith('.html') || name.endsWith('.xhtml'));
      
      // Sort them to keep reading order (roughly)
      htmlFiles.sort();

      for (const fileName of htmlFiles) {
        const text = await contents.files[fileName].async('text');
        // Simple HTML strip
        const doc = new DOMParser().parseFromString(text, 'text/html');
        fullText += (doc.body.textContent || '') + '\n';
      }

      const cleanText = fullText.replace(/\s+/g, ' ').trim();
      if (cleanText) {
        addCustomBook(file.name.replace('.epub', ''), cleanText);
      }
    } catch (err) {
      console.error('Failed to parse EPUB:', err);
      alert('Failed to parse EPUB. Please try a different file.');
    }
  };

  const downloadRsvpFile = (book: Book) => {
    const wordInfos = processText(book.content);
    const WORD_INFO_SIZE = 34; // 32 (char word) + 1 (pivotIndex) + 1 (delayFactorFixed)
    const buffer = new ArrayBuffer(wordInfos.length * WORD_INFO_SIZE);
    const view = new DataView(buffer);
    const uint8View = new Uint8Array(buffer);

    wordInfos.forEach((info, i) => {
      const offset = i * WORD_INFO_SIZE;
      
      // 1. Write the word (up to 31 chars + null terminator)
      const encoder = new TextEncoder();
      const encodedWord = encoder.encode(info.word.substring(0, 31));
      uint8View.set(encodedWord, offset);
      // Ensure null termination (though ArrayBuffer is zeroed)
      uint8View[offset + 31] = 0;

      // 2. Write pivotIndex
      view.setUint8(offset + 32, info.pivotIndex);

      // 3. Write delayFactorFixed (delayFactor * 10)
      view.setUint8(offset + 33, Math.round(info.delayFactor * 10));
    });

    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title.replace(/\s+/g, '_')}.rsvp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center gap-12 p-8">
      {/* The Xiao Device */}
      <div className="relative w-[340px] h-[200px] bg-[#222] rounded-3xl p-6 shadow-2xl border-4 border-[#333] flex items-center justify-center">
        {/* USB-C Port Mockup */}
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-10 bg-[#111] rounded-l-md border-y border-l border-[#444]"></div>
        
        {/* Buttons - Right Side */}
        <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex flex-col gap-4">
          <button 
            onMouseDown={() => handleButtonAction('LEFT', 'DOWN')}
            onMouseUp={() => handleButtonAction('LEFT', 'UP')}
            onMouseLeave={() => handleButtonAction('LEFT', 'UP')}
            className="w-10 h-10 bg-[#333] hover:bg-[#444] rounded-full border-2 border-[#555] active:scale-95 transition-all text-white flex items-center justify-center cursor-pointer shadow-lg"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onMouseDown={() => {
              const timer = setTimeout(() => handleButtonAction('SELECT', 'LONG'), 800);
              (window as any).selectTimer = timer;
              handleButtonAction('SELECT', 'DOWN');
            }}
            onMouseUp={() => {
              clearTimeout((window as any).selectTimer);
              handleButtonAction('SELECT', 'UP');
            }}
            onMouseLeave={() => {
              clearTimeout((window as any).selectTimer);
            }}
            onDoubleClick={() => handleButtonAction('SELECT', 'DOUBLE')}
            className="w-12 h-12 bg-[#333] hover:bg-[#444] rounded-full border-2 border-[#555] active:scale-95 transition-all text-white flex items-center justify-center cursor-pointer shadow-lg"
          >
            <div className={`w-4 h-4 rounded-sm transition-colors ${readerState.isPlaying ? 'bg-green-500' : 'bg-red-500'}`}></div>
          </button>
          <button 
            onMouseDown={() => handleButtonAction('RIGHT', 'DOWN')}
            onMouseUp={() => handleButtonAction('RIGHT', 'UP')}
            onMouseLeave={() => handleButtonAction('RIGHT', 'UP')}
            className="w-10 h-10 bg-[#333] hover:bg-[#444] rounded-full border-2 border-[#555] active:scale-95 transition-all text-white flex items-center justify-center cursor-pointer shadow-lg"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* OLED SCREEN */}
        <div className="relative group">
          {/* Bezel / Glass effect */}
          <div className="absolute -inset-2 bg-[#111] rounded-sm border border-[#333] shadow-inner pointer-events-none z-0"></div>
          
          <div className="w-[128px] h-[64px] scale-[2.5] origin-center oled-screen overflow-hidden flex items-center justify-center relative z-10">
            <AnimatePresence mode="wait">
            {appState === 'HOME' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full p-0 flex flex-col items-stretch"
              >
                <div className="h-[14px] border-b border-white/20 flex justify-between items-center px-1 text-[7px] font-bold">
                  <span>RSVP NANO SD</span>
                  <span>V1.0</span>
                </div>
                <div className="flex flex-col">
                  {[
                    { id: 0, label: 'RESUME', icon: <BookOpen size={6} /> },
                    { id: 1, label: 'EXPLORE SD', icon: <BookOpen size={6} /> },
                    { id: 2, label: 'SETTINGS', icon: <SettingsIcon size={6} /> },
                    { id: 3, label: 'EXIT', icon: <Power size={6} /> }
                  ].map((item) => (
                    <div 
                      key={item.id}
                      className={`h-[12px] px-1 flex items-center text-[7px] font-mono tracking-tight ${menuIndex === item.id ? 'bg-white text-black font-bold' : 'text-white'}`}
                    >
                      <span className="w-2">{menuIndex === item.id ? '>' : ' '}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {appState === 'BOOKS' && (
              <motion.div 
                key="books"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full p-0 flex flex-col items-stretch"
              >
                <div className="h-[14px] border-b border-white/20 flex items-center px-1 text-[7px] font-bold uppercase">
                  Select Book
                </div>
                <div className="flex flex-col">
                  {books.map((book, idx) => (
                    <div 
                      key={book.id}
                      className={`h-[12px] px-1 flex items-center text-[7px] truncate ${menuIndex === idx ? 'bg-white text-black font-bold' : 'text-white'}`}
                    >
                      <span className="w-4 tabular-nums">{idx + 1}.</span>
                      {book.title.toUpperCase()}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {appState === 'READER' && (
              <motion.div 
                key="reader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex flex-col items-center justify-center oled-text p-1 relative"
              >
                {/* Title Line / Header */}
                <div className="absolute top-0 left-0 w-full h-[12px] flex items-center justify-center px-1 border-b border-white/20">
                  <span className="text-[5px] uppercase tracking-widest truncate opacity-80">
                    {books.find(b => b.id === readerState.currentBookId)?.title || 'READER'}
                  </span>
                </div>
                
                {/* Progress Bar (Integrated into header bottom) */}
                <div className="absolute top-[11px] left-0 w-full h-[1px] bg-white/10 z-10">
                  <div 
                    className="h-full bg-white" 
                    style={{ width: `${(readerState.currentWordIndex / Math.max(1, words.length - 1)) * 100}%` }}
                  ></div>
                </div>

                {/* RSVP Core */}
                <div className="relative h-10 w-full mt-2 flex items-center justify-center font-mono">
                  {/* Pivot Markers (ORP Guides) */}
                  {settings.showPivot && (
                    <>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-2 bg-white/80 z-20"></div>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1px] h-2 bg-white/80 z-20"></div>
                    </>
                  )}
                  
                  {words[readerState.currentWordIndex] ? (
                    <div className="flex text-[14px] items-center relative oled-text-active">
                      <span className="text-right oled-dim min-w-[58px] tracking-tighter">{words[readerState.currentWordIndex].prefix}</span>
                      <span className="w-[10px] text-center oled-pivot">{words[readerState.currentWordIndex].pivot}</span>
                      <span className="text-left oled-dim min-w-[58px] tracking-tighter">{words[readerState.currentWordIndex].suffix}</span>
                    </div>
                  ) : (
                    <span className="text-[8px] font-bold">READY</span>
                  )}
                </div>

                {/* Status Bar */}
                <div className="absolute bottom-0 left-0 w-full h-[10px] flex justify-between items-center px-1 text-[4px] opacity-60 border-t border-white/5">
                  <div className="flex gap-2">
                    <span>{Math.round((readerState.currentWordIndex / Math.max(1, words.length - 1)) * 100)}%</span>
                    <span>{settings.wpm} WPM</span>
                  </div>
                  <span>{readerState.autoplayLocked ? 'AUTO' : (readerState.isPlaying ? 'PLAY' : 'PAUSED')}</span>
                </div>
              </motion.div>
            )}

            {appState === 'SETTINGS' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full p-0 flex flex-col items-stretch"
              >
                <div className="h-[14px] border-b border-white/20 flex items-center px-1 text-[7px] font-bold">
                  SETTINGS
                </div>
                <div className="flex-1 flex flex-col justify-center items-center gap-2 p-2">
                  <div className="w-full flex justify-between items-center px-2">
                    <span className="text-[8px]">SPEED:</span>
                    <span className="bg-white text-black px-1 text-[8px] font-bold">{settings.wpm} WPM</span>
                  </div>
                  <div className="mt-2 flex flex-col items-center gap-1">
                    <div className="text-[5px] uppercase tracking-tighter opacity-50">Use Left/Right to adjust</div>
                    <div className="text-[5px] uppercase tracking-tighter opacity-50">Select to save and exit</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Reset/Back Button - Top Side */}
        <button 
          onClick={handleBack}
          className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#333] hover:bg-[#444] text-[10px] rounded-lg border-2 border-[#555] active:scale-95 transition-all text-white flex items-center gap-2 cursor-pointer shadow-lg uppercase tracking-widest font-bold"
        >
          <RotateCcw size={12} />
          Back / Reset
        </button>
      </div>

      {/* External Controls & Info */}
      <div className="w-full max-w-2xl bg-[#1e1e1e] rounded-2xl p-8 border border-white/10 shadow-xl">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <BookOpen className="text-white" />
          Add Your Own Text
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4 p-4 border border-white/5 rounded-xl bg-white/5">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Upload size={18} className="text-blue-400" />
              EPUB Converter
            </h3>
            <p className="text-xs text-gray-400">Convert EPUB books to high-speed .rsvp format for your Xiao.</p>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-all">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileUp className="w-8 h-8 mb-3 text-gray-400" />
                <p className="text-xs text-gray-400">Click to upload EPUB</p>
              </div>
              <input type="file" className="hidden" accept=".epub" onChange={handleEpubUpload} />
            </label>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold">Manual Text</h3>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
              <input 
                id="book-title"
                type="text" 
                placeholder="The Great Gatsby"
                className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Content</label>
              <textarea 
                id="book-content"
                rows={3}
                placeholder="Paste your text here..."
                className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-white/40"
              ></textarea>
            </div>
            <button 
              onClick={() => {
                const title = (document.getElementById('book-title') as HTMLInputElement).value;
                const content = (document.getElementById('book-content') as HTMLTextAreaElement).value;
                if (title && content) {
                  addCustomBook(title, content);
                  (document.getElementById('book-title') as HTMLInputElement).value = '';
                  (document.getElementById('book-content') as HTMLTextAreaElement).value = '';
                }
              }}
              className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-500 transition-colors text-sm"
            >
              ADD TO LIST
            </button>
          </div>
        </div>

        {books.length > 1 && (
          <div className="mb-8 overflow-hidden border border-white/10 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="p-3">Book List</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {books.map(book => (
                  <tr key={book.id}>
                    <td className="p-3 truncate max-w-[200px]">{book.title}</td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => downloadRsvpFile(book)}
                        className="p-2 hover:text-white transition-all text-blue-400 inline-flex items-center gap-1"
                        title="Download as .rsvp"
                      >
                        <Download size={14} />
                        <span className="text-[10px]">SAVE .RSVP</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 grid grid-cols-3 gap-4 text-xs text-gray-500">
          <div className="flex flex-col items-center gap-1">
            <span className="font-bold border border-white/20 px-2 py-1 rounded bg-white/5 text-white">PLAY: L/R</span>
            <span>Adjust WPM</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="font-bold border border-white/20 px-2 py-1 rounded bg-white/5 text-white">PAUSE: L/R</span>
            <span>Previous/Next Word</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="font-bold border border-white/20 px-2 py-1 rounded bg-white/5 text-white">SELECT (LONG)</span>
            <span>Main Menu</span>
          </div>
        </div>

        <hr className="my-8 border-white/10" />

        <div className="prose prose-invert max-w-none text-sm text-gray-400">
          <h3 className="text-white">Hardware & Firmware</h3>
          <p>
            This project includes a production-ready <strong>PlatformIO project</strong> in the <code>/firmware</code> directory. 
            The latest firmware supports <strong>USB Mass Storage</strong>, allowing you to copy files directly to the SD card.
          </p>
          <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg my-4">
            <h4 className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">Firmware Features</h4>
            <ul className="text-[10px] text-blue-200 space-y-1">
              <li>• <strong>USB MSC Mode:</strong> Drag & drop <code>.rsvp</code> files directly</li>
              <li>• Persistence: Auto-saves progress to <code>progress.json</code></li>
              <li>• Support for large files via streamed binary reading</li>
            </ul>
          </div>
          <p>
            To build the physical version, you'll need:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Seeed Studio Xiao ESP32S3 (Sense or Standard)</li>
            <li>SH1106 1.3" or 0.96" OLED Display (I2C)</li>
            <li>3x Momentary Push Buttons</li>
            <li>LiPo Battery (Optional, for portability)</li>
          </ul>
          <p className="mt-4">
            The firmware uses the <strong>U8g2</strong> graphics library for the high-contrast display and the <strong>Button2</strong> 
            library for robust navigation handling on the three digital inputs.
          </p>
        </div>
      </div>
    </div>
  );
}
