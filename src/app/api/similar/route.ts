import { NextResponse } from 'next/server';
import { getCachedVectors, cosineSimilarity, MODEL_KEY } from '@/lib/vectorCache';

const SMART_ENV_PATH = process.env.SMART_ENV_PATH || '';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const limit = parseInt(searchParams.get('limit') || '30', 10);

  if (!slug) {
    return NextResponse.json({ error: 'Query parameter "slug" is required' }, { status: 400 });
  }

  if (!SMART_ENV_PATH) {
    return NextResponse.json({ error: 'SMART_ENV_PATH not configured' }, { status: 500 });
  }

  try {
    const allEntries = await getCachedVectors();
    
    // Find the vector for the active note
    // The key format is usually "smart_sources:Folder/Filename.md"
    const targetKeyBase = `smart_sources:${slug}.md`.toLowerCase();
    
    // Exact or case-insensitive match for the specific note's vector
    const activeNoteEntry = allEntries.find(entry => 
      entry.key.toLowerCase().endsWith(targetKeyBase) || 
      entry.key.toLowerCase().endsWith(`:${slug.split('/').pop()}.md`.toLowerCase())
    );

    if (!activeNoteEntry || !activeNoteEntry.embeddings || !activeNoteEntry.embeddings[MODEL_KEY]) {
      return NextResponse.json({ error: 'Vector not found for this note', results: [] });
    }

    const queryVec = activeNoteEntry.embeddings[MODEL_KEY].vec;

    const activeNoteBase = activeNoteEntry.key.replace(/^smart_sources:/, '').split('.md')[0];

    const scoredMap = new Map();

    allEntries
      .filter(entry => {
        const rawKey = entry.key.replace(/^smart_blocks:/, '').replace(/^smart_sources:/, '');
        const baseKey = rawKey.split('.md')[0];
        // Exclude any blocks or sources that belong to the exact same file we are currently reading
        return baseKey !== activeNoteBase && (entry.key.startsWith('smart_sources:') || entry.key.startsWith('smart_blocks:'));
      })
      .forEach(entry => {
        const rawKey = entry.key.replace(/^smart_blocks:/, '').replace(/^smart_sources:/, '');
        const baseKey = rawKey.split('.md')[0]; // The file path for click navigation
        
        const score = cosineSimilarity(queryVec, entry.embeddings![MODEL_KEY]!.vec);
        
        // If we haven't seen this file yet, or if this block has a higher score, update it
        if (!scoredMap.has(baseKey) || scoredMap.get(baseKey).score < score) {
          scoredMap.set(baseKey, {
            uniqueId: entry.key,
            key: baseKey,
            rawKey: rawKey,
            score: score,
            lines: entry.lines,
            size: entry.size,
          });
        }
      });

    const scored = Array.from(scoredMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return NextResponse.json({ results: scored, slug });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Search failed: ${message}` }, { status: 500 });
  }
}
