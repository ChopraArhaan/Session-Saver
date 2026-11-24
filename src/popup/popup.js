/**
 * popup.js - Main UI controller for Session Saver
 *
 * Imports logic from sessions.js and handles user interactions:
 * - Loading and rendering saved sessions
 * - Capturing and saving active tabs
 * - Expanding sessions to preview individual tabs with favicons & titles
 * - Live real-time search filtering
 * - Displaying friendly UI feedback banners & empty states
 */

import {
  saveCurrentSession,
  getSessions,
  restoreSessionInNewWindow,
  restoreSessionInCurrentWindow,
  removeSession,
  renameSession,
  duplicateSession,
} from '../lib/sessions.js';
import { exportSessionsAsJson, parseBackup } from '../lib/backup.js';
import {
  addImportedSessions,
  getSettings,
  saveSettings,
  getStorageUsage,
} from '../lib/storage.js';

// DOM Elements
const sessionNameInput = document.getElementById('sessionNameInput');
const saveBtn = document.getElementById('saveBtn');
const sessionsList = document.getElementById('sessionsList');
const sessionCounter = document.getElementById('sessionCounter');
const statusMessage = document.getElementById('statusMessage');
const searchInput = document.getElementById('searchInput');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFileInput');
const autoSaveToggle = document.getElementById('autoSaveToggle');
const storageUsageText = document.getElementById('storageUsageText');
const storageProgressBar = document.getElementById('storageProgressBar');

// State
let allSessions = [];
let searchQuery = '';
let activeTypeFilter = 'all'; // 'all' | 'manual' | 'auto'
let messageTimeout = null;
const expandedSessionIds = new Set();

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
 * Updates the storage usage progress bar and text in the footer.
 */
async function updateStorageMeter() {
  if (!storageUsageText || !storageProgressBar) {
    return;
  }

  try {
    const usage = await getStorageUsage();
    storageUsageText.textContent = usage.formatted;
    storageProgressBar.style.width = `${usage.percentage}%`;
    storageProgressBar.setAttribute('aria-valuenow', String(usage.percentage));

    if (usage.percentage >= 80) {
      storageProgressBar.classList.add('warning');
    } else {
      storageProgressBar.classList.remove('warning');
    }
  } catch (error) {
    console.error('Failed to update storage meter:', error);
  }
}

/**
 * Creates a generic fallback favicon element.
 *
 * @returns {SVGElement} Safe SVG globe icon.
 */
function createFallbackFavicon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'tab-favicon tab-favicon-fallback');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.innerHTML =
    '<path fill-rule="evenodd" d="M4.083 9h11.834a8 8 0 01-1.144 6.273A8.006 8.006 0 0110 18a8.006 8.006 0 01-4.773-2.727A8 8 0 014.083 9zm.28-2a7.97 7.97 0 011.66-3.879A7.994 7.994 0 0110 2c1.78 0 3.395.58 4.707 1.558A7.97 7.97 0 0116.368 7H4.363zM10 4a6 6 0 00-1.87 5.706h3.74A6 6 0 0010 4z" clip-rule="evenodd"/>';
  return svg;
}

/**
 * Creates an empty state element when no sessions exist or search yields no matches.
 *
 * @param {'none'|'search'} type - Type of empty state.
 * @param {string} [term=''] - Current search term.
 * @returns {HTMLElement} Empty state container.
 */
function createEmptyState(type, term = '') {
  const container = document.createElement('div');
  container.className = 'empty-state';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'empty-icon-wrap';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('width', '32');
  svg.setAttribute('height', '32');

  const title = document.createElement('div');
  title.className = 'empty-title';

  const desc = document.createElement('div');
  desc.className = 'empty-desc';

  if (type === 'search') {
    svg.innerHTML =
      '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/><line x1="8" y1="11" x2="14" y2="11"/>';
    title.textContent = 'No matching sessions';
    desc.textContent = `No saved sessions matched "${term}".`;

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn-clear-search';
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear Search';
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      render();
    });

    iconWrap.appendChild(svg);
    container.appendChild(iconWrap);
    container.appendChild(title);
    container.appendChild(desc);
    container.appendChild(clearBtn);
  } else {
    svg.innerHTML =
      '<path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/><path d="M12 7v6m-3-3h6"/>';
    title.textContent = 'No saved sessions yet';
    desc.textContent =
      'Click Save above to capture all your open tabs into a clean, restorable session!';

    iconWrap.appendChild(svg);
    container.appendChild(iconWrap);
    container.appendChild(title);
    container.appendChild(desc);
  }

  return container;
}

