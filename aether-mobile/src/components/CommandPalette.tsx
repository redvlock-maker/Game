/**
 * CommandPalette.tsx
 * Spotlight-style command palette. Activated from the HomeScreen ⌘ button.
 * Supports:
 *  - Fuzzy note search
 *  - Quick actions (new note, export, graph)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, FileText, Plus, GitBranch, Archive, X } from 'lucide-react-native';

import { Colors, Spacing, FontSize, Radius } from '../utils/theme';
import { NoteFile } from '../utils/FileManager';
import { exportVault } from '../utils/BackupManager';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface PaletteItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  notes: NoteFile[];
}

export default function CommandPalette({ visible, onClose, notes }: Props) {
  const navigation = useNavigation<NavProp>();
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  // ── Static quick-actions ──
  const quickActions: PaletteItem[] = [
    {
      id: '__new__',
      label: 'New Note',
      subtitle: 'Create a blank note',
      icon: <Plus color={Colors.accentLight} size={16} />,
      action: () => {
        close();
        navigation.navigate('Editor', undefined);
      },
    },
    {
      id: '__graph__',
      label: 'Open Graph',
      subtitle: 'View knowledge graph',
      icon: <GitBranch color={Colors.accentLight} size={16} />,
      action: () => {
        close();
        // Navigate to the Graph tab
        navigation.navigate('MainTabs');
      },
    },
    {
      id: '__export__',
      label: 'Export Vault',
      subtitle: 'Backup all notes',
      icon: <Archive color={Colors.accentLight} size={16} />,
      action: async () => {
        close();
        await exportVault();
      },
    },
  ];

  // ── Filtered note results ──
  const filteredNotes: PaletteItem[] = notes
    .filter(
      (n) =>
        query.trim() === '' ||
        n.title.toLowerCase().includes(query.toLowerCase()) ||
        n.content.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 8)
    .map((n) => ({
      id: n.id,
      label: n.title,
      subtitle: n.content.replace(/#+\s/g, '').slice(0, 60),
      icon: <FileText color={Colors.textSecondary} size={16} />,
      action: () => {
        close();
        navigation.navigate('Editor', { noteId: n.id, title: n.title });
      },
    }));

  // Combine: quick actions first when no query
  const items: PaletteItem[] =
    query.trim() === ''
      ? [...quickActions, ...filteredNotes]
      : filteredNotes.length > 0
      ? filteredNotes
      : quickActions;

  const renderItem = ({ item }: { item: PaletteItem }) => (
    <TouchableOpacity style={styles.item} onPress={item.action} activeOpacity={0.7}>
      <View style={styles.itemIcon}>{item.icon}</View>
      <View style={styles.itemBody}>
        <Text style={styles.itemLabel} numberOfLines={1}>
          {item.label}
        </Text>
        {item.subtitle ? (
          <Text style={styles.itemSubtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          {/* Search bar */}
          <View style={styles.searchRow}>
            <Search color={Colors.textMuted} size={18} />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search notes or run a command…"
              placeholderTextColor={Colors.textMuted}
              selectionColor={Colors.accent}
              autoCorrect={false}
              returnKeyType="search"
            />
            <TouchableOpacity onPress={close} style={styles.closeBtn}>
              <X color={Colors.textMuted} size={18} />
            </TouchableOpacity>
          </View>

          {/* Item list */}
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            keyboardShouldPersistTaps="always"
            style={styles.list}
            contentContainerStyle={{ paddingBottom: Spacing.sm }}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.md,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    maxHeight: '75%',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    paddingVertical: 8,
  },
  closeBtn: { padding: 4 },
  list: { flexShrink: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  itemBody: { flex: 1 },
  itemLabel: { color: Colors.textPrimary, fontSize: FontSize.md },
  itemSubtitle: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2 },
});
