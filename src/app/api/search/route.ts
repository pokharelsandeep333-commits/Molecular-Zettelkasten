import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const SMART_ENV_PATH = process.env.SMART_ENV_PATH || '';
const MODEL_KEY = 'TaylorAI/bge-micro-v2';

interface EmbeddingEntry {
  key: string;
  embeddings?: {
    [model: string]: {
      vec: number[];
    };
  };
  size?: number;
  lines?: number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function loadAllVectors(): Promise<EmbeddingEntry[]> {
  const entries: EmbeddingEntry[] = [];
  const files = await fs.readdir(SMART_ENV_PATH);
  
  for (const file of files) {
    if (!file.endsWith('.ajson')) continue;
    const content = await fs.readFile(path.join(SMART_ENV_PATH, file), 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      try {
        // Each line is key: value format in ajson
        const match = line.match(/^"([^"]+)":\s*(\{.+\})[\s,]*$/);
        if (!match) continue;
        const data = JSON.parse(match[2]) as EmbeddingEntry;
        const vec = data.embeddings?.[MODEL_KEY]?.vec;
        if (vec && vec.length > 0) {
          entries.push({ ...data, key: match[1] });
        }
      } catch {
        // Skip malformed lines
      }
    }
  }
  return entries;
}

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
      loadAllVectors(),
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
