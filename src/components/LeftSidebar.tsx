import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, FileText, Search, ChevronRight, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { TreeNode } from '@/app/api/tree/route';

interface LeftSidebarProps {
  onNodeClick: (slug: string) => void;
  activeNoteSlug: string | null;
  isLeftSidebarOpen: boolean;
  setIsLeftSidebarOpen: (v: boolean) => void;
}

const FileTreeNode: React.FC<{
  node: TreeNode;
  level: number;
  onNodeClick: (slug: string) => void;
  activeNoteSlug: string | null;
}> = ({ node, level, onNodeClick, activeNoteSlug }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isFile = node.type === 'file';
  const isActive = activeNoteSlug === node.path;

  return (
    <div className="select-none">
      <div
        className={`flex items-center py-1 px-2 cursor-pointer rounded-sm mx-2 text-sm transition-colors ${
          isActive
            ? 'bg-[#00F0FF]/15 text-[#00F0FF] font-medium'
            : 'text-[#00F0FF]/50 hover:bg-[#00F0FF]/10 hover:text-[#00F0FF]/90'
        }`}
        style={{ paddingLeft: `${(level * 12) + 8}px` }}
        onClick={() => {
          if (isFile) {
            onNodeClick(node.path);
          } else {
            setIsOpen(!isOpen);
          }
        }}
      >
        <span className={`mr-1.5 shrink-0 ${isActive ? 'text-[#00F0FF]' : 'text-[#00F0FF]/40'}`}>
          {isFile ? (
            <FileText size={14} />
          ) : (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          )}
        </span>
        {!isFile && (
          <span className={`mr-2 shrink-0 ${isActive ? 'text-[#00F0FF]' : 'text-[#00F0FF]/40'}`}>
            {isOpen ? <FolderOpen size={14} /> : <Folder size={14} />}
          </span>
        )}
        <span className="truncate">{node.name}</span>
      </div>
      
      {!isFile && isOpen && node.children && (
        <div className="flex flex-col mt-0.5">
          {node.children.map((child, i) => (
            <FileTreeNode
              key={i}
              node={child}
              level={level + 1}
              onNodeClick={onNodeClick}
              activeNoteSlug={activeNoteSlug}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onNodeClick,
  activeNoteSlug,
  isLeftSidebarOpen,
  setIsLeftSidebarOpen
}) => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const { user, logout } = useAuth();

  useEffect(() => {
    fetch('/api/tree')
      .then(res => res.json())
      .then(data => {
        if (data.tree) setTreeData(data.tree);
      });
  }, []);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isLeftSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsLeftSidebarOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <div className={`fixed inset-y-0 left-0 w-[280px] h-full flex flex-col bg-[#001E3C]/40 backdrop-blur-md border-r border-[#00F0FF]/20 shrink-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
        isLeftSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}>
      
      {/* App Header */}
      <div className="h-14 flex items-center px-5 shrink-0 border-b border-[#00F0FF]/20">
        <span className="font-tech text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] to-white tracking-widest text-lg font-bold">NEURAL MATRIX</span>
      </div>

      {/* Top Header */}
      <div className="h-10 flex items-center justify-between px-5 shrink-0 mt-2">
        <h2 className="font-mono tracking-widest text-[11px] text-[#00F0FF]/60 font-semibold uppercase">DATA CORES</h2>
      </div>

      <div className="px-4 py-2 mb-2">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-omni-search'))}
          className="w-full bg-[#00F0FF]/5 hover:bg-[#00F0FF]/15 text-[#00F0FF]/80 rounded-md py-1.5 px-3 text-xs font-mono tracking-wider flex items-center justify-between transition-colors border border-[#00F0FF]/20 hover:border-[#00F0FF]/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.2)]"
        >
          <div className="flex items-center gap-2">
            <Search size={13} className="text-[#00F0FF]/70" />
            <span>OMNI-SEARCH</span>
          </div>
          <span className="font-sans text-[10px] bg-[#02050C] text-[#00F0FF]/70 border border-[#00F0FF]/30 px-1.5 py-0.5 rounded font-medium">⌘K</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        <div className="flex flex-col gap-0.5">
          {treeData.map((node, i) => (
            <FileTreeNode
              key={i}
              node={node}
              level={0}
              onNodeClick={(slug) => {
                onNodeClick(slug);
                setIsLeftSidebarOpen(false); // Close on mobile after click
              }}
              activeNoteSlug={activeNoteSlug}
            />
          ))}
        </div>
      </div>

      {/* User Profile + Logout */}
      {user && (
        <div className="shrink-0 border-t border-[#00F0FF]/20 px-4 py-3">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="w-8 h-8 rounded-full border border-[#00F0FF]/40 shadow-[0_0_8px_rgba(0,240,255,0.2)] shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#00F0FF]/20 border border-[#00F0FF]/40 flex items-center justify-center shrink-0 text-[#00F0FF] text-xs font-bold">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-white/90 font-medium truncate">{user.displayName || 'User'}</p>
              <p className="text-[9px] text-[#00F0FF]/40 font-mono tracking-wider truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-[#00F0FF]/40 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