/**
 * Renders the session list filtered by current search query.
 * Safely sanitizes text output using textContent to prevent XSS.
 */
function render() {
  let filtered = allSessions;

  // Filter by session type (All / Manual / Auto-saved)
  if (activeTypeFilter === 'manual') {
    filtered = filtered.filter((s) => !s.auto);
  } else if (activeTypeFilter === 'auto') {
    filtered = filtered.filter((s) => s.auto === true);
  }

  if (searchQuery) {
    filtered = filtered.filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }

  sessionCounter.textContent = String(filtered.length);
  sessionsList.innerHTML = '';

  // Handle empty states
  if (allSessions.length === 0) {
    sessionsList.appendChild(createEmptyState('none'));
    return;
  }

  if (filtered.length === 0) {
    sessionsList.appendChild(createEmptyState('search', searchQuery));
    return;
  }

  filtered.forEach((session) => {
    const isExpanded = expandedSessionIds.has(session.id);

    const card = document.createElement('div');
    card.className = `session-card ${isExpanded ? 'expanded' : ''}`;
    card.setAttribute('role', 'listitem');
    card.dataset.id = session.id;

    // Header container (Clickable to toggle tab preview)
    const header = document.createElement('div');
    header.className = 'session-header';
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', String(isExpanded));
    header.setAttribute('aria-label', `Toggle preview for ${session.name}`);

    // Left info container (Chevron + Title + Meta)
    const headerMain = document.createElement('div');
    headerMain.className = 'session-header-main';

    // Chevron icon for accordion
    const chevronSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chevronSvg.setAttribute('class', 'chevron-icon');
    chevronSvg.setAttribute('viewBox', '0 0 20 20');
    chevronSvg.setAttribute('fill', 'currentColor');
    chevronSvg.setAttribute('width', '16');
    chevronSvg.setAttribute('height', '16');
    chevronSvg.innerHTML =
      '<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>';

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

    // Auto-saved badge indicator
    if (session.auto === true) {
      const autoDot = document.createElement('span');
      autoDot.textContent = '•';
      const autoBadge = document.createElement('span');
      autoBadge.className = 'badge-auto';
      autoBadge.textContent = 'Auto';
      meta.appendChild(autoDot);
      meta.appendChild(autoBadge);
    }

    info.appendChild(title);
    info.appendChild(meta);

    headerMain.appendChild(chevronSvg);
    headerMain.appendChild(info);
    header.appendChild(headerMain);

    // Actions container (Restore, Rename, Duplicate, Delete)
    const actions = document.createElement('div');
    actions.className = 'session-actions';

    // Rename button - triggers inline editing of session name
    const renameBtn = document.createElement('button');
    renameBtn.className = 'btn-action btn-rename';
    renameBtn.type = 'button';
    renameBtn.title = 'Rename session';
    renameBtn.setAttribute('aria-label', `Rename session ${session.name}`);

    const renameSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    renameSvg.setAttribute('viewBox', '0 0 20 20');
    renameSvg.setAttribute('fill', 'currentColor');
    renameSvg.setAttribute('width', '13');
    renameSvg.setAttribute('height', '13');
    renameSvg.innerHTML =
      '<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>';
    renameBtn.appendChild(renameSvg);

    let isEditing = false;
    renameBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (isEditing) return;
      isEditing = true;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'input-inline-rename';
      input.value = session.name;
      input.maxLength = 60;

      const commitRename = async () => {
        if (!isEditing) return;
        isEditing = false;
        const newName = input.value.trim();
        if (newName && newName !== session.name) {
          try {
            await renameSession(session.id, newName);
            showStatus(`Renamed to "${newName}".`, 'success');
            allSessions = await getSessions();
            render();
          } catch (err) {
            showStatus(err.message || 'Failed to rename session.', 'error');
            title.textContent = session.name;
            input.replaceWith(title);
          }
        } else {
          input.replaceWith(title);
        }
      };

      const cancelRename = () => {
        if (!isEditing) return;
        isEditing = false;
        input.replaceWith(title);
      };

      input.addEventListener('click', (e) => e.stopPropagation());
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitRename();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelRename();
        }
      });
      input.addEventListener('blur', () => {
        commitRename();
      });

      title.replaceWith(input);
      input.focus();
      input.select();
    });

    // Duplicate button - creates an identical copy of the session
    const duplicateBtn = document.createElement('button');
    duplicateBtn.className = 'btn-action btn-duplicate';
    duplicateBtn.type = 'button';
    duplicateBtn.title = 'Duplicate session';
    duplicateBtn.setAttribute('aria-label', `Duplicate session ${session.name}`);

    const duplicateSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    duplicateSvg.setAttribute('viewBox', '0 0 20 20');
    duplicateSvg.setAttribute('fill', 'currentColor');
    duplicateSvg.setAttribute('width', '13');
    duplicateSvg.setAttribute('height', '13');
    duplicateSvg.innerHTML =
      '<path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z"/><path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z"/>';
    duplicateBtn.appendChild(duplicateSvg);

    duplicateBtn.addEventListener('click', async (event) => {
      event.stopPropagation();
      try {
        const dup = await duplicateSession(session.id);
        showStatus(`Duplicated as "${dup.name}".`, 'success');
        allSessions = await getSessions();
        render();
        updateStorageMeter();
      } catch (err) {
        showStatus(err.message || 'Failed to duplicate session.', 'error');
      }
    });

    // Split Restore button group (New window vs Current window)
    const restoreGroup = document.createElement('div');
    restoreGroup.className = 'restore-group';

    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'btn-action btn-restore btn-restore-main';
    restoreBtn.type = 'button';
    restoreBtn.title = 'Restore session in a new window (default)';
    restoreBtn.setAttribute(
      'aria-label',
      `Restore session ${session.name} in new window`,
    );

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

    // Restore choice dropdown toggle
    const restoreArrowBtn = document.createElement('button');
    restoreArrowBtn.className = 'btn-action btn-restore btn-restore-arrow';
    restoreArrowBtn.type = 'button';
    restoreArrowBtn.title = 'Restore options';
    restoreArrowBtn.setAttribute('aria-label', `Restore choices for ${session.name}`);
    restoreArrowBtn.setAttribute('aria-haspopup', 'true');
    restoreArrowBtn.setAttribute('aria-expanded', 'false');
    restoreArrowBtn.innerHTML =
      '<svg viewBox="0 0 20 20" fill="currentColor" width="10" height="10"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>';

    const restoreMenu = document.createElement('div');
    restoreMenu.className = 'restore-menu';
    restoreMenu.setAttribute('role', 'menu');

    const itemNewWindow = document.createElement('button');
    itemNewWindow.className = 'restore-menu-item';
    itemNewWindow.setAttribute('role', 'menuitem');
    itemNewWindow.textContent = 'New Window';
    itemNewWindow.addEventListener('click', async (e) => {
      e.stopPropagation();
      restoreMenu.classList.remove('open');
      restoreArrowBtn.setAttribute('aria-expanded', 'false');
      try {
        await restoreSessionInNewWindow(session);
        showStatus(`Restored "${session.name}" in a new window!`, 'success');
      } catch (err) {
        showStatus(err.message || 'Failed to restore session.', 'error');
      }
    });

    const itemCurrentWindow = document.createElement('button');
    itemCurrentWindow.className = 'restore-menu-item';
    itemCurrentWindow.setAttribute('role', 'menuitem');
    itemCurrentWindow.textContent = 'Current Window';
    itemCurrentWindow.addEventListener('click', async (e) => {
      e.stopPropagation();
      restoreMenu.classList.remove('open');
      restoreArrowBtn.setAttribute('aria-expanded', 'false');
      try {
        await restoreSessionInCurrentWindow(session);
        showStatus(`Restored "${session.name}" in current window!`, 'success');
      } catch (err) {
        showStatus(err.message || 'Failed to restore session.', 'error');
      }
    });

    restoreMenu.appendChild(itemNewWindow);
    restoreMenu.appendChild(itemCurrentWindow);

    restoreArrowBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = restoreMenu.classList.toggle('open');
      restoreArrowBtn.setAttribute('aria-expanded', String(isOpen));
      document.querySelectorAll('.restore-menu.open').forEach((m) => {
        if (m !== restoreMenu) m.classList.remove('open');
      });
    });

    restoreGroup.appendChild(restoreBtn);
    restoreGroup.appendChild(restoreArrowBtn);
    restoreGroup.appendChild(restoreMenu);

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
        expandedSessionIds.delete(session.id);
        showStatus(`Deleted "${session.name}".`, 'success');
        allSessions = await getSessions();
        render();
        updateStorageMeter();
      } catch (err) {
        showStatus(err.message || 'Failed to delete session.', 'error');
      }
    });

    actions.appendChild(restoreGroup);
    actions.appendChild(renameBtn);
    actions.appendChild(duplicateBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(actions);

    // Toggle expand/collapse when header is clicked
    const toggleExpand = () => {
      if (expandedSessionIds.has(session.id)) {
        expandedSessionIds.delete(session.id);
      } else {
        expandedSessionIds.add(session.id);
      }
      render();
    };

    header.addEventListener('click', toggleExpand);
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleExpand();
      }
    });

    card.appendChild(header);

    // Tab preview list (Accordion body)
    if (isExpanded && Array.isArray(session.tabs)) {
      const tabsPreview = document.createElement('div');
      tabsPreview.className = 'session-tabs-preview';
      tabsPreview.setAttribute('role', 'list');

      session.tabs.forEach((tab) => {
        const tabItem = document.createElement('div');
        tabItem.className = 'tab-preview-item';
        tabItem.setAttribute('role', 'listitem');
        tabItem.title = tab.url || '';

        // Favicon handling with safe fallback
        if (tab.favIconUrl && tab.favIconUrl.startsWith('http')) {
          const img = document.createElement('img');
          img.className = 'tab-favicon';
          img.src = tab.favIconUrl;
          img.alt = '';
          img.width = 14;
          img.height = 14;
          img.onerror = () => {
            img.replaceWith(createFallbackFavicon());
          };
          tabItem.appendChild(img);
        } else {
          tabItem.appendChild(createFallbackFavicon());
        }

        // Tab Title - strictly textContent to avoid XSS
        const titleSpan = document.createElement('span');
        titleSpan.className = 'tab-preview-title';
        titleSpan.textContent = tab.title || tab.url || 'Untitled Tab';

        // Hover restore hint
        const hintSpan = document.createElement('span');
        hintSpan.className = 'tab-preview-hint';
        hintSpan.textContent = 'Open tab';

        tabItem.appendChild(titleSpan);
        tabItem.appendChild(hintSpan);

        tabItem.setAttribute('tabindex', '0');
        tabItem.setAttribute('role', 'button');
        tabItem.setAttribute('aria-label', `Restore tab: ${tab.title || 'Untitled Tab'}`);

        // Restore single tab when clicked or activated via keyboard
        const handleRestoreSingleTab = async (e) => {
          e.stopPropagation();
          if (tab.url) {
            try {
              await chrome.tabs.create({ url: tab.url });
              showStatus(`Opened "${tab.title || 'tab'}".`, 'success');
            } catch (err) {
              showStatus(err.message || 'Failed to open tab.', 'error');
            }
          }
        };

        tabItem.addEventListener('click', handleRestoreSingleTab);
        tabItem.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleRestoreSingleTab(e);
          }
        });

        tabsPreview.appendChild(tabItem);
      });

      card.appendChild(tabsPreview);
    }

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

    allSessions = await getSessions();
    // Auto-expand newly saved session for instant confirmation
    expandedSessionIds.add(newSession.id);
    render();
    updateStorageMeter();
  } catch (error) {
    showStatus(error.message || 'Failed to save session.', 'error');
  } finally {
    saveBtn.disabled = false;
  }
}

