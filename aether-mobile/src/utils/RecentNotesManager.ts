/**
 * RecentNotesManager.ts
 * Persists a small list of recently-opened notes using AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'aether:recentNotes';
const MAX = 10;

export interface RecentNote {
  id: string;
  title: string;
  openedAt: number;
}

export async function getRecentNotes(): Promise<RecentNote[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addRecentNote(note: { id: string; title: string }): Promise<void> {
  try {
    let list = await getRecentNotes();
    // Remove duplicates
    list = list.filter((n) => n.id !== note.id);
    list.unshift({ ...note, openedAt: Date.now() });
    if (list.length > MAX) list = list.slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Silently fail — recent notes is non-critical
  }
}

export async function clearRecentNotes(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
