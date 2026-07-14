import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import type { NoteMetadata } from '@/app/api/notes/route';

interface OmniSearchProps {
  onSelectNote: (slug: string) => void;
}

export const OmniSearch: React.FC<OmniSearchProps> = ({ onSelectNote }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
    } else {
      // eslint-disable-next-line
      setQuery('');
      setResults([]);
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
      }
    }, 300);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-abyssal-bg/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-surface-container-highest border border-electric-cyan/30 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col">
        <div className="flex items-center px-4 py-4 border-b border-whisper-border">
          <Search className="text-electric-cyan mr-3" size={24} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search the Neural Matrix..."
            className="flex-1 bg-transparent text-xl text-pure-ink outline-none font-tech placeholder-muted-steel"
          />
          {isLoading && <Loader2 className="animate-spin text-electric-cyan" size={20} />}
          <div className="ml-3 text-xs text-muted-steel font-mono bg-surface-container px-2 py-1 rounded">ESC</div>
        </div>
        
        {results.length > 0 && (
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {results.map((note) => (
              <button
                key={note.slug}
                onClick={() => {
                  onSelectNote(note.slug);
                  setIsOpen(false);
                }}
                className="w-full text-left p-3 hover:bg-electric-cyan/10 rounded-lg flex flex-col gap-1 transition-colors border border-transparent hover:border-electric-cyan/20"
              >
                <div className="text-pure-ink font-medium">{note.title}</div>
                <div className="text-xs text-muted-steel flex items-center gap-2">
                  <span className="font-mono text-[10px] text-electric-cyan/80">{note.slug}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        {query && results.length === 0 && !isLoading && (
          <div className="p-8 text-center text-muted-steel font-tech text-lg tracking-wider">No data cores match your query.</div>
        )}
      </div>
    </div>
  );
};
