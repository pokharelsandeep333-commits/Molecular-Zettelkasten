import { NextResponse } from 'next/server';
import { getCachedVectors, cosineSimilarity, MODEL_KEY } from '@/lib/vectorCache';

const SMART_ENV_PATH = process.env.SMART_ENV_PATH || '';

// Embed query using Transformers.js (lazy loaded server-side)
async function embedQuery(query: string): Promise<number[]> {
  // Dynamic import to avoid bundling issues
  const { pipeline } = await import('@xenova/transformers');
  const extractor = await pipeline('feature-extraction', MODEL_KEY, { quantized: true });
  const output = await extractor(query, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  if (!SMART_ENV_PATH) {
    return NextResponse.json({ error: 'SMART_ENV_PATH not configured' }, { status: 500 });
  }

  try {
    const [queryVec, allEntries] = await Promise.all([
      embedQuery(query),
      getCachedVectors(),
    ]);

    const scored = allEntries
      .map(entry => ({
        key: entry.key.replace(/^smart_blocks:/, '').replace(/^smart_notes:/, ''),
        score: cosineSimilarity(queryVec, entry.embeddings![MODEL_KEY]!.vec),
        lines: entry.lines,
        size: entry.size,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return NextResponse.json({ results: scored, query });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Search failed: ${message}` }, { status: 500 });
  }
}
