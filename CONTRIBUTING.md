# Contributing to Session Saver

Thank you for your interest in improving Session Saver! We welcome community contributions, bug reports, and suggestions.

---

## Getting Started

### 1. Fork & Clone

1. Fork the repository to your GitHub account.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/ChopraArhaan/Session-Saver.git
   cd Session-Saver
   ```

### 2. Install Development Dependencies

```bash
npm install
```

### 3. Load Unpacked Extension in Chrome

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top right corner.
3. Click **Load unpacked** in the top left corner.
4. Select the `src/` directory from this repository.
5. Session Saver will now appear in your browser toolbar!

---

## Development Workflow

### Code Quality, Testing & Formatting

Always ensure all linter checks, unit tests, and format rules pass before creating commits:

```bash
# Run automated unit test suite (Vitest)
npm test

# Run tests in watch mode during development
npm run test:watch

# Check code syntax and lint rules
npm run lint

# Auto-format codebase
npm run format

# Package extension for Chrome Web Store distribution (works on Windows, macOS, and Linux)
npm run package
```

### Project Structure Reference

- `src/`: The core extension files loaded into Chrome (Manifest V3, ES modules, UI, storage wrappers).
- `tests/`: Automated unit tests powered by Vitest, containing comprehensive test suites (`tests/backup.test.js`, `tests/sessions.test.js`, `tests/storage.test.js`) and an in-memory Chrome API mock in `tests/helpers/chromeMock.js`.
- `scripts/`: Development utility scripts, including `scripts/generate-icons.py` for generating high-resolution extension icons.
- `docs/`: Visual screenshots, documentation, and the Chrome Web Store listing draft (`docs/store-listing.md`).

### Branch Naming Convention

Please create short-lived feature or bugfix branches based on `main`:

- `feat/<feature-name>` (e.g., `feat/session-export`)
- `fix/<bug-name>` (e.g., `fix/favicon-fallback`)
- `test/<test-suite>` (e.g., `test/unit-tests`)
- `docs/<doc-update>` (e.g., `docs/readme-update`)
- `chore/<task-name>` (e.g., `chore/bump-deps`)

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat: add export sessions to JSON`
- `fix: prevent duplicate session names`
- `test: add unit tests for storage retention pruning`
- `docs: update installation instructions`
- `style: format css with prettier`
- `refactor: optimize storage query mechanism`
- `chore: update build script`

---

## Submitting Pull Requests

1. Push your branch to your GitHub fork.
2. Open a Pull Request targeting the `main` branch.
3. Describe the change, mention any related issues, and provide screenshots for UI changes.
4. Ensure all GitHub Actions CI checks (`npm run lint` and `npm test`) pass.
