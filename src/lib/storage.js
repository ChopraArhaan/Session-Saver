/**
 * storage.js - Wrapper module for chrome.storage.local
 *
 * This module abstracts all direct calls to Chrome's local storage API,
 * providing safe, Promise-based functions to read, save, and delete sessions.
 */

// Key used to store the array of saved sessions in chrome.storage.local
const STORAGE_KEY = 'session_saver_sessions';

// Key used to store user settings in chrome.storage.local
export const SETTINGS_KEY = 'session_saver_settings';

// Key used to persist in-flight window tab snapshots across service worker restarts
export const SNAPSHOTS_KEY = 'session_saver_window_snapshots';

// Default settings
export const DEFAULT_SETTINGS = {
  autoSave: true,
};

/**
 * Retrieves all saved sessions from chrome.storage.local.
 *
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of sessions.
 *                                   Returns an empty array if no sessions exist.
 */
export async function getSessions() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const sessions = result[STORAGE_KEY];

    // Ensure we always return an Array, even if storage was empty or undefined
    if (Array.isArray(sessions)) {
      return sessions;
    }
    return [];
  } catch (error) {
    console.error('Failed to retrieve sessions from storage:', error);
    throw new Error('Could not load saved sessions. Please try again.');
  }
}

/**
 * Saves a new session into chrome.storage.local.
 * The newest session is placed at the beginning of the list.
 *
 * @param {Object} session - The session object to save.
 * @returns {Promise<Array<Object>>} Resolves to the updated array of all sessions.
 */
export async function saveSession(session) {
  if (!session || typeof session !== 'object') {
    throw new Error('Invalid session payload provided.');
  }

  try {
    const existingSessions = await getSessions();

    // Prepend the new session so newest appears first
    const updatedSessions = [session, ...existingSessions];

    await chrome.storage.local.set({ [STORAGE_KEY]: updatedSessions });
    return updatedSessions;
  } catch (error) {
    console.error('Failed to save session to storage:', error);
    throw new Error('Could not save session. Storage quota may be exceeded.');
  }
}

/**
 * Deletes a session by its unique ID.
 *
 * @param {string} sessionId - The unique ID of the session to remove.
 * @returns {Promise<Array<Object>>} Resolves to the updated list of remaining sessions.
 */
export async function deleteSession(sessionId) {
  if (!sessionId) {
    throw new Error('A valid session ID is required to delete.');
  }

  try {
    const existingSessions = await getSessions();
    const updatedSessions = existingSessions.filter((s) => s.id !== sessionId);

    await chrome.storage.local.set({ [STORAGE_KEY]: updatedSessions });
    return updatedSessions;
  } catch (error) {
    console.error('Failed to delete session from storage:', error);
    throw new Error('Could not delete session. Please try again.');
  }
}

/**
 * Saves a full array of sessions, replacing existing list.
 *
 * @param {Array<Object>} sessions - Sessions array to persist.
 * @returns {Promise<Array<Object>>} Resolves to the persisted sessions array.
 */
export async function setAllSessions(sessions) {
  if (!Array.isArray(sessions)) {
    throw new Error('Expected an array of sessions.');
  }

  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: sessions });
    return sessions;
  } catch (error) {
    console.error('Failed to save sessions to storage:', error);
    throw new Error('Could not save sessions. Storage quota may be exceeded.');
  }
}

/**
 * Merges newly imported sessions into existing storage without overwriting.
 *
 * @param {Array<Object>} newSessions - Sessions to prepend/merge.
 * @returns {Promise<Array<Object>>} Resolves to all sessions after merge.
 */
export async function addImportedSessions(newSessions) {
  if (!Array.isArray(newSessions) || newSessions.length === 0) {
    return await getSessions();
  }

  try {
    const existingSessions = await getSessions();
    const merged = [...newSessions, ...existingSessions];
    await chrome.storage.local.set({ [STORAGE_KEY]: merged });
    return merged;
  } catch (error) {
    console.error('Failed to merge imported sessions in storage:', error);
    throw new Error('Could not persist imported sessions.');
  }
}

