# 🗂️ Session Saver

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Lint](https://github.com/chopraArhaan/session-saver/actions/workflows/lint.yml/badge.svg)](https://github.com/chopraArhaan/session-saver/actions/workflows/lint.yml)

> Save, search, and restore your tab sessions in one click. Clean, private, and lightweight tab management built for Manifest V3.

![Session Saver Demo](docs/screenshots/demo.gif)

---

## ✨ Features

- 💾 **One-Click Session Saving**: Capture all open tabs in your active window instantly with an optional custom name (defaults to current date and time).
- 🛡️ **Smart URL Filtering**: Automatically ignores internal system URLs (`chrome://`, `edge://`, `about:`) to preserve a clean session history.
- 🚀 **Instant Window Restore**: Launch all saved tabs belonging to a session in a fresh browser window at once.
- 🗑️ **Safe Deletion**: Prompt confirmation before deleting a session prevents accidental data loss.
- 🔍 **Real-Time Search**: Filter through your saved sessions instantly as you type.
- 👁️ **Tab Previews**: Expand any session to inspect page titles and favicons before restoring.
- 🌓 **Dynamic Light & Dark Theme**: Automatically matches your OS color scheme via `prefers-color-scheme`.
- 🔒 **100% Local & Private**: Stores your data strictly on your device using `chrome.storage.local`. No analytics, tracking, or remote servers.

---

## 📸 Screenshots

| Light Mode | Dark Mode |
| :---: | :---: |
| ![Popup Light](docs/screenshots/popup-light.png) | ![Popup Dark](docs/screenshots/popup-dark.png) |

---

## 📦 Installation (Load Unpacked)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/chopraArhaan/session-saver.git
   cd session-saver
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

## 🛠️ Tech Stack

- **Platform**: Chrome Extensions (Manifest V3)
- **Frontend**: Vanilla JavaScript (ES modules), HTML5, CSS3
- **APIs**: `chrome.tabs`, `chrome.storage.local`, `chrome.windows`
- **Tooling & Quality**: ESLint 9 (flat config), Prettier 3, GitHub Actions CI
- **Dependencies**: Zero runtime dependencies

---

## 🔑 Permissions Breakdown

Session Saver requests the absolute minimum permissions necessary to function:

| Permission | Justification |
| :--- | :--- |
| `tabs` | Required to read URLs, titles, and favicons of open tabs in the current window during saving, and open new tabs during restore. |
| `storage` | Required to persist your saved session collections locally on your machine via `chrome.storage.local`. |

---

## 📂 Project Structure

```
session-saver/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── workflows/
│       └── lint.yml
├── docs/screenshots/        # UI screenshots and visual walkthroughs
├── src/                     # Extension source files (loaded into Chrome)
│   ├── manifest.json        # Manifest V3 configuration
│   ├── icons/               # Extension icons (16px, 48px, 128px)
│   ├── lib/
│   │   ├── storage.js       # chrome.storage.local wrapper
│   │   └── sessions.js      # Core session save, restore, and filtering logic
│   └── popup/
│       ├── popup.html       # Popup layout
│       ├── popup.css        # Adaptive light/dark styling
│       └── popup.js         # UI logic and event listeners
├── .gitignore
├── .prettierrc
├── eslint.config.js
├── package.json
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE                  # MIT License
└── README.md
```

---

## 🗺️ Roadmap

- [ ] Export / import sessions as JSON backup
- [ ] Configurable keyboard shortcut (e.g. `Ctrl+Shift+S`)
- [ ] Auto-save session snapshot on browser close
- [ ] Color-coded tags and category grouping for sessions
- [ ] Cloud sync via optional storage adapter

---

## 🤝 Contributing

Contributions are welcome! Please check out [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, commit conventions, and branch guidelines.

---

## 👤 Author

**Arhaan Chopra**
- GitHub: [@chopraArhaan](https://github.com/chopraArhaan)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
