# VS Code IDE Switcher - Walkthrough

## 完成摘要

成功建立 Chrome 擴充功能 v1.1，支援：

- Popup UI 讓用戶選擇目標 IDE
- 攔截標準 `<a>` 連結
- 攔截 JavaScript 動態導航（如 GitHub MCP 頁面）

---

## 支援的 IDE

| IDE              | 協議                 | 圖示 |
| ---------------- | -------------------- | ---- |
| VS Code          | `vscode://`          | 💙   |
| VS Code Insiders | `vscode-insiders://` | 💚   |
| Antigravity      | `antigravity://`     | 🚀   |
| Cursor           | `cursor://`          | ⚡   |
| Windsurf         | `windsurf://`        | 🌊   |

---

## 檔案結構

```
vscode-ide-switcher/
├── manifest.json    # 擴充功能配置
├── content.js       # 連結攔截腳本
├── popup.html       # Popup 介面
├── popup.css        # Popup 樣式
├── popup.js         # Popup 邏輯
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 手動載入步驟

1. Chrome 網址列輸入 `chrome://extensions/`
2. 開啟右上角「**開發人員模式**」
3. 點擊「**載入未封裝項目**」
4. 選擇資料夾（例如專案的本地目錄）

---

## 使用方式

1. 點擊工具列的擴充功能圖示
2. 從 Popup 選擇目標 IDE
3. 之後點擊任何 VS Code 連結都會導向選擇的 IDE

---

## 測試建議

前往 [GitHub MCP](https://github.com/mcp) 或 [VS Code Marketplace](https://marketplace.visualstudio.com/) 點擊任一擴充功能的「Install」按鈕進行測試。

---

## GitHub MCP 修復說明

GitHub MCP 頁面的「Install in VS Code」按鈕使用 JavaScript 動態觸發 `vscode://` 協議，而非標準 `<a>` 連結。已更新 `content.js` 注入攔截器覆寫：

- `window.location.href`
- `window.location.assign()`
- `window.location.replace()`
- `window.open()`

![GitHub MCP 頁面](file:///C:/Users/addra/.gemini/antigravity/brain/f37dc266-81ab-4b5e-b20f-6497a4dcffe0/.system_generated/click_feedback/click_feedback_1768719570314.png)
