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
  NoSavableTabsError,
} from './lib/sessions.js';
import {
  getSettings,
  setWindowSnapshots,
  removeWindowSnapshot,
  saveAutoSession,
} from './lib/storage.js';

let badgeTimer = null;

/**
 * Temporarily displays badge text feedback on the extension toolbar icon.
 * Clears any pending timeout to prevent race conditions during rapid triggers.
 *
 * @param {'success'|'no-tabs'|'error'|boolean} [status='success'] - Indicator status type.
 */
export async function showBadgeFeedback(status = 'success') {
  try {
    if (badgeTimer) {
      clearTimeout(badgeTimer);
      badgeTimer = null;
    }

    let text = '✓';
    let color = '#10B981'; // Green (Emerald 500)

    if (status === 'no-tabs' || status === 'empty') {
      text = '–'; // Neutral en-dash
      color = '#6B7280'; // Gray 500
    } else if (status === false || status === 'error') {
      text = '!';
      color = '#EF4444'; // Red 500
    }

    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });

    badgeTimer = setTimeout(async () => {
      try {
        await chrome.action.setBadgeText({ text: '' });
      } catch (err) {
        // Safe to ignore if context invalidated
      } finally {
        badgeTimer = null;
      }
    }, 2000);
  } catch (err) {
    console.error('Failed to show badge feedback:', err);
  }
}

/**
 * Resolves the target window ID for a shortcut trigger.
 * Prefers tab.windowId; falls back to chrome.windows.getLastFocused({ windowTypes: ['normal'] }).
 *
 * @param {chrome.tabs.Tab} [tab] - Optional tab passed from onCommand listener.
 * @returns {Promise<number|undefined>} The target window ID or undefined if not resolved.
 */
export async function getTargetWindowId(tab) {
  if (tab && typeof tab.windowId === 'number') {
    return tab.windowId;
  }

  if (chrome.windows && typeof chrome.windows.getLastFocused === 'function') {
    try {
      const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
      if (win && typeof win.id === 'number') {
        return win.id;
      }
    } catch {
      // Fallback if getLastFocused fails
    }
  }

  return undefined;
}

/**
 * Handles the keyboard command to save the active session.
 *
 * @param {chrome.tabs.Tab} [tab] - Active tab provided by onCommand.
 */
export async function handleSaveCommand(tab) {
  // Clear any existing badge at the start of the next event
  try {
    await chrome.action.setBadgeText({ text: '' });
  } catch {
    // Ignore
  }

  const targetWindowId = await getTargetWindowId(tab);

  try {
    await saveCurrentSession(undefined, targetWindowId);
    await showBadgeFeedback('success');
  } catch (err) {
    if (err instanceof NoSavableTabsError || err?.name === 'NoSavableTabsError') {
      console.info('No savable tabs found in window; skipped session save.');
      await showBadgeFeedback('no-tabs');
    } else {
      console.error('Failed to save session via keyboard shortcut:', err);
      await showBadgeFeedback('error');
    }
  }
}

/* ==========================================================================
   Window Snapshot & Auto-Save Recovery Logic
   ========================================================================== */

let syncTimeout = null;

/**
 * Queries all open windows and caches their sanitized tab lists into storage.
 * Persisting in storage.session ensures recovery if service worker sleeps.
 */
export async function syncWindowSnapshots() {
  try {
    if (!chrome.windows?.getAll) {
      return;
    }
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

/* ==========================================================================
   Synchronous Top-Level Event Listener Registrations
   (Required by Manifest V3 service worker lifecycle)
   ========================================================================== */

// 1. Keyboard shortcuts
if (chrome.commands?.onCommand?.addListener) {
  chrome.commands.onCommand.addListener((command, tab) => {
    if (command === 'save-session') {
      handleSaveCommand(tab);
    }
  });
}

// 2. Lifecycle hooks: clear badge text and sync snapshots
if (chrome.runtime?.onStartup?.addListener) {
  chrome.runtime.onStartup.addListener(async () => {
    try {
      await chrome.action.setBadgeText({ text: '' });
    } catch {
      // Ignore
    }
    syncWindowSnapshots();
  });
}

if (chrome.runtime?.onInstalled?.addListener) {
  chrome.runtime.onInstalled.addListener(async () => {
    try {
      await chrome.action.setBadgeText({ text: '' });
    } catch {
      // Ignore
    }
    syncWindowSnapshots();
  });
}

// 3. Tab mutation listeners to keep window snapshots fresh
if (chrome.tabs?.onCreated?.addListener) {
  chrome.tabs.onCreated.addListener(() => scheduleSyncWindowSnapshots());
}
if (chrome.tabs?.onUpdated?.addListener) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete' || changeInfo.url || changeInfo.title) {
      scheduleSyncWindowSnapshots();
    }
  });
}
if (chrome.tabs?.onRemoved?.addListener) {
  chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    // Skip snapshot updates when window is closing so closing windows aren't saved as empty
    if (removeInfo && removeInfo.isWindowClosing) {
      return;
    }
    scheduleSyncWindowSnapshots();
  });
}
if (chrome.tabs?.onMoved?.addListener) {
  chrome.tabs.onMoved.addListener(() => scheduleSyncWindowSnapshots());
}
if (chrome.tabs?.onAttached?.addListener) {
  chrome.tabs.onAttached.addListener(() => scheduleSyncWindowSnapshots());
}
if (chrome.tabs?.onDetached?.addListener) {
  chrome.tabs.onDetached.addListener(() => scheduleSyncWindowSnapshots());
}

// 4. Window removal listener for auto-save recovery
if (chrome.windows?.onRemoved?.addListener) {
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
}

// Sync snapshots when service worker initializes
syncWindowSnapshots();
