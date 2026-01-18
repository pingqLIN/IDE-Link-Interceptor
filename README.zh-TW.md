# IDE Link Interceptor

[![CI](https://github.com/pingqLIN/IDE-Link-Interceptor/actions/workflows/ci.yml/badge.svg)](https://github.com/pingqLIN/IDE-Link-Interceptor/actions/workflows/ci.yml)

Chrome 擴充功能，攔截 IDE 協議連結（`vscode://`、`cursor://`、`windsurf://`），讓你選擇要用哪個 IDE 開啟。

## ✨ 特色功能

- 🔗 **攔截 IDE 協議連結** - 捕捉網頁上的 `vscode://`、`cursor://`、`windsurf://` 連結
- 🎯 **選擇你的 IDE** - 從 Popup 或右鍵選單選擇偏好的 IDE
- 🚀 **無瀏覽器提示** - 消除「開啟 Visual Studio Code？」對話框
- 📦 **VSIX 支援** - 右鍵點擊 `.vsix` 檔案直接安裝到選定的 IDE
- 💾 **記住選擇** - 你的 IDE 選擇會自動儲存
- 🌐 **多語言支援** - 自動根據瀏覽器語言顯示繁體中文或英文介面

## 🎯 支援的 IDE

| IDE              | 協議                 |
| ---------------- | -------------------- |
| VS Code          | `vscode://`          |
| VS Code Insiders | `vscode-insiders://` |
| Antigravity      | `antigravity://`     |
| Cursor           | `cursor://`          |
| Windsurf         | `windsurf://`        |

## 📦 安裝

1. Chrome 網址列輸入 `chrome://extensions/`
2. 開啟右上角「**開發人員模式**」
3. 點擊「**載入未封裝項目**」
4. 選擇此資料夾

## 🚀 使用方式

### 方法一：擴充功能 Popup

1. 點擊工具列的擴充功能圖示
2. 從 Popup 選擇目標 IDE
3. 之後點擊任何 IDE 連結都會導向選擇的 IDE

### 方法二：右鍵選單

1. 在任意連結或頁面上按右鍵
2. 將滑鼠移到「🔗 選擇目標 IDE」
3. 選擇偏好的 IDE

### 方法三：安裝 VSIX 擴充套件

1. 在 `.vsix` 下載連結上按右鍵
2. 點擊「📦 用 [IDE 名稱] 安裝此擴充套件」
3. 擴充套件會自動安裝到選定的 IDE

## 🧪 測試

可在以下網站測試擴充功能：

- [GitHub MCP](https://github.com/mcp) - 點擊「Install MCP server」按鈕
- [VS Code Marketplace](https://marketplace.visualstudio.com/) - 點擊擴充套件的「Install」按鈕
- [Open VSX Registry](https://open-vsx.org/) - 下載 `.vsix` 檔案

## License

MIT

## 開發

### 設定開發環境

```bash
# 安裝依賴
npm install

# 執行程式碼檢查
npm run lint

# 自動修正程式碼風格
npm run lint:fix

# 驗證 manifest.json
npm run validate

# 打包擴充功能
npm run package
```

### CI/CD 流程

本專案使用 GitHub Actions 進行自動化建置與部署：

#### CI 流程 (每次 Push 和 PR)

1. **程式碼檢查** - 使用 ESLint 檢查程式碼品質
2. **Manifest 驗證** - 驗證 manifest.json 結構和檔案完整性
3. **打包** - 自動打包擴充功能為 .zip 檔案
4. **上傳 Artifacts** - 將打包檔案上傳至 GitHub Actions artifacts

#### Release 流程 (推送版本標籤時)

當推送版本標籤（如 `v1.3.0`）時：

1. 執行所有 CI 檢查
2. 打包擴充功能
3. 自動建立 GitHub Release
4. 將打包檔案附加至 Release

**建立新版本：**

```bash
# 確保 manifest.json 中的版本號已更新
git tag v1.3.0
git push origin v1.3.0
```

### 工作流程檔案

- `.github/workflows/ci.yml` - 持續整合流程
- `.github/workflows/release.yml` - 自動發布流程