/**
 * Pure function: filters an array of sessions to keep at most `maxAuto` (default 5)
 * auto-saved sessions (where auto === true), while preserving ALL manually saved sessions.
 *
 * @param {Array<Object>} sessions - Sessions to prune.
 * @param {number} [maxAuto=5] - Maximum number of auto-saved sessions to retain.
 * @returns {Array<Object>} Pruned sessions list.
 */
export function pruneAutoSavedSessions(sessions = [], maxAuto = 5) {
  if (!Array.isArray(sessions)) {
    return [];
  }
  let autoCount = 0;
  return sessions.filter((s) => {
    if (s && s.auto === true) {
      autoCount += 1;
      return autoCount <= maxAuto;
    }
    return true;
  });
}

/**
 * Saves a new auto-saved session, retaining only the latest 5 auto-saved sessions.
 * Never touches or removes manual sessions.
 *
 * @param {Object} session - The auto-saved session object (must have auto: true).
 * @param {number} [maxAuto=5] - Max auto sessions to keep.
 * @returns {Promise<Array<Object>>} Resolves to updated sessions array.
 */
export async function saveAutoSession(session, maxAuto = 5) {
  if (!session || typeof session !== 'object') {
    throw new Error('Invalid session payload provided.');
  }

  const existingSessions = await getSessions();
  const withNewSession = [{ ...session, auto: true }, ...existingSessions];
  const pruned = pruneAutoSavedSessions(withNewSession, maxAuto);

  await chrome.storage.local.set({ [STORAGE_KEY]: pruned });
  return pruned;
}

/**
 * Retrieves extension settings from chrome.storage.local.
 *
 * @returns {Promise<Object>} Resolves to settings object with defaults.
 */
export async function getSettings() {
  try {
    const result = await chrome.storage.local.get([SETTINGS_KEY]);
    return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] || {}) };
  } catch (error) {
    console.error('Failed to read settings from storage:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Updates extension settings in chrome.storage.local.
 *
 * @param {Object} newSettings - Partial or complete settings object.
 * @returns {Promise<Object>} Resolves to full updated settings.
 */
export async function saveSettings(newSettings = {}) {
  try {
    const current = await getSettings();
    const updated = { ...current, ...newSettings };
    await chrome.storage.local.set({ [SETTINGS_KEY]: updated });
    return updated;
  } catch (error) {
    console.error('Failed to save settings to storage:', error);
    throw new Error('Could not save settings.');
  }
}

/**
 * Returns the storage area for lightweight window snapshots.
 * Uses chrome.storage.session when available, otherwise falls back to chrome.storage.local.
 */
function getSnapshotStorageArea() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
    return chrome.storage.session;
  }
  return chrome.storage.local;
}

/**
 * Retrieves all in-flight window tab snapshots.
 *
 * @returns {Promise<Object>} Map of windowId -> array of tabs.
 */
export async function getWindowSnapshots() {
  try {
    const area = getSnapshotStorageArea();
    const result = await area.get([SNAPSHOTS_KEY]);
    return result[SNAPSHOTS_KEY] && typeof result[SNAPSHOTS_KEY] === 'object'
      ? result[SNAPSHOTS_KEY]
      : {};
  } catch (error) {
    console.error('Failed to get window snapshots:', error);
    return {};
  }
}

/**
 * Saves all in-flight window tab snapshots.
 *
 * @param {Object} snapshots - Map of windowId -> array of tabs.
 */
export async function setWindowSnapshots(snapshots = {}) {
  try {
    const area = getSnapshotStorageArea();
    await area.set({ [SNAPSHOTS_KEY]: snapshots });
  } catch (error) {
    console.error('Failed to save window snapshots:', error);
  }
}

/**
 * Removes the snapshot for a specific closed window ID and returns its tabs.
 *
 * @param {number} windowId - The window ID to remove.
 * @returns {Promise<Array<Object>|null>} The removed tabs snapshot, or null if none.
 */
export async function removeWindowSnapshot(windowId) {
  try {
    const snapshots = await getWindowSnapshots();
    const removedTabs = snapshots[windowId] || null;
    delete snapshots[windowId];
    await setWindowSnapshots(snapshots);
    return removedTabs;
  } catch (error) {
    console.error('Failed to remove window snapshot:', error);
    return null;
  }
}
