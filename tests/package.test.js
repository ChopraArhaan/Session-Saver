import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageExtension } from '../scripts/package.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const testZipPath = path.join(projectRoot, 'test-package-output.zip');

/**
 * Extracts entry names from a ZIP archive by parsing the Central Directory headers.
 * Pure Node.js implementation without external dependencies.
 *
 * @param {Buffer} buffer - Buffer of the zip file.
 * @returns {Array<string>} List of entry paths in the zip file.
 */
function getZipEntries(buffer) {
  const entries = [];
  const CENTRAL_DIR_SIGNATURE = 0x02014b50;

  for (let offset = 0; offset < buffer.length - 4; offset += 1) {
    if (buffer.readUInt32LE(offset) === CENTRAL_DIR_SIGNATURE) {
      const fileNameLen = buffer.readUInt16LE(offset + 28);
      const extraLen = buffer.readUInt16LE(offset + 30);
      const commentLen = buffer.readUInt16LE(offset + 32);

      const fileName = buffer.toString('utf8', offset + 46, offset + 46 + fileNameLen);
      entries.push(fileName);

      offset += 45 + fileNameLen + extraLen + commentLen;
    }
  }

  return entries;
}

describe('scripts/package.js cross-platform packaging', () => {
  it('successfully creates zip with manifest.json at the archive root', async () => {
    // Run packageExtension targeting test zip path
    const result = await packageExtension({ dest: testZipPath });

    try {
      expect(fs.existsSync(testZipPath)).toBe(true);
      expect(result.name).toBe('Session Saver');
      expect(result.version).toBe('1.1.0');
      expect(result.fileCount).toBeGreaterThanOrEqual(10);
      expect(result.sizeBytes).toBeGreaterThan(0);

      const buffer = fs.readFileSync(testZipPath);
      const entries = getZipEntries(buffer);

      // Verify manifest.json is at zip root, not src/manifest.json
      expect(entries).toContain('manifest.json');
      expect(entries).not.toContain('src/manifest.json');

      // Verify forward slashes across all platforms
      for (const entry of entries) {
        expect(entry).not.toContain('\\');
        expect(entry.startsWith('/')).toBe(false);
      }

      // Verify key extension files are included
      expect(entries).toContain('background.js');
      expect(entries).toContain('popup/popup.html');
      expect(entries).toContain('popup/popup.css');
      expect(entries).toContain('popup/popup.js');
      expect(entries).toContain('lib/sessions.js');
      expect(entries).toContain('lib/storage.js');
      expect(entries).toContain('lib/backup.js');
      expect(entries).toContain('icons/icon16.png');
      expect(entries).toContain('icons/icon48.png');
      expect(entries).toContain('icons/icon128.png');

      // Verify NO tests, node_modules, root docs, or config files leaked into archive
      for (const entry of entries) {
        expect(entry).not.toMatch(/^src\//);
        expect(entry).not.toMatch(/^tests\//);
        expect(entry).not.toMatch(/^node_modules\//);
        expect(entry).not.toMatch(/\.git/);
        expect(entry).not.toBe('package.json');
        expect(entry).not.toBe('package-lock.json');
        expect(entry).not.toBe('eslint.config.js');
        expect(entry).not.toBe('.prettierrc');
        expect(entry).not.toBe('README.md');
        expect(entry).not.toBe('CHANGELOG.md');
        expect(entry).not.toBe('CONTRIBUTING.md');
        expect(entry).not.toBe('LICENSE');
      }
    } finally {
      if (fs.existsSync(testZipPath)) {
        fs.unlinkSync(testZipPath);
      }
    }
  });

  it('fails with a descriptive error when manifest.json is missing', async () => {
    const invalidManifest = path.join(projectRoot, 'src', 'non-existent.json');

    await expect(
      packageExtension({ manifest: invalidManifest, dest: testZipPath }),
    ).rejects.toThrow('Manifest file missing');
  });
});
