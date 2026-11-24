import { describe, it, expect, beforeEach } from 'vitest';
import { createChromeMock } from './helpers/chromeMock.js';
import {
  getSessions,
  saveSession,
  deleteSession,
  setAllSessions,
  addImportedSessions,
  pruneAutoSavedSessions,
  saveAutoSession,
  getSettings,
  saveSettings,
  getWindowSnapshots,
  setWindowSnapshots,
  removeWindowSnapshot,
  getStorageUsage,
} from '../src/lib/storage.js';

describe('storage.js', () => {
  beforeEach(() => {
    createChromeMock();
  });

  describe('Session persistence', () => {
    it('returns empty array if no sessions are stored', async () => {
      const sessions = await getSessions();
      expect(sessions).toEqual([]);
    });

    it('saves a session and prepends it to the list', async () => {
      const s1 = { id: '1', name: 'First', tabs: [] };
      const s2 = { id: '2', name: 'Second', tabs: [] };

      await saveSession(s1);
      const afterFirst = await getSessions();
      expect(afterFirst).toHaveLength(1);
      expect(afterFirst[0].id).toBe('1');

      await saveSession(s2);
      const afterSecond = await getSessions();
      expect(afterSecond).toHaveLength(2);
      expect(afterSecond[0].id).toBe('2');
    });

    it('deletes a session by ID', async () => {
      await saveSession({ id: 'keep', name: 'Keep me', tabs: [] });
      await saveSession({ id: 'delete', name: 'Delete me', tabs: [] });

      const remaining = await deleteSession('delete');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('keep');
    });

    it('replaces all sessions with setAllSessions', async () => {
      await saveSession({ id: 'old', name: 'Old', tabs: [] });
      const newSessions = [
        { id: 'new-1', name: 'N1', tabs: [] },
        { id: 'new-2', name: 'N2', tabs: [] },
      ];
      await setAllSessions(newSessions);
      const result = await getSessions();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('new-1');
    });

    it('merges imported sessions without overwriting', async () => {
      await saveSession({ id: 'existing', name: 'Existing', tabs: [] });
      const imported = [{ id: 'imported-1', name: 'Imported', tabs: [] }];

      const merged = await addImportedSessions(imported);
      expect(merged).toHaveLength(2);
      expect(merged.some((s) => s.id === 'existing')).toBe(true);
      expect(merged.some((s) => s.id === 'imported-1')).toBe(true);
    });
  });

  describe('Auto-save retention pruning', () => {
    it('keeps only the latest 5 auto-saved sessions and never drops manual sessions', () => {
      const sessions = [
        { id: 'auto-1', name: 'A1', auto: true },
        { id: 'manual-1', name: 'M1' },
        { id: 'auto-2', name: 'A2', auto: true },
        { id: 'auto-3', name: 'A3', auto: true },
        { id: 'manual-2', name: 'M2' },
        { id: 'auto-4', name: 'A4', auto: true },
        { id: 'auto-5', name: 'A5', auto: true },
        { id: 'auto-6', name: 'A6', auto: true }, // should be pruned
        { id: 'auto-7', name: 'A7', auto: true }, // should be pruned
        { id: 'manual-3', name: 'M3' },
      ];

      const pruned = pruneAutoSavedSessions(sessions, 5);

      const autoSessions = pruned.filter((s) => s.auto);
      const manualSessions = pruned.filter((s) => !s.auto);

      expect(autoSessions).toHaveLength(5);
      expect(manualSessions).toHaveLength(3);
      expect(autoSessions.map((s) => s.id)).toEqual([
        'auto-1',
        'auto-2',
        'auto-3',
        'auto-4',
        'auto-5',
      ]);
    });

    it('saveAutoSession flags session with auto:true and enforces max 5 limit', async () => {
      for (let i = 1; i <= 6; i++) {
        await saveAutoSession({ id: `auto-${i}`, name: `Auto ${i}`, tabs: [] });
      }

      const all = await getSessions();
      expect(all).toHaveLength(5);
      expect(all[0].id).toBe('auto-6');
      expect(all[4].id).toBe('auto-2');
    });
  });

  describe('Settings management', () => {
    it('returns default settings if unset', async () => {
      const settings = await getSettings();
      expect(settings.autoSave).toBe(true);
    });

    it('updates and persists settings', async () => {
      await saveSettings({ autoSave: false });
      const updated = await getSettings();
      expect(updated.autoSave).toBe(false);
    });
  });

  describe('Window snapshots', () => {
    it('stores and retrieves window snapshots', async () => {
      await setWindowSnapshots({ 101: [{ title: 'Tab', url: 'https://test.com' }] });
      const snapshots = await getWindowSnapshots();
      expect(snapshots[101]).toHaveLength(1);
    });

    it('removes window snapshot and returns removed tabs', async () => {
      const tabs = [{ title: 'Tab', url: 'https://test.com' }];
      await setWindowSnapshots({ 202: tabs });

      const removed = await removeWindowSnapshot(202);
      expect(removed).toEqual(tabs);

      const snapshotsAfter = await getWindowSnapshots();
      expect(snapshotsAfter[202]).toBeUndefined();
    });
  });

  describe('Storage usage', () => {
    it('calculates storage bytes in use and percentage', async () => {
      await saveSession({
        id: 's1',
        name: 'Test',
        tabs: [{ title: 'T', url: 'https://a.com' }],
      });
      const usage = await getStorageUsage();
      expect(usage.bytesInUse).toBeGreaterThan(0);
      expect(usage.quotaBytes).toBe(10485760);
      expect(typeof usage.formatted).toBe('string');
    });
  });
});
