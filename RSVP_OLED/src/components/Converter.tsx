import React, { useState } from 'react';
import { BookOpen, Upload, FileUp, Download } from 'lucide-react';
import { Book } from '../types';
import { processText } from '../utils/rsvp';
import JSZip from 'jszip';

export default function Converter() {
  const [books, setBooks] = useState<Book[]>([]);

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
      
      const htmlFiles = Object.keys(contents.files).filter(name => name.endsWith('.html') || name.endsWith('.xhtml'));
      htmlFiles.sort();

      for (const fileName of htmlFiles) {
        const text = await contents.files[fileName].async('text');
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
      
      const encoder = new TextEncoder();
      const encodedWord = encoder.encode(info.word.substring(0, 31));
      uint8View.set(encodedWord, offset);
      uint8View[offset + 31] = 0;

      view.setUint8(offset + 32, info.pivotIndex);
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
    <div className="w-full max-w-4xl mx-auto p-4 space-y-12">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tighter text-white">RSVP Nano Converter</h1>
        <p className="text-gray-400">Convert books and text to high-speed .rsvp format for your Xiao RSVP Nano device.</p>
      </header>

      <div className="bg-[#1e1e1e] rounded-2xl p-8 border border-white/10 shadow-xl">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-white">
          <BookOpen className="text-blue-400" />
          Import Books
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4 p-6 border border-white/5 rounded-xl bg-white/5">
            <h3 className="text-lg font-bold flex items-center gap-2 text-white">
              <Upload size={18} className="text-blue-400" />
              EPUB Converter
            </h3>
            <p className="text-sm text-gray-400">Upload an EPUB file to extract its content for speed reading.</p>
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-all">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileUp className="w-10 h-10 mb-3 text-gray-400" />
                <p className="text-sm text-gray-400 font-medium">Click to upload EPUB</p>
                <p className="text-xs text-gray-500 mt-1">.epub files only</p>
              </div>
              <input type="file" className="hidden" accept=".epub" onChange={handleEpubUpload} />
            </label>
          </div>

          <div className="space-y-4 p-6 border border-white/5 rounded-xl bg-white/5">
            <h3 className="text-lg font-bold text-white">Manual Text Entry</h3>
            <p className="text-sm text-gray-400">Paste raw text directly to create a custom speed reading file.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Book Title</label>
                <input 
                  id="book-title"
                  type="text" 
                  placeholder="e.g. My Custom Notes"
                  className="w-full bg-black border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Content</label>
                <textarea 
                  id="book-content"
                  rows={4}
                  placeholder="Paste your text here..."
                  className="w-full bg-black border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none"
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
                  } else {
                    alert('Please provide both a title and content.');
                  }
                }}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-500 active:scale-[0.98] transition-all text-sm shadow-lg shadow-blue-900/20"
              >
                GENERATE WORD LIST
              </button>
            </div>
          </div>
        </div>

        {books.length > 0 && (
          <div className="mt-12 space-y-4">
            <h3 className="text-xl font-bold text-white">Your RSVP Files</h3>
            <div className="overflow-hidden border border-white/10 rounded-xl bg-black/40">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5">
                  <tr className="text-gray-400 uppercase text-[10px] tracking-wider">
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {books.map(book => (
                    <tr key={book.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 text-white font-medium">{book.title}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => downloadRsvpFile(book)}
                          className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-md transition-all inline-flex items-center gap-2 text-xs font-bold"
                        >
                          <Download size={14} />
                          DOWNLOAD .RSVP
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#1e1e1e] rounded-2xl p-8 border border-white/10 shadow-xl prose prose-invert max-w-none">
        <h2 className="text-white mt-0">Project Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-blue-400">Firmware & Hardware</h3>
            <p className="text-gray-400">
              RSVP Nano is a bare-metal speed reading device built for the Seeed Studio Xiao series. 
              The firmware is designed for low-latency text rendering using the U8g2 library.
            </p>
            <ul className="text-gray-400 space-y-2 text-sm">
              <li>• <strong>Controller:</strong> ESP32-S3 (Xiao S3 Sense/Standard)</li>
              <li>• <strong>Display:</strong> 1.3" OLED (SH1106) via I2C</li>
              <li>• <strong>Storage:</strong> MicroSD Card (formatted as FAT32)</li>
              <li>• <strong>Inputs:</strong> 3-button navigation (Left, Enter, Right)</li>
            </ul>
          </div>
          <div>
            <h3 className="text-blue-400">Streaming Binary Format</h3>
            <p className="text-gray-400">
              The .rsvp files generated here use a packed binary format to ensure the microcontroller 
              can stream words from the SD card without memory overhead or slow JSON parsing.
            </p>
            <div className="bg-black/50 p-4 rounded-lg font-mono text-[10px] text-gray-500 border border-white/5">
              // WordInfo Struct (34 bytes)<br/>
              char word[32]; // Nul-terminated<br/>
              uint8_t pivotIndex;<br/>
              uint8_t delayFactorFixed; // delay * 10
            </div>
          </div>
        </div>
        
        <div className="mt-12 bg-blue-900/20 border border-blue-500/30 p-6 rounded-xl">
          <h4 className="text-blue-400 font-bold uppercase tracking-widest text-xs mb-3">USB Integration</h4>
          <p className="text-blue-200 text-sm mb-0">
            Copy the downloaded <code>.rsvp</code> files to the root directory of your SD card. 
            The device will automatically index them on start. Use the on-device menu to browse and select your books.
          </p>
        </div>
      </div>

      <footer className="text-center text-gray-600 text-xs pb-12">
        RSVP Nano Port &bull; Inspired by open-source speed reading tools
      </footer>
    </div>
  );
}
