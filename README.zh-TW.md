# VS Code IDE Switcher

[![CI](https://github.com/pingqLIN/vscode-antigravity-linker/actions/workflows/ci.yml/badge.svg)](https://github.com/pingqLIN/vscode-antigravity-linker/actions/workflows/ci.yml)

Chrome 擴充功能，攔截 VS Code 連結（`vscode://`），讓你選擇要用哪個 IDE 開啟。

## 支援的 IDE

| IDE              | 協議                 |
| ---------------- | -------------------- |
| VS Code          | `vscode://`          |
| VS Code Insiders | `vscode-insiders://` |
| Antigravity      | `antigravity://`     |
| Cursor           | `cursor://`          |
| Windsurf         | `windsurf://`        |

## 安裝

1. Chrome 網址列輸入 `chrome://extensions/`
2. 開啟右上角「**開發人員模式**」
3. 點擊「**載入未封裝項目**」
4. 選擇此資料夾

## 使用方式

1. 點擊工具列的擴充功能圖示
2. 從 Popup 選擇目標 IDE
3. 之後點擊任何 VS Code 連結都會導向選擇的 IDE

## 檔案結構

```
vscode-antigravity-linker/
├── manifest.json    # 擴充功能配置
├── content.js       # 連結攔截腳本
├── popup.html       # Popup 介面
├── popup.css        # Popup 樣式
├── popup.js         # Popup 邏輯
├── icons/           # 擴充功能圖示
└── docs/            # 開發文件
```

## 測試

- [GitHub MCP](https://github.com/mcp)
- [VS Code Marketplace](https://marketplace.visualstudio.com/)

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
