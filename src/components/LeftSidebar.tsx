import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { Atom, Folder, FolderOpen, FileText, Search, ChevronRight, ChevronDown, LogOut, PanelLeftClose, X, Loader2 } from 'lucide-react';
import { useDrawerFocus } from '@/lib/useDrawerFocus';
import { useMediaQuery, MOBILE_QUERY } from '@/lib/useMediaQuery';
import { useAuth } from '@/context/AuthContext';

import type { TreeNode } from '@/app/api/tree/route';

interface LeftSidebarProps {
  treeData: TreeNode[];
  treeState: 'loading' | 'ready' | 'error';
  onHome: () => void;
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
  const containsActiveNote = !isFile && !!activeNoteSlug?.startsWith(`${node.path}/`);
  const [isOpen, setIsOpen] = useState(containsActiveNote);
  const [lastActiveSlug, setLastActiveSlug] = useState(activeNoteSlug);

  // Reveal the selected file after search or a wikilink, while allowing manual collapse.
  if (activeNoteSlug !== lastActiveSlug) {
    setLastActiveSlug(activeNoteSlug);
    if (containsActiveNote) setIsOpen(true);
  }

  return (
    <div className="select-none">
      <button
        type="button"
        className={`w-[calc(100%-1rem)] flex items-center min-h-11 md:min-h-8 py-2 md:py-1.5 px-2 rounded-sm mx-2 text-sm text-left transition-colors ${
          isActive
            ? 'bg-brass/15 text-brass font-medium'
            : 'text-muted hover:bg-brass/10 hover:text-paper'
        }`}
        style={{ paddingLeft: `${(level * 12) + 8}px` }}
        onClick={() => (isFile ? onNodeClick(node.path) : setIsOpen(!isOpen))}
        aria-expanded={isFile ? undefined : isOpen}
        aria-current={isActive ? 'page' : undefined}
        title={node.name}
      >
        <span className={`mr-1.5 shrink-0 ${isActive ? 'text-brass' : 'text-muted'}`}>
          {isFile ? (
            <FileText size={14} />
          ) : (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          )}
        </span>
        {!isFile && (
          <span className={`mr-2 shrink-0 ${isActive ? 'text-brass' : 'text-muted'}`}>
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
  treeData,
  treeState,
  onHome,
  activeNoteSlug,
  isLeftSidebarOpen,
  setIsLeftSidebarOpen
}) => {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const drawerRef = useDrawerFocus<HTMLElement>(isMobile && isLeftSidebarOpen);
  const { user, logout } = useAuth();
  const isMac = useSyncExternalStore(() => () => {}, isMacPlatform, () => true);

  useEffect(() => {
    if (!isLeftSidebarOpen || !isMobile) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) setIsLeftSidebarOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isMobile, isLeftSidebarOpen, setIsLeftSidebarOpen]);

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
        ref={drawerRef}
        aria-label="Vault"
        className={`fixed inset-y-0 left-0 h-full flex flex-col bg-background/95 md:bg-panel backdrop-blur-md border-rule shrink-0 z-50 transition-all duration-300 ease-in-out md:relative overflow-hidden ${
          isLeftSidebarOpen ? 'translate-x-0 w-[min(85vw,300px)] md:w-[260px] border-r' : '-translate-x-full md:translate-x-0 w-[min(85vw,300px)] md:w-0 border-r-0'
        }`}
        // Keep the collapsed drawer out of the tab order.
        inert={!isLeftSidebarOpen}
      >
      <div className="w-[min(85vw,300px)] md:w-[260px] md:min-w-[260px] h-full flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">

      {/* App Header */}
      <div className="h-16 flex items-center justify-between px-5 shrink-0 border-b border-rule">
        <button className="wordmark text-left" onClick={() => { onHome(); closeOnSmallScreens(); }} aria-label="Vault home">
          <Atom aria-hidden="true" /><span className="leading-tight">Molecular<br />Zettelkasten</span>
        </button>
        <button
          onClick={() => setIsLeftSidebarOpen(false)}
          className="text-muted hover:text-brass transition-colors inline-grid place-items-center min-w-11 min-h-11 md:min-w-8 md:min-h-8 p-1.5 rounded-md hover:bg-brass/10"
          title="Collapse Sidebar (Ctrl/Cmd + B)"
          aria-label="Close sidebar"
        >
          <X size={18} className="md:hidden" />
          <PanelLeftClose size={18} className="hidden md:block" />
        </button>
      </div>

      <div className="px-4 py-5">
        <button
          onClick={() => {
            closeOnSmallScreens();
            window.dispatchEvent(new CustomEvent('open-omni-search'));
          }}
          className="w-full bg-brass/5 hover:bg-brass/15 text-muted rounded-md py-2.5 px-3 text-sm flex items-center justify-between transition-colors border border-rule hover:border-brass/50"
        >
          <div className="flex items-center gap-2">
            <Search size={13} className="text-muted" />
            <span>Search vault</span>
          </div>
          <span className="hidden md:inline font-sans text-[10px] bg-background text-muted border border-rule px-1.5 py-0.5 rounded font-medium">
            {isMac ? '⌘K' : 'Ctrl K'}
          </span>
        </button>
      </div>

      <h2 className="px-5 pb-1 text-xs text-muted font-medium">File browser</h2>
      <div className="flex-1 overflow-y-auto overscroll-contain py-2 custom-scrollbar">
        {treeState === 'loading' && (
          <div className="flex items-center gap-2 px-5 py-3 text-muted text-xs" role="status">
            <Loader2 size={14} className="animate-spin" /> Loading files…
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
        <div className="shrink-0 border-t border-rule px-4 py-3">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-brass/40  shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brass/20 border border-brass/40 flex items-center justify-center shrink-0 text-brass text-xs font-bold">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-paper font-medium truncate">{user.displayName || 'User'}</p>
              <p className="text-xs text-muted truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-md text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
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
