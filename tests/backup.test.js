import { describe, it, expect } from 'vitest';
import {
  parseBackup,
  createBackupPayload,
  isAllowedTabUrl,
  formatBackupFilenameDate,
  MAX_BACKUP_FILE_SIZE,
} from '../src/lib/backup.js';

describe('backup.js', () => {
  describe('isAllowedTabUrl', () => {
    it('allows valid http, https, and file URLs', () => {
      expect(isAllowedTabUrl('https://example.com/page')).toBe(true);
      expect(isAllowedTabUrl('http://localhost:3000')).toBe(true);
      expect(isAllowedTabUrl('file:///C:/Users/test/doc.pdf')).toBe(true);
    });

    it('rejects internal and dangerous URL schemes', () => {
      expect(isAllowedTabUrl('javascript:alert(1)')).toBe(false);
      expect(isAllowedTabUrl('data:text/html,<h1>hi</h1>')).toBe(false);
      expect(isAllowedTabUrl('chrome://extensions')).toBe(false);
      expect(isAllowedTabUrl('edge://settings')).toBe(false);
      expect(isAllowedTabUrl('about:blank')).toBe(false);
      expect(isAllowedTabUrl('')).toBe(false);
      expect(isAllowedTabUrl(null)).toBe(false);
    });
  });

  describe('formatBackupFilenameDate', () => {
    it('formats a date as YYYY-MM-DD', () => {
      const date = new Date(2026, 10, 24); // Month is 0-indexed: 10 is November
      expect(formatBackupFilenameDate(date)).toBe('2026-11-24');
    });
  });

  describe('createBackupPayload', () => {
    it('creates standard backup payload structure', () => {
      const sessions = [{ id: 's1', name: 'Test Session', tabs: [] }];
      const payload = createBackupPayload(sessions);
      expect(payload.app).toBe('session-saver');
      expect(payload.version).toBe(1);
      expect(typeof payload.exportedAt).toBe('string');
      expect(payload.sessions).toHaveLength(1);
    });
  });

  describe('parseBackup', () => {
    const validBackupJson = JSON.stringify({
      app: 'session-saver',
      version: 1,
      exportedAt: '2026-11-24T12:00:00.000Z',
      sessions: [
        {
          id: 'session-1',
          name: 'Work Tabs',
          createdAt: '2026-11-24T10:00:00.000Z',
          tabs: [
            { id: 1, title: 'GitHub', url: 'https://github.com' },
            { id: 2, title: 'Docs', url: 'https://developer.mozilla.org' },
          ],
        },
      ],
    });

    it('successfully parses valid backup payload', () => {
      const result = parseBackup(validBackupJson);
      expect(result.importedSessions).toHaveLength(1);
      expect(result.stats.sessionsImported).toBe(1);
      expect(result.stats.tabsImported).toBe(2);
      expect(result.stats.sessionsSkipped).toBe(0);
      expect(result.stats.tabsSkipped).toBe(0);
    });

    it('rejects oversized files > 5MB', () => {
      expect(() => {
        parseBackup('{}', [], MAX_BACKUP_FILE_SIZE + 1);
      }).toThrow('File exceeds maximum allowed size of 5 MB.');
    });

    it('rejects empty or whitespace-only inputs', () => {
      expect(() => parseBackup('')).toThrow('Backup file is empty.');
      expect(() => parseBackup('   ')).toThrow('Backup file is empty.');
    });

    it('rejects malformed JSON', () => {
      expect(() => parseBackup('{ broken json')).toThrow('Invalid JSON file format.');
    });

    it('rejects backups with mismatched app name', () => {
      const wrongApp = JSON.stringify({
        app: 'other-session-manager',
        version: 1,
        sessions: [],
      });
      expect(() => parseBackup(wrongApp)).toThrow('application mismatch');
    });

    it('rejects unsupported backup versions', () => {
      const wrongVersion = JSON.stringify({
        app: 'session-saver',
        version: 99,
        sessions: [],
      });
      expect(() => parseBackup(wrongVersion)).toThrow('version 99 is not supported');
    });

    it('filters out disallowed URLs and drops sessions with no valid tabs', () => {
      const withBadUrls = JSON.stringify({
        app: 'session-saver',
        version: 1,
        sessions: [
          {
            id: 's-bad',
            name: 'Bad URLs Only',
            tabs: [
              { title: 'Bad 1', url: 'javascript:void(0)' },
              { title: 'Bad 2', url: 'chrome://settings' },
            ],
          },
          {
            id: 's-mixed',
            name: 'Mixed URLs',
            tabs: [
              { title: 'Good', url: 'https://valid.com' },
              { title: 'Bad', url: 'data:text/plain,bad' },
            ],
          },
        ],
      });

      const result = parseBackup(withBadUrls);
      expect(result.importedSessions).toHaveLength(1);
      expect(result.importedSessions[0].name).toBe('Mixed URLs');
      expect(result.stats.sessionsImported).toBe(1);
      expect(result.stats.sessionsSkipped).toBe(1);
      expect(result.stats.tabsImported).toBe(1);
      expect(result.stats.tabsSkipped).toBe(3);
    });

    it('resolves ID collisions by generating a fresh unique ID', () => {
      const existingSessions = [{ id: 'session-1', name: 'Existing One', tabs: [] }];
      const result = parseBackup(validBackupJson, existingSessions);
      expect(result.importedSessions[0].id).not.toBe('session-1');
      expect(result.importedSessions[0].name).toBe('Work Tabs');
    });
  });
});
