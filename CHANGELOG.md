# Changelog

All notable changes to the **Session Saver** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-11-24

### Added
- **JSON Backup Export & Import**: Export all saved sessions to a standardized `session-saver-backup-YYYY-MM-DD.json` file and import backups with strict schema validation, protocol security filtering, and non-destructive ID collision resolution.
- **Global Keyboard Shortcut**: Save current window sessions instantly with `Ctrl+Shift+S` (`Command+Shift+S` on macOS) powered by a background service worker, featuring visual toolbar badge confirmation.
- **Auto-Save Closed Windows**: Automatic crash and accidental window closure recovery. Continuously snapshots window tabs and saves closing windows with 2 or more restorable tabs into rolling auto-saved sessions (capped at latest 5).
- **Auto-Save Settings Toggle**: User preference in popup header to toggle closed-window auto-saving on or off.
- **Session Type Filter**: Segment session list easily between "All", "Manual", and "Auto-saved" sessions.
- **Local Storage Meter**: Real-time storage consumption progress bar tracking usage against Chrome's 10 MB local quota, with an 80% warning threshold indicator.
- **Inline Session Rename**: Click the pencil icon to rename any session in-place with `Enter` to commit and `Escape` to cancel.
- **Session Duplication**: One-click duplication to clone existing sessions.
- **Current Window Restoration**: Choose between restoring sessions into a fresh browser window or appending tabs into the current active window.
- **Single Tab Restoration**: Click or activate individual tabs directly within the preview accordion to open them immediately.
- **Comprehensive Unit Test Suite**: Full Vitest testing coverage (38 unit tests) simulating Chrome extension storage, tabs, windows, and backup logic.
- **Continuous Integration (CI)**: GitHub Actions workflow running automated linting and unit tests on every push and pull request.
- **Privacy Policy**: Plain-English data privacy documentation in `PRIVACY.md` for Chrome Web Store distribution.
- **Chrome Web Store Listing Draft**: Complete store listing metadata and description in `docs/store-listing.md`.

### Changed
- Converted background processing to a Manifest V3 module service worker (`src/background.js`).
- Upgraded CI workflow to use `npm ci` and execute both `npm run lint` and `npm test`.
- Hardened tab queries to seamlessly support both popup and service worker execution contexts.

### Fixed
- Keyboard shortcut now targets the correct window and no longer reports an error for windows with only internal pages.
- Introduced `NoSavableTabsError` to distinguish expected empty tab conditions from unexpected runtime exceptions, displaying a neutral badge indicator (`–`) instead of an error.
- Hardened keyboard shortcut window targeting in the background service worker by using `tab.windowId` and falling back to `chrome.windows.getLastFocused`.
- Implemented single-timer tracking for badge notifications to prevent race conditions and collisions during rapid shortcut activations.
- Ensured tab removal events ignore closing windows (`removeInfo.isWindowClosing`), preventing closing windows from being recorded as empty tab snapshots.

## [1.0.0] - 2026-11-22

### Added
- **Save Session**: Save all tabs in the active window under a custom name, defaulting to the current date and time if left blank. Restricted URLs (`chrome://`, `edge://`, `about:`) are skipped automatically.
- **Restore Session**: Open all saved tabs from any session into a fresh browser window.
- **Delete Session**: Safely delete sessions with user confirmation prompts to avoid accidental loss.
- **Session Preview**: Expandable accordion view displaying tab counts, page titles, and favicons for every tab in a session.
- **Search & Filter**: Real-time search to instantly filter saved sessions by title.
- **Light & Dark Theme**: Responsive styling automatically matching system preferences via `prefers-color-scheme`.
- **Friendly Empty States**: Helpful visual indicators when no sessions are saved or no search queries match.
