# Changelog

All notable changes to the **Session Saver** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-22

### Added
- **Save Session**: Save all tabs in the active window under a custom name, defaulting to the current date and time if left blank. Restricted URLs (`chrome://`, `edge://`, `about:`) are skipped automatically.
- **Restore Session**: Open all saved tabs from any session into a fresh browser window.
- **Delete Session**: Safely delete sessions with user confirmation prompts to avoid accidental loss.
- **Session Preview**: Expandable accordion view displaying tab counts, page titles, and favicons for every tab in a session.
- **Search & Filter**: Real-time search to instantly filter saved sessions by title.
- **Light & Dark Theme**: Responsive styling automatically matching system preferences via `prefers-color-scheme`.
- **Friendly Empty States**: Helpful visual indicators when no sessions are saved or no search queries match.
