import React from 'react';
import { MessageSquare, Menu, ArrowUp, AlertTriangle } from 'lucide-react';
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
  home: React.ReactNode;
  onHome: () => void;
  activeNoteDetail: NoteDetail | null;
  noteError?: string | null;
  isChatVisible: boolean;
  setIsChatVisible: (v: boolean) => void;
  isLoadingNote?: boolean;
  setIsLeftSidebarOpen: (v: boolean) => void;
  isLeftSidebarOpen: boolean;
}

export const MainContent: React.FC<MainContentProps> = ({
  home,
  onHome,
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
      <header className="h-16 border-b border-rule bg-transparent flex items-center justify-between gap-3 px-3 sm:px-4 md:px-6 shrink-0 z-10 pt-[env(safe-area-inset-top)] box-content">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            className={`grid place-items-center min-h-11 min-w-11 p-2 -ml-1 shrink-0 rounded-md text-muted hover:text-brass hover:bg-brass/10 transition-colors ${isLeftSidebarOpen ? 'md:hidden' : ''}`}
            onClick={() => setIsLeftSidebarOpen(true)}
            title="Open Sidebar (Ctrl/Cmd + B)"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          <button onClick={onHome} className="text-sm font-medium text-muted hover:text-paper shrink-0">Vault</button>
          <span aria-hidden="true" className="text-muted">/</span>
          <span className="text-sm truncate">{isLoadingNote ? 'Opening note…' : noteError ? 'Note unavailable' : activeNoteDetail?.title || 'Overview'}</span>
        </div>

        <button
          onClick={() => setIsChatVisible(!isChatVisible)}
          className="shrink-0 min-h-11 min-w-11 flex items-center justify-center gap-2 text-sm font-sans font-medium text-brass hover:text-white transition-colors bg-brass/10 hover:bg-brass/20 px-3 py-2 rounded-full border border-rule"
          title="Toggle E.D.I.T.H. (Ctrl/Cmd + \)"
          aria-label={isChatVisible ? 'Close assistant' : 'Open assistant'}
          aria-pressed={isChatVisible}
        >
          <MessageSquare size={14} />
          <span className="hidden sm:inline">{isChatVisible ? 'Close assistant' : 'Assistant'}</span>
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
            <div className="h-8 w-1/3 bg-brass/20 rounded-md  mb-4"></div>
            <div className="h-4 w-full bg-inset rounded-md"></div>
            <div className="h-4 w-5/6 bg-inset rounded-md"></div>
            <div className="h-4 w-4/6 bg-inset rounded-md mb-4"></div>
            <div className="h-32 w-full bg-panel/20 border border-rule rounded-xl"></div>
            <div className="h-4 w-full bg-inset rounded-md mt-4"></div>
            <div className="h-4 w-3/4 bg-inset rounded-md"></div>
          </div>
        ) : noteError ? (
          <div className="h-full flex items-center justify-center text-muted flex-col gap-4 text-center px-4" role="alert">
            <AlertTriangle size={40} className="text-red-400/70" />
            <p className="font-sans tracking-widest text-sm text-red-300/90">Couldn’t open this note</p>
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
              // A bounded measure keeps lines readable on wide monitors; tables and diagrams can still scroll.
              className={`w-full mx-auto ${activeNoteDetail.wide ? 'max-w-6xl' : 'max-w-[70ch]'}`}
            >
              {activeNoteDetail.tags && activeNoteDetail.tags.length > 0 && (
                <div className="mb-6 sm:mb-8 flex flex-wrap gap-2">
                  {activeNoteDetail.tags.map((tag: string) => (
                    <span key={tag} className="px-2.5 py-1 rounded-md bg-brass/10 border border-rule text-xs font-mono tracking-wider uppercase text-brass  break-all">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-white/90 break-words">
                {activeNoteDetail.content}
              </div>

              <div className="mt-12 pt-6 border-t border-rule flex flex-wrap gap-x-6 gap-y-2 justify-between text-xs text-muted font-mono">
                <span>Created: {activeNoteDetail.createdDate}</span>
                <span>Modified: {activeNoteDetail.modifiedDate}</span>
              </div>
            </motion.article>
          </AnimatePresence>
        ) : (
          home
        )}
      </div>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToTop}
            className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 sm:right-8 p-3 rounded-full bg-brass/10 border border-rule text-brass hover:bg-brass hover:text-background transition-colors  z-30 backdrop-blur-sm"
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
