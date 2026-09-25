import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { guard } from '@/lib/firebase-admin';
import {
  locateVaultFile,
  parseFrontMatter,
  normalizeTags,
  toDateString,
  toVaultSlug,
  RAW_MIME_TYPES,
} from '@/lib/vault';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { response } = await guard(request);
  if (response) return response;

  const { slug: slugSegments } = await params;
  const slug = slugSegments.join('/');
  const ext = path.extname(slug).toLowerCase();

  // Attachments (PDF, images, docx) are served by /api/raw; describe them here.
  if (RAW_MIME_TYPES[ext]) {
    const filePath = await locateVaultFile(slug);
    if (!filePath) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    const relativeSlug = toVaultSlug(filePath);
    return NextResponse.json({
      slug: relativeSlug,
      title: path.basename(filePath),
      tags: [],
      created: '',
      modified: '',
      content: '',
      frontmatter: {},
      isRawFile: true,
      fileUrl: `/api/raw/${relativeSlug.split('/').map(encodeURIComponent).join('/')}`,
      fileType: ext,
    });
  }

  const filePath = await locateVaultFile(`${slug}.md`);
  if (!filePath) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }

  try {
    const { data, content: body } = parseFrontMatter(await fs.readFile(/*turbopackIgnore: true*/ filePath, 'utf-8'));
    return NextResponse.json({
      slug: toVaultSlug(filePath).replace(/\.md$/, ''),
      title: String(data.title || path.basename(filePath, '.md')),
      tags: normalizeTags(data.tags),
      created: toDateString(data.created || data.date),
      modified: toDateString(data.modified || data.updated),
      content: body,
      frontmatter: data,
    });
  } catch (error) {
    console.error('Error parsing note:', error);
    return NextResponse.json({ error: 'Error parsing note' }, { status: 500 });
  }
}
