'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LeftSidebar } from '@/components/LeftSidebar';
import { MainContent } from '@/components/MainContent';
import { ChatSidebar } from '@/components/ChatSidebar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { OmniSearch } from '@/components/OmniSearch';
import { useAuth } from '@/context/AuthContext';
import { authFetchJson } from '@/lib/authFetch';
import { readJson, readStorage, writeStorage } from '@/lib/storage';
import { useMediaQuery, matchesNow, MOBILE_QUERY, DESKTOP_QUERY } from '@/lib/useMediaQuery';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText } from 'lucide-react';

interface NoteResponse {
  title: string;
  content: string;
  created: string;
  modified: string;
  tags: string[];
  isRawFile?: boolean;
  fileUrl?: string;
  fileType?: string;
}

const IMAGE_TYPES = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp'];

const formatDate = (iso: string) => {
  if (!iso) return '—';
  const date = new Date(iso);
  return isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

function RawFileView({ data }: { data: NoteResponse }) {
  if (data.fileType === '.pdf') {
    return (
      <div className="w-full h-[75dvh] bg-surface-container-high rounded-xl overflow-hidden border border-electric-cyan/30 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
        <iframe src={data.fileUrl} className="w-full h-full" title={data.title} />
      </div>
    );
  }
  if (data.fileType && IMAGE_TYPES.includes(data.fileType)) {
    return (
      <div className="w-full flex justify-center items-center p-2 sm:p-4 bg-surface-container/50 rounded-xl border border-whisper-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={data.fileUrl} alt={data.title} className="max-w-full max-h-[80dvh] rounded shadow-lg" />
      </div>
    );
  }
  if (data.fileType === '.docx') {
    return (
      <div className="w-full max-w-xl mx-auto mt-6 sm:mt-10 p-6 sm:p-8 bg-surface-container-high rounded-xl border border-electric-cyan/30 flex flex-col items-center justify-center gap-6 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
        <FileText size={48} className="text-electric-cyan" />
        <div className="text-center">
          <h3 className="text-lg font-tech text-white mb-2 break-words">{data.title}</h3>
          <p className="text-sm text-muted-steel mb-6">Word documents cannot be previewed directly in the Matrix. Please download the file to view its contents.</p>
        </div>
        <a
          href={data.fileUrl}
          download={data.title}
          className="px-6 py-2.5 bg-electric-cyan/10 hover:bg-electric-cyan/20 text-electric-cyan border border-electric-cyan/50 rounded-full font-tech tracking-wider transition-colors shadow-[0_0_10px_rgba(0,240,255,0.15)] flex items-center gap-2"
        >
          <Download size={16} />
          DOWNLOAD FILE
        </a>
      </div>
    );
  }
  return (
    <div className="p-8 text-center text-muted-steel">
      <a href={data.fileUrl} download className="text-electric-cyan hover:underline font-tech tracking-wider">DOWNLOAD {data.title}</a>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const isMobile = useMediaQuery(MOBILE_QUERY);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  // Below 1280px the chat floats over the note instead of squeezing it.
  const isChatOverlay = !isDesktop;

  // Note State
  const [activeNoteSlug, setActiveNoteSlug] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<{ slug: string; data: NoteResponse } | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [isLoadingNote, setIsLoadingNote] = useState(false);
  const noteRequestId = useRef(0);

  // Panels start closed on small screens so they never cover the note on load;
  // the saved preference only applies where they sit beside it.
  const [isChatVisible, setIsChatVisible] = useState(() =>
    matchesNow(DESKTOP_QUERY) ? readStorage('arc_chat_visible') !== 'false' : false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(() =>
    matchesNow(MOBILE_QUERY) ? false : readStorage('arc_sidebar_visible') !== 'false');

  useEffect(() => {
    if (isDesktop) writeStorage('arc_chat_visible', String(isChatVisible));
  }, [isChatVisible, isDesktop]);

  useEffect(() => {
    if (!isMobile) writeStorage('arc_sidebar_visible', String(isLeftSidebarOpen));
  }, [isLeftSidebarOpen, isMobile]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD+\ or CTRL+\ to toggle Chat
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setIsChatVisible(prev => !prev);
      }
      // CMD+B or CTRL+B to toggle Left Sidebar
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsLeftSidebarOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openNote = useCallback(async (slug: string) => {
    const requestId = ++noteRequestId.current;
    setActiveNoteSlug(slug);
    setIsLoadingNote(true);
    setNoteError(null);
    writeStorage('arc_active_note', slug);

    const recent = readJson<string[]>('arc_recent_files', []).filter(s => s !== slug);
    writeStorage('arc_recent_files', JSON.stringify([slug, ...recent].slice(0, 5)));

    try {
      const encodedSlug = slug.split('/').map(encodeURIComponent).join('/');
      const data = await authFetchJson<NoteResponse>(`/api/notes/${encodedSlug}`, { cache: 'no-store' });
      // A newer click superseded this request; drop the stale response.
      if (requestId !== noteRequestId.current) return;
      setActiveNote({ slug, data });
    } catch (e) {
      if (requestId !== noteRequestId.current) return;
      console.error('Failed to load note', e);
      // Don't keep reopening a note that no longer loads (e.g. deleted from the vault).
      if (readStorage('arc_active_note') === slug) writeStorage('arc_active_note', '');
      setActiveNote(null);
      setNoteError(e instanceof Error ? e.message : 'Failed to load note');
    } finally {
      if (requestId === noteRequestId.current) setIsLoadingNote(false);
    }
  }, []);

  // Opening a note from an overlay panel should reveal the note underneath.
  const openNoteFromPanel = useCallback((slug: string) => {
    openNote(slug);
    if (!matchesNow(DESKTOP_QUERY)) setIsChatVisible(false);
  }, [openNote]);

  // Restore the last open note once signed in.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!user || restoredRef.current) return;
    restoredRef.current = true;
    const savedNote = readStorage('arc_active_note');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of persisted state
    if (savedNote) openNote(savedNote);
  }, [user, openNote]);

  const activeNoteDetail = useMemo(() => {
    if (!activeNote) return null;
    const { slug, data } = activeNote;
    return {
      id: slug,
      title: data.title,
      content: data.isRawFile
        ? <RawFileView data={data} />
        : <MarkdownRenderer content={data.content} onNodeClick={openNote} />,
      createdDate: formatDate(data.created),
      modifiedDate: formatDate(data.modified),
      tags: data.tags,
      wide: !!data.isRawFile,
    };
  }, [activeNote, openNote]);

  // AuthProvider redirects signed-out users to /login.
  if (!user) return null;

  return (
    <div className="h-dvh w-full bg-[#02050C] text-on-surface font-sans overflow-hidden flex relative z-0">
      {/* Global Cyan Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00F0FF08_1px,transparent_1px),linear-gradient(to_bottom,#00F0FF08_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />

      <LeftSidebar
        onNodeClick={openNote}
        activeNoteSlug={activeNoteSlug}
        isLeftSidebarOpen={isLeftSidebarOpen}
        setIsLeftSidebarOpen={setIsLeftSidebarOpen}
      />
      <MainContent
        activeNoteDetail={activeNoteDetail}
        noteError={noteError}
        isChatVisible={isChatVisible}
        setIsChatVisible={setIsChatVisible}
        isLoadingNote={isLoadingNote}
        setIsLeftSidebarOpen={setIsLeftSidebarOpen}
        isLeftSidebarOpen={isLeftSidebarOpen}
      />
      <OmniSearch onSelectNote={openNote} />

      <AnimatePresence>
        {isChatVisible && isChatOverlay && (
          <motion.div
            key="chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setIsChatVisible(false)}
            aria-hidden="true"
          />
        )}
        {isChatVisible && (
          <motion.aside
            key={isChatOverlay ? 'chat-overlay' : 'chat-docked'}
            aria-label="E.D.I.T.H. assistant"
            initial={isChatOverlay ? { x: '100%' } : { width: 0, opacity: 0 }}
            animate={isChatOverlay ? { x: 0 } : { width: 400, opacity: 1 }}
            exit={isChatOverlay ? { x: '100%' } : { width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className={`h-full shrink-0 overflow-hidden ${
              isChatOverlay
                ? 'fixed inset-y-0 right-0 z-50 w-full sm:w-[min(420px,90vw)] bg-[#02050C]/95 shadow-[-10px_0_30px_rgba(0,0,0,0.6)]'
                : 'relative z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] bg-[#02050C]/90'
            }`}
          >
            <ChatSidebar
              onNodeClick={openNoteFromPanel}
              setIsChatVisible={setIsChatVisible}
              activeNoteSlug={activeNoteSlug}
              isOverlay={isChatOverlay}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
