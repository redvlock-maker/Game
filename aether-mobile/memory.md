# Aether Mobile - Project Memory & Architecture

## Concept
A local-first Android productivity app combining Notion's block-like UI with Obsidian's local
markdown files and bidirectional linking. The app must be fully functional offline, prioritizing
the user's data ownership.

## Tech Stack
- Framework: React Native + Expo (TypeScript)
- Styling: Custom dark theme via `src/utils/theme.ts`
- Icons: Lucide-React-Native
- File Storage: expo-file-system (Notes saved as raw .md files on device)
- Relational Indexing: expo-sqlite (Indexes tags, metadata, and [[bidirectional links]])
- Full-Text Search: SQLite FTS5 (Instant search across all content)
- Media Support: expo-image-picker (Local attachment management)
- Backup & Sharing: expo-sharing (Vault export functionality)
- State: React hooks + Zustand (available, not yet wired to global store)
- Navigation: React Navigation (Bottom Tabs + Native Stack)
- Visualization: react-native-svg (Interactive graph rendering)
- Recent Notes: @react-native-async-storage/async-storage
- **Build System: EAS (Expo Application Services) for APK generation**

## Core Features — ALL COMPLETE ✅
1. [x] Mobile Navigation (Bottom Tabs & Stack) — AppNavigator.tsx
2. [x] Local File System Integration (Read/Write/Delete .md files) — FileManager.ts
3. [x] SQLite Link Indexer (Parses files for `[[links]]` and saves relationships) — DatabaseManager.ts
4. [x] Markdown Editor Screen — EditorScreen.tsx
5. [x] Floating Action Button (FAB) wired to Editor — FloatingActionButton.tsx
6. [x] Graph View Visualization — GraphScreen.tsx
7. [x] Instant Full-Text Search (FTS5) — SearchScreen.tsx
8. [x] Local Media Attachments — FileManager.ts & EditorScreen.tsx
9. [x] Vault Export & Backup — BackupManager.ts & HomeScreen.tsx
10. [x] Command Palette & UI Polish — CommandPalette.tsx & RecentNotesManager.ts
11. [x] APK Build Preparation — app.json & eas.json configured

## Current Status
- [x] Phase 1: Expo project scaffolded
- [x] Phase 2: theme.ts + AppNavigator.tsx
- [x] Phase 3: FileManager.ts (vault I/O)
- [x] Phase 4: DatabaseManager.ts (SQLite + FTS5)
- [x] Phase 5: EditorScreen.tsx (markdown editor + preview + wikilink autocomplete)
- [x] Phase 6: FloatingActionButton.tsx + HomeScreen.tsx + RecentNotesManager.ts
- [x] Phase 7: GraphScreen.tsx (force-layout SVG graph)
- [x] Phase 8: SearchScreen.tsx (FTS5 instant search)
- [x] Phase 9: BackupManager.ts (vault export via share sheet)
- [x] Phase 10: CommandPalette.tsx (spotlight-style)
- [x] Phase 11: app.json + eas.json + BUILD_INSTRUCTIONS.md
- [x] App.tsx wired to AppNavigator

## Architecture & Data Model
- **File Layer:**
  - `/AetherVault/note_name.md` (Raw text)
  - `/AetherVault/attachments/` (Local media files)
- **SQLite Layer:**
  - `nodes` table (id, filename, title, created_at, updated_at)
  - `edges` table (id, source_id, target_id) — bidirectional link graph
  - `search_index` (FTS5) — virtual table for lightning-fast content search

## File Map
```
aether-mobile/
├── memory.md                          ← Project brain
├── App.tsx                            ← Entry point (wired to AppNavigator)
├── app.json                           ← Production Android config
├── eas.json                           ← EAS build profiles
├── BUILD_INSTRUCTIONS.md              ← APK build guide
├── src/
│   ├── components/
│   │   ├── FloatingActionButton.tsx   ← Animated FAB
│   │   └── CommandPalette.tsx         ← Spotlight-style palette
│   ├── navigation/
│   │   └── AppNavigator.tsx           ← Bottom tabs + stack navigator
│   ├── screens/
│   │   ├── HomeScreen.tsx             ← Note list + vault stats
│   │   ├── SearchScreen.tsx           ← FTS5 instant search
│   │   ├── EditorScreen.tsx           ← Markdown editor + preview
│   │   └── GraphScreen.tsx            ← SVG force-layout graph
│   └── utils/
│       ├── FileManager.ts             ← File I/O helpers
│       ├── DatabaseManager.ts         ← SQLite + FTS5
│       ├── BackupManager.ts           ← Vault export
│       ├── RecentNotesManager.ts      ← AsyncStorage recent list
│       └── theme.ts                   ← Design tokens
```
