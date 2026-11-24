import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createChromeMock } from './helpers/chromeMock.js';
import {
  handleSaveCommand,
  showBadgeFeedback,
  getTargetWindowId,
  registerBackgroundListeners,
} from '../src/background.js';
import { getSessions, getWindowSnapshots } from '../src/lib/storage.js';

describe('background keyboard shortcut & targeting', () => {
  let mock;
  let consoleErrorSpy;
  let consoleWarnSpy;
  let consoleInfoSpy;

  beforeEach(() => {
    vi.useFakeTimers();

    mock = createChromeMock({
      windows: [
        { id: 101, focused: true },
        { id: 102, focused: false },
      ],
      tabs: [
        {
          id: 1,
          windowId: 101,
          title: 'Google',
          url: 'https://google.com',
          favIconUrl: 'https://google.com/favicon.ico',
        },
        {
          id: 2,
          windowId: 101,
          title: 'GitHub',
          url: 'https://github.com',
          favIconUrl: 'https://github.com/favicon.ico',
        },
        {
          id: 3,
          windowId: 102,
          title: 'Wikipedia',
          url: 'https://wikipedia.org',
        },
        {
          id: 4,
          windowId: 103,
          title: 'Chrome Extensions',
          url: 'chrome://extensions',
        },
        {
          id: 5,
          windowId: 103,
          title: 'New Tab',
          url: 'chrome://newtab',
        },
      ],
    });

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    registerBackgroundListeners();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  describe('handleSaveCommand with valid tabs', () => {
    it('saves a session for the target window and shows success badge', async () => {
      const tab = { id: 1, windowId: 101 };
      await handleSaveCommand(tab);

      const sessions = await getSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].tabCount).toBe(2);
      expect(sessions[0].tabs.map((t) => t.url)).toEqual([
        'https://google.com',
        'https://github.com',
      ]);

      expect(mock.action._getBadgeText()).toBe('✓');
      expect(mock.action._getBadgeColor()).toBe('#10B981');

      // Clear badge after 2 seconds
      await vi.advanceTimersByTimeAsync(2000);
      expect(mock.action._getBadgeText()).toBe('');
    });
  });

  describe('handleSaveCommand with internal/restricted pages only', () => {
    it('sets neutral badge and logs info without throwing or calling console.error', async () => {
      const tab = { id: 4, windowId: 103 };
      await handleSaveCommand(tab);

      // No session should be saved
      const sessions = await getSessions();
      expect(sessions).toHaveLength(0);

      // Neutral badge '–' with gray color
      expect(mock.action._getBadgeText()).toBe('–');
      expect(mock.action._getBadgeColor()).toBe('#6B7280');

      // Never logs error or warning for normal expected condition
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('No savable tabs found'),
      );

      // Badge clears after 2 seconds
      await vi.advanceTimersByTimeAsync(2000);
      expect(mock.action._getBadgeText()).toBe('');
    });
  });

  describe('window targeting and fallback behavior', () => {
    it('falls back to getLastFocused normal window if tab is undefined', async () => {
      // tab argument is undefined
      await handleSaveCommand(undefined);

      const sessions = await getSessions();
      expect(sessions).toHaveLength(1);
      // Window 101 was the focused window with 2 tabs
      expect(sessions[0].tabCount).toBe(2);
      expect(mock.action._getBadgeText()).toBe('✓');
    });

    it('falls back to getLastFocused if tab.windowId is missing', async () => {
      const tabWithoutWindowId = { id: 1 };
      await handleSaveCommand(tabWithoutWindowId);

      const sessions = await getSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].tabCount).toBe(2);
    });

    it('queries tabs by windowId and never by currentWindow in background worker', async () => {
      mock.tabs._queries.length = 0; // reset tracked queries

      const tab = { id: 3, windowId: 102 };
      await handleSaveCommand(tab);

      // Inspect all queries performed during save
      expect(mock.tabs._queries.length).toBeGreaterThan(0);
      for (const query of mock.tabs._queries) {
        expect(query).toHaveProperty('windowId', 102);
        expect(query).not.toHaveProperty('currentWindow');
      }
    });

    it('getTargetWindowId correctly resolves explicit tab.windowId', async () => {
      const winId = await getTargetWindowId({ windowId: 102 });
      expect(winId).toBe(102);
    });
  });

  describe('badge timing and rapid triggers', () => {
    it('clears prior timer on rapid consecutive calls to prevent collision', async () => {
      await showBadgeFeedback('success');
      expect(mock.action._getBadgeText()).toBe('✓');

      // Advance 1 second (halfway through the 2s timeout)
      await vi.advanceTimersByTimeAsync(1000);
      expect(mock.action._getBadgeText()).toBe('✓');

      // Trigger second feedback ('no-tabs')
      await showBadgeFeedback('no-tabs');
      expect(mock.action._getBadgeText()).toBe('–');

      // Advance 1000ms: first timer would have fired here, but second timer is still active
      await vi.advanceTimersByTimeAsync(1000);
      expect(mock.action._getBadgeText()).toBe('–');

      // Advance another 1000ms: second timer completes and clears badge
      await vi.advanceTimersByTimeAsync(1000);
      expect(mock.action._getBadgeText()).toBe('');
    });

    it('displays error badge "!" on unexpected failure', async () => {
      await showBadgeFeedback('error');
      expect(mock.action._getBadgeText()).toBe('!');
      expect(mock.action._getBadgeColor()).toBe('#EF4444');

      await vi.advanceTimersByTimeAsync(2000);
      expect(mock.action._getBadgeText()).toBe('');
    });
  });

  describe('tab removal and window closing hardening', () => {
    it('skips snapshot updates when removeInfo.isWindowClosing is true', async () => {
      // In chromeMock, simulate onRemoved listener registered in background.js
      const onRemovedListeners = mock.tabs.onRemoved.getListeners();
      expect(onRemovedListeners.length).toBeGreaterThan(0);

      // Invoke with isWindowClosing: true
      const tabId = 1;
      const removeInfoClosing = { windowId: 101, isWindowClosing: true };

      const initialSnapshots = await getWindowSnapshots();

      for (const listener of onRemovedListeners) {
        listener(tabId, removeInfoClosing);
      }

      // Even after advancing timers, no debounce sync was scheduled
      await vi.advanceTimersByTimeAsync(2000);
      const afterSnapshots = await getWindowSnapshots();
      expect(afterSnapshots).toEqual(initialSnapshots);
    });

    it('schedules snapshot updates when removeInfo.isWindowClosing is false', async () => {
      const onRemovedListeners = mock.tabs.onRemoved.getListeners();
      const tabId = 1;
      const removeInfoNormal = { windowId: 101, isWindowClosing: false };

      for (const listener of onRemovedListeners) {
        listener(tabId, removeInfoNormal);
      }

      // Advancing timer runs debounced syncWindowSnapshots
      await vi.advanceTimersByTimeAsync(1500);
      const snapshots = await getWindowSnapshots();
      expect(snapshots).toBeDefined();
    });
  });

  describe('lifecycle hooks', () => {
    it('clears badge text on startup listener trigger', async () => {
      mock.action.setBadgeText({ text: 'OLD' });
      expect(mock.action._getBadgeText()).toBe('OLD');

      const startupListeners = mock.runtime.onStartup.getListeners();
      for (const fn of startupListeners) {
        await fn();
      }

      expect(mock.action._getBadgeText()).toBe('');
    });

    it('clears badge text on installed listener trigger', async () => {
      mock.action.setBadgeText({ text: 'OLD' });
      expect(mock.action._getBadgeText()).toBe('OLD');

      const installedListeners = mock.runtime.onInstalled.getListeners();
      for (const fn of installedListeners) {
        await fn();
      }

      expect(mock.action._getBadgeText()).toBe('');
    });
  });
});
