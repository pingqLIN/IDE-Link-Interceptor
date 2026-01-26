# 目標軟體安裝連結研究報告

> 最後更新：2026-01-24
> 研究範圍：VS Code、Cursor、Windsurf、Antigravity 及相關擴充套件來源
> 更新註記：本次更新參考了社群討論的構想（來源：https://community.firebasestudio.dev/t/fetching-vs-code-extensions-from-marketplace-visualstudio-com/7673/6），補強 Marketplace 下載連結與解析策略

---

## 目錄

1. [研究摘要](#研究摘要)
2. [各 IDE 協議與連結格式](#各-ide-協議與連結格式)
3. [擴充套件來源連結格式](#擴充套件來源連結格式)
4. [MCP Server 安裝連結](#mcp-server-安裝連結)
5. [現有實作對比分析](#現有實作對比分析)
6. [失效風險與解決方案](#失效風險與解決方案)

---

## 研究摘要

### 支援的 IDE 列表

| IDE | 協議 | 狀態 | 官方下載 |
|-----|------|------|----------|
| VS Code | `vscode://` | ✅ 穩定 | [code.visualstudio.com](https://code.visualstudio.com) |
| VS Code Insiders | `vscode-insiders://` | ✅ 穩定 | [code.visualstudio.com/insiders](https://code.visualstudio.com/insiders) |
| Cursor | `cursor://` | ✅ 穩定 | [cursor.com](https://cursor.com) |
| Windsurf | `windsurf://` | ✅ 穩定 | [windsurf.com](https://windsurf.com) |
| Antigravity | `antigravity://` | ⚠️ 僅單 a | [antigravity.google](https://antigravity.google) |

### 重大發現

1. **Antigravity 協議拼寫**：研究確認官方協議為 `antigravity://`（單個 a），先前文件曾誤植為雙 a
2. **MCP 安裝連結**：GitHub MCP Registry 和各 IDE 有專門的 MCP 安裝 URL 格式
3. **vscode.dev 重定向**：支援多種格式包括 extension、mcp/install、remote-containers

---

## 各 IDE 協議與連結格式

### VS Code / VS Code Insiders

#### 協議格式
```
vscode://file/{path}:{line}:{column}
vscode://extension/{publisher}.{extension}
vscode://vscode.git/clone?url={encoded_repo_url}
vscode://mcp/install?{encoded_json_config}
```

#### vscode.dev 重定向
```
https://vscode.dev/redirect?url={encoded_protocol_url}
https://insiders.vscode.dev/redirect?url={encoded_protocol_url}
```

#### 範例
| 用途 | URL |
|------|-----|
| 開啟檔案 | `vscode://file/C:/project/main.py:42:10` |
| 安裝擴充套件 | `vscode://extension/ms-python.python` |
| Clone Repo | `vscode://vscode.git/clone?url=https%3A%2F%2Fgithub.com%2Fuser%2Frepo` |
| MCP 安裝 | `vscode://mcp/install?%7B%22name%22%3A%22server%22%7D` |

---

### Cursor

#### 協議格式
```
cursor://file/{path}:{line}:{column}
cursor://extension/{extensionId}
cursor://-deeplink/mcp/install?name={name}&config={base64_config}
```

#### MCP 安裝專用 URL
```
https://cursor.com/en/install-mcp?name={name}&config={base64_encoded_json}
```

#### 範例
| 用途 | URL |
|------|-----|
| 開啟檔案 | `cursor://file/home/user/project/main.py:42` |
| MCP 安裝 | `https://cursor.com/en/install-mcp?name=context7&config=eyJ1cmwiOiJodHRwczovL21jcC5jb250ZXh0Ny5jb20vbWNwIn0=` |

#### 下載 URL 模式
```
https://api2.cursor.sh/updates/download/{channel}/{platform}/cursor/{version}

平台參數：
- darwin-arm64, darwin-x64, darwin-universal (macOS)
- win32-x64, win32-x64-user, win32-arm64, win32-arm64-user (Windows)
- linux-x64-deb, linux-arm64-deb, linux-x64-rpm, linux-arm64-rpm, linux-x64, linux-arm64 (Linux)

channel: golden (穩定版), nightly (測試版)
```

---

### Windsurf

#### 協議格式
```
windsurf://file/{path}:{line}:{column}
windsurf://file/{path}?windowId=_blank
windsurf://coder.coder-remote/open?owner={X}&workspace={Y}&url={Z}&token={T}
```

#### 下載 URL
```
https://windsurf.com/download
https://windsurf.com/windsurf/download_mac (macOS)
https://windsurf.com/windsurf/download (Windows)
https://windsurf.com/windsurf/download_linux (Linux)
```

---

### Antigravity

> ⚠️ **重要**：官方協議為 `antigravity://`（單 a），先前文件曾誤植為雙 a

#### 協議格式
```
antigravity://file/{path}
antigravity://git/open?url={encoded_repo_url}
antigravity://extension/install?url={vsix_url}&name={publisher.ext}
```

#### 下載來源
| 來源 | URL |
|------|-----|
| Google 官方 | `https://antigravity.google/download` |
| 社群站點 | `https://antigravityide.org/download` |

#### Package Manager
```bash
# macOS
brew install --cask antigravity

# Windows
winget install Google.Antigravity

# Arch Linux
yay -S antigravity-bin
```

---

## 擴充套件來源連結格式

### Visual Studio Marketplace

#### 頁面 URL
```
https://marketplace.visualstudio.com/items?itemName={publisher}.{extension}
```

#### Install 按鈕連結
```
vscode:extension/{publisher}.{extension}
```

#### VSIX 下載 API
```
https://marketplace.visualstudio.com/_apis/public/gallery/publishers/{publisher}/vsextensions/{extension}/{version}/vspackage
https://{publisher}.gallery.vsassets.io/_apis/public/gallery/publisher/{publisher}/extension/{extension}/{version}/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage
```

#### 解析方式
```javascript
// 從 itemName 解析
const url = new URL('https://marketplace.visualstudio.com/items?itemName=ms-python.python');
const itemName = url.searchParams.get('itemName'); // 'ms-python.python'
const [publisher, extension] = itemName.split('.'); // ['ms-python', 'python']
```
> 補充：新版 Marketplace 下載連結常使用 `{publisher}.gallery.vsassets.io` 網域，且路徑不含 `.vsix` 副檔名。

---

### Open VSX Registry

#### 頁面 URL
```
https://open-vsx.org/extension/{namespace}/{extension}
```

#### API 下載 URL
```
https://open-vsx.org/api/{namespace}/{extension}/{version}/file
https://open-vsx.org/api/{namespace}/{extension}/{version}/file/{namespace}.{extension}-{version}.vsix
```

#### 解析方式
```javascript
// 從 API URL 解析
const match = url.pathname.match(/^\/api\/([^/]+)\/([^/]+)\/([^/]+)\/file/);
if (match) {
  const [, publisher, extension, version] = match;
  // publisher: 'ms-python', extension: 'python', version: '2026.0.0'
}
```

---

### GitHub Releases

#### URL 模式
```
https://github.com/{owner}/{repo}/releases/download/{tag}/{filename}.vsix
```

#### 解析方式
```javascript
const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/(.+\.vsix)$/);
if (match) {
  const [, owner, repo, tag, filename] = match;
  // 從 filename 進一步解析 publisher.extension-version.vsix
}
```

---

### VSIX 檔名解析

#### 標準格式
```
{publisher}.{extension}-{version}.vsix
```

#### 解析函數
```javascript
function parseVsixFilename(filename) {
  const match = filename.match(/^(.+)\.vsix$/i);
  if (!match) return null;
  
  const baseName = match[1];
  const lastDash = baseName.lastIndexOf('-');
  const namePart = lastDash > 0 ? baseName.slice(0, lastDash) : baseName;
  const version = lastDash > 0 ? baseName.slice(lastDash + 1) : null;
  const dotIndex = namePart.indexOf('.');
  
  if (dotIndex > 0) {
    return {
      publisher: namePart.slice(0, dotIndex),
      name: namePart.slice(dotIndex + 1),
      version
    };
  }
  return null;
}
```

---

## MCP Server 安裝連結

### GitHub MCP Registry

#### 頁面 URL
```
https://github.com/mcp
https://github.com/mcp/{owner}/{server-name}
```

#### VS Code MCP 安裝協議
```
vscode://mcp/install?{url_encoded_json}
vscode-insiders://mcp/install?{url_encoded_json}
```

#### JSON 配置結構

**遠端 HTTP Server**
```json
{
  "name": "server-name",
  "type": "http",
  "url": "https://example.com/api/mcp"
}
```

**本地 NPX Server**
```json
{
  "name": "server-name",
  "config": {
    "command": "npx",
    "args": ["-y", "@package/name@latest"]
  }
}
```

#### Cursor MCP 安裝
```
https://cursor.com/en/install-mcp?name={name}&config={base64_json}
```

#### vscode.dev 重定向包裝
```
https://vscode.dev/redirect?url=vscode:mcp/install?{double_encoded_json}
https://insiders.vscode.dev/redirect?url=vscode-insiders:mcp/install?{double_encoded_json}
```

---

## 現有實作對比分析

### 目前支援的協議 (interceptor.js)

```javascript
const VSCODE_PROTOCOLS = [
  'vscode:',
  'vscode-insiders:',
  'antigravity:',
  'cursor:',
  'windsurf:',
  'vscodium:'
];
```

### 目前支援的重定向模式

```javascript
const VSCODE_DEV_PATTERNS = [
  'vscode.dev/redirect',
  'insiders.vscode.dev/redirect'
];
```

### 目前 VSIX URL 匹配 (background.js)

```javascript
targetUrlPatterns: [
  '*://*/*.vsix',
  '*://*/*.vsix?*',
  '*://open-vsx.org/api/*/*/*/file*',
  '*://*.open-vsx.org/api/*/*/*/file*',
  '*://*.gallery.vsassets.io/_apis/public/gallery/publisher/*/extension/*/*/assetbyname/*',
  '*://marketplace.visualstudio.com/_apis/public/gallery/publishers/*/vsextensions/*/*/vspackage'
]
```

---

## 失效風險與解決方案

### 風險 1：Antigravity 協議拼寫不一致

**問題**：
- 先前文件/程式碼曾有雙 a 的誤植
- 現已統一為 `antigravity://`（單 a）

**影響**：低 - 已修正一致

**建議**：
- 維持文件與程式碼一致
- 若需向後相容，可在轉換邏輯加入舊拼寫偵測

---

### 風險 2：缺少 MCP 安裝連結處理

**問題**：
- 未處理 `vscode://mcp/install?...` 格式
- 未處理 `cursor.com/en/install-mcp?...` 格式
- GitHub MCP Registry 的 Install 按鈕無法被攔截轉換

**影響**：中 - MCP 生態系統快速成長中

**建議**：
1. 新增 MCP URL 模式檢測
2. 支援 MCP 配置的協議轉換

---

### 風險 3：VS Code Marketplace Install 按鈕未處理

**問題**：
- Marketplace 的 Install 按鈕使用 `vscode:extension/...` 格式（無 `//`）
- 目前的 `isVSCodeUrl()` 檢查 `url.startsWith(protocol)` 可能無法匹配

**影響**：需驗證 - 實際測試確認

**建議**：
- 確保能處理 `vscode:extension/` 格式（不含 `//`）

---

### 風險 4：GitHub Releases VSIX 未涵蓋

**問題**：
- 目前 VSIX 匹配未涵蓋 GitHub Releases URL 模式
- `https://github.com/*/releases/download/*/*.vsix`

**影響**：中 - 許多擴充套件透過 GitHub 發布

**建議**：
新增 URL 模式：
```javascript
'*://github.com/*/*/releases/download/*/*.vsix'
```

---

### 風險 5：Cursor 專屬 MCP 安裝頁面

**問題**：
- `cursor.com/en/install-mcp` 是 Cursor 專屬
- 無法透過協議攔截轉換到其他 IDE

**影響**：低 - 這是 Cursor 專屬功能

**建議**：
- 可考慮在 Cursor MCP 頁面注入「在其他 IDE 開啟」按鈕
- 或在文件中說明限制

---

### 風險 6：URL 編碼處理

**問題**：
- MCP 安裝 URL 使用多層 URL 編碼
- vscode.dev redirect 中的 URL 需要正確解碼

**影響**：中 - 可能導致轉換失敗

**建議**：
- 增強 `convertVSCodeDevUrl()` 處理多層編碼
- 新增 MCP URL 專用解析邏輯

---

## 建議的程式碼更新

### 1. 新增 MCP URL 檢測

```javascript
// 新增 MCP 相關模式
const MCP_PATTERNS = [
  'vscode:mcp/install',
  'vscode-insiders:mcp/install',
  'cursor://-deeplink/mcp/install'
];

function isMCPUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return MCP_PATTERNS.some(pattern => url.includes(pattern));
}
```

### 2. 更新 VSIX URL 模式

```javascript
targetUrlPatterns: [
  '*://*/*.vsix',
  '*://*/*.vsix?*',
  '*://open-vsx.org/api/*/*/*/file*',
  '*://*.open-vsx.org/api/*/*/*/file*',
  '*://github.com/*/*/releases/download/*/*.vsix',  // 新增
  '*://github.com/*/*/releases/download/*/*.vsix?*' // 新增
]
```

### 3. 新增 Marketplace itemName 解析

```javascript
function parseMarketplaceUrl(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'marketplace.visualstudio.com') {
      const itemName = urlObj.searchParams.get('itemName');
      if (itemName) {
        const [publisher, name] = itemName.split('.');
        return { publisher, name };
      }
    }
    return null;
  } catch {
    return null;
  }
}
```

---

## 參考資料

- [VS Code URL Protocol](https://code.visualstudio.com/docs/editor/command-line#_opening-vs-code-with-urls)
- [Open VSX Registry API](https://github.com/eclipse/openvsx/wiki/Registry-API)
- [VS Code Marketplace API](https://github.com/microsoft/vscode/blob/main/src/vs/platform/extensionManagement/common/extensionGalleryService.ts)
- [GitHub MCP Registry](https://github.com/mcp)
- [Cursor Deep Links](https://docs.cursor.com/deeplinks)
