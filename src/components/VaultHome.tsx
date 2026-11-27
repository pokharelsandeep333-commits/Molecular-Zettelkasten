import { ArrowRight, FileText, Search } from 'lucide-react';
import { useState } from 'react';
import type { TreeNode } from '@/app/api/tree/route';
import { readJson } from '@/lib/storage';

function firstFiles(nodes: TreeNode[], limit: number): string[] {
  const files: string[] = [];
  for (const node of nodes) {
    if (files.length === limit) break;
    if (node.type === 'file') files.push(node.path);
    else if (node.children) files.push(...firstFiles(node.children, limit - files.length));
  }
  return files;
}

export function VaultHome({ tree, treeState, onOpen }: {
  tree: TreeNode[];
  treeState: 'loading' | 'ready' | 'error';
  onOpen: (slug: string) => void;
}) {
  const [recent] = useState(() => readJson<string[]>('arc_recent_files', []));
  const hasRecent = Array.isArray(recent) && recent.some(slug => typeof slug === 'string');
  const notes = hasRecent ? recent.filter(slug => typeof slug === 'string').slice(0, 5) : firstFiles(tree, 5);

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="vault-cover">
        <h1 className="display-title">Your vault</h1>
        <p>Find a note or explore a connection.</p>
        <button className="vault-search" onClick={() => window.dispatchEvent(new CustomEvent('open-omni-search'))}>
          <Search size={16} /> Search vault
        </button>
      </div>
      <h2 className="mt-9 mb-4 text-xl font-medium tracking-tight">{hasRecent ? 'Recently opened' : 'From your vault'}</h2>
      {notes.length ? (
        <ul className="border-t border-rule">
          {notes.map(slug => {
            const segments = slug.split('/');
            const title = segments.pop()?.replace(/\.md$/i, '').replace(/[_-]/g, ' ');
            return <li key={slug} className="border-b border-rule">
              <button className="group flex w-full gap-4 items-center py-4 px-2 text-left hover:bg-panel transition-colors" onClick={() => onOpen(slug)}>
                <FileText size={18} className="text-brass shrink-0" />
                <span className="flex-1 min-w-0"><span className="block truncate text-sm font-medium">{title}</span>
                  {segments.length > 0 && <span className="block truncate text-xs mt-1 text-muted">{segments.join(' / ')}</span>}
                </span>
                <ArrowRight size={15} className="text-muted group-hover:text-brass shrink-0" />
              </button>
            </li>;
          })}
        </ul>
      ) : <p className="border-t border-rule py-5 text-sm text-muted" role="status">
        {treeState === 'loading' ? 'Loading your notes…' : treeState === 'error' ? 'Your notes couldn’t be loaded. Refresh to try again.' : 'Your vault has no files yet.'}
      </p>}
    </section>
  );
}
