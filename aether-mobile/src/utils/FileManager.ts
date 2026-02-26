/**
 * FileManager.ts
 * Handles all local file I/O for the AetherVault directory.
 * Notes are stored as raw .md files; attachments in a sub-folder.
 */

import * as FileSystem from 'expo-file-system';

const VAULT_DIR = `${FileSystem.documentDirectory}AetherVault/`;
const ATTACHMENTS_DIR = `${VAULT_DIR}attachments/`;

export interface NoteFile {
  id: string;        // filename without extension
  title: string;     // human-readable title
  content: string;
  path: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Initialisation ──────────────────────────────────────────────────────────

/** Ensure the vault directory tree exists on first run. */
export async function initVault(): Promise<void> {
  const vaultInfo = await FileSystem.getInfoAsync(VAULT_DIR);
  if (!vaultInfo.exists) {
    await FileSystem.makeDirectoryAsync(VAULT_DIR, { intermediates: true });
  }

  const attachInfo = await FileSystem.getInfoAsync(ATTACHMENTS_DIR);
  if (!attachInfo.exists) {
    await FileSystem.makeDirectoryAsync(ATTACHMENTS_DIR, { intermediates: true });
  }
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export function notePathFromId(id: string): string {
  return `${VAULT_DIR}${id}.md`;
}

/** Write (create or overwrite) a markdown note. */
export async function saveNote(id: string, content: string): Promise<void> {
  await initVault();
  await FileSystem.writeAsStringAsync(notePathFromId(id), content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

/** Read a note's raw markdown content. */
export async function readNote(id: string): Promise<string> {
  const path = notePathFromId(id);
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) throw new Error(`Note not found: ${id}`);
  return FileSystem.readAsStringAsync(path, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

/** Delete a note file from disk. */
export async function deleteNote(id: string): Promise<void> {
  const path = notePathFromId(id);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    await FileSystem.deleteAsync(path);
  }
}

/** List all notes in the vault. Returns lightweight metadata. */
export async function listNotes(): Promise<NoteFile[]> {
  await initVault();
  const files = await FileSystem.readDirectoryAsync(VAULT_DIR);
  const mdFiles = files.filter((f) => f.endsWith('.md'));

  const notes = await Promise.all(
    mdFiles.map(async (filename) => {
      const id = filename.replace(/\.md$/, '');
      const path = `${VAULT_DIR}${filename}`;
      const info = await FileSystem.getInfoAsync(path, { size: true });
      const content = await FileSystem.readAsStringAsync(path, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // First non-empty line becomes the title
      const firstLine = content.split('\n').find((l) => l.trim().length > 0) ?? id;
      const title = firstLine.replace(/^#+\s*/, '').trim() || id;

      return {
        id,
        title,
        content,
        path,
        createdAt: (info as any).modificationTime ?? Date.now(),
        updatedAt: (info as any).modificationTime ?? Date.now(),
      } as NoteFile;
    })
  );

  // Sort newest first
  return notes.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Rename a note (creates new file, deletes old). */
export async function renameNote(oldId: string, newId: string): Promise<void> {
  const content = await readNote(oldId);
  await saveNote(newId, content);
  await deleteNote(oldId);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a URL-safe note ID from a title string. */
export function titleToId(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-_]/g, '')
      .slice(0, 60) +
    '-' +
    Date.now().toString(36)
  );
}

/** Extract all [[wikilinks]] from markdown content. */
export function extractLinks(content: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1].trim());
  }
  return [...new Set(links)];
}

// ─── Attachments ─────────────────────────────────────────────────────────────

export function getVaultDir(): string {
  return VAULT_DIR;
}

export function getAttachmentsDir(): string {
  return ATTACHMENTS_DIR;
}

/** Copy a media file into the vault's attachments folder. Returns the new path. */
export async function saveAttachment(
  sourceUri: string,
  filename: string
): Promise<string> {
  await initVault();
  const dest = `${ATTACHMENTS_DIR}${filename}`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

/** List all attachment filenames. */
export async function listAttachments(): Promise<string[]> {
  await initVault();
  return FileSystem.readDirectoryAsync(ATTACHMENTS_DIR);
}
