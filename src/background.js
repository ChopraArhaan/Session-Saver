/**
 * background.js - Manifest V3 module background service worker
 *
 * Handles:
 * - Keyboard shortcuts (Ctrl+Shift+S / Command+Shift+S) to save active session
 * - Badge feedback indicators without requiring notifications permission
 * - Window tab snapshots debounced across tab events to recover closed windows
 * - Auto-saving closed windows with >= 2 restorable tabs (keeping latest 5)
 */

import {
  saveCurrentSession,
  createAutoSession,
  isRestrictedUrl,
} from './lib/sessions.js';
import {
  getSettings,
  setWindowSnapshots,
  removeWindowSnapshot,
  saveAutoSession,
} from './lib/storage.js';

/**
 * Temporarily displays badge text feedback on the extension toolbar icon.
 *
 * @param {boolean} success - True for success (green checkmark), false for failure (red exclamation).
 */
export async function showBadgeFeedback(success = true) {
  try {
    const text = success ? '✓' : '!';
    const color = success ? '#10B981' : '#EF4444'; // Emerald 500 / Red 500

    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });

    setTimeout(async () => {
      try {
        await chrome.action.setBadgeText({ text: '' });
      } catch (err) {
        console.error('Failed to clear badge text:', err);
      }
    }, 2000);
  } catch (err) {
    console.error('Failed to show badge feedback:', err);
  }
}

/**
 * Listens for keyboard commands configured in manifest.json.
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-session') {
    try {
      await saveCurrentSession();
      await showBadgeFeedback(true);
    } catch (err) {
      console.error('Failed to save session via keyboard shortcut:', err);
      await showBadgeFeedback(false);
    }
  }
});

/* ==========================================================================
   Window Snapshot & Auto-Save Recovery Logic
   ========================================================================== */

let syncTimeout = null;

/**
 * Queries all open windows and caches their sanitized tab lists into storage.
 * Persisting in storage.session (or local) ensures recovery if service worker sleeps.
 */
export async function syncWindowSnapshots() {
  try {
    const windows = await chrome.windows.getAll({ populate: true });
    const updatedSnapshots = {};

    for (const win of windows) {
      if (!win || typeof win.id !== 'number' || !Array.isArray(win.tabs)) {
        continue;
      }

      const validTabs = win.tabs
        .filter((tab) => tab && tab.url && !isRestrictedUrl(tab.url))
        .map((tab) => ({
          id: tab.id,
          title: tab.title || tab.url || 'Untitled Tab',
          url: tab.url,
          favIconUrl: tab.favIconUrl || '',
        }));

      updatedSnapshots[win.id] = validTabs;
    }

    await setWindowSnapshots(updatedSnapshots);
  } catch (err) {
    console.error('Failed to sync window snapshots:', err);
  }
}

/**
 * Schedules debounced window snapshot synchronization (~1000ms).
 *
 * @param {number} [delayMs=1000] - Debounce delay in milliseconds.
 */
export function scheduleSyncWindowSnapshots(delayMs = 1000) {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  syncTimeout = setTimeout(() => {
    syncWindowSnapshots();
  }, delayMs);
}

// Register listeners on tab mutation events to keep window snapshots fresh
chrome.tabs.onCreated.addListener(() => scheduleSyncWindowSnapshots());
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete' || changeInfo.url || changeInfo.title) {
    scheduleSyncWindowSnapshots();
  }
});
chrome.tabs.onRemoved.addListener(() => scheduleSyncWindowSnapshots());
chrome.tabs.onMoved.addListener(() => scheduleSyncWindowSnapshots());
chrome.tabs.onAttached.addListener(() => scheduleSyncWindowSnapshots());
chrome.tabs.onDetached.addListener(() => scheduleSyncWindowSnapshots());

// On window close, check if auto-save is enabled and save if >= 2 restorable tabs
chrome.windows.onRemoved.addListener(async (windowId) => {
  try {
    const settings = await getSettings();
    const removedTabs = await removeWindowSnapshot(windowId);

    // Skip if setting is disabled or snapshot is missing
    if (!settings.autoSave || !removedTabs || !Array.isArray(removedTabs)) {
      return;
    }

    const autoSession = createAutoSession(removedTabs);
    if (autoSession) {
      await saveAutoSession(autoSession);
    }
  } catch (err) {
    console.error('Failed to auto-save closed window:', err);
  }
});

// Sync snapshots when service worker initializes
syncWindowSnapshots();