/**
 * Handles exporting all saved sessions to a JSON backup file.
 */
function handleExport() {
  try {
    const result = exportSessionsAsJson(allSessions);
    showStatus(`Exported ${result.count} sessions to ${result.filename}!`, 'success');
  } catch (error) {
    showStatus(error.message || 'Failed to export sessions.', 'error');
  }
}

/**
 * Handles importing sessions from a user-selected JSON file.
 *
 * @param {Event} event - File input change event.
 */
async function handleImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const currentSessions = await getSessions();
    const { importedSessions, stats } = parseBackup(text, currentSessions, file.size);

    if (importedSessions.length === 0) {
      showStatus('No valid sessions found in backup file.', 'error');
      return;
    }

    // Merge into storage without overwriting existing sessions
    await addImportedSessions(importedSessions);
    allSessions = await getSessions();
    render();
    updateStorageMeter();

    let feedback = `Imported ${stats.sessionsImported} ${
      stats.sessionsImported === 1 ? 'session' : 'sessions'
    } (${stats.tabsImported} tabs).`;

    if (stats.sessionsSkipped > 0 || stats.tabsSkipped > 0) {
      feedback += ` Skipped: ${stats.sessionsSkipped} invalid sessions, ${stats.tabsSkipped} invalid tabs.`;
    }

    showStatus(feedback, 'success');
  } catch (error) {
    showStatus(error.message || 'Failed to import backup file.', 'error');
  } finally {
    importFileInput.value = '';
  }
}

