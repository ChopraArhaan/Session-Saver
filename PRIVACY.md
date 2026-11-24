# Privacy Policy for Session Saver

**Effective Date:** November 24, 2026  
**Last Updated:** November 24, 2026

Session Saver ("we", "our", or "the extension") is committed to respecting and protecting your privacy. This Privacy Policy explains our practices regarding data collection, storage, and handling.

---

## 1. Zero Data Collection & Tracking

- **No Remote Servers**: Session Saver does not operate external servers, backend APIs, or cloud sync databases.
- **No Analytics or Telemetry**: We do not include tracking scripts, telemetry, cookies, advertising trackers, or fingerprinting code.
- **No Third-Party Sharing**: We do not sell, rent, monetize, or transmit your browsing data or session information to any third party under any circumstances.
- **No Network Requests**: The extension makes zero external network requests. All operations execute strictly locally inside your browser environment.

---

## 2. Local Data Storage

All data created or processed by Session Saver remains 100% on your device:
- **Tab Information**: When you save a session (manually, via keyboard shortcut, or via auto-save on window close), the URLs, titles, and favicon URLs of open tabs are recorded locally.
- **Storage Mechanism**: Data is persisted using Chrome's local storage API (`chrome.storage.local` and in-flight `chrome.storage.session`).
- **Backup Files**: When you use the Export feature, a JSON file is generated locally in your browser and saved to your device. When you Import a JSON file, it is parsed directly in your browser without uploading to any server.

---

## 3. Permissions Justification

Session Saver only requests the minimum permissions required for core functionality:
- `tabs`: Used solely to capture open tab URLs, page titles, and favicons when saving sessions, and to open tabs when restoring sessions.
- `storage`: Used solely to store your saved sessions, auto-saved window recovery snapshots, and extension preferences locally on your machine.

---

## 4. How to Delete Your Data

You retain complete ownership and control over your data at all times:
- **Delete Individual Sessions**: Click the trash can icon next to any session in the extension popup to permanently remove it.
- **Clear All Data**: Uninstalling Session Saver from your browser (`chrome://extensions` -> "Remove") immediately and permanently deletes all stored sessions, snapshots, and extension settings.

---

## 5. Contact & Questions

If you have questions about this Privacy Policy or Session Saver, please open an issue on our GitHub repository:  
https://github.com/ChopraArhaan/Session-Saver/issues
