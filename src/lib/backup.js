/**
 * backup.js - Backup export and import logic for Session Saver
 *
 * Provides pure parsing/validation functions (for unit testability)
 * and safe browser-based JSON download/upload handling.
 */

// Maximum allowed backup file size in bytes (5 MB)
export const MAX_BACKUP_FILE_SIZE = 5 * 1024 * 1024;

// Expected application signature and schema version
export const BACKUP_APP_NAME = 'session-saver';
export const BACKUP_SCHEMA_VERSION = 1;

// Allowed protocols for imported tab URLs
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'file:'];

/**
 * Checks if a URL has an allowed safe protocol (http, https, file).
 * Disallows javascript:, data:, chrome:, edge:, about:, and other internal schemes.
 *
 * @param {string} url - The URL string to validate.
 * @returns {boolean} True if the protocol is allowed; false otherwise.
 */
export function isAllowedTabUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Generates a standard backup data payload structure.
 *
 * @param {Array<Object>} sessions - List of sessions to export.
 * @returns {Object} Structured backup object.
 */
export function createBackupPayload(sessions = []) {
  return {
    app: BACKUP_APP_NAME,
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    sessions: Array.isArray(sessions) ? sessions : [],
  };
}

/**
 * Parses and strictly validates JSON backup content.
 * Pure function: does not access DOM or Chrome extension APIs directly.
 *
 * @param {string} jsonString - The raw JSON string from an imported file.
 * @param {Array<Object>} [existingSessions=[]] - Current sessions to check ID collisions.
 * @param {number} [fileSize=0] - Size of the file in bytes.
 * @returns {{
 *   importedSessions: Array<Object>,
 *   stats: {
 *     sessionsImported: number,
 *     tabsImported: number,
 *     sessionsSkipped: number,
 *     tabsSkipped: number
 *   }
 * }} Validation result and stats.
 */
export function parseBackup(jsonString, existingSessions = [], fileSize = 0) {
  // Validate file size limit (max 5 MB)
  if (fileSize > MAX_BACKUP_FILE_SIZE) {
    throw new Error('File exceeds maximum allowed size of 5 MB.');
  }

  if (!jsonString || typeof jsonString !== 'string' || !jsonString.trim()) {
    throw new Error('Backup file is empty.');
  }

  // Parse JSON
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON file format.');
  }

  // Validate root structure
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid backup format: root must be an object.');
  }

  if (data.app !== BACKUP_APP_NAME) {
    throw new Error(
      `Invalid backup file: application mismatch (expected "${BACKUP_APP_NAME}").`,
    );
  }

  if (data.version !== BACKUP_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported backup version: version ${data.version} is not supported.`,
    );
  }

  if (!Array.isArray(data.sessions)) {
    throw new Error('Invalid backup format: "sessions" must be an array.');
  }

  // Collect existing session IDs to prevent collisions
  const seenIds = new Set(
    Array.isArray(existingSessions)
      ? existingSessions.map((s) => s && s.id).filter(Boolean)
      : [],
  );

  const importedSessions = [];
  let sessionsSkipped = 0;
  let tabsImported = 0;
  let tabsSkipped = 0;

  for (const rawSession of data.sessions) {
    // Basic session validation
    if (
      !rawSession ||
      typeof rawSession !== 'object' ||
      typeof rawSession.name !== 'string' ||
      !rawSession.name.trim() ||
      !Array.isArray(rawSession.tabs)
    ) {
      sessionsSkipped += 1;
      continue;
    }

    // Process and filter tabs
    const validTabs = [];
    for (const tab of rawSession.tabs) {
      if (
        tab &&
        typeof tab === 'object' &&
        typeof tab.url === 'string' &&
        typeof tab.title === 'string' &&
        isAllowedTabUrl(tab.url)
      ) {
        validTabs.push({
          id: tab.id || Math.floor(Math.random() * 1000000),
          title: tab.title.trim() || 'Untitled Tab',
          url: tab.url.trim(),
          favIconUrl: typeof tab.favIconUrl === 'string' ? tab.favIconUrl : '',
        });
      } else {
        tabsSkipped += 1;
      }
    }

    // If session has no valid tabs left, skip it
    if (validTabs.length === 0) {
      sessionsSkipped += 1;
      continue;
    }

    // Handle ID collision: generate a fresh ID if already exists
    let sessionId =
      typeof rawSession.id === 'string' && rawSession.id.trim()
        ? rawSession.id.trim()
        : '';

    if (!sessionId || seenIds.has(sessionId)) {
      sessionId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }
    seenIds.add(sessionId);

    const cleanSession = {
      id: sessionId,
      name: rawSession.name.trim(),
      createdAt:
        typeof rawSession.createdAt === 'string' && rawSession.createdAt
          ? rawSession.createdAt
          : new Date().toISOString(),
      tabCount: validTabs.length,
      tabs: validTabs,
    };

    // Preserve optional flags if present (such as auto-save)
    if (rawSession.auto === true) {
      cleanSession.auto = true;
    }

    importedSessions.push(cleanSession);
    tabsImported += validTabs.length;
  }

  return {
    importedSessions,
    stats: {
      sessionsImported: importedSessions.length,
      tabsImported,
      sessionsSkipped,
      tabsSkipped,
    },
  };
}

/**
 * Formats a Date object to YYYY-MM-DD string.
 *
 * @param {Date} [date=new Date()] - Date to format.
 * @returns {string} Formatted date string (e.g. "2026-11-24").
 */
export function formatBackupFilenameDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Triggers a client-side file download of all sessions as a JSON file.
 * Uses a temporary <a> tag with an object URL (requires NO downloads permission).
 *
 * @param {Array<Object>} sessions - The sessions to export.
 * @returns {{ filename: string, count: number }} Download details.
 */
export function exportSessionsAsJson(sessions = []) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    throw new Error('No sessions available to export.');
  }

  const payload = createBackupPayload(sessions);
  const jsonContent = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);

  const dateStr = formatBackupFilenameDate();
  const filename = `session-saver-backup-${dateStr}.json`;

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the object URL after brief delay
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);

  return { filename, count: sessions.length };
}
