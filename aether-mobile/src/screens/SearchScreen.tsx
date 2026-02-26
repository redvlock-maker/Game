/**
 * SearchScreen.tsx
 * Instant full-text search using SQLite FTS5.
 * Shows highlighted snippets; tap to open note in editor.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, X, FileText } from 'lucide-react-native';

import { Colors, Spacing, FontSize, Radius } from '../utils/theme';
import { searchNotes, SearchResult } from '../utils/DatabaseManager';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function SearchScreen() {
  const navigation = useNavigation<NavProp>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await searchNotes(query);
        setResults(res);
        setHasSearched(true);
      } catch (err) {
        console.error('Search error', err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [query]);

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultCard}
      activeOpacity={0.75}
      onPress={() => {
        Keyboard.dismiss();
        navigation.navigate('Editor', { noteId: item.noteId, title: item.title });
      }}
    >
      <View style={styles.resultIcon}>
        <FileText color={Colors.accent} size={16} />
      </View>
      <View style={styles.resultBody}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {/* Strip FTS5 <b> tags for display */}
        <Text style={styles.resultSnippet} numberOfLines={2}>
          {item.snippet.replace(/<\/?b>/g, '')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchBar}>
        <Search color={Colors.textMuted} size={18} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search your vault…"
          placeholderTextColor={Colors.textMuted}
          selectionColor={Colors.accent}
          autoFocus={false}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
            <X color={Colors.textMuted} size={16} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Results ── */}
      {isSearching ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : hasSearched && results.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No results for "{query}"</Text>
          <Text style={styles.emptyHint}>Try different keywords</Text>
        </View>
      ) : !hasSearched ? (
        <View style={styles.center}>
          <Search color={Colors.textMuted} size={48} />
          <Text style={styles.placeholderText}>Type to search across all notes</Text>
          <Text style={styles.placeholderHint}>Full-text search powered by SQLite FTS5</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(r) => r.noteId}
          renderItem={renderResult}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },

  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + 8,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
  },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    margin: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: { marginRight: Spacing.sm },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    paddingVertical: 12,
  },
  clearBtn: { padding: Spacing.xs },

  listContent: { paddingBottom: Spacing.xxl },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.accentDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    marginTop: 2,
  },
  resultBody: { flex: 1 },
  resultTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '500' },
  resultSnippet: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 3, lineHeight: 18 },

  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md },
  emptyHint: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.xs },
  placeholderText: { color: Colors.textSecondary, fontSize: FontSize.md, marginTop: Spacing.md },
  placeholderHint: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.xs },
});
