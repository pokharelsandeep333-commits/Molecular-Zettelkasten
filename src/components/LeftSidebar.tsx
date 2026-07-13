import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, FileText, Search, ChevronRight, ChevronDown } from 'lucide-react';
import type { TreeNode } from '@/app/api/tree/route';

interface LeftSidebarProps {
  onNodeClick: (slug: string) => void;
  activeNoteSlug: string | null;
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
        className={`flex items-center py-1.5 px-2 cursor-pointer rounded-md mx-2 text-sm transition-colors ${
          isActive
            ? 'bg-electric-cyan/10 text-electric-cyan font-medium'
            : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
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
        <span className="mr-1.5 text-muted-steel shrink-0">
          {isFile ? (
            <FileText size={14} className={isActive ? 'text-electric-cyan' : ''} />
          ) : (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          )}
        </span>
        {!isFile && (
          <span className="mr-2 text-muted-steel shrink-0">
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
  activeNoteSlug
}) => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);

  useEffect(() => {
    fetch('/api/tree')
      .then(res => res.json())
      .then(data => {
        if (data.tree) setTreeData(data.tree);
      });
  }, []);

  return (
    <div className="w-[300px] h-full flex flex-col bg-surface-container-lowest border-r border-whisper-border shrink-0">
      
      {/* App Header */}
      <div className="h-12 border-b border-whisper-border flex items-center px-4 shrink-0">
        <span className="font-bold text-on-surface tracking-wide">The Arc Vault</span>
      </div>

      {/* Top Header */}
      <div className="h-12 border-b border-whisper-border flex items-center justify-between px-4 shrink-0 bg-surface-container/50">
        <h2 className="font-tech tracking-widest text-sm text-muted-steel uppercase">Data Cores</h2>
      </div>

      <div className="px-4 py-3 border-b border-whisper-border">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-omni-search'))}
          className="w-full bg-surface-container border border-whisper-border hover:border-electric-cyan/50 text-muted-steel hover:text-electric-cyan rounded-md py-2 px-3 text-xs font-tech tracking-wider flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-2">
            <Search size={14} />
            <span>OMNI-SEARCH</span>
          </div>
          <span className="font-mono text-[10px] bg-abyssal-bg px-1.5 py-0.5 rounded">⌘K</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="flex flex-col">
          {treeData.map((node, i) => (
            <FileTreeNode
              key={i}
              node={node}
              level={0}
              onNodeClick={onNodeClick}
              activeNoteSlug={activeNoteSlug}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
