# Contributing to Session Saver

Thank you for your interest in improving Session Saver! We welcome community contributions, bug reports, and suggestions.

---

## Getting Started

### 1. Fork & Clone
1. Fork the repository to your GitHub account.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/session-saver.git
   cd session-saver
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

### Code Quality & Formatting
Run the linter and formatter before creating commits:
```bash
# Check code syntax and standards
npm run lint

# Auto-format codebase
npm run format
```

### Branch Naming Convention
Please create short-lived feature or bugfix branches based on `main`:
- `feat/<feature-name>` (e.g., `feat/session-export`)
- `fix/<bug-name>` (e.g., `fix/favicon-fallback`)
- `docs/<doc-update>` (e.g., `docs/readme-update`)
- `chore/<task-name>` (e.g., `chore/bump-deps`)

### Commit Messages
We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat: add export sessions to JSON`
- `fix: prevent duplicate session names`
- `docs: update installation instructions`
- `style: format css with prettier`
- `refactor: optimize storage query mechanism`
- `chore: update build script`

---

## Submitting Pull Requests
1. Push your branch to your GitHub fork.
2. Open a Pull Request targeting the `main` branch.
3. Describe the change, mention any related issues, and provide screenshots for UI changes.
4. Ensure all GitHub Actions CI checks (linting) pass.
