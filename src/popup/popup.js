/**
 * popup.js - Main UI controller for Session Saver
 *
 * Imports logic from sessions.js and handles user interactions:
 * - Loading and rendering saved sessions
 * - Capturing and saving active tabs
 * - Displaying friendly UI feedback banners
 */

import {
  saveCurrentSession,
  getSessions,
  restoreSessionInNewWindow,
  removeSession,
} from '../lib/sessions.js';

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

    // Actions container (Restore & Delete)
    const actions = document.createElement('div');
    actions.className = 'session-actions';

    // Restore button - opens tabs in a new browser window
    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'btn-action btn-restore';
    restoreBtn.type = 'button';
    restoreBtn.title = 'Restore session in a new window';
    restoreBtn.setAttribute('aria-label', `Restore session ${session.name}`);

    // Create SVG icon safely
    const restoreSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    restoreSvg.setAttribute('viewBox', '0 0 20 20');
    restoreSvg.setAttribute('fill', 'currentColor');
    restoreSvg.setAttribute('width', '13');
    restoreSvg.setAttribute('height', '13');
    restoreSvg.innerHTML =
      '<path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>';

    const restoreLabel = document.createElement('span');
    restoreLabel.textContent = 'Restore';

    restoreBtn.appendChild(restoreSvg);
    restoreBtn.appendChild(restoreLabel);

    restoreBtn.addEventListener('click', async (event) => {
      event.stopPropagation();
      try {
        await restoreSessionInNewWindow(session);
        showStatus(`Restored "${session.name}" in a new window!`, 'success');
      } catch (err) {
        showStatus(err.message || 'Failed to restore session.', 'error');
      }
    });

    // Delete button - removes session after user confirmation
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-action btn-delete';
    deleteBtn.type = 'button';
    deleteBtn.title = 'Delete session';
    deleteBtn.setAttribute('aria-label', `Delete session ${session.name}`);

    const deleteSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    deleteSvg.setAttribute('viewBox', '0 0 20 20');
    deleteSvg.setAttribute('fill', 'currentColor');
    deleteSvg.setAttribute('width', '13');
    deleteSvg.setAttribute('height', '13');
    deleteSvg.innerHTML =
      '<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>';

    deleteBtn.appendChild(deleteSvg);

    deleteBtn.addEventListener('click', async (event) => {
      event.stopPropagation();
      const confirmDelete = window.confirm(
        `Are you sure you want to delete "${session.name}"?`,
      );
      if (!confirmDelete) return;

      try {
        await removeSession(session.id);
        showStatus(`Deleted "${session.name}".`, 'success');
        const updatedSessions = await getSessions();
        renderSessions(updatedSessions);
      } catch (err) {
        showStatus(err.message || 'Failed to delete session.', 'error');
      }
    });

    actions.appendChild(restoreBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(actions);
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
