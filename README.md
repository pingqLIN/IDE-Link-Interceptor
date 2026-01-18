# VS Code IDE Switcher

[中文版](README.zh-TW.md)

[![CI](https://github.com/pingqLIN/vscode-antigravity-linker/actions/workflows/ci.yml/badge.svg)](https://github.com/pingqLIN/vscode-antigravity-linker/actions/workflows/ci.yml)

A Chrome extension that intercepts VS Code links (`vscode://`) and lets you choose which IDE to open them with.

## Supported IDEs

| IDE              | Protocol             |
| ---------------- | -------------------- |
| VS Code          | `vscode://`          |
| VS Code Insiders | `vscode-insiders://` |
| Antigravity      | `antigravity://`     |
| Cursor           | `cursor://`          |
| Windsurf         | `windsurf://`        |

## Installation

1. Navigate to `chrome://extensions/` in Chrome
2. Enable "**Developer mode**" in the top right corner
3. Click "**Load unpacked**"
4. Select this folder

## Usage

1. Click the extension icon in the toolbar
2. Select your target IDE from the popup
3. All VS Code links will now open in your selected IDE

## File Structure

```
vscode-antigravity-linker/
├── manifest.json    # Extension configuration
├── content.js       # Link interception script
├── popup.html       # Popup interface
├── popup.css        # Popup styles
├── popup.js         # Popup logic
├── icons/           # Extension icons
└── docs/            # Development documentation
```

## Testing

- [GitHub MCP](https://github.com/mcp)
- [VS Code Marketplace](https://marketplace.visualstudio.com/)

## License

MIT

## Development

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
3. **Packaging** - Automatically package the extension as a .zip file
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
