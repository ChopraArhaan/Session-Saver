/**
 * background.js - Manifest V3 module background service worker
 *
 * Handles:
 * - Keyboard shortcuts (Ctrl+Shift+S / Command+Shift+S) to save active session
 * - Badge feedback indicators without requiring notifications permission
 */

import { saveCurrentSession } from './lib/sessions.js';

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
