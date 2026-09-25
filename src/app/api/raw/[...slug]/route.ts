import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { guard } from '@/lib/firebase-admin';
import { locateVaultFile, RAW_MIME_TYPES } from '@/lib/vault';

// Media is embedded in notes, so a single page can request many files at once.
const RAW_LIMIT = { limit: 300, windowMs: 60_000 };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { response } = await guard(request, { limit: RAW_LIMIT, allowCookie: true });
  if (response) return response;

  const { slug: slugSegments } = await params;
  // Next.js already decodes each segment; decoding again would let "%252e%252e" become "..".
  const slug = slugSegments.join('/');

  const ext = path.extname(slug).toLowerCase();
  const contentType = RAW_MIME_TYPES[ext];
  if (!contentType) {
    return new NextResponse('Unsupported file type', { status: 415 });
  }

  // Obsidian embeds reference files by basename, so fall back to a vault-wide lookup.
  const filePath = await locateVaultFile(slug);
  if (!filePath || path.extname(filePath).toLowerCase() !== ext) {
    return new NextResponse('File not found', { status: 404 });
  }

  try {
    const fileBuffer = await fs.readFile(/*turbopackIgnore: true*/ filePath);
    const filename = path.basename(filePath);
    const asciiName = filename.replace(/[^\x20-\x7E]|["\\]/g, '_');

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // filename* carries non-ASCII names; a raw non-ASCII header value would throw.
        'Content-Disposition': `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        // Personal content: never let shared caches keep it.
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        // An SVG opened directly is a document: sandbox it so embedded script cannot
        // run as the app's origin. (A sandbox would stop Chrome rendering PDFs.)
        'Content-Security-Policy': ext === '.svg'
          ? "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox"
          : "frame-ancestors 'self'",
        'X-Frame-Options': 'SAMEORIGIN',
      },
    });
  } catch {
    return new NextResponse('File not found', { status: 404 });
  }
}
