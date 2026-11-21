/**
 * storage.js - Wrapper module for chrome.storage.local
 *
 * This module abstracts all direct calls to Chrome's local storage API,
 * providing safe, Promise-based functions to read, save, and delete sessions.
 */

// Key used to store the array of saved sessions in chrome.storage.local
const STORAGE_KEY = 'session_saver_sessions';

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
