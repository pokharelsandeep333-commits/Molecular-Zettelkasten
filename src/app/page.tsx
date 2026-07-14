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

export default function Dashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Note State
  const [activeNoteSlug, setActiveNoteSlug] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeNoteDetail, setActiveNoteDetail] = useState<any>(null);
  const [isLoadingNote, setIsLoadingNote] = useState(false);

  // Chat State
  const [isChatVisible, setIsChatVisible] = useState(false);

  // Mobile Layout State
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
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
    } catch {
       
      setIsChatVisible(true);
    }
  }, []);

  // Save State on Change
  useEffect(() => {
    localStorage.setItem('arc_chat_visible', isChatVisible.toString());
  }, [isChatVisible]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD+\ or CTRL+\ to toggle Chat
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setIsChatVisible(prev => !prev);
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
      
      setActiveNoteDetail({
        id: slug.split('/').pop()?.toUpperCase().replace(/-/g, '') || slug,
        title: data.title,
        content: <MarkdownRenderer content={data.content} />,
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
      
      <OmniSearch onSelectNote={handleNodeClick} />
      
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
      />
      
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
