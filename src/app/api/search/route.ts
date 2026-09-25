import { NextResponse } from 'next/server';
import { guard } from '@/lib/firebase-admin';
import { performSemanticSearch } from '@/lib/semanticSearch';

export async function GET(request: Request) {
  const { response } = await guard(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim().slice(0, 500);
  const parsedLimit = parseInt(searchParams.get('limit') || '10', 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 10;

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const scored = await performSemanticSearch(query, limit);
    return NextResponse.json({ results: scored, query });
  } catch (error) {
    console.error('Semantic search failed:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
