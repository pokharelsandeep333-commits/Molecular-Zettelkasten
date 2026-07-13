import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const VAULT_PATH = process.env.VAULT_PATH || '';

export interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: TreeNode[];
}

async function buildTree(dir: string, baseDir: string): Promise<TreeNode[]> {
  const nodes: TreeNode[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    // Sort directories first, then files
    const sortedEntries = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of sortedEntries) {
      if (dir === baseDir) {
        const allowedRootEntries = ['Raw', 'Wiki', 'AGENTS.md', 'Cloud Infrastructure.md'];
        if (!allowedRootEntries.includes(entry.name)) {
          continue;
        }
      } else {
        if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
      }
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        const children = await buildTree(fullPath, baseDir);
        // Only include folders that have content
        if (children.length > 0) {
          nodes.push({
            name: entry.name,
            type: 'folder',
            path: relativePath,
            children
          });
        }
      } else if (entry.name.endsWith('.md')) {
        nodes.push({
          name: entry.name.replace(/\.md$/, ''),
          type: 'file',
          path: relativePath.replace(/\.md$/, ''),
        });
      }
    }
  } catch {
    // Skip unreadable
  }
  return nodes;
}

export async function GET() {
  if (!VAULT_PATH) {
    return NextResponse.json({ error: 'VAULT_PATH not configured' }, { status: 500 });
  }

  try {
    const tree = await buildTree(VAULT_PATH, VAULT_PATH);
    return NextResponse.json({ tree });
  } catch (err) {
    console.error("Error building tree:", err);
    return NextResponse.json({ error: 'Failed to read vault tree' }, { status: 500 });
  }
}
