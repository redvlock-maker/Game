/**
 * EditorScreen.tsx
 * Full-featured markdown editor with:
 *  - Live preview toggle
 *  - [[wikilink]] auto-complete hints
 *  - Media attachment picker
 *  - Auto-save to .md file + SQLite index update
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Save, Eye, EyeOff, Paperclip, Trash2, Link } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { Colors, Spacing, FontSize, Radius } from '../utils/theme';
import {
  saveNote,
  readNote,
  deleteNote,
  titleToId,
  extractLinks,
  saveAttachment,
  listNotes,
} from '../utils/FileManager';
import { upsertNode, deleteNode, syncEdges, getAllNodes } from '../utils/DatabaseManager';
import { addRecentNote } from '../utils/RecentNotesManager';
import type { RootStackParamList } from '../navigation/AppNavigator';

type EditorRouteProp = RouteProp<RootStackParamList, 'Editor'>;
type EditorNavProp = NativeStackNavigationProp<RootStackParamList, 'Editor'>;

// ─── Tiny markdown renderer ───────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactElement[] {
  return text.split('\n').map((line, i) => {
    if (/^#{3}\s/.test(line)) {
      return (
        <Text key={i} style={styles.mdH3}>
          {line.replace(/^###\s/, '')}
        </Text>
      );
    }
    if (/^#{2}\s/.test(line)) {
      return (
        <Text key={i} style={styles.mdH2}>
          {line.replace(/^##\s/, '')}
        </Text>
      );
    }
    if (/^#\s/.test(line)) {
      return (
        <Text key={i} style={styles.mdH1}>
          {line.replace(/^#\s/, '')}
        </Text>
      );
    }
    if (/^[-*]\s/.test(line)) {
      return (
        <Text key={i} style={styles.mdListItem}>
          {'  •  '}
          {line.replace(/^[-*]\s/, '')}
        </Text>
      );
    }
    if (/^\s*>\s/.test(line)) {
      return (
        <Text key={i} style={styles.mdBlockquote}>
          {line.replace(/^\s*>\s/, '')}
        </Text>
      );
    }
    // Highlight [[wikilinks]]
    const parts = line.split(/(\[\[[^\]]+\]\])/g);
    if (parts.length > 1) {
      return (
        <Text key={i} style={styles.mdParagraph}>
          {parts.map((part, j) =>
            /^\[\[.+\]\]$/.test(part) ? (
              <Text key={j} style={styles.mdWikilink}>
                {part}
              </Text>
            ) : (
              <Text key={j}>{part}</Text>
            )
          )}
        </Text>
      );
    }
    return (
      <Text key={i} style={line.trim() === '' ? styles.mdSpacer : styles.mdParagraph}>
        {line || ' '}
      </Text>
    );
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditorScreen() {
  const navigation = useNavigation<EditorNavProp>();
  const route = useRoute<EditorRouteProp>();
  const noteId = route.params?.noteId;
  const initialTitle = route.params?.title ?? '';

  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentId, setCurrentId] = useState<string>(noteId ?? '');
  const [wikilinkHints, setWikilinkHints] = useState<string[]>([]);
  const [allNoteTitles, setAllNoteTitles] = useState<string[]>([]);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load existing note ──
  useEffect(() => {
    (async () => {
      if (noteId) {
        try {
          const text = await readNote(noteId);
          const lines = text.split('\n');
          const firstLine = lines[0]?.replace(/^#+\s*/, '').trim() ?? noteId;
          setTitle(firstLine || noteId);
          setContent(text);
          setCurrentId(noteId);
        } catch {
          // New note
        }
      }
      // Load all titles for [[wikilink]] autocomplete
      const notes = await listNotes();
      setAllNoteTitles(notes.map((n) => n.title));
      setIsLoading(false);
    })();
  }, [noteId]);

  // ── Wikilink hint detection ──
  useEffect(() => {
    const match = content.match(/\[\[([^\]]+)$/);
    if (match) {
      const partial = match[1].toLowerCase();
      const hints = allNoteTitles.filter(
        (t) => t.toLowerCase().startsWith(partial) && t.toLowerCase() !== partial
      );
      setWikilinkHints(hints.slice(0, 5));
    } else {
      setWikilinkHints([]);
    }
  }, [content, allNoteTitles]);

  // ── Auto-save logic ──
  const triggerAutoSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        persistNote(newTitle, newContent, false);
      }, 1500);
    },
    []
  );

  const persistNote = async (
    t: string,
    c: string,
    showFeedback: boolean
  ) => {
    if (!t.trim() && !c.trim()) return;
    setIsSaving(true);
    try {
      let id = currentId;
      if (!id) {
        id = titleToId(t || 'untitled');
        setCurrentId(id);
      }
      await saveNote(id, c);
      await upsertNode(id, t || id, c);

      // Sync [[wikilinks]] to edges
      const linkedTitles = extractLinks(c);
      const nodes = await getAllNodes();
      const titleToIdMap = new Map(nodes.map((n) => [n.title.toLowerCase(), n.id]));
      const targetIds = linkedTitles
        .map((lt) => titleToIdMap.get(lt.toLowerCase()))
        .filter((x): x is string => !!x);
      await syncEdges(id, targetIds);

      await addRecentNote({ id, title: t || id });

      if (showFeedback) {
        Alert.alert('Saved', 'Note saved successfully.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save note.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => persistNote(title, content, true);

  const handleDelete = () => {
    Alert.alert('Delete Note', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (currentId) {
            await deleteNote(currentId);
            await deleteNode(currentId);
          }
          navigation.goBack();
        },
      },
    ]);
  };

  // ── Attachment picker ──
  const handleAttachImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow media access to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const filename = `img-${Date.now()}.${ext}`;
      await saveAttachment(asset.uri, filename);
      const mdImage = `\n![${filename}](attachments/${filename})\n`;
      const newContent = content + mdImage;
      setContent(newContent);
      triggerAutoSave(title, newContent);
    }
  };

  // ── Wikilink autocomplete insert ──
  const insertWikilink = (targetTitle: string) => {
    const newContent = content.replace(/\[\[([^\]]+)$/, `[[${targetTitle}]]`);
    setContent(newContent);
    setWikilinkHints([]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft color={Colors.textSecondary} size={22} />
        </TouchableOpacity>

        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            triggerAutoSave(t, content);
          }}
          placeholder="Untitled"
          placeholderTextColor={Colors.textMuted}
          selectionColor={Colors.accent}
        />

        <View style={styles.headerActions}>
          {isSaving && <ActivityIndicator size="small" color={Colors.accent} style={{ marginRight: 6 }} />}
          <TouchableOpacity onPress={handleAttachImage} style={styles.iconBtn}>
            <Paperclip color={Colors.textSecondary} size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsPreview((p) => !p)} style={styles.iconBtn}>
            {isPreview ? (
              <EyeOff color={Colors.accentLight} size={20} />
            ) : (
              <Eye color={Colors.textSecondary} size={20} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={styles.iconBtn}>
            <Save color={Colors.accentLight} size={20} />
          </TouchableOpacity>
          {currentId ? (
            <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
              <Trash2 color={Colors.error} size={20} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── Wikilink hint bar ── */}
      {wikilinkHints.length > 0 && (
        <ScrollView
          horizontal
          style={styles.hintBar}
          keyboardShouldPersistTaps="always"
          showsHorizontalScrollIndicator={false}
        >
          {wikilinkHints.map((hint) => (
            <TouchableOpacity
              key={hint}
              style={styles.hintChip}
              onPress={() => insertWikilink(hint)}
            >
              <Link color={Colors.accentLight} size={12} />
              <Text style={styles.hintText}>{hint}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Editor / Preview ── */}
      {isPreview ? (
        <ScrollView style={styles.previewContainer} contentContainerStyle={styles.previewContent}>
          {renderMarkdown(content)}
        </ScrollView>
      ) : (
        <TextInput
          style={styles.editor}
          multiline
          value={content}
          onChangeText={(c) => {
            setContent(c);
            triggerAutoSave(title, c);
          }}
          placeholder="Start writing… use # for headings, [[links]] for connections"
          placeholderTextColor={Colors.textMuted}
          selectionColor={Colors.accent}
          textAlignVertical="top"
          autoCorrect={false}
          autoCapitalize="sentences"
          scrollEnabled
        />
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
  },
  titleInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: '600',
    marginHorizontal: Spacing.sm,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { padding: Spacing.sm },

  hintBar: {
    backgroundColor: Colors.surface,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    maxHeight: 44,
  },
  hintChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accentDim,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  hintText: { color: Colors.accentLight, fontSize: FontSize.xs },

  editor: {
    flex: 1,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    lineHeight: 24,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
  },

  previewContainer: { flex: 1 },
  previewContent: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  mdH1: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '700', marginVertical: 8 },
  mdH2: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '600', marginVertical: 6 },
  mdH3: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '600', marginVertical: 4 },
  mdParagraph: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 22, marginVertical: 2 },
  mdListItem: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 22 },
  mdBlockquote: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    fontStyle: 'italic',
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    paddingLeft: Spacing.sm,
    marginVertical: 4,
  },
  mdWikilink: { color: Colors.accentLight, textDecorationLine: 'underline' },
  mdSpacer: { height: 8 },
});
