import { getCachedVectors, cosineSimilarity, MODEL_KEY } from './vectorCache';

type Extractor = (text: string, options: { pooling: 'mean'; normalize: boolean }) => Promise<{ data: ArrayLike<number> }>;

// Building the pipeline loads the ONNX model from disk; do it once per process.
let extractorPromise: Promise<Extractor> | null = null;

function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    // q8 is the same quantized ONNX file @xenova/transformers used, so query vectors
    // stay comparable with the Smart Connections embeddings in the vault.
    extractorPromise = import('@huggingface/transformers')
      .then(({ pipeline }) => pipeline('feature-extraction', MODEL_KEY, { dtype: 'q8' }) as unknown as Promise<Extractor>)
      .catch(err => {
        extractorPromise = null; // allow a retry after a transient failure
        throw err;
      });
  }
  return extractorPromise;
}

async function embedQuery(query: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(query, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export interface SearchHit {
  key: string;
  score: number;
  lines?: number[];
  size?: number;
}

export async function performSemanticSearch(query: string, limit: number): Promise<SearchHit[]> {
  if (!process.env.SMART_ENV_PATH) {
    throw new Error('SMART_ENV_PATH not configured');
  }

  const [queryVec, allEntries] = await Promise.all([embedQuery(query), getCachedVectors()]);

  return allEntries
    .map(entry => ({
      key: entry.key.replace(/^smart_blocks:/, '').replace(/^smart_notes:/, ''),
      score: cosineSimilarity(queryVec, entry.embeddings![MODEL_KEY]!.vec),
      lines: entry.lines,
      size: entry.size,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** "smart_sources:Folder/Note.md#Heading" -> "Folder/Note" */
export const hitToSlug = (key: string) =>
  key.replace(/^smart_\w+:/, '').split('#')[0].replace(/\.md$/, '').trim();
