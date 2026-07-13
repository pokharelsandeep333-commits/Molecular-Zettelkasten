import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';

const VAULT_PATH = process.env.VAULT_PATH || '';

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

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data, content: body } = matter(content);
    const title = data.title || path.basename(filePath, '.md');
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
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }
}
