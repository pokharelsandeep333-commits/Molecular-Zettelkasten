import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { Folder, FolderOpen, FileText, Search, ChevronRight, ChevronDown, LogOut, PanelLeftClose, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authFetchJson } from '@/lib/authFetch';
import type { TreeNode } from '@/app/api/tree/route';

interface LeftSidebarProps {
  onNodeClick: (slug: string) => void;
  activeNoteSlug: string | null;
  isLeftSidebarOpen: boolean;
  setIsLeftSidebarOpen: (v: boolean) => void;
}

const isMacPlatform = () => /Mac|iPhone|iPad/.test(navigator.userAgent);

const FileTreeNode: React.FC<{
  node: TreeNode;
  level: number;
  onNodeClick: (slug: string) => void;
  activeNoteSlug: string | null;
}> = ({ node, level, onNodeClick, activeNoteSlug }) => {
  const isFile = node.type === 'file';
  const isActive = activeNoteSlug === node.path;
  // Folders on the path to the open note start expanded.
  const [isOpen, setIsOpen] = useState(() => !isFile && !!activeNoteSlug?.startsWith(`${node.path}/`));

  return (
    <div className="select-none">
      <button
        type="button"
        className={`w-[calc(100%-1rem)] flex items-center py-2 md:py-1 px-2 rounded-sm mx-2 text-sm text-left transition-colors ${
          isActive
            ? 'bg-[#00F0FF]/15 text-[#00F0FF] font-medium'
            : 'text-[#00F0FF]/50 hover:bg-[#00F0FF]/10 hover:text-[#00F0FF]/90'
        }`}
        style={{ paddingLeft: `${(level * 12) + 8}px` }}
        onClick={() => (isFile ? onNodeClick(node.path) : setIsOpen(!isOpen))}
        aria-expanded={isFile ? undefined : isOpen}
        aria-current={isActive ? 'page' : undefined}
        title={node.name}
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
      </button>

      {!isFile && isOpen && node.children && (
        <div className="flex flex-col mt-0.5" role="group">
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
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
  const [treeState, setTreeState] = useState<'loading' | 'ready' | 'error'>('loading');
  const { user, logout } = useAuth();
  const isMac = useSyncExternalStore(() => () => {}, isMacPlatform, () => true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    authFetchJson<{ tree: TreeNode[] }>('/api/tree')
      .then(data => {
        if (cancelled) return;
        setTreeData(data.tree || []);
        setTreeState('ready');
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Failed to load vault tree', err);
        setTreeState('error');
      });
    return () => { cancelled = true; };
  }, [user]);

  const closeOnSmallScreens = () => {
    if (window.matchMedia('(max-width: 767px)').matches) setIsLeftSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isLeftSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsLeftSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Content */}
      <nav
        aria-label="Vault"
        className={`fixed inset-y-0 left-0 h-full flex flex-col bg-[#02050C]/95 md:bg-[#001E3C]/40 backdrop-blur-md border-[#00F0FF]/20 shrink-0 z-50 transition-all duration-300 ease-in-out md:relative overflow-hidden ${
          isLeftSidebarOpen ? 'translate-x-0 shadow-2xl w-[min(85vw,300px)] md:w-[280px] border-r' : '-translate-x-full md:translate-x-0 w-[min(85vw,300px)] md:w-0 border-r-0'
        }`}
        // Keep the collapsed drawer out of the tab order.
        inert={!isLeftSidebarOpen}
      >
      <div className="w-[min(85vw,300px)] md:w-[280px] md:min-w-[280px] h-full flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">

      {/* App Header */}
      <div className="h-14 flex items-center justify-between px-5 shrink-0 border-b border-[#00F0FF]/20">
        <span className="font-tech text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] to-white tracking-widest text-lg font-bold">NEURAL MATRIX</span>
        <button
          onClick={() => setIsLeftSidebarOpen(false)}
          className="text-[#00F0FF]/60 hover:text-[#00F0FF] transition-colors p-1.5 rounded-md hover:bg-[#00F0FF]/10"
          title="Collapse Sidebar (Ctrl/Cmd + B)"
          aria-label="Close sidebar"
        >
          <X size={18} className="md:hidden" />
          <PanelLeftClose size={18} className="hidden md:block" />
        </button>
      </div>

      {/* Top Header */}
      <div className="h-10 flex items-center justify-between px-5 shrink-0 mt-2">
        <h2 className="font-mono tracking-widest text-[11px] text-[#00F0FF]/60 font-semibold uppercase">DATA CORES</h2>
      </div>

      <div className="px-4 py-2 mb-2">
        <button
          onClick={() => {
            closeOnSmallScreens();
            window.dispatchEvent(new CustomEvent('open-omni-search'));
          }}
          className="w-full bg-[#00F0FF]/5 hover:bg-[#00F0FF]/15 text-[#00F0FF]/80 rounded-md py-2 md:py-1.5 px-3 text-xs font-mono tracking-wider flex items-center justify-between transition-colors border border-[#00F0FF]/20 hover:border-[#00F0FF]/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.2)]"
        >
          <div className="flex items-center gap-2">
            <Search size={13} className="text-[#00F0FF]/70" />
            <span>OMNI-SEARCH</span>
          </div>
          <span className="hidden md:inline font-sans text-[10px] bg-[#02050C] text-[#00F0FF]/70 border border-[#00F0FF]/30 px-1.5 py-0.5 rounded font-medium">
            {isMac ? '⌘K' : 'Ctrl K'}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain py-2 custom-scrollbar">
        {treeState === 'loading' && (
          <div className="flex items-center gap-2 px-5 py-3 text-[#00F0FF]/50 text-xs font-mono tracking-widest" role="status">
            <Loader2 size={14} className="animate-spin" /> LOADING VAULT...
          </div>
        )}
        {treeState === 'error' && (
          <div className="px-5 py-3 text-red-300/80 text-xs font-mono" role="alert">
            Could not load the vault. Try refreshing.
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          {treeData.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              level={0}
              onNodeClick={(slug) => {
                onNodeClick(slug);
                closeOnSmallScreens();
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
                alt=""
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-[#00F0FF]/40 shadow-[0_0_8px_rgba(0,240,255,0.2)] shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#00F0FF]/20 border border-[#00F0FF]/40 flex items-center justify-center shrink-0 text-[#00F0FF] text-xs font-bold">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-white/90 font-medium truncate">{user.displayName || 'User'}</p>
              <p className="text-[10px] text-[#00F0FF]/50 font-mono tracking-wider truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-md text-[#00F0FF]/50 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
      </div>
      </nav>
    </>
  );
};
