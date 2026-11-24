import { describe, it, expect, beforeEach } from 'vitest';
import { createChromeMock } from './helpers/chromeMock.js';
import {
  isRestrictedUrl,
  formatDefaultSessionName,
  getCurrentWindowTabs,
  saveCurrentSession,
  restoreSessionInNewWindow,
  restoreSessionInCurrentWindow,
  renameSession,
  duplicateSession,
  createAutoSession,
} from '../src/lib/sessions.js';
import { getSessions } from '../src/lib/storage.js';

describe('sessions.js', () => {
  let mock;

  beforeEach(() => {
    mock = createChromeMock({
      tabs: [
        { id: 10, title: 'Google', url: 'https://google.com', windowId: 1 },
        { id: 11, title: 'Extensions', url: 'chrome://extensions', windowId: 1 },
        { id: 12, title: 'Edge Flags', url: 'edge://flags', windowId: 1 },
        { id: 13, title: 'About Blank', url: 'about:blank', windowId: 1 },
        { id: 14, title: 'GitHub', url: 'https://github.com', windowId: 1 },
      ],
      windows: [{ id: 1, focused: true }],
    });
  });

  describe('isRestrictedUrl', () => {
    it('identifies internal browser restricted schemes', () => {
      expect(isRestrictedUrl('chrome://extensions')).toBe(true);
      expect(isRestrictedUrl('chrome://history')).toBe(true);
      expect(isRestrictedUrl('edge://settings')).toBe(true);
      expect(isRestrictedUrl('about:blank')).toBe(true);
      expect(isRestrictedUrl('')).toBe(true);
      expect(isRestrictedUrl(null)).toBe(true);
    });

    it('permits normal web and file URLs', () => {
      expect(isRestrictedUrl('https://google.com')).toBe(false);
      expect(isRestrictedUrl('http://localhost:8080')).toBe(false);
      expect(isRestrictedUrl('file:///C:/doc.html')).toBe(false);
    });
  });

  describe('formatDefaultSessionName', () => {
    it('formats a date into human-readable session name', () => {
      const date = new Date(2026, 10, 24, 10, 30);
      const name = formatDefaultSessionName(date);
      expect(typeof name).toBe('string');
      expect(name).toContain('2026');
    });
  });

  describe('getCurrentWindowTabs', () => {
    it('filters out restricted tabs from current window', async () => {
      const tabs = await getCurrentWindowTabs(1);
      expect(tabs).toHaveLength(2);
      expect(tabs.map((t) => t.url)).toEqual([
        'https://google.com',
        'https://github.com',
      ]);
    });
  });

  describe('saveCurrentSession', () => {
    it('saves valid tabs under a custom name', async () => {
      const session = await saveCurrentSession('My Project', 1);
      expect(session.name).toBe('My Project');
      expect(session.tabCount).toBe(2);

      const all = await getSessions();
      expect(all).toHaveLength(1);
      expect(all[0].name).toBe('My Project');
    });

    it('falls back to formatted date name if custom name is omitted', async () => {
      const session = await saveCurrentSession('', 1);
      expect(session.name).toContain('2026');
    });

    it('throws error if window contains zero valid tabs', async () => {
      mock.tabs._setTabs([
        { id: 1, title: 'Chrome', url: 'chrome://version', windowId: 2 },
      ]);
      await expect(saveCurrentSession('Empty', 2)).rejects.toThrow(
        'Internal browser pages',
      );
    });
  });

  describe('renameSession', () => {
    it('renames an existing session', async () => {
      const session = await saveCurrentSession('Initial Name', 1);
      const renamed = await renameSession(session.id, 'Updated Name');
      expect(renamed.name).toBe('Updated Name');

      const all = await getSessions();
      expect(all[0].name).toBe('Updated Name');
    });

    it('throws error on empty name', async () => {
      const session = await saveCurrentSession('Test', 1);
      await expect(renameSession(session.id, '  ')).rejects.toThrow('cannot be empty');
    });
  });

  describe('duplicateSession', () => {
    it('duplicates session with a fresh ID and " (Copy)" suffix', async () => {
      const original = await saveCurrentSession('My Notes', 1);
      const duplicate = await duplicateSession(original.id);

      expect(duplicate.id).not.toBe(original.id);
      expect(duplicate.name).toBe('My Notes (Copy)');
      expect(duplicate.tabs).toHaveLength(original.tabs.length);

      const all = await getSessions();
      expect(all).toHaveLength(2);
    });
  });

  describe('restoreSessionInNewWindow & CurrentWindow', () => {
    it('restores session into a new window', async () => {
      const session = await saveCurrentSession('To Restore', 1);
      const newWin = await restoreSessionInNewWindow(session);
      expect(newWin.id).toBeDefined();
      expect(newWin.tabs).toHaveLength(2);
    });

    it('restores session into current window', async () => {
      const session = await saveCurrentSession('Current Restore', 1);
      const tabs = await restoreSessionInCurrentWindow(session);
      expect(tabs).toHaveLength(2);
    });
  });

  describe('createAutoSession', () => {
    it('returns null if restorable tabs count < 2', () => {
      const singleTab = [{ title: 'T1', url: 'https://test.com' }];
      expect(createAutoSession(singleTab)).toBeNull();

      const onlyRestricted = [
        { title: 'C1', url: 'chrome://settings' },
        { title: 'C2', url: 'about:blank' },
      ];
      expect(createAutoSession(onlyRestricted)).toBeNull();
    });

    it('creates auto-saved session when >= 2 restorable tabs exist', () => {
      const twoTabs = [
        { title: 'T1', url: 'https://site1.com' },
        { title: 'Restricted', url: 'chrome://history' },
        { title: 'T2', url: 'https://site2.com' },
      ];
      const autoSession = createAutoSession(twoTabs);
      expect(autoSession).not.toBeNull();
      expect(autoSession.auto).toBe(true);
      expect(autoSession.tabCount).toBe(2);
      expect(autoSession.name).toContain('Auto-saved:');
    });
  });
});
