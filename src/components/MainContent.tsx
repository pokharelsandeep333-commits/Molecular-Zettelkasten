import React from 'react';
import { FileText, MessageSquare, Menu, ArrowUp, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NoteDetail {
  id: string;
  title: string;
  content: React.ReactNode;
  createdDate: string;
  modifiedDate: string;
  tags?: string[];
  /** PDFs and images use the full width instead of the reading column. */
  wide?: boolean;
}

interface MainContentProps {
  activeNoteDetail: NoteDetail | null;
  noteError?: string | null;
  isChatVisible: boolean;
  setIsChatVisible: (v: boolean) => void;
  isLoadingNote?: boolean;
  setIsLeftSidebarOpen: (v: boolean) => void;
  isLeftSidebarOpen: boolean;
}

export const MainContent: React.FC<MainContentProps> = ({
  activeNoteDetail,
  noteError,
  isChatVisible,
  setIsChatVisible,
  isLoadingNote,
  setIsLeftSidebarOpen,
  isLeftSidebarOpen,
}) => {
  // Only the threshold crossing matters, so scrolling does not re-render the note.
  const [showScrollTop, setShowScrollTop] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const past = e.currentTarget.scrollTop > 300;
    if (past !== showScrollTop) setShowScrollTop(past);
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  React.useEffect(() => {
    if (!activeNoteDetail?.id) return;
    // Small timeout ensures layout has updated before scrolling
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(timer);
  }, [activeNoteDetail?.id]);

  return (
    <main className="flex-1 min-w-0 h-full flex flex-col bg-transparent relative transition-all duration-300 ease-in-out z-10">
      {/* Top Header */}
      <header className="h-14 border-b border-[#00F0FF]/20 bg-transparent flex items-center justify-between gap-3 px-3 sm:px-4 md:px-6 shrink-0 z-10 pt-[env(safe-area-inset-top)] box-content">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            className={`p-2 -ml-1 shrink-0 rounded-md text-muted-steel hover:text-electric-cyan hover:bg-[#00F0FF]/10 transition-colors ${isLeftSidebarOpen ? 'md:hidden' : ''}`}
            onClick={() => setIsLeftSidebarOpen(true)}
            title="Open Sidebar (Ctrl/Cmd + B)"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          {activeNoteDetail ? (
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={16} className="text-[#00F0FF] shrink-0" />
              <h1 className="font-tech text-[#00F0FF] tracking-wider truncate text-sm">
                {activeNoteDetail.title}
              </h1>
            </div>
          ) : (
            <span className="text-muted-steel font-tech tracking-widest text-sm truncate">STANDBY...</span>
          )}
        </div>

        <button
          onClick={() => setIsChatVisible(!isChatVisible)}
          className="shrink-0 flex items-center gap-2 text-xs font-tech tracking-wider text-electric-cyan hover:text-white transition-colors bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 px-3 py-2 rounded-full border border-[#00F0FF]/30 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
          title="Toggle E.D.I.T.H. (Ctrl/Cmd + \)"
          aria-label={isChatVisible ? 'Close assistant' : 'Open assistant'}
          aria-pressed={isChatVisible}
        >
          <MessageSquare size={14} />
          <span className="hidden sm:inline">{isChatVisible ? 'STANDBY E.D.I.T.H.' : 'ACTIVATE E.D.I.T.H.'}</span>
        </button>
      </header>

      {/* Scrollable Body */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-8 lg:px-12 pt-6 sm:pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] relative z-10 custom-scrollbar"
      >
        {isLoadingNote ? (
          <div className="max-w-3xl mx-auto flex flex-col gap-4 animate-pulse" role="status" aria-label="Loading note">
            <div className="h-8 w-1/3 bg-[#00F0FF]/20 rounded-md shadow-[0_0_15px_rgba(0,240,255,0.1)] mb-4"></div>
            <div className="h-4 w-full bg-[#30353e]/50 rounded-md"></div>
            <div className="h-4 w-5/6 bg-[#30353e]/50 rounded-md"></div>
            <div className="h-4 w-4/6 bg-[#30353e]/50 rounded-md mb-4"></div>
            <div className="h-32 w-full bg-[#001E3C]/20 border border-[#00F0FF]/20 rounded-xl"></div>
            <div className="h-4 w-full bg-[#30353e]/50 rounded-md mt-4"></div>
            <div className="h-4 w-3/4 bg-[#30353e]/50 rounded-md"></div>
          </div>
        ) : noteError ? (
          <div className="h-full flex items-center justify-center text-muted-steel flex-col gap-4 text-center px-4" role="alert">
            <AlertTriangle size={40} className="text-red-400/70" />
            <p className="font-tech tracking-widest text-sm text-red-300/90">UNABLE TO LOAD DATA CORE</p>
            <p className="text-xs font-mono max-w-sm">{noteError}</p>
          </div>
        ) : activeNoteDetail ? (
          <AnimatePresence mode="wait">
            <motion.article
              key={activeNoteDetail.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              // ~75ch keeps lines readable on wide monitors; tables and diagrams can still scroll.
              className={`w-full mx-auto ${activeNoteDetail.wide ? 'max-w-6xl' : 'max-w-[75ch]'}`}
            >
              {activeNoteDetail.tags && activeNoteDetail.tags.length > 0 && (
                <div className="mb-6 sm:mb-8 flex flex-wrap gap-2">
                  {activeNoteDetail.tags.map((tag: string) => (
                    <span key={tag} className="px-2.5 py-1 rounded-md bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-xs font-mono tracking-wider uppercase text-[#00F0FF] shadow-[0_0_8px_rgba(0,240,255,0.15)] break-all">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-white/90 break-words">
                {activeNoteDetail.content}
              </div>

              <div className="mt-12 pt-6 border-t border-whisper-border flex flex-wrap gap-x-6 gap-y-2 justify-between text-xs text-muted-steel font-mono">
                <span>Created: {activeNoteDetail.createdDate}</span>
                <span>Modified: {activeNoteDetail.modifiedDate}</span>
              </div>
            </motion.article>
          </AnimatePresence>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-steel flex-col gap-4 text-center">
            <FileText size={48} className="opacity-20" />
            <p className="font-tech tracking-widest text-sm">AWAITING INPUT...</p>
            <p className="text-xs font-mono opacity-60">Open a note from the sidebar or press Ctrl/Cmd + K to search.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToTop}
            className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 sm:right-8 p-3 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF] hover:bg-[#00F0FF] hover:text-[#02050C] transition-colors shadow-[0_0_15px_rgba(0,240,255,0.2)] z-30 backdrop-blur-sm"
            title="Scroll to Top"
            aria-label="Scroll to top"
          >
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </main>
  );
};
