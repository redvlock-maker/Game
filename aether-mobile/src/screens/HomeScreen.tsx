/**
 * HomeScreen.tsx
 * Displays all notes (sorted by last-modified) with:
 *  - Vault stats header
 *  - Recent notes chip rail
 *  - Full note list
 *  - FAB to create new notes
 *  - One-tap vault backup
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FileText, Clock, Archive, ChevronRight } from 'lucide-react-native';

import { Colors, Spacing, FontSize, Radius } from '../utils/theme';
import { listNotes, NoteFile } from '../utils/FileManager';
import { upsertNode, getAllNodes } from '../utils/DatabaseManager';
import { getRecentNotes, RecentNote } from '../utils/RecentNotesManager';
import { exportVault } from '../utils/BackupManager';
import FloatingActionButton from '../components/FloatingActionButton';
import CommandPalette from '../components/CommandPalette';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();

  const [notes, setNotes] = useState<NoteFile[]>([]);
  const [recent, setRecent] = useState<RecentNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  const load = useCallback(async () => {
    try {
      const [fileNotes, recentNotes] = await Promise.all([
        listNotes(),
        getRecentNotes(),
      ]);
      setNotes(fileNotes);
      setRecent(recentNotes);

      // Sync any new/changed files into SQLite
      for (const n of fileNotes) {
        await upsertNode(n.id, n.title, n.content);
      }
    } catch (err) {
      console.error('HomeScreen load error', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load().finally(() => setIsLoading(false));
    }, [load])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const openNote = (note: NoteFile) => {
    navigation.navigate('Editor', { noteId: note.id, title: note.title });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportVault();
    } catch {
      Alert.alert('Export Failed', 'Could not create vault backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (ms: number) => {
    const d = new Date(ms);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const renderNote = ({ item }: { item: NoteFile }) => (
    <TouchableOpacity style={styles.noteCard} onPress={() => openNote(item)} activeOpacity={0.75}>
      <View style={styles.noteIcon}>
        <FileText color={Colors.accent} size={18} />
      </View>
      <View style={styles.noteInfo}>
        <Text style={styles.noteTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.noteSnippet} numberOfLines={1}>
          {item.content.replace(/#+\s/g, '').slice(0, 80)}
        </Text>
      </View>
      <View style={styles.noteMeta}>
        <Text style={styles.noteDate}>{formatDate(item.updatedAt)}</Text>
        <ChevronRight color={Colors.textMuted} size={16} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Aether</Text>
          <Text style={styles.subtitle}>{notes.length} notes in vault</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowPalette(true)} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>⌘</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExport} style={styles.headerBtn} disabled={isExporting}>
            {isExporting ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <Archive color={Colors.textSecondary} size={20} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Recent notes rail ── */}
      {recent.length > 0 && (
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Clock color={Colors.textMuted} size={13} />
            <Text style={styles.sectionLabel}>Recent</Text>
          </View>
          <FlatList
            horizontal
            data={recent.slice(0, 6)}
            keyExtractor={(r) => r.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: Spacing.md }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recentChip}
                onPress={() => navigation.navigate('Editor', { noteId: item.id, title: item.title })}
              >
                <Text style={styles.recentChipText} numberOfLines={1}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* ── Notes list ── */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      ) : notes.length === 0 ? (
        <View style={styles.center}>
          <FileText color={Colors.textMuted} size={48} />
          <Text style={styles.emptyText}>No notes yet</Text>
          <Text style={styles.emptyHint}>Tap + to create your first note</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(n) => n.id}
          renderItem={renderNote}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.accent}
            />
          }
        />
      )}

      {/* ── FAB ── */}
      <FloatingActionButton />

      {/* ── Command Palette ── */}
      <CommandPalette
        visible={showPalette}
        onClose={() => setShowPalette(false)}
        notes={notes}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + 8,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
  },
  appName: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '700' },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { padding: Spacing.sm },
  headerBtnText: { color: Colors.textSecondary, fontSize: FontSize.lg },

  recentSection: { paddingVertical: Spacing.sm, borderBottomColor: Colors.border, borderBottomWidth: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  sectionLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textTransform: 'uppercase', letterSpacing: 1 },
  recentChip: {
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 140,
  },
  recentChipText: { color: Colors.textSecondary, fontSize: FontSize.sm },

  listContent: { paddingVertical: Spacing.sm },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
  },
  noteIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.accentDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  noteInfo: { flex: 1 },
  noteTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '500' },
  noteSnippet: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2 },
  noteMeta: { alignItems: 'flex-end', marginLeft: Spacing.sm },
  noteDate: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: 2 },

  emptyText: { color: Colors.textSecondary, fontSize: FontSize.lg, marginTop: Spacing.md },
  emptyHint: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.xs },
});
