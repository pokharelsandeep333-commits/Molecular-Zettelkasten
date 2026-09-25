import { promises as fs } from 'fs';
import path from 'path';

const getSmartEnvPath = () => process.env.SMART_ENV_PATH || '';
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
  const smartEnvPath = getSmartEnvPath();
  if (!smartEnvPath) return [];
  
  const entries: EmbeddingEntry[] = [];
  try {
    const files = await fs.readdir(/*turbopackIgnore: true*/ smartEnvPath);
    
    for (const file of files) {
      if (!file.endsWith('.ajson')) continue;
      const content = await fs.readFile(/*turbopackIgnore: true*/ path.join(smartEnvPath, file), 'utf-8');
      try {
        let jsonString = content.trim();
        if (jsonString.endsWith(',')) jsonString = jsonString.slice(0, -1);
        const dataMap = JSON.parse('{' + jsonString + '}');
        for (const [key, data] of Object.entries(dataMap)) {
          const entry = data as EmbeddingEntry;
          const vec = entry.embeddings?.[MODEL_KEY]?.vec;
          if (vec && vec.length > 0) {
            entries.push({ ...entry, key });
          }
        }
      } catch {
        // Skip malformed files
        console.warn(`Failed to parse ajson file ${file}`);
      }
    }
  } catch (e) {
    console.error('Failed to read smart env directory', e);
  }
  return entries;
}

let pendingLoad: Promise<EmbeddingEntry[]> | null = null;

export async function getCachedVectors(): Promise<EmbeddingEntry[]> {
  if (globalVectorCache && (Date.now() - lastCacheTime < CACHE_TTL_MS)) {
    return globalVectorCache;
  }
  // Concurrent requests share one load instead of each re-reading every .ajson file.
  if (!pendingLoad) {
    pendingLoad = loadAllVectors()
      .then(entries => {
        globalVectorCache = entries;
        lastCacheTime = Date.now();
        return entries;
      })
      .finally(() => { pendingLoad = null; });
  }
  return pendingLoad;
}
