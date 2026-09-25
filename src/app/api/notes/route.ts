import { NextResponse } from 'next/server';
import { guard } from '@/lib/firebase-admin';
import { getAllNotes, getVaultPath } from '@/lib/vault';

export type { NoteMetadata } from '@/lib/vault';

const clampInt = (value: string | null, fallback: number, min: number, max: number) => {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};

export async function GET(request: Request) {
  const { response } = await guard(request);
  if (response) return response;

  if (!getVaultPath()) {
    return NextResponse.json({ error: 'Vault is not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').toLowerCase().slice(0, 200);
  const tag = (searchParams.get('tag') || '').toLowerCase().slice(0, 100);
  const limit = clampInt(searchParams.get('limit'), 500, 1, 5000);
  // Optional exact-slug filter so search can resolve its hits without downloading every note.
  const slugs = searchParams.getAll('slug').slice(0, 100);
  const slugSet = slugs.length ? new Set(slugs) : null;

  try {
    const notes = (await getAllNotes()).filter(note => {
      if (slugSet && !slugSet.has(note.slug)) return false;
      if (tag && !note.tags.some(t => t.toLowerCase() === tag)) return false;
      if (query) {
        const haystack = `${note.title} ${note.tags.join(' ')} ${note.excerpt}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    }).slice(0, limit);

    return NextResponse.json({ notes, total: notes.length });
  } catch (err) {
    console.error('Error reading vault:', err);
    return NextResponse.json({ error: 'Failed to read vault' }, { status: 500 });
  }
}
