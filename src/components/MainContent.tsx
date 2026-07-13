import React from 'react';
import { Network, FileText, MessageSquare } from 'lucide-react';
import { GraphView } from '@/components/GraphView';
import type { GraphData } from '@/app/page';

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
  activeNoteSlug: string | null;
  graphData: GraphData;
  isGraphView: boolean;
  setIsGraphView: (v: boolean) => void;
  isChatVisible: boolean;
  setIsChatVisible: (v: boolean) => void;
  onNodeClick: (slug: string) => void;
  isLoadingNote?: boolean;
}

export const MainContent: React.FC<MainContentProps> = ({
  activeNoteDetail,
  activeNoteSlug,
  graphData,
  isGraphView,
  setIsGraphView,
  isChatVisible,
  setIsChatVisible,
  onNodeClick,
  isLoadingNote
}) => {
  return (
    <div className="flex-1 min-w-0 h-full flex flex-col bg-surface-dim relative transition-all duration-300 ease-in-out">
      
      {/* Top Header */}
      <div className="h-12 border-b border-whisper-border bg-surface-container/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-2">
          {activeNoteDetail ? (
            <>
              <FileText size={16} className="text-electric-cyan" />
              <span className="font-tech text-electric-cyan tracking-wider truncate max-w-xl text-sm">
                {activeNoteDetail.title}
              </span>
            </>
          ) : (
            <span className="text-muted-steel font-tech tracking-widest text-sm">STANDBY...</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsGraphView(!isGraphView)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-tech transition-colors border ${
              isGraphView
                ? 'bg-electric-cyan/20 border-electric-cyan/50 text-electric-cyan shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'bg-surface-container border-whisper-border hover:border-electric-cyan/50 text-muted-steel hover:text-on-surface'
            }`}
          >
            <Network size={14} />
            {isGraphView ? 'CLOSE NETWORK' : 'NETWORK'}
          </button>
          
          <button
            onClick={() => setIsChatVisible(!isChatVisible)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-tech transition-colors border ${
              isChatVisible
                ? 'bg-electric-cyan/20 border-electric-cyan/50 text-electric-cyan shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'bg-surface-container border-whisper-border hover:border-electric-cyan/50 text-muted-steel hover:text-on-surface'
            }`}
          >
            <MessageSquare size={14} />
            {isChatVisible ? 'STANDBY O.R.I.O.N.' : 'ACTIVATE O.R.I.O.N.'}
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-hidden relative">
        {isGraphView ? (
          <GraphView 
            graphData={graphData} 
            activeNoteSlug={activeNoteSlug} 
            onNodeClick={onNodeClick} 
          />
        ) : (
          <div className="h-full overflow-y-auto px-10 py-8">
            {isLoadingNote ? (
              <div className="max-w-3xl mx-auto flex flex-col gap-4 animate-pulse">
                <div className="h-8 w-1/3 bg-electric-cyan/20 rounded-md shadow-[0_0_15px_rgba(6,182,212,0.1)] mb-4"></div>
                <div className="h-4 w-full bg-surface-container-high rounded-md"></div>
                <div className="h-4 w-5/6 bg-surface-container-high rounded-md"></div>
                <div className="h-4 w-4/6 bg-surface-container-high rounded-md mb-4"></div>
                <div className="h-32 w-full glass-panel opacity-50"></div>
                <div className="h-4 w-full bg-surface-container-high rounded-md mt-4"></div>
                <div className="h-4 w-3/4 bg-surface-container-high rounded-md"></div>
              </div>
            ) : activeNoteDetail ? (
              <div className="max-w-3xl mx-auto transition-opacity duration-300">
                {activeNoteDetail.tags && activeNoteDetail.tags.length > 0 && (
                  <div className="mb-6 flex flex-wrap gap-2">
                    {activeNoteDetail.tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-1 rounded-md bg-electric-cyan/10 border border-electric-cyan/30 text-xs font-tech tracking-wider uppercase text-electric-cyan shadow-[0_0_5px_rgba(6,182,212,0.2)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="prose prose-invert prose-lg max-w-none text-on-surface">
                  {activeNoteDetail.content}
                </div>
                <div className="mt-12 pt-6 border-t border-whisper-border flex justify-between text-xs text-muted-steel font-mono">
                  <span>Created: {activeNoteDetail.createdDate}</span>
                  <span>Modified: {activeNoteDetail.modifiedDate}</span>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-steel flex-col gap-4">
                <FileText size={48} className="opacity-20" />
                <p>Select a note from the left sidebar to view it.</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
