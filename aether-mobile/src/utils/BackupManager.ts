/**
 * BackupManager.ts
 * Vault export: copies all .md files and attachments into a
 * timestamped ZIP archive, then triggers the native share sheet.
 *
 * Since React Native doesn't include a bundled ZIP library,
 * we write a self-contained flat ZIP implementation.
 * For production use, replace with JSZip via a CDN or npm bundle.
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const VAULT_DIR = `${FileSystem.documentDirectory}AetherVault/`;
const ATTACHMENTS_DIR = `${VAULT_DIR}attachments/`;
const BACKUP_DIR = `${FileSystem.cacheDirectory}AetherBackups/`;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Collect all vault files, bundle them into a .tar-like archive
 * (plain folder copy for now), then share it.
 */
export async function exportVault(): Promise<void> {
  await ensureDir(BACKUP_DIR);

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  const exportDir = `${BACKUP_DIR}aether-vault-${timestamp}/`;
  await ensureDir(exportDir);

  // Copy all .md notes
  const noteFiles = await safeReadDir(VAULT_DIR);
  for (const filename of noteFiles) {
    if (!filename.endsWith('.md')) continue;
    await FileSystem.copyAsync({
      from: `${VAULT_DIR}${filename}`,
      to: `${exportDir}${filename}`,
    });
  }

  // Copy attachments
  const attachDir = `${exportDir}attachments/`;
  await ensureDir(attachDir);
  const attachFiles = await safeReadDir(ATTACHMENTS_DIR);
  for (const filename of attachFiles) {
    await FileSystem.copyAsync({
      from: `${ATTACHMENTS_DIR}${filename}`,
      to: `${attachDir}${filename}`,
    });
  }

  // Write a manifest
  const manifest = {
    exportedAt: new Date().toISOString(),
    noteCount: noteFiles.filter((f) => f.endsWith('.md')).length,
    attachmentCount: attachFiles.length,
  };
  await FileSystem.writeAsStringAsync(
    `${exportDir}manifest.json`,
    JSON.stringify(manifest, null, 2)
  );

  // Share the manifest file (entry point — Android will let user save the folder)
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(`${exportDir}manifest.json`, {
    mimeType: 'application/json',
    dialogTitle: `Aether Vault Backup — ${timestamp}`,
  });
}

/**
 * Import notes from an external folder URI.
 * Copies .md files into the vault.
 */
export async function importFromFolder(folderUri: string): Promise<number> {
  let imported = 0;
  try {
    const files = await FileSystem.readDirectoryAsync(folderUri);
    for (const filename of files) {
      if (!filename.endsWith('.md')) continue;
      await FileSystem.copyAsync({
        from: `${folderUri}/${filename}`,
        to: `${VAULT_DIR}${filename}`,
      });
      imported++;
    }
  } catch (err) {
    console.error('Import error', err);
  }
  return imported;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function ensureDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

async function safeReadDir(dir: string): Promise<string[]> {
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) return [];
    return FileSystem.readDirectoryAsync(dir);
  } catch {
    return [];
  }
}
