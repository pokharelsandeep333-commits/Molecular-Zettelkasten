import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';

export const getVaultPath = () => process.env.VAULT_PATH || '';

// Vault paths are only known at runtime, so fs calls carry turbopackIgnore;
// otherwise output tracing bundles the whole project into the server build.

// Files the raw endpoint is allowed to serve. Anything else (dotfiles, .env,
// plugin configs, arbitrary binaries) is refused even if it lives in the vault.
export const RAW_MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
};

// Segments starting with "." or "_" are hidden (.obsidian, .smart-env, .git, _templates).
const isHiddenSegment = (segment: string) => segment.startsWith('.') || segment.startsWith('_');

function isInside(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * Resolve a vault-relative path to an absolute path, or null if it escapes the
 * vault, touches a hidden segment, or does not exist. Symlinks are resolved
 * before the containment check so a link cannot point outside the vault.
 */
export async function resolveInVault(relativePath: string): Promise<string | null> {
  const vaultPath = getVaultPath();
  if (!vaultPath || !relativePath || relativePath.includes('\0')) return null;

  const segments = relativePath.split(/[\\/]+/).filter(Boolean);
  if (segments.length === 0 || segments.some(s => s === '..' || isHiddenSegment(s))) return null;

  const vaultReal = await fs.realpath(/*turbopackIgnore: true*/ vaultPath).catch(() => path.resolve(/*turbopackIgnore: true*/ vaultPath));
  const candidate = path.resolve(/*turbopackIgnore: true*/ vaultReal, ...segments);
  if (!isInside(vaultReal, candidate)) return null;

  try {
    const real = await fs.realpath(/*turbopackIgnore: true*/ candidate);
    return isInside(vaultReal, real) ? real : null;
  } catch {
    return null;
  }
}

export const toVaultSlug = (absPath: string) =>
  path.relative(path.resolve(/*turbopackIgnore: true*/ getVaultPath()), absPath).replace(/\\/g, '/');

/* ── Cached vault index ──────────────────────────────────────────── */

const INDEX_TTL_MS = 60 * 1000;

async function walk(dir: string, out: string[]) {
  let entries;
  try {
    entries = await fs.readdir(/*turbopackIgnore: true*/ dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (isHiddenSegment(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(fullPath, out);
    else if (entry.isFile()) out.push(fullPath);
  }
}

interface FileIndex {
  at: number;
  files: string[];
  byBasename: Map<string, string>;
}

let fileIndex: FileIndex | null = null;
let fileIndexPending: Promise<FileIndex> | null = null;

async function getFileIndex(): Promise<FileIndex> {
  if (fileIndex && Date.now() - fileIndex.at < INDEX_TTL_MS) return fileIndex;
  if (!fileIndexPending) {
    fileIndexPending = (async () => {
      const files: string[] = [];
      await walk(path.resolve(/*turbopackIgnore: true*/ getVaultPath()), files);
      const byBasename = new Map<string, string>();
      for (const f of files) {
        const key = path.basename(f).toLowerCase();
        if (!byBasename.has(key)) byBasename.set(key, f);
      }
      const index: FileIndex = { at: Date.now(), files, byBasename };
      fileIndex = index;
      return index;
    })().finally(() => { fileIndexPending = null; });
  }
  return fileIndexPending;
}

/** Case-insensitive lookup of a file anywhere in the vault by its basename (Obsidian link semantics). */
export async function findByBasename(basename: string): Promise<string | null> {
  if (!getVaultPath()) return null;
  const index = await getFileIndex();
  return index.byBasename.get(basename.toLowerCase()) ?? null;
}

/** Resolve a link target: exact vault-relative path first, then basename anywhere in the vault. */
export async function locateVaultFile(relativePath: string): Promise<string | null> {
  const exact = await resolveInVault(relativePath);
  if (exact) return exact;
  const found = await findByBasename(path.basename(relativePath));
  return found ? resolveInVault(toVaultSlug(found)) : null;
}

export interface NoteMetadata {
  slug: string;
  title: string;
  tags: string[];
  created: string;
  modified: string;
  excerpt: string;
}

// gray-matter evaluates `---js` / `---javascript` front matter with eval(); refuse it
// so a note synced into the vault can never run code on the server.
const refuseEngine = () => { throw new Error('Executable front matter is not allowed'); };

// A leading ---…--- block, whatever its language tag.
const FRONT_MATTER_BLOCK = /^---[^\n]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;

export interface ParsedNote {
  // Front matter is free-form YAML.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  content: string;
}

/**
 * Split front matter from the body. Malformed YAML (which Obsidian tolerates)
 * or executable front matter yields empty metadata and the body alone, so the
 * note still opens instead of failing with a 500.
 */
export function parseFrontMatter(raw: string): ParsedNote {
  try {
    const { data, content } = matter(raw, { engines: { js: refuseEngine, javascript: refuseEngine } });
    return { data, content };
  } catch {
    return { data: {}, content: raw.replace(FRONT_MATTER_BLOCK, '') };
  }
}

// YAML dates come back as Date objects; send ISO strings so the client can format them.
export const toDateString = (value: unknown): string =>
  value instanceof Date ? value.toISOString() : value ? String(value) : '';

export const normalizeTags = (tags: unknown): string[] =>
  Array.isArray(tags) ? tags.map(String) : tags ? [String(tags)] : [];

let notesCache: { at: number; notes: NoteMetadata[] } | null = null;

/** Metadata for every markdown note, cached so search does not re-read the vault per keystroke. */
export async function getAllNotes(): Promise<NoteMetadata[]> {
  if (notesCache && Date.now() - notesCache.at < INDEX_TTL_MS) return notesCache.notes;
  const index = await getFileIndex();
  const notes: NoteMetadata[] = [];
  for (const filePath of index.files) {
    if (!filePath.endsWith('.md')) continue;
    try {
      const { data, content: body } = parseFrontMatter(await fs.readFile(/*turbopackIgnore: true*/ filePath, 'utf-8'));
      notes.push({
        slug: toVaultSlug(filePath).replace(/\.md$/, ''),
        title: String(data.title || path.basename(filePath, '.md')),
        tags: normalizeTags(data.tags),
        created: toDateString(data.created || data.date),
        modified: toDateString(data.modified || data.updated),
        excerpt: body.replace(/#+\s/g, '').replace(/\[\[.*?\]\]/g, '').trim().slice(0, 200),
      });
    } catch {
      // Skip unreadable or malformed notes rather than failing the whole listing.
    }
  }
  notesCache = { at: Date.now(), notes };
  return notes;
}
