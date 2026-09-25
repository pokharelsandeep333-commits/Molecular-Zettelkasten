import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { NoteMetadata } from '@/app/api/notes/route';
import { authFetchJson } from '@/lib/authFetch';
import { readJson } from '@/lib/storage';

interface OmniSearchProps {
  onSelectNote: (slug: string) => void;
}

type ResultItem = Pick<NoteMetadata, 'slug' | 'title'>;

const hitToSlug = (key: string) => key.replace(/^smart_\w+:/, '').split('#')[0].replace(/\.md$/, '').trim();

async function semanticSearch(q: string): Promise<NoteMetadata[]> {
  const data = await authFetchJson<{ results: { key: string }[] }>(`/api/search?q=${encodeURIComponent(q)}&limit=15`);
  // Keep the similarity ranking; several blocks of one note collapse to its best rank.
  const rankedSlugs = Array.from(new Set(data.results.map(r => hitToSlug(r.key)).filter(Boolean)));
  if (rankedSlugs.length === 0) return [];
  const params = rankedSlugs.map(s => `slug=${encodeURIComponent(s)}`).join('&');
  const { notes } = await authFetchJson<{ notes: NoteMetadata[] }>(`/api/notes?${params}`);
  const bySlug = new Map(notes.map(n => [n.slug, n]));
  return rankedSlugs.map(s => bySlug.get(s)).filter((n): n is NoteMetadata => !!n);
}

async function keywordSearch(q: string): Promise<NoteMetadata[]> {
  const { notes } = await authFetchJson<{ notes: NoteMetadata[] }>(`/api/notes?q=${encodeURIComponent(q)}&limit=15`);
  return notes;
}

export const OmniSearch: React.FC<OmniSearchProps> = ({ onSelectNote }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);

  const displayResults: ResultItem[] = query
    ? results
    : recentFiles.map(slug => ({ slug, title: slug.split('/').pop()?.replace(/-/g, ' ') || slug }));

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchId = useRef(0);

  const close = useCallback(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchId.current++; // discard any in-flight search
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setIsLoading(false);
    setSelectedIndex(0);
  }, []);

  const open = useCallback(() => {
    setRecentFiles(readJson<string[]>('arc_recent_files', []));
    setIsOpen(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) close();
        else open();
      }
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-omni-search', open);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-omni-search', open);
    };
  }, [isOpen, open, close]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => () => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
  }, []);

  // Keep the keyboard-selected result visible in long lists.
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleSearch = (q: string) => {
    setQuery(q);
    setSelectedIndex(0);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    const id = ++searchId.current;
    if (!q.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    searchTimeout.current = setTimeout(async () => {
      let found: NoteMetadata[] = [];
      try {
        found = await semanticSearch(q);
      } catch (err) {
        console.warn('Semantic search failed, using keyword search', err);
      }
      if (found.length === 0) {
        found = await keywordSearch(q).catch(() => []);
      }
      // Ignore responses for queries the user has already typed past.
      if (id !== searchId.current) return;
      setResults(found);
      setIsLoading(false);
    }, 300);
  };

  const selectNote = (slug: string) => {
    onSelectNote(slug);
    close();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < displayResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayResults[selectedIndex]) selectNote(displayResults[selectedIndex].slug);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[max(1rem,env(safe-area-inset-top))] sm:pt-[12vh] bg-[#02050C]/80 backdrop-blur-md px-3 sm:px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search notes"
        className="w-full max-w-xl max-h-[calc(100dvh-2rem)] sm:max-h-[75vh] bg-[#041424]/95 border border-electric-cyan/30 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col"
      >
        <div className="flex items-center px-3 sm:px-4 py-3 sm:py-4 border-b border-whisper-border shrink-0">
          <Search className="text-electric-cyan mr-3 shrink-0" size={22} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search the Neural Matrix..."
            aria-label="Search notes"
            aria-controls="omni-results"
            aria-activedescendant={displayResults[selectedIndex] ? `omni-result-${selectedIndex}` : undefined}
            enterKeyHint="search"
            autoComplete="off"
            className="flex-1 min-w-0 bg-transparent text-lg sm:text-xl text-pure-ink outline-none font-tech placeholder-muted-steel [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            onClick={close}
            className="ml-2 p-2 text-muted-steel hover:text-electric-cyan hover:bg-electric-cyan/10 rounded-md transition-colors shrink-0"
            aria-label="Close search"
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
          <div ref={listRef} id="omni-results" role="listbox" className="flex-1 overflow-y-auto overscroll-contain p-2 custom-scrollbar">
            {!query && <div className="text-[10px] font-mono tracking-widest text-muted-steel uppercase px-3 pb-2 pt-1">Recent Data Cores</div>}
            {displayResults.map((note, index) => (
              <button
                key={note.slug}
                id={`omni-result-${index}`}
                data-index={index}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => selectNote(note.slug)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full text-left p-3 rounded-lg flex flex-col gap-1 transition-colors border ${
                  index === selectedIndex
                    ? 'bg-electric-cyan/20 border-electric-cyan shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                    : 'border-transparent hover:border-electric-cyan/20 hover:bg-electric-cyan/5'
                }`}
              >
                <div className={`font-medium truncate ${index === selectedIndex ? 'text-white' : 'text-pure-ink'}`}>{note.title}</div>
                <div className="text-xs text-muted-steel flex items-center gap-2 min-w-0">
                  <span className={`font-mono text-[10px] truncate ${index === selectedIndex ? 'text-electric-cyan' : 'text-electric-cyan/80'}`}>{note.slug}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        {query && displayResults.length === 0 && !isLoading && (
          <div className="p-8 text-center text-muted-steel font-tech text-base sm:text-lg tracking-wider">No data cores match your query.</div>
        )}

        {isLoading && results.length === 0 && (
          <div className="p-10 sm:p-12 flex flex-col items-center justify-center gap-4" role="status">
             <motion.div
               animate={{ opacity: [0.3, 1, 0.3] }}
               transition={{ repeat: Infinity, duration: 1.5 }}
               className="font-tech text-electric-cyan tracking-[0.2em] text-sm text-center"
             >
               ANALYZING NEURAL MATRIX...
             </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};
