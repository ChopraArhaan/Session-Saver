/**
 * sessions.js - Core business logic for Session Saver
 *
 * Handles tab querying, URL filtering (skipping restricted chrome://, edge://,
 * and about: URLs), default session naming, session formatting, and restoration.
 */

import { getSessions, saveSession, deleteSession } from './storage.js';

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
 *
 * @returns {Promise<Array<Object>>} Filtered list of tab data.
 */
export async function getCurrentWindowTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });

  // Filter out internal system pages and extract only needed attributes
  const sanitizedTabs = tabs
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
 * @returns {Promise<Object>} The newly created session object.
 */
export async function saveCurrentSession(customName) {
  const validTabs = await getCurrentWindowTabs();

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
 * Removes a session by its unique ID.
 *
 * @param {string} sessionId - The ID of the session to delete.
 * @returns {Promise<Array<Object>>} Remaining sessions.
 */
export async function removeSession(sessionId) {
  return await deleteSession(sessionId);
}

/**
 * Re-exports getSessions for convenient access.
 */
export { getSessions };
