# IDE Link Interceptor

[中文版](README.zh-TW.md)

[![CI](https://github.com/pingqLIN/IDE-Link-Interceptor/actions/workflows/ci.yml/badge.svg)](https://github.com/pingqLIN/IDE-Link-Interceptor/actions/workflows/ci.yml)

A browser extension that intercepts IDE hyperlinks (`vscode://`, `cursor://`, `windsurf://`) from web pages and lets you choose which IDE to open them with.

## ✨ Features

- 🔗 **Intercept IDE Protocol Links** - Captures `vscode://`, `cursor://`, `windsurf://` and other IDE protocol links from web pages
- 🎯 **Choose Your IDE** - Select your preferred IDE from a convenient popup or context menu
- 🚀 **No Browser Prompts** - Eliminates the "Open Visual Studio Code?" dialog
- 📦 **VSIX Support** - Right-click on `.vsix` files to install directly in your chosen IDE
- 💾 **Remember Your Choice** - Your IDE selection is saved and persists across browsing sessions

## 📸 Screenshots

### Popup Interface
<p align="center">
  <img src="docs/screenshot-popup.png" alt="Screenshot showing the IDE selection popup interface" width="300"/>
</p>

*Click the extension icon to select your preferred IDE*

### Context Menu Integration
<p align="center">
  <img src="docs/screenshot-context-menu.png" alt="Screenshot showing the context menu integration for IDE selection" width="650"/>
</p>

*Right-click on any link to choose your target IDE*

### Before: Browser Protocol Prompt
<p align="center">
  <img src="docs/screenshot-intercept.png" alt="Screenshot showing browser protocol prompt before using the extension" width="650"/>
</p>

*Without the extension: annoying browser prompts every time*

## 🎯 Supported IDEs

| IDE              | Protocol             | Description          |
| ---------------- | -------------------- | -------------------- |
| VS Code          | `vscode://`          | Official stable      |
| VS Code Insiders | `vscode-insiders://` | Preview release      |
| Antigravity      | `antigravity://`     | Antigravity IDE      |
| Cursor           | `cursor://`          | AI-first IDE         |
| Windsurf         | `windsurf://`        | Codeium IDE          |

## 📦 Installation

### Chrome / Edge

1. Navigate to `chrome://extensions/` (or `edge://extensions/` for Edge)
2. Enable "**Developer mode**" in the top right corner
3. Click "**Load unpacked**"
4. Select the extension folder

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

1. Click the extension icon in the browser toolbar
2. Select your target IDE from the list
3. Your choice is automatically saved

### Method 2: Context Menu

1. Right-click on any link or page
2. Hover over "🔗 選擇目標 IDE"
3. Select your preferred IDE

### Method 3: VSIX Files

1. Right-click on a `.vsix` download link
2. Click "📦 用 [Your IDE] 安裝此擴充套件"
3. The extension will be installed in your chosen IDE

## 🧪 Testing

Try these websites to test the extension:

- [GitHub MCP](https://github.com/mcp) - Click "Install MCP server" buttons
- [VS Code Marketplace](https://marketplace.visualstudio.com/) - Click extension "Install" buttons
- [Open VSX Registry](https://open-vsx.org/) - Download `.vsix` files

## 📁 File Structure

```
ide-link-interceptor/
├── manifest.json    # Extension configuration
├── content.js       # Link interception script
├── popup.html       # Popup interface
├── popup.css        # Popup styles
├── popup.js         # Popup logic
├── background.js    # Background service worker
├── icons/           # Extension icons
└── docs/            # Development documentation
```

## 🛠️ Development

### Setting up the Development Environment

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
1. **Code Linting** - Use ESLint to check code quality
2. **Manifest Validation** - Validate manifest.json structure and file integrity
3. **Packaging** - Automatically package the extension as a `.zip` file
4. **Upload Artifacts** - Upload the packaged file to GitHub Actions artifacts

#### Release Workflow (when pushing version tags)
When pushing a version tag (e.g., `v1.3.0`):
1. Run all CI checks
2. Package the extension
3. Automatically create a GitHub Release
4. Attach the packaged file to the Release

**Creating a new release:**
```bash
# Make sure the version number in manifest.json is updated
git tag v1.3.0
git push origin v1.3.0
```

### Workflow Files
- `.github/workflows/ci.yml` - Continuous integration workflow
- `.github/workflows/release.yml` - Automated release workflow

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT

## 🙏 Acknowledgments

This extension was created to streamline the workflow of developers who use multiple IDE variants and want seamless control over protocol link handling.

---

<p align="center">Made with ❤️ by <a href="https://github.com/pingqLIN">pingqLIN</a></p>
