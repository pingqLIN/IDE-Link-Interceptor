# IDE Link Interceptor

[中文版](README.zh-TW.md)

<div align="center">

[![CI](https://github.com/pingqLIN/IDE-Link-Interceptor/actions/workflows/ci.yml/badge.svg)](https://github.com/pingqLIN/IDE-Link-Interceptor/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Intercept IDE protocol links and choose your preferred editor seamlessly.**

[中文版](README.zh-TW.md) | [Report Bug](https://github.com/pingqLIN/IDE-Link-Interceptor/issues) | [Request Feature](https://github.com/pingqLIN/IDE-Link-Interceptor/issues)

</div>

---

## 📖 Table of Contents

- [Features](#-features)
- [Screenshots](#-screenshots)
- [Supported IDEs](#-supported-ides)
- [Installation](#-installation)
- [Usage](#-usage)
- [Testing](#-testing)
- [Development](#-development)

---

A browser extension that intercepts IDE hyperlinks (`vscode://`, `cursor://`, `windsurf://`) from web pages and lets you choose which IDE to open them with.

## ✨ Features

- 🔗 **Intercept IDE Protocol Links** - Captures `vscode://`, `cursor://`, `windsurf://` and other IDE protocol links from web pages
- 🎯 **Choose Your IDE** - Select your preferred IDE from a convenient popup or context menu
- 🚀 **No Browser Prompts** - Eliminates the "Open Visual Studio Code?" dialog
- 📦 **Extension & VSIX Support** - Opens extension pages in your chosen IDE; right-click `.vsix` files for direct installation
- 🔧 **MCP Server Installation** - Intercepts MCP install links (including Cursor's special deeplink format) and redirects to your IDE
- 💾 **Remember Your Choice** - Your IDE selection is saved and persists across browsing sessions

> **Note:** When clicking "Install" on VS Code Marketplace extensions, the extension page will open in your chosen IDE. Due to security limitations in all VS Code-based IDEs, you'll need to click "Install" once more inside the IDE to complete the installation.

## 📸 Screenshots

| Popup Interface | Context Menu |
|:---:|:---:|
| ![Popup Interface](docs/screenshot-popup.png) | ![Context Menu](docs/screenshot-context-menu.png) |
| *Click extension icon to select IDE* | *Right-click to open specific links* |

### Before: Browser Protocol Prompt

<div align="center">
  <img src="docs/screenshot-intercept.png" alt="Protocol Interception" width="600"/>
  <br/>
  <em>Without the extension: annoying browser prompts every time</em>
</div>

## 🎯 Supported IDEs

| IDE | Protocol | Description |
| :--- | :--- | :--- |
| **VS Code** | `vscode://` | Official stable release |
| **VS Code Insiders** | `vscode-insiders://` | Preview release |
| **Antigravity** | `antigravity://` | Antigravity IDE |
| **Cursor** | `cursor://` | AI-first IDE |
| **Windsurf** | `windsurf://` | Codeium IDE |

## 📦 Installation

### Chrome / Edge

1. Navigate to `chrome://extensions/` (or `edge://extensions/` for Edge)
2. Enable "**Developer mode**" in the top right corner
3. Click "**Load unpacked**"
4. Select `extension/` (the folder that contains `manifest.json`)

### From Source

```bash
# Clone the repository
git clone https://github.com/pingqLIN/IDE-Link-Interceptor.git
cd IDE-Link-Interceptor

# Install dependencies
npm install

# Validate the extension
npm run validate
```

## 🚀 Usage

### Method 1: Extension Popup

1. Click the extension icon in the browser toolbar.
2. Select your target IDE from the list.
3. Your choice is automatically saved.

### Method 2: Context Menu

1. Right-click on any link or page.
2. Hover over "**🔗 Select Target IDE**".
3. Select your preferred IDE.

> **Note:** The extension automatically displays menu text in English or Traditional Chinese based on your browser's language settings.

### Method 3: VSIX Files

1. Right-click on a `.vsix` download link.
2. Click "**📦 Install extension with \[IDE Name\]**".
3. The extension will be installed in your chosen IDE.

### Method 4: Extension Install Links

When you click "Install" on VS Code Marketplace or similar sites:

1. The extension intercepts the `vscode:extension/...` link.
2. It converts the protocol to your target IDE (e.g., `antigravity:extension/...`).
3. Your IDE opens and displays the extension's page.
4. Click "Install" inside the IDE to complete installation.

> **Why the extra click?** All VS Code-based IDEs intentionally do not support automatic extension installation via protocol URLs for security reasons. This is a platform limitation, not a bug.

## 🧪 Testing

Try these websites to test the extension:

- [GitHub MCP](https://github.com/mcp) - Click "Install MCP server" buttons
- [VS Code Marketplace](https://marketplace.visualstudio.com/) - Click extension "Install" buttons
- [Open VSX Registry](https://open-vsx.org/) - Download `.vsix` files

## 🛠️ Development

Extension runtime files live in `extension/`. See `docs/project-structure.md` and `docs/global-workflow.md`.

### Setting up Environment

```bash
# Install dependencies
npm install

# Run linting
npm run lint

# Auto-fix code style
npm run lint:fix

# Validate manifest.json
npm run validate

# Package the extension
npm run package
```

### CI/CD Workflow

This project uses GitHub Actions for automated builds and deployment:

#### CI Workflow (on every Push and PR)

1. **Code Linting** - ESLint quality check
2. **Manifest Validation** - Integrity check
3. **Packaging** - Zip creation
4. **Upload Artifacts** - Build preservation

#### Release Workflow (on tag push)

When pushing a version tag (e.g., `v1.3.0`):

1. Run all CI checks
2. Package the extension
3. Automatically create a GitHub Release with the package

### Creating a Release

```bash
# 1. Update version in manifest.json & package.json
# 2. Tag and push
git tag v1.4.0
git push origin v1.4.0
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

