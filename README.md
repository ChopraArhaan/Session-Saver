# 🗂️ Session Saver

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/ChopraArhaan/Session-Saver/actions/workflows/lint.yml/badge.svg)](https://github.com/ChopraArhaan/Session-Saver/actions/workflows/lint.yml)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](https://github.com/ChopraArhaan/Session-Saver/actions/workflows/lint.yml)

> Save, search, and restore your tab sessions in one click. Clean, private, and lightweight tab management built for Manifest V3.

![Session Saver Demo](docs/screenshots/demo.gif)

---

## 💡 Why Session Saver?

Most session managers are bloated with trackers, require cloud accounts, or request invasive browser permissions. **Session Saver** was engineered from the ground up to be different:

- 🛡️ **Auto-Save Crash Recovery**: Accidentally closed a window or suffered a browser crash? Windows containing 2+ restorable tabs are automatically saved into a rolling recovery log.
- 💾 **Non-Destructive JSON Backups**: Export your entire session library to clean JSON and restore it on any machine without ever overwriting existing sessions.
- 🔒 **100% Local & Private**: Zero analytics, zero tracking, zero remote network calls. All data stays strictly in your browser's local storage.
- ⚡ **Zero Runtime Dependencies**: Written entirely in vanilla JavaScript (ES modules) with minimal overhead. Fast, lightweight, and battery-friendly.
- 🔑 **Minimal Permissions**: Operates using only `"tabs"` and `"storage"`. No notification spam, no downloads permission, no broad host access.

---

## ✨ Features

- 💾 **One-Click Session Saving**: Capture all open tabs in your active window instantly with an optional custom name (defaults to current date and time).
- ⌨️ **Global Keyboard Shortcut**: Press `Ctrl+Shift+S` (`Command+Shift+S` on macOS) to instantly save your current workspace without opening the popup.
- 🔄 **Auto-Save Closed Windows**: Background service worker tracks in-flight window tab snapshots and saves closing windows with 2 or more restorable tabs (capped at the latest 5).
- 📦 **JSON Backup Export & Import**: Export all sessions as `session-saver-backup-YYYY-MM-DD.json` and import backups with strict validation and safe protocol filtering.
- 📊 **Local Storage Meter**: Real-time progress bar tracking storage usage against Chrome's 10 MB local storage quota, featuring an 80% warning indicator.
- ✏️ **Inline Session Rename**: Click the pencil icon on any session card to rename it directly (`Enter` to save, `Escape` to cancel).
- 📑 **Session Duplication**: One-click duplication to clone existing sessions.
- 🪟 **Flexible Window Restoration**: Choose between restoring sessions into a fresh browser window (default) or appending tabs into the current active window.
- 🔗 **Single Tab Restoration**: Click or keyboard-activate any individual tab in the preview list to restore it immediately.
- 🔍 **Real-Time Search & Type Filter**: Search sessions instantly by title, and toggle between "All", "Manual", and "Auto-saved" filters.
- 👁️ **Tab Previews & Favicons**: Expand any session to inspect page titles and favicons with safe fallbacks.
- 🌓 **Adaptive Light & Dark Themes**: Modern interface that automatically adapts to your operating system's color scheme via `prefers-color-scheme`.
- 🛡️ **Smart Security Filtering**: Automatically ignores internal system URLs (`chrome://`, `edge://`, `about:`) and strictly renders tab titles with `textContent`.

---

## 📸 Screenshots

|                    Light Mode                    |                   Dark Mode                    |
| :----------------------------------------------: | :--------------------------------------------: |
| ![Popup Light](docs/screenshots/popup-light.png) | ![Popup Dark](docs/screenshots/popup-dark.png) |

---

## ⌨️ Keyboard Shortcut

Save your active window tabs at any moment without opening the popup:

| Platform            | Default Shortcut      |
| :------------------ | :-------------------- |
| **Windows / Linux** | `Ctrl + Shift + S`    |
| **macOS**           | `Command + Shift + S` |

### Visual Feedback

When you press the shortcut, the extension icon badge provides immediate visual confirmation:

- **`✓` (Green)**: Session saved successfully.
- **`–` (Gray)**: No savable tabs in the active window (e.g., all open tabs are internal pages like `chrome://newtab`).
- **`!` (Red)**: Unexpected error saving session.

> 💡 **Customizing the Shortcut**: You can change this keyboard shortcut at any time by navigating to `chrome://extensions/shortcuts` in Google Chrome.

---

## 📦 Backup & Restore (JSON)

- **Exporting**: Click the **Export** button in the popup toolbar to generate a standardized JSON backup named `session-saver-backup-YYYY-MM-DD.json`. File downloads execute entirely client-side using `Blob` and a temporary `<a download>` link (requiring no `"downloads"` permission).
- **Importing**: Click the **Import** button to upload any `.json` backup file. The importer strictly checks:
  - File size limit (maximum 5 MB).
  - Application signature (`app === "session-saver"`) and schema version (`version === 1`).
  - Allowed URL protocols (`http:`, `https:`, and `file:` only; `javascript:` and internal schemes are dropped).
  - Non-destructive merging: if a session ID already exists, a fresh ID is generated so existing data is **never overwritten or deleted**.

---

## 📦 Installation (Load Unpacked)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ChopraArhaan/Session-Saver.git
   cd Session-Saver
   ```
2. **Open Extensions in Chrome**:
   - In Chrome's address bar, navigate to `chrome://extensions`.
3. **Enable Developer Mode**:
   - Toggle the switch labeled **Developer mode** in the upper-right corner.
4. **Load Unpacked**:
   - Click the **Load unpacked** button in the upper-left.
   - Choose the `src/` folder inside the cloned project directory.
5. **Pin the Extension**:
   - Click the Extensions puzzle piece icon on your Chrome toolbar and pin **Session Saver**.

---

## 🧪 Testing

Session Saver features an automated unit test suite powered by [Vitest](https://vitest.dev/) with in-memory Chrome extension API mocks:

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch
```

Tests verify restricted URL filtering, default session naming, session saving, deletion, renaming, duplication, multi-window restoration, backup validation, and rolling auto-save retention rules.

---

## 📦 Packaging for Distribution

Create a production-ready, compressed ZIP distribution for the Chrome Web Store:

```bash
npm run package
```

The cross-platform packaging script runs seamlessly on Windows, macOS, and Linux, generating `session-saver.zip` at the project root with `manifest.json` at the archive root.

---

## 🛠️ Tech Stack

- **Platform**: Chrome Extensions (Manifest V3)
- **Frontend**: Vanilla JavaScript (ES modules), HTML5, CSS3
- **APIs**: `chrome.tabs`, `chrome.storage.local`, `chrome.storage.session`, `chrome.windows`, `chrome.commands`, `chrome.action`
- **Tooling & Quality**: Vitest 5, ESLint 9 (flat config), Prettier 3, GitHub Actions CI
- **Dependencies**: Zero runtime dependencies

---

## 🔑 Permissions Breakdown

Session Saver strictly adheres to the principle of least privilege. **No new permissions were added in v1.1.0:**

| Permission | Justification                                                                                                                                   |
| :--------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| `tabs`     | Required to read URLs, titles, and favicons of open tabs in the current window during saving, and create tabs during window/tab restoration.    |
| `storage`  | Required to persist your saved session collections, rolling window recovery snapshots, and user preferences locally via `chrome.storage.local`. |

### Why Other Features Require No Extra Permissions

- **Keyboard Shortcut**: Declared via the Manifest V3 `commands` API (requires zero permissions).
- **Toolbar Badge**: Uses the standard Manifest V3 `chrome.action` API (requires zero permissions).
- **Window Management**: Window creation and querying use `chrome.windows` (available by default in MV3).
- **JSON File Downloads**: Generated purely in client-side memory using `Blob` and temporary object URLs (requires no `"downloads"` permission).

---

## 📂 Project Structure

```
session-saver/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── workflows/
│       └── lint.yml          # GitHub Actions CI workflow (lint & test)
├── docs/
│   ├── screenshots/          # UI screenshots and walkthrough demo
│   └── store-listing.md      # Chrome Web Store metadata & description draft
├── scripts/
│   └── generate-icons.py     # High-res icon generation script (Pillow)
├── src/                      # Extension source files (loaded into Chrome)
│   ├── manifest.json         # Manifest V3 configuration
│   ├── background.js         # Module background service worker (commands & auto-save)
│   ├── icons/                # Extension icons (16px, 48px, 128px)
│   ├── lib/
│   │   ├── backup.js         # Backup export, parsing, and strict schema validation
│   │   ├── sessions.js       # Core session save, restore, duplicate, and rename logic
│   │   └── storage.js        # Storage wrapper, settings, quota, and snapshot management
│   └── popup/
│       ├── popup.html        # Popup layout and controls
│       ├── popup.css         # Adaptive light/dark styling & storage meter
│       └── popup.js          # UI controller and event listeners
├── tests/
│   ├── helpers/
│   │   └── chromeMock.js     # In-memory mock of Chrome Extension APIs
│   ├── backup.test.js        # Unit tests for JSON backup parsing & validation
│   ├── sessions.test.js      # Unit tests for session operations and filtering
│   └── storage.test.js       # Unit tests for storage, retention, and quota
├── .gitignore
├── .prettierrc
├── eslint.config.js
├── package.json
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE                   # MIT License
├── PRIVACY.md                # Chrome Web Store compliant privacy policy
└── README.md
```

---

## 🗺️ Roadmap

- [x] Export / import sessions as JSON backup
- [x] Configurable keyboard shortcut (`Ctrl+Shift+S`)
- [x] Auto-save session snapshot on browser close
- [ ] Color-coded tags and category grouping for sessions
- [ ] Cloud sync via optional storage adapter

---

## 🤝 Contributing

Contributions are welcome! Please check out [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, commit conventions, testing guides, and branch guidelines.

---

## 🔒 Privacy Policy

Session Saver collects zero personal data and performs zero network requests. Read the full policy in [PRIVACY.md](PRIVACY.md).

---

## 👤 Author

**Arhaan Chopra**

- GitHub: [@ChopraArhaan](https://github.com/ChopraArhaan)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
