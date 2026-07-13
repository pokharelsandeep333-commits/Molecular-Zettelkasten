import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';

const VAULT_PATH = process.env.VAULT_PATH || '';

export interface NoteMetadata {
  slug: string;
  title: string;
  tags: string[];
  created: string;
  modified: string;
  excerpt: string;
}

async function getMarkdownFiles(dir: string, baseDir: string = dir): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const nested = await getMarkdownFiles(fullPath, baseDir);
        files.push(...nested);
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  } catch {
    // Skip unreadable directories
  }
  return files;
}

function slugify(filePath: string, baseDir: string): string {
  const relative = path.relative(baseDir, filePath);
  return relative.replace(/\\/g, '/').replace(/\.md$/, '');
}

export async function GET(request: Request) {
  if (!VAULT_PATH) {
    return NextResponse.json({ error: 'VAULT_PATH not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';
  const limit = parseInt(searchParams.get('limit') || '500', 10);
  const tag = searchParams.get('tag') || '';

  try {
    const files = await getMarkdownFiles(VAULT_PATH);
    const notes: NoteMetadata[] = [];

    for (const filePath of files) {
      const content = await fs.readFile(filePath, 'utf-8');
      const { data, content: body } = matter(content);
      const slug = slugify(filePath, VAULT_PATH);
      const title = data.title || path.basename(filePath, '.md');
      const tags: string[] = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);
      const excerpt = body.replace(/#+\s/g, '').replace(/\[\[.*?\]\]/g, '').trim().slice(0, 200);

      // Filter by tag if provided
      if (tag && !tags.some(t => t.toLowerCase() === tag.toLowerCase())) continue;

      // Filter by query (title + tags + excerpt)
      if (query) {
        const haystack = `${title} ${tags.join(' ')} ${excerpt}`.toLowerCase();
        if (!haystack.includes(query)) continue;
      }

      notes.push({
        slug,
        title,
        tags,
        created: data.created || data.date || '',
        modified: data.modified || data.updated || '',
        excerpt,
      });

      if (notes.length >= limit) break;
    }

    return NextResponse.json({ notes, total: notes.length });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read vault' }, { status: 500 });
  }
}
