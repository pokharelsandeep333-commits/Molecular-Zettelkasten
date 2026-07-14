import React from 'react';
import { FileText, MessageSquare, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NoteDetail {
  id: string;
  title: string;
  content: React.ReactNode;
  createdDate: string;
  modifiedDate: string;
  tags?: string[];
}

interface MainContentProps {
  activeNoteDetail: NoteDetail | null;
  isChatVisible: boolean;
  setIsChatVisible: (v: boolean) => void;
  isLoadingNote?: boolean;
  setIsLeftSidebarOpen: (v: boolean) => void;
}

export const MainContent: React.FC<MainContentProps> = ({
  activeNoteDetail,
  isChatVisible,
  setIsChatVisible,
  isLoadingNote,
  setIsLeftSidebarOpen
}) => {
  return (
    <div className="flex-1 min-w-0 h-full flex flex-col bg-transparent relative transition-all duration-300 ease-in-out z-10">
      
      {/* Top Header */}
      <div className="h-14 border-b border-[#00F0FF]/20 bg-transparent flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            className="md:hidden text-muted-steel hover:text-electric-cyan transition-colors"
            onClick={() => setIsLeftSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>
          
          {activeNoteDetail ? (
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[#00F0FF] shrink-0" />
              <span className="font-tech text-[#00F0FF] tracking-wider truncate max-w-[120px] sm:max-w-xs md:max-w-xl text-sm">
                {activeNoteDetail.title}
              </span>
            </div>
          ) : (
            <span className="text-muted-steel font-tech tracking-widest text-sm truncate">STANDBY...</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsChatVisible(!isChatVisible)}
            className="flex items-center gap-2 text-xs font-tech tracking-wider text-electric-cyan hover:text-white transition-colors bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 px-3 py-1.5 rounded-full border border-[#00F0FF]/30 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
            title="Toggle E.D.I.T.H. (Cmd/Ctrl + \)"
          >
            <MessageSquare size={14} />
            <span className="hidden sm:inline">{isChatVisible ? 'STANDBY E.D.I.T.H.' : 'ACTIVATE E.D.I.T.H.'}</span>
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-10 py-8 relative z-10 custom-scrollbar">
        {isLoadingNote ? (
          <div className="max-w-3xl mx-auto flex flex-col gap-4 animate-pulse">
            <div className="h-8 w-1/3 bg-[#00F0FF]/20 rounded-md shadow-[0_0_15px_rgba(0,240,255,0.1)] mb-4"></div>
            <div className="h-4 w-full bg-[#30353e]/50 rounded-md"></div>
            <div className="h-4 w-5/6 bg-[#30353e]/50 rounded-md"></div>
            <div className="h-4 w-4/6 bg-[#30353e]/50 rounded-md mb-4"></div>
            <div className="h-32 w-full bg-[#001E3C]/20 border border-[#00F0FF]/20 rounded-xl"></div>
            <div className="h-4 w-full bg-[#30353e]/50 rounded-md mt-4"></div>
            <div className="h-4 w-3/4 bg-[#30353e]/50 rounded-md"></div>
          </div>
        ) : activeNoteDetail ? (
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeNoteDetail.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <div className="w-full">
                {activeNoteDetail.tags && activeNoteDetail.tags.length > 0 && (
                  <div className="mb-8 flex flex-wrap gap-2">
                    {activeNoteDetail.tags.map((tag: string) => (
                      <span key={tag} className="px-2.5 py-1 rounded-md bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-xs font-mono tracking-wider uppercase text-[#00F0FF] shadow-[0_0_8px_rgba(0,240,255,0.15)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="prose prose-invert prose-lg max-w-none text-white/90 prose-headings:font-tech prose-headings:text-white prose-a:text-[#00F0FF] prose-a:no-underline hover:prose-a:underline prose-code:text-[#00F0FF] prose-code:bg-[#00F0FF]/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none">
                  {activeNoteDetail.content}
                </div>
                
                <div className="mt-12 pt-6 border-t border-whisper-border flex justify-between text-xs text-muted-steel font-mono">
                  <span>Created: {activeNoteDetail.createdDate}</span>
                  <span>Modified: {activeNoteDetail.modifiedDate}</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-steel flex-col gap-4">
            <FileText size={48} className="opacity-20" />
            <p className="font-tech tracking-widest text-sm">AWAITING INPUT...</p>
          </div>
        )}
      </div>
    </div>
  );
};
