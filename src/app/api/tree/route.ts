import { NextResponse } from 'next/server';
import { guard } from '@/lib/firebase-admin';
import { RAW_MIME_TYPES } from '@/lib/vault';
import { promises as fs } from 'fs';
import path from 'path';

const getVaultPath = () => process.env.VAULT_PATH || '';

export interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: TreeNode[];
}

async function buildTree(dir: string, baseDir: string): Promise<TreeNode[]> {
  const nodes: TreeNode[] = [];
  try {
    const entries = await fs.readdir(/*turbopackIgnore: true*/ dir, { withFileTypes: true });
    
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
      } else {
        const isMd = entry.name.endsWith('.md');
        // Only list files the viewer can open (notes and supported media).
        if (!isMd && !RAW_MIME_TYPES[path.extname(entry.name).toLowerCase()]) continue;
        nodes.push({
          name: isMd ? entry.name.replace(/\.md$/, '') : entry.name,
          type: 'file',
          path: isMd ? relativePath.replace(/\.md$/, '') : relativePath,
        });
      }
    }
  } catch {
    // Skip unreadable
  }
  return nodes;
}

export async function GET(request: Request) {
  const { response } = await guard(request);
  if (response) return response;

  const vaultPath = getVaultPath();
  if (!vaultPath) {
    return NextResponse.json({ error: 'Vault is not configured' }, { status: 500 });
  }

  try {
    const tree = await buildTree(vaultPath, vaultPath);
    return NextResponse.json({ tree });
  } catch (err) {
    console.error("Error building tree:", err);
    return NextResponse.json({ error: 'Failed to read vault tree' }, { status: 500 });
  }
}
