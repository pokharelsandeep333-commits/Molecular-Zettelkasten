import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { NoteMetadata } from '@/app/api/notes/route';

interface OmniSearchProps {
  onSelectNote: (slug: string) => void;
}

export const OmniSearch: React.FC<OmniSearchProps> = ({ onSelectNote }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  
  const displayResults = query ? results : recentFiles.map(slug => ({ slug, title: slug.split('/').pop()?.replace(/-/g, ' ') || slug }));

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    const handleCustomOpen = () => setIsOpen(true);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-omni-search', handleCustomOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-omni-search', handleCustomOpen);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      try {
        const recent = localStorage.getItem('arc_recent_files');
        if (recent) setRecentFiles(JSON.parse(recent));
      } catch (e) {}
    } else {
      // eslint-disable-next-line
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    searchTimeout.current = setTimeout(async () => {
      if (!q.trim()) {
        setResults([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=15`);
        if (res.ok) {
          const data = await res.json();
          const matchedSlugs = new Set<string>(
            (data.results as { key: string }[])
              .map(r => {
                const k = r.key.replace(/^smart_\w+:/, '').split('#')[0].replace(/\.md$/, '');
                return k.trim();
              }).filter(Boolean)
          );

          const noteData = await fetch('/api/notes?limit=500');
          const allNotes = await noteData.json();
          const filtered = (allNotes.notes as NoteMetadata[]).filter((n: NoteMetadata) => matchedSlugs.has(n.slug));
          setResults(filtered);
        }
      } catch {
        const res = await fetch(`/api/notes?q=${encodeURIComponent(q)}&limit=15`);
        const data = await res.json();
        if (data.notes) setResults(data.notes);
      } finally {
        setIsLoading(false);
        setSelectedIndex(0);
      }
    }, 300);
  }, []);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < displayResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayResults[selectedIndex]) {
        onSelectNote(displayResults[selectedIndex].slug);
        setIsOpen(false);
      }
    }
  };


  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[15vh] bg-abyssal-bg/80 backdrop-blur-md px-4 sm:px-0">
      <div className="w-full max-w-xl bg-surface-container-highest border border-electric-cyan/30 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col">
        <div className="flex items-center px-4 py-4 border-b border-whisper-border">
          <Search className="text-electric-cyan mr-3" size={24} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search the Neural Matrix..."
            className="flex-1 bg-transparent text-xl text-pure-ink outline-none font-tech placeholder-muted-steel"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="ml-3 p-1.5 text-muted-steel hover:text-electric-cyan hover:bg-electric-cyan/10 rounded-md transition-colors"
          >
            <X size={20} />
          </button>
          <div className="ml-2 hidden sm:block text-xs text-muted-steel font-mono bg-surface-container px-2 py-1 rounded">ESC</div>
        </div>

        {/* Cyber Progress Bar */}
        <div className="h-[2px] w-full bg-transparent relative overflow-hidden shrink-0">
          {isLoading && (
            <motion.div 
              className="absolute inset-y-0 left-0 bg-electric-cyan w-1/3 shadow-[0_0_10px_#00F0FF]"
              animate={{ left: ["-33%", "100%"] }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          )}
        </div>
        
        {displayResults.length > 0 && (
          <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
            {!query && <div className="text-[10px] font-mono tracking-widest text-muted-steel uppercase px-3 pb-2 pt-1">Recent Data Cores</div>}
            {displayResults.map((note, index) => (
              <button
                key={note.slug}
                onClick={() => {
                  onSelectNote(note.slug);
                  setIsOpen(false);
                }}
                className={`w-full text-left p-3 rounded-lg flex flex-col gap-1 transition-colors border ${
                  index === selectedIndex 
                    ? 'bg-electric-cyan/20 border-electric-cyan shadow-[0_0_10px_rgba(0,240,255,0.15)]' 
                    : 'border-transparent hover:border-electric-cyan/20 hover:bg-electric-cyan/5'
                }`}
              >
                <div className={`font-medium ${index === selectedIndex ? 'text-white' : 'text-pure-ink'}`}>{note.title}</div>
                <div className="text-xs text-muted-steel flex items-center gap-2">
                  <span className={`font-mono text-[10px] ${index === selectedIndex ? 'text-electric-cyan' : 'text-electric-cyan/80'}`}>{note.slug}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        {query && displayResults.length === 0 && !isLoading && (
          <div className="p-8 text-center text-muted-steel font-tech text-lg tracking-wider">No data cores match your query.</div>
        )}
        
        {isLoading && results.length === 0 && (
          <div className="p-12 flex flex-col items-center justify-center gap-4">
             <motion.div
               animate={{ opacity: [0.3, 1, 0.3] }}
               transition={{ repeat: Infinity, duration: 1.5 }}
               className="font-tech text-electric-cyan tracking-[0.2em] text-sm"
             >
               ANALYZING NEURAL MATRIX...
             </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};
