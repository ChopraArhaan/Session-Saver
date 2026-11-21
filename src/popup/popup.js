/**
 * popup.js - Main UI controller for Session Saver
 *
 * Imports logic from sessions.js and handles user interactions:
 * - Loading and rendering saved sessions
 * - Capturing and saving active tabs
 * - Displaying friendly UI feedback banners
 */

import { saveCurrentSession, getSessions } from '../lib/sessions.js';

// DOM Elements
const sessionNameInput = document.getElementById('sessionNameInput');
const saveBtn = document.getElementById('saveBtn');
const sessionsList = document.getElementById('sessionsList');
const sessionCounter = document.getElementById('sessionCounter');
const statusMessage = document.getElementById('statusMessage');

let messageTimeout = null;

/**
 * Shows an accessible, friendly status message in the UI banner.
 *
 * @param {string} text - Message to display.
 * @param {'success'|'error'} [type='success'] - Style of status banner.
 */
function showStatus(text, type = 'success') {
  if (messageTimeout) {
    clearTimeout(messageTimeout);
  }

  statusMessage.textContent = text;
  statusMessage.className = `status-banner show ${type}`;

  messageTimeout = setTimeout(() => {
    statusMessage.textContent = '';
    statusMessage.className = 'status-banner';
  }, 3500);
}

/**
 * Formats an ISO date string into a user-friendly timestamp.
 *
 * @param {string} isoString - Date string to format.
 * @returns {string} Human-friendly formatted date.
 */
function formatSessionDate(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

/**
 * Renders the session list.
 * Safely sanitizes text output using textContent to prevent XSS.
 *
 * @param {Array<Object>} sessions - Sessions to display.
 */
function renderSessions(sessions = []) {
  sessionCounter.textContent = String(sessions.length);
  sessionsList.innerHTML = '';

  if (sessions.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No saved sessions yet.';
    sessionsList.appendChild(emptyState);
    return;
  }

  sessions.forEach((session) => {
    const card = document.createElement('div');
    card.className = 'session-card';
    card.setAttribute('role', 'listitem');
    card.dataset.id = session.id;

    // Header container
    const header = document.createElement('div');
    header.className = 'session-header';

    // Info container (Title + Meta)
    const info = document.createElement('div');
    info.className = 'session-info';

    // Session title - strictly using textContent for security
    const title = document.createElement('div');
    title.className = 'session-name';
    title.textContent = session.name;

    // Meta details (tab count and date saved)
    const meta = document.createElement('div');
    meta.className = 'session-meta';

    const tabBadge = document.createElement('span');
    tabBadge.className = 'tab-count-badge';
    const count = session.tabs ? session.tabs.length : session.tabCount || 0;
    tabBadge.textContent = `${count} ${count === 1 ? 'tab' : 'tabs'}`;

    const dot = document.createElement('span');
    dot.textContent = '•';

    const dateSpan = document.createElement('span');
    dateSpan.textContent = formatSessionDate(session.createdAt);

    meta.appendChild(tabBadge);
    meta.appendChild(dot);
    meta.appendChild(dateSpan);

    info.appendChild(title);
    info.appendChild(meta);
    header.appendChild(info);
    card.appendChild(header);

    sessionsList.appendChild(card);
  });
}

/**
 * Handles saving the active window tabs as a new session.
 */
async function handleSaveSession() {
  const customName = sessionNameInput.value.trim();

  saveBtn.disabled = true;

  try {
    const newSession = await saveCurrentSession(customName);
    sessionNameInput.value = '';
    showStatus(`Saved "${newSession.name}" successfully!`, 'success');

    // Refresh sessions list
    const sessions = await getSessions();
    renderSessions(sessions);
  } catch (error) {
    showStatus(error.message || 'Failed to save session.', 'error');
  } finally {
    saveBtn.disabled = false;
  }
}

/**
 * Loads all saved sessions on popup launch.
 */
async function init() {
  try {
    const sessions = await getSessions();
    renderSessions(sessions);
  } catch (error) {
    console.error('Failed to initialize sessions:', error);
    showStatus('Could not load saved sessions.', 'error');
  }

  // Event Listeners
  saveBtn.addEventListener('click', handleSaveSession);

  // Allow pressing Enter in input to save
  sessionNameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      handleSaveSession();
    }
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
