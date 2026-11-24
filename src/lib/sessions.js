/**
 * sessions.js - Core business logic for Session Saver
 *
 * Handles tab querying, URL filtering (skipping restricted chrome://, edge://,
 * and about: URLs), default session naming, session formatting, and restoration.
 */

import { getSessions, saveSession, deleteSession, setAllSessions } from './storage.js';

// Internal browser pages that cannot or should not be reopened by extensions
const RESTRICTED_URL_PREFIXES = ['chrome://', 'edge://', 'about:'];

/**
 * Checks whether a given URL is a restricted browser internal page.
 *
 * @param {string} url - The URL string to test.
 * @returns {boolean} True if the URL should be ignored; false otherwise.
 */
export function isRestrictedUrl(url) {
  if (!url || typeof url !== 'string') {
    return true;
  }

  const trimmedLower = url.trim().toLowerCase();
  return RESTRICTED_URL_PREFIXES.some((prefix) => trimmedLower.startsWith(prefix));
}

/**
 * Generates a beginner-friendly human-readable default session name
 * based on current date and time (e.g., "Nov 22, 2026, 04:30 AM").
 *
 * @param {Date} [date=new Date()] - The date to format.
 * @returns {string} Formatted default session title.
 */
export function formatDefaultSessionName(date = new Date()) {
  const dateStr = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timeStr = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dateStr}, ${timeStr}`;
}

/**
 * Queries all tabs in the active window and strips out restricted pages.
 * Supports passing an explicit windowId or falls back to lastFocusedWindow in background workers.
 *
 * @param {number} [windowId] - Optional specific window ID to query.
 * @returns {Promise<Array<Object>>} Filtered list of tab data.
 */
export async function getCurrentWindowTabs(windowId) {
  const queryInfo = typeof windowId === 'number' ? { windowId } : { currentWindow: true };

  let tabs = await chrome.tabs.query(queryInfo);

  // Fallback to lastFocusedWindow if currentWindow returned no tabs (service worker context)
  if ((!tabs || tabs.length === 0) && queryInfo.currentWindow) {
    tabs = await chrome.tabs.query({ lastFocusedWindow: true });
  }

  // Filter out internal system pages and extract only needed attributes
  const sanitizedTabs = (tabs || [])
    .filter((tab) => tab.url && !isRestrictedUrl(tab.url))
    .map((tab) => ({
      id: tab.id,
      title: tab.title || tab.url || 'Untitled Tab',
      url: tab.url,
      favIconUrl: tab.favIconUrl || '',
    }));

  return sanitizedTabs;
}

/**
 * Saves all valid tabs of the current window as a new session.
 *
 * @param {string} [customName] - Optional custom name provided by the user.
 * @param {number} [windowId] - Optional specific window ID to save.
 * @returns {Promise<Object>} The newly created session object.
 */
export async function saveCurrentSession(customName, windowId) {
  const validTabs = await getCurrentWindowTabs(windowId);

  if (validTabs.length === 0) {
    throw new Error(
      'No valid tabs to save. Internal browser pages (chrome://, edge://, about:) cannot be saved.',
    );
  }

  // Use custom name if provided; otherwise fallback to formatted timestamp
  const name =
    customName && customName.trim().length > 0
      ? customName.trim()
      : formatDefaultSessionName();

  const session = {
    id:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name,
    createdAt: new Date().toISOString(),
    tabCount: validTabs.length,
    tabs: validTabs,
  };

  await saveSession(session);
  return session;
}

/**
 * Restores a saved session by opening all its tabs in a new browser window.
 *
 * @param {Object} session - The session object to restore.
 * @returns {Promise<chrome.windows.Window>} The newly created Chrome window.
 */
export async function restoreSessionInNewWindow(session) {
  if (!session || !Array.isArray(session.tabs) || session.tabs.length === 0) {
    throw new Error('This session has no tabs to restore.');
  }

  const urls = session.tabs.map((tab) => tab.url).filter((url) => !isRestrictedUrl(url));

  if (urls.length === 0) {
    throw new Error('No valid URLs found in this session.');
  }

  // Open all URLs in a new browser window
  const newWindow = await chrome.windows.create({
    url: urls,
    focused: true,
  });

  return newWindow;
}

/**
 * Restores all tabs of a session into the current active window.
 *
 * @param {Object} session - Session to restore.
 * @returns {Promise<Array<chrome.tabs.Tab>>} Created tabs.
 */
export async function restoreSessionInCurrentWindow(session) {
  if (!session || !Array.isArray(session.tabs) || session.tabs.length === 0) {
    throw new Error('This session has no tabs to restore.');
  }

  const urls = session.tabs.map((tab) => tab.url).filter((url) => !isRestrictedUrl(url));

  if (urls.length === 0) {
    throw new Error('No valid URLs found in this session.');
  }

  const createdTabs = [];
  for (const url of urls) {
    const tab = await chrome.tabs.create({ url });
    createdTabs.push(tab);
  }

  return createdTabs;
}

/**
 * Renames an existing session by ID.
 *
 * @param {string} sessionId - ID of session to rename.
 * @param {string} newName - New name to assign.
 * @returns {Promise<Object>} Updated session object.
 */
export async function renameSession(sessionId, newName) {
  if (!sessionId) {
    throw new Error('A session ID is required to rename.');
  }

  const trimmed = typeof newName === 'string' ? newName.trim() : '';
  if (!trimmed) {
    throw new Error('Session name cannot be empty.');
  }

  const sessions = await getSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) {
    throw new Error('Session not found.');
  }

  session.name = trimmed;
  await setAllSessions(sessions);
  return session;
}

/**
 * Duplicates an existing session by ID, assigning a fresh ID and " (Copy)" suffix.
 *
 * @param {string} sessionId - ID of session to duplicate.
 * @returns {Promise<Object>} Newly created duplicate session object.
 */
export async function duplicateSession(sessionId) {
  if (!sessionId) {
    throw new Error('A session ID is required to duplicate.');
  }

  const sessions = await getSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) {
    throw new Error('Session not found.');
  }

  const newId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const duplicated = {
    ...session,
    id: newId,
    name: `${session.name} (Copy)`,
    createdAt: new Date().toISOString(),
    tabs: session.tabs.map((tab) => ({ ...tab })),
  };

  const updatedSessions = [duplicated, ...sessions];
  await setAllSessions(updatedSessions);
  return duplicated;
}

/**
 * Removes a session by its unique ID.
 *
 * @param {string} sessionId - The ID of the session to delete.
 * @returns {Promise<Array<Object>>} Remaining sessions.
 */
export async function removeSession(sessionId) {
  return await deleteSession(sessionId);
}

/**
 * Creates an auto-saved session object from an array of window tabs.
 * Only creates a session if there are at least 2 valid, non-restricted tabs.
 *
 * @param {Array<Object>} tabs - Tab objects from the closing window.
 * @param {Date} [date=new Date()] - Date to timestamp the session.
 * @returns {Object|null} Formatted auto session object or null if < 2 restorable tabs.
 */
export function createAutoSession(tabs = [], date = new Date()) {
  if (!Array.isArray(tabs)) {
    return null;
  }

  const validTabs = tabs
    .filter((tab) => tab && tab.url && !isRestrictedUrl(tab.url))
    .map((tab) => ({
      id: tab.id || Math.floor(Math.random() * 1000000),
      title: tab.title || tab.url || 'Untitled Tab',
      url: tab.url,
      favIconUrl: tab.favIconUrl || '',
    }));

  // Require at least 2 restorable tabs
  if (validTabs.length < 2) {
    return null;
  }

  const dateStr = formatDefaultSessionName(date);
  return {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `auto_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name: `Auto-saved: ${dateStr}`,
    createdAt: date.toISOString(),
    tabCount: validTabs.length,
    tabs: validTabs,
    auto: true,
  };
}

/**
 * Re-exports getSessions for convenient access.
 */
export { getSessions };
