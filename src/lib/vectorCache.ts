import { promises as fs } from 'fs';
import path from 'path';

const SMART_ENV_PATH = process.env.SMART_ENV_PATH || '';
export const MODEL_KEY = 'TaylorAI/bge-micro-v2';

export interface EmbeddingEntry {
  key: string;
  embeddings?: {
    [model: string]: {
      vec: number[];
    };
  };
  size?: number;
  lines?: number[];
}

export function cosineSimilarity(a: number[], b: number[]): number {
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

let globalVectorCache: EmbeddingEntry[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function loadAllVectors(): Promise<EmbeddingEntry[]> {
  if (!SMART_ENV_PATH) return [];
  
  const entries: EmbeddingEntry[] = [];
  const files = await fs.readdir(SMART_ENV_PATH);
  
  for (const file of files) {
    if (!file.endsWith('.ajson')) continue;
    const content = await fs.readFile(path.join(SMART_ENV_PATH, file), 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      try {
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

export async function getCachedVectors(): Promise<EmbeddingEntry[]> {
  const now = Date.now();
  if (globalVectorCache && (now - lastCacheTime < CACHE_TTL_MS)) {
    return globalVectorCache;
  }
  globalVectorCache = await loadAllVectors();
  lastCacheTime = now;
  return globalVectorCache;
}
