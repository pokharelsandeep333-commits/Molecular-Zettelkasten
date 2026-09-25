// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

let root: string;
let vault: string;

beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'mz-vault-'));
  vault = path.join(root, 'vault');
  await fs.mkdir(path.join(vault, 'Wiki', 'Deep'), { recursive: true });
  await fs.mkdir(path.join(vault, '.obsidian'), { recursive: true });
  await fs.mkdir(path.join(root, 'vault-secrets'), { recursive: true });
  await fs.writeFile(path.join(vault, 'Wiki', 'Note.md'), '---\ntitle: A Note\ntags: [x]\n---\nBody');
  await fs.writeFile(path.join(vault, 'Wiki', 'Deep', 'Pic One.png'), 'png');
  await fs.writeFile(path.join(vault, '.obsidian', 'app.json'), '{}');
  await fs.writeFile(path.join(root, 'vault-secrets', 'secret.md'), 'secret');
  await fs.writeFile(path.join(root, 'outside.md'), 'outside');
});

afterAll(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VAULT_PATH', vault);
});

const loadVault = () => import('../vault');

describe('resolveInVault', () => {
  it('resolves files inside the vault', async () => {
    const { resolveInVault } = await loadVault();
    expect(await resolveInVault('Wiki/Note.md')).toBe(await fs.realpath(path.join(vault, 'Wiki', 'Note.md')));
  });

  it('rejects parent-directory traversal', async () => {
    const { resolveInVault } = await loadVault();
    expect(await resolveInVault('../outside.md')).toBeNull();
    expect(await resolveInVault('Wiki/../../outside.md')).toBeNull();
    expect(await resolveInVault('..\\outside.md')).toBeNull();
  });

  it('rejects sibling directories that share the vault path as a prefix', async () => {
    const { resolveInVault } = await loadVault();
    // The old startsWith() check let "/vault-secrets" pass for a "/vault" root.
    expect(await resolveInVault('../vault-secrets/secret.md')).toBeNull();
  });

  it('rejects hidden and underscore segments', async () => {
    const { resolveInVault } = await loadVault();
    expect(await resolveInVault('.obsidian/app.json')).toBeNull();
    expect(await resolveInVault('_templates/x.md')).toBeNull();
  });

  it('rejects absolute paths, null bytes and missing files', async () => {
    const { resolveInVault } = await loadVault();
    expect(await resolveInVault(path.join(root, 'outside.md'))).toBeNull();
    expect(await resolveInVault('Wiki/Note.md\0.png')).toBeNull();
    expect(await resolveInVault('Wiki/Missing.md')).toBeNull();
  });

  it('rejects symlinks that point outside the vault', async () => {
    const { resolveInVault } = await loadVault();
    const link = path.join(vault, 'Wiki', 'escape.md');
    try {
      await fs.symlink(path.join(root, 'outside.md'), link);
    } catch {
      return; // creating symlinks needs extra privileges on some Windows setups
    }
    expect(await resolveInVault('Wiki/escape.md')).toBeNull();
    await fs.rm(link);
  });
});

describe('locateVaultFile', () => {
  it('falls back to a case-insensitive basename lookup (Obsidian embeds)', async () => {
    const { locateVaultFile } = await loadVault();
    const found = await locateVaultFile('pic one.PNG');
    expect(found && path.basename(found)).toBe('Pic One.png');
  });

  it('never finds hidden files by basename', async () => {
    const { locateVaultFile } = await loadVault();
    expect(await locateVaultFile('app.json')).toBeNull();
  });
});

describe('getAllNotes', () => {
  it('lists notes with front matter metadata', async () => {
    const { getAllNotes } = await loadVault();
    const notes = await getAllNotes();
    expect(notes).toEqual([
      expect.objectContaining({ slug: 'Wiki/Note', title: 'A Note', tags: ['x'] }),
    ]);
  });
});

describe('parseFrontMatter', () => {
  it('parses YAML front matter', async () => {
    const { parseFrontMatter } = await loadVault();
    expect(parseFrontMatter('---\ntitle: Hi\n---\nBody').data.title).toBe('Hi');
  });

  it('never executes JavaScript front matter, and strips it', async () => {
    const { parseFrontMatter } = await loadVault();
    (globalThis as Record<string, unknown>).__mzPwned = false;
    for (const fence of ['---js', '---javascript', '---JS']) {
      const parsed = parseFrontMatter(`${fence}\nglobalThis.__mzPwned = true\n---\nBody`);
      expect(parsed).toEqual({ data: {}, content: 'Body' });
    }
    expect((globalThis as Record<string, unknown>).__mzPwned).toBe(false);
  });

  it('keeps notes with malformed YAML readable', async () => {
    const { parseFrontMatter } = await loadVault();
    const parsed = parseFrontMatter('---\ntitle: x\n  Author: ""\n: bad\n---\n# Heading\nBody');
    expect(parsed.data).toEqual({});
    expect(parsed.content).toBe('# Heading\nBody');
  });
});
