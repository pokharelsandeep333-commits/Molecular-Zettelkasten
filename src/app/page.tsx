'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { NoteMetadata } from '@/app/api/notes/route';
import { LeftSidebar } from '@/components/LeftSidebar';
import { MainContent } from '@/components/MainContent';
import { ChatSidebar } from '@/components/ChatSidebar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { OmniSearch } from '@/components/OmniSearch';

export interface GraphNode {
  id: string;
  name: string;
  group: string;
  val: number;
}
export interface GraphLink {
  source: string;
  target: string;
}
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export default function Dashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Search State has been moved to OmniSearch.tsx

  // Note State
  const [activeNoteSlug, setActiveNoteSlug] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeNoteDetail, setActiveNoteDetail] = useState<any>(null);
  const [isLoadingNote, setIsLoadingNote] = useState(false);

  // Graph State
  const [isGraphView, setIsGraphView] = useState(false);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });

  // Chat State
  const [isChatVisible, setIsChatVisible] = useState(true);

  // Load Persisted State on Mount
  useEffect(() => {
    try {
      const savedChat = localStorage.getItem('arc_chat_visible');
      // eslint-disable-next-line
      if (savedChat !== null) setIsChatVisible(savedChat === 'true');

      const savedGraph = localStorage.getItem('arc_graph_view');
      if (savedGraph !== null) setIsGraphView(savedGraph === 'true');
    } catch {
      // Ignore local storage errors
    }
  }, []);

  // Save State on Change
  useEffect(() => {
    localStorage.setItem('arc_chat_visible', isChatVisible.toString());
  }, [isChatVisible]);

  useEffect(() => {
    localStorage.setItem('arc_graph_view', isGraphView.toString());
  }, [isGraphView]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD+\ or CTRL+\ to toggle Chat
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setIsChatVisible(prev => !prev);
      }
      // ESC to close Graph
      if (e.key === 'Escape') {
        setIsGraphView(false);
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

  // Build Graph Data from notes
  const buildGraph = useCallback((notesToBuild: NoteMetadata[]) => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIds = new Set<string>();

    notesToBuild.forEach(note => {
      if (!nodeIds.has(note.slug)) {
        nodes.push({
          id: note.slug,
          name: note.title,
          group: note.tags?.[0] || 'untyped',
          val: 1
        });
        nodeIds.add(note.slug);
      }
    });

    // Create edges based on shared tags
    for (let i = 0; i < notesToBuild.length; i++) {
      for (let j = i + 1; j < notesToBuild.length; j++) {
        const t1 = notesToBuild[i].tags || [];
        const t2 = notesToBuild[j].tags || [];
        if (t1.some(t => t2.includes(t))) {
          links.push({
            source: notesToBuild[i].slug,
            target: notesToBuild[j].slug,
          });
        }
      }
    }

    setGraphData({ nodes, links });
  }, []);

  // Search functionality is now completely handled within OmniSearch.tsx

  // Load all notes for graph on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/notes?limit=500')
        .then(r => r.json())
        .then(data => {
          if (data.notes) buildGraph(data.notes);
        });
    }
  }, [isAuthenticated, buildGraph]);

  // Handle Node Selection
  const handleNodeClick = useCallback(async (slug: string) => {
    setActiveNoteSlug(slug);
    setIsLoadingNote(true);
    localStorage.setItem('arc_active_note', slug);
    // If graph view is active, turn it off so they can read the note
    setIsGraphView(false);
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
    return <div className="min-h-screen bg-abyssal-bg flex items-center justify-center text-muted-steel">Authenticating...</div>;
  }

  return (
    <div className="h-screen w-full bg-abyssal-bg text-on-surface font-sans overflow-hidden flex">
      <OmniSearch onSelectNote={handleNodeClick} />
      
      <LeftSidebar 
        onNodeClick={handleNodeClick}
        activeNoteSlug={activeNoteSlug}
      />
      <MainContent 
        activeNoteDetail={activeNoteDetail}
        activeNoteSlug={activeNoteSlug}
        graphData={graphData}
        isGraphView={isGraphView}
        setIsGraphView={setIsGraphView}
        isChatVisible={isChatVisible}
        setIsChatVisible={setIsChatVisible}
        onNodeClick={handleNodeClick}
        isLoadingNote={isLoadingNote}
      />
      
      {isChatVisible && <ChatSidebar onNodeClick={handleNodeClick} />}
    </div>
  );
}
