/**
 * DatabaseManager.ts
 * SQLite brain for Aether Mobile.
 *
 * Tables:
 *   nodes  — one row per note (id, filename, title, timestamps)
 *   edges  — bidirectional [[wikilink]] graph (source → target)
 *   search_index — FTS5 virtual table for instant full-text search
 */

import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

// ─── Bootstrap ───────────────────────────────────────────────────────────────

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('aether.db');
  await initSchema(_db);
  return _db;
}

async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS nodes (
      id          TEXT PRIMARY KEY,
      filename    TEXT NOT NULL UNIQUE,
      title       TEXT NOT NULL,
      created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS edges (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id   TEXT NOT NULL,
      target_id   TEXT NOT NULL,
      UNIQUE(source_id, target_id),
      FOREIGN KEY(source_id) REFERENCES nodes(id) ON DELETE CASCADE,
      FOREIGN KEY(target_id) REFERENCES nodes(id) ON DELETE CASCADE
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
      note_id UNINDEXED,
      title,
      content,
      tokenize = 'porter ascii'
    );
  `);
}

// ─── Node CRUD ────────────────────────────────────────────────────────────────

export interface NoteNode {
  id: string;
  filename: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export async function upsertNode(
  id: string,
  title: string,
  content: string
): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO nodes (id, filename, title, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title      = excluded.title,
       updated_at = excluded.updated_at`,
    [id, `${id}.md`, title, now, now]
  );

  // Refresh FTS index
  await db.runAsync(`DELETE FROM search_index WHERE note_id = ?`, [id]);
  await db.runAsync(
    `INSERT INTO search_index (note_id, title, content) VALUES (?, ?, ?)`,
    [id, title, content]
  );
}

export async function deleteNode(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM nodes WHERE id = ?`, [id]);
  await db.runAsync(`DELETE FROM search_index WHERE note_id = ?`, [id]);
}

export async function getAllNodes(): Promise<NoteNode[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    filename: string;
    title: string;
    created_at: number;
    updated_at: number;
  }>(`SELECT * FROM nodes ORDER BY updated_at DESC`);

  return rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getNode(id: string): Promise<NoteNode | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    filename: string;
    title: string;
    created_at: number;
    updated_at: number;
  }>(`SELECT * FROM nodes WHERE id = ?`, [id]);

  if (!row) return null;
  return {
    id: row.id,
    filename: row.filename,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Edge (Link) Management ───────────────────────────────────────────────────

export interface Edge {
  sourceId: string;
  targetId: string;
}

/** Replace all outgoing links for a note with a fresh set. */
export async function syncEdges(sourceId: string, targetIds: string[]): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM edges WHERE source_id = ?`, [sourceId]);

  for (const targetId of targetIds) {
    // Only insert edge if target node exists in index
    const exists = await db.getFirstAsync(
      `SELECT 1 FROM nodes WHERE id = ?`,
      [targetId]
    );
    if (exists) {
      await db.runAsync(
        `INSERT OR IGNORE INTO edges (source_id, target_id) VALUES (?, ?)`,
        [sourceId, targetId]
      );
    }
  }
}

/** Get all nodes this note links to (outgoing). */
export async function getOutgoingLinks(sourceId: string): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ target_id: string }>(
    `SELECT target_id FROM edges WHERE source_id = ?`,
    [sourceId]
  );
  return rows.map((r) => r.target_id);
}

/** Get all notes that link to this note (incoming / backlinks). */
export async function getBacklinks(targetId: string): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ source_id: string }>(
    `SELECT source_id FROM edges WHERE target_id = ?`,
    [targetId]
  );
  return rows.map((r) => r.source_id);
}

/** Get every edge in the graph (for the graph view). */
export async function getAllEdges(): Promise<Edge[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ source_id: string; target_id: string }>(
    `SELECT source_id, target_id FROM edges`
  );
  return rows.map((r) => ({ sourceId: r.source_id, targetId: r.target_id }));
}

// ─── Full-Text Search (FTS5) ──────────────────────────────────────────────────

export interface SearchResult {
  noteId: string;
  title: string;
  snippet: string;
}

export async function searchNotes(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const db = await getDatabase();

  // Escape special FTS5 characters
  const safeQuery = query.replace(/['"*\-]/g, ' ').trim() + '*';

  const rows = await db.getAllAsync<{
    note_id: string;
    title: string;
    content: string;
  }>(
    `SELECT note_id, title, snippet(search_index, 2, '<b>', '</b>', '…', 20) AS content
     FROM search_index
     WHERE search_index MATCH ?
     ORDER BY rank
     LIMIT 30`,
    [safeQuery]
  );

  return rows.map((r) => ({
    noteId: r.note_id,
    title: r.title,
    snippet: r.content,
  }));
}

// ─── Index Rebuild ─────────────────────────────────────────────────────────────

/** Re-index all notes from the file list (call on app start). */
export async function rebuildIndex(
  notes: { id: string; title: string; content: string }[]
): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(`
    DELETE FROM nodes;
    DELETE FROM edges;
    DELETE FROM search_index;
  `);

  for (const note of notes) {
    await upsertNode(note.id, note.title, note.content);
  }
}
