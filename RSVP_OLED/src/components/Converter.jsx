import React, { useState } from 'react';
import { BookOpen, Upload, FileUp, Download } from 'lucide-react';
import { processText } from '../utils/rsvp';
import JSZip from 'jszip';

export default function Converter() {
  const [books, setBooks] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addCustomBook = (title, content) => {
    const newBook = { id: Date.now().toString(), title, content };
    setBooks(prev => [...prev, newBook]);
  };

  const handleEpubUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const zip = new JSZip();
    try {
      console.log('Loading EPUB zip...');
      const contents = await zip.loadAsync(file);
      let fullText = '';
      
      const contentFiles = Object.keys(contents.files).filter(name => 
        name.toLowerCase().endsWith('.html') || 
        name.toLowerCase().endsWith('.xhtml') || 
        name.toLowerCase().endsWith('.htm')
      );
      
      // Sort files to maintain some semblance of order (many EPUBs follow numeric/section naming)
      contentFiles.sort();

      console.log(`Found ${contentFiles.length} content files`);

      for (const fileName of contentFiles) {
        const text = await contents.files[fileName].async('text');
        const doc = new DOMParser().parseFromString(text, 'text/html');
        
        // Remove script and style tags to avoid garbage text
        const scripts = doc.querySelectorAll('script, style');
        scripts.forEach(s => s.remove());

        fullText += (doc.body.textContent || '') + '\n';
      }

      const cleanText = fullText.replace(/\s+/g, ' ').trim();
      if (cleanText) {
        addCustomBook(file.name.replace(/\.[^/.]+$/, ""), cleanText);
      } else {
        alert('Could not extract any readable text from this EPUB.');
      }
    } catch (err) {
      console.error('Failed to parse EPUB:', err);
      alert('Failed to parse EPUB. The file might be corrupted or in an unsupported format.');
    } finally {
      setIsProcessing(false);
      // Reset input
      e.target.value = '';
    }
  };

  const downloadRsvpFile = (book) => {
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
            <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-all relative overflow-hidden ${isProcessing ? 'opacity-50 cursor-wait pointer-events-none' : ''}`}>
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isProcessing ? (
                  <>
                    <div className="w-10 h-10 mb-3 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-sm text-blue-400 font-bold uppercase tracking-widest">Processing Zip...</p>
                  </>
                ) : (
                  <>
                    <FileUp className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="text-sm text-gray-400 font-medium">Click to upload EPUB</p>
                    <p className="text-xs text-gray-500 mt-1">.epub files only</p>
                  </>
                )}
              </div>
              {!isProcessing && <input type="file" className="hidden" accept=".epub" onChange={handleEpubUpload} />}
            </label>
          </div>

          <div className="space-y-4 p-6 border border-white/5 rounded-xl bg-white/5">
            <h3 className="text-lg font-bold text-white">Manual Text Entry</h3>
            <p className="text-sm text-gray-400">Paste raw text directly to create a custom speed reading file.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 text-gray-500">Book Title</label>
                <input 
                  id="book-title"
                  type="text" 
                  placeholder="e.g. My Custom Notes"
                  className="w-full bg-black border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 text-gray-500">Content</label>
                <textarea 
                  id="book-content"
                  rows={4}
                  placeholder="Paste your text here..."
                  className="w-full bg-black border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none font-mono"
                ></textarea>
              </div>
              <button 
                onClick={() => {
                  const titleInput = document.getElementById('book-title');
                  const contentInput = document.getElementById('book-content');
                  const title = titleInput.value;
                  const content = contentInput.value;
                  if (title && content) {
                    addCustomBook(title, content);
                    titleInput.value = '';
                    contentInput.value = '';
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

        <div className="mt-12 space-y-4 border-t border-white/5 pt-12">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Download className="text-blue-400" />
              Download Ready Files
            </h3>
            {books.length > 0 && (
              <span className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {books.length} Available
              </span>
            )}
          </div>
          
          <div className="overflow-hidden border border-white/10 rounded-xl bg-black/40 min-h-[200px] flex flex-col">
            {books.length > 0 ? (
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr className="text-gray-400 uppercase text-[10px] tracking-wider">
                    <th className="px-6 py-4 font-bold">File Name</th>
                    <th className="px-6 py-4 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {books.map(book => (
                    <tr key={book.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 text-white font-medium flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                        {book.title}.rsvp
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => downloadRsvpFile(book)}
                          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all inline-flex items-center gap-2 text-xs font-bold shadow-lg shadow-blue-900/20 active:scale-95"
                        >
                          <Download size={14} strokeWidth={3} />
                          DOWNLOAD NOW
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4 opacity-50">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <FileUp className="text-gray-500" size={32} />
                </div>
                <div className="space-y-1">
                  <p className="text-white font-bold">No files generated yet</p>
                  <p className="text-gray-500 text-xs max-w-[240px]">Import an EPUB or paste text above to create your first .rsvp file.</p>
                </div>
              </div>
            )}
          </div>
        </div>
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
