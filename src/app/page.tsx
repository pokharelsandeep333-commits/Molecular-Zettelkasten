'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { LeftSidebar } from '@/components/LeftSidebar';
import { MainContent } from '@/components/MainContent';
import { ChatSidebar } from '@/components/ChatSidebar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { OmniSearch } from '@/components/OmniSearch';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Note State
  const [activeNoteSlug, setActiveNoteSlug] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeNoteDetail, setActiveNoteDetail] = useState<any>(null);
  const [isLoadingNote, setIsLoadingNote] = useState(false);

  // Chat State
  const [isChatVisible, setIsChatVisible] = useState(true);

  // Mobile Layout State
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); // Initial check
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    try {
      const savedChat = localStorage.getItem('arc_chat_visible');
      if (savedChat !== null) {
        setTimeout(() => setIsChatVisible(savedChat === 'true'), 0);
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsChatVisible(window.innerWidth >= 768);
      }

      const savedSidebar = localStorage.getItem('arc_sidebar_visible');
      if (savedSidebar !== null) {
        setTimeout(() => setIsLeftSidebarOpen(savedSidebar === 'true'), 0);
      } else {
        setIsLeftSidebarOpen(window.innerWidth >= 768);
      }
    } catch {
       
      setIsChatVisible(true);
      setIsLeftSidebarOpen(true);
    }
  }, []);

  // Save State on Change
  useEffect(() => {
    localStorage.setItem('arc_chat_visible', isChatVisible.toString());
  }, [isChatVisible]);

  useEffect(() => {
    localStorage.setItem('arc_sidebar_visible', isLeftSidebarOpen.toString());
  }, [isLeftSidebarOpen]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD+\ or CTRL+\ to toggle Chat
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setIsChatVisible(prev => !prev);
      }
      // CMD+B or CTRL+B to toggle Left Sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsLeftSidebarOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auth Protection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Handle Node Selection
  const handleNodeClick = useCallback(async (slug: string) => {
    setActiveNoteSlug(slug);
    setIsLoadingNote(true);
    localStorage.setItem('arc_active_note', slug);
    
    // Update Recent Files
    try {
      const recentStr = localStorage.getItem('arc_recent_files');
      let recent = recentStr ? JSON.parse(recentStr) : [];
      recent = recent.filter((s: string) => s !== slug);
      recent.unshift(slug);
      if (recent.length > 5) recent = recent.slice(0, 5);
      localStorage.setItem('arc_recent_files', JSON.stringify(recent));
    } catch (e) {
      console.error('Failed to update recent files', e);
    }
    
    try {
      const encodedSlug = slug.split('/').map(encodeURIComponent).join('/');
      const res = await fetch(`/api/notes/${encodedSlug}`);
      const data = await res.json();
      
      const formatDate = (iso: string) => {
        if (!iso) return '—';
        try {
          return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch { return iso; }
      };
      
      let noteContent = <MarkdownRenderer content={data.content} />;

      if (data.isRawFile) {
        if (data.fileType === '.pdf') {
          noteContent = (
            <div className="w-full h-[80vh] bg-surface-container-high rounded-xl overflow-hidden border border-electric-cyan/30 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
              <iframe src={data.fileUrl} className="w-full h-full" title={data.title} />
            </div>
          );
        } else if (data.fileType === '.docx') {
          noteContent = (
            <div className="w-full max-w-xl mx-auto mt-10 p-8 bg-surface-container-high rounded-xl border border-electric-cyan/30 flex flex-col items-center justify-center gap-6 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
              <FileText size={48} className="text-electric-cyan" />
              <div className="text-center">
                <h3 className="text-lg font-tech text-white mb-2">{data.title}</h3>
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
        } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(data.fileType)) {
          noteContent = (
            <div className="w-full flex justify-center items-center p-4 bg-surface-container/50 rounded-xl border border-whisper-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.fileUrl} alt={data.title} className="max-w-full max-h-[80vh] rounded shadow-lg" />
            </div>
          );
        } else {
           noteContent = (
             <div className="p-8 text-center text-muted-steel">
               <a href={data.fileUrl} download className="text-electric-cyan hover:underline font-tech tracking-wider">DOWNLOAD {data.title}</a>
             </div>
           );
        }
      }
      
      setActiveNoteDetail({
        id: slug.split('/').pop()?.toUpperCase().replace(/-/g, '') || slug,
        title: data.title,
        content: noteContent,
        createdDate: formatDate(data.created),
        modifiedDate: formatDate(data.modified),
        tags: data.tags,
      });
    } catch (e) {
      console.error('Failed to load note', e);
    } finally {
      setIsLoadingNote(false);
    }
  }, []);

  // Restore active note after auth
  useEffect(() => {
    if (isAuthenticated) {
      const savedNote = localStorage.getItem('arc_active_note');
      if (savedNote && !activeNoteSlug) {
        // eslint-disable-next-line
        handleNodeClick(savedNote);
      }
    }
  }, [isAuthenticated, handleNodeClick, activeNoteSlug]);

  if (isAuthenticated === null) {
    return <div className="min-h-screen bg-[#02050C] flex items-center justify-center text-muted-steel font-tech tracking-widest">INITIALIZING SECURE CONNECTION...</div>;
  }

  return (
    <div className="h-screen w-full bg-[#02050C] text-on-surface font-sans overflow-hidden flex relative z-0">
      {/* Global Cyan Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00F0FF08_1px,transparent_1px),linear-gradient(to_bottom,#00F0FF08_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
      
      <LeftSidebar 
        onNodeClick={handleNodeClick}
        activeNoteSlug={activeNoteSlug}
        isLeftSidebarOpen={isLeftSidebarOpen}
        setIsLeftSidebarOpen={setIsLeftSidebarOpen}
      />
      <MainContent 
        activeNoteDetail={activeNoteDetail}
        isChatVisible={isChatVisible}
        setIsChatVisible={setIsChatVisible}
        isLoadingNote={isLoadingNote}
        setIsLeftSidebarOpen={setIsLeftSidebarOpen}
        isLeftSidebarOpen={isLeftSidebarOpen}
      >
        <OmniSearch onSelectNote={handleNodeClick} />
      </MainContent>
      
      <AnimatePresence>
        {isChatVisible && (
          <motion.div
            initial={isMobile ? { x: "100%", opacity: 0 } : { width: 0, opacity: 0 }}
            animate={isMobile ? { x: 0, opacity: 1 } : { width: 400, opacity: 1 }}
            exit={isMobile ? { x: "100%", opacity: 0 } : { width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className={`h-full shrink-0 z-50 overflow-hidden ${isMobile ? 'fixed inset-y-0 right-0 w-full' : 'relative z-20'}`}
          >
            <ChatSidebar 
              onNodeClick={handleNodeClick} 
              setIsChatVisible={setIsChatVisible} 
              activeNoteSlug={activeNoteSlug}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
