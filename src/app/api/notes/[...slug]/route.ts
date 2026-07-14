import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';

const VAULT_PATH = process.env.VAULT_PATH || '';

async function findFileRecursive(dir: string, targetName: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = await findFileRecursive(fullPath, targetName);
        if (found) return found;
      } else {
        if (entry.name.toLowerCase() === targetName.toLowerCase()) {
          return fullPath;
        }
      }
    }
  } catch {
    // Ignore read errors in subdirectories
  }
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  if (!VAULT_PATH) {
    return NextResponse.json({ error: 'VAULT_PATH not configured' }, { status: 500 });
  }

  // Next.js 15: params is a Promise, must be awaited
  const { slug: slugSegments } = await params;
  const slug = slugSegments.map(decodeURIComponent).join('/');
  const filePath = path.join(VAULT_PATH, `${slug}.md`);

  // Prevent path traversal attacks
  const resolvedPath = path.resolve(filePath);
  const resolvedVault = path.resolve(VAULT_PATH);
  if (!resolvedPath.startsWith(resolvedVault)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let actualFilePath = filePath;
  let content = '';

  try {
    content = await fs.readFile(actualFilePath, 'utf-8');
  } catch {
    // Fallback: search recursively for the basename (case-insensitive)
    const targetName = path.basename(filePath);
    const foundPath = await findFileRecursive(VAULT_PATH, targetName);
    if (foundPath) {
      actualFilePath = foundPath;
      content = await fs.readFile(actualFilePath, 'utf-8');
    } else {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
  }

  try {
    const { data, content: body } = matter(content);
    const title = data.title || path.basename(actualFilePath, '.md');
    const tags: string[] = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);

    return NextResponse.json({
      slug,
      title,
      tags,
      created: data.created || data.date || '',
      modified: data.modified || data.updated || '',
      content: body,
      frontmatter: data,
    });
  } catch {
    return NextResponse.json({ error: 'Error parsing note' }, { status: 500 });
  }
}
