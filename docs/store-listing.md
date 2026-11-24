# Chrome Web Store Listing Draft

## Extension Title
Session Saver - Tab & Session Manager

---

## Short Description (Under 132 characters)
Save, search, and restore tab sessions in one click. Features auto-save recovery, JSON backup, and instant keyboard shortcuts.

*(Character count: 124 characters)*

---

## Detailed Description

Tired of tab overload slowing down your browser and scattering your focus? **Session Saver** is a fast, lightweight, and private tab session manager designed for Google Chrome (Manifest V3).

Whether you are researching a topic, juggling work projects, or recovering from an accidental window closure, Session Saver lets you organize, restore, and backup your workspaces with a single click or keyboard shortcut.

### 🌟 Key Features
- **One-Click Session Saving**: Capture all open tabs in your active window with an optional custom name (or formatted timestamp).
- **Auto-Save Crash Recovery**: Never lose work again. Automatically saves closing windows containing 2+ restorable tabs into rolling auto-saved sessions.
- **Global Keyboard Shortcut**: Press `Ctrl+Shift+S` (`Command+Shift+S` on macOS) to instantly save your current workspace without opening the popup.
- **JSON Backup Export & Import**: Export all sessions into a clean JSON file and import backups across devices with non-destructive merge protection.
- **Flexible Restoration**: Restore entire sessions into a fresh window or the current window, or click any single tab in the preview list to restore it individually.
- **Instant Search & Filter**: Find sessions effortlessly with real-time title search and toggle between "All", "Manual", and "Auto-saved" sessions.
- **Local Storage Meter**: Monitor local storage consumption in real time with an integrated 10 MB quota progress meter.
- **Adaptive Light & Dark Themes**: Modern interface that seamlessly matches your operating system's dark or light mode preference.
- **Smart Security Filtering**: Automatically ignores internal system URLs (`chrome://`, `edge://`, `about:`) and sanitizes tab titles.

### 🔒 Privacy First
Session Saver operates 100% locally on your computer:
- No tracking or analytics
- Zero external network requests
- No accounts, logins, or remote servers
- All data stays securely in your browser's `chrome.storage.local`

---

## Single-Purpose Statement
The single purpose of Session Saver is to save, organize, and restore browser tab sessions to help users manage their workspaces efficiently.

---

## Permission Justifications

| Permission | Justification |
| :--- | :--- |
| `tabs` | Needed to read URLs, titles, and favicons of open tabs when saving sessions, and to create tabs when restoring sessions or individual tabs. |
| `storage` | Needed to store saved tab collections, in-flight window recovery snapshots, and extension settings locally in `chrome.storage.local`. |

---

## Category
Productivity > Workflow & Planning

---

## Language
English