/**
 * Loads all saved sessions and registers event listeners.
 */
async function init() {
  try {
    allSessions = await getSessions();
    render();
  } catch (error) {
    console.error('Failed to initialize sessions:', error);
    showStatus('Could not load saved sessions.', 'error');
  }

  // Save session listeners
  saveBtn.addEventListener('click', handleSaveSession);
  sessionNameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      handleSaveSession();
    }
  });

  // Search input live filtering
  searchInput.addEventListener('input', (event) => {
    searchQuery = event.target.value.trim();
    render();
  });

  // Export & Import listeners
  if (exportBtn) {
    exportBtn.addEventListener('click', handleExport);
  }
  if (importBtn && importFileInput) {
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', handleImportFile);
  }

  // Auto-save setting toggle
  if (autoSaveToggle) {
    try {
      const settings = await getSettings();
      autoSaveToggle.checked = Boolean(settings.autoSave);
    } catch {
      autoSaveToggle.checked = true;
    }

    autoSaveToggle.addEventListener('change', async () => {
      try {
        await saveSettings({ autoSave: autoSaveToggle.checked });
        showStatus(
          autoSaveToggle.checked ? 'Auto-save enabled.' : 'Auto-save disabled.',
          'success',
        );
      } catch (err) {
        showStatus(err.message || 'Failed to update auto-save setting.', 'error');
      }
    });
  }

  // Filter pills (All / Manual / Auto)
  const filterPills = document.querySelectorAll('.filter-pill');
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      activeTypeFilter = pill.dataset.filter || 'all';
      render();
    });
  });

  // Global listener to close restore menus when clicking elsewhere
  document.addEventListener('click', () => {
    document.querySelectorAll('.restore-menu.open').forEach((m) => {
      m.classList.remove('open');
    });
  });

  // Initial storage meter calculation
  updateStorageMeter();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
