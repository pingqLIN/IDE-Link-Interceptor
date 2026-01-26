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
| Antigravity      | `antigravity://`    | 🚀   |
| Cursor           | `cursor://`          | ⚡   |
| Windsurf         | `windsurf://`        | 🌊   |

---

## 檔案結構

```
IDE-Link-Interceptor/
├── extension/           # 可直接「載入未封裝」的擴充元件資料夾
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── interceptor.js
│   ├── popup.html
│   ├── popup.css
│   ├── popup.js
│   ├── _locales/
│   └── icons/
├── scripts/             # 開發/打包用腳本
├── docs/
└── package.json
```

---

## 手動載入步驟

1. Chrome 網址列輸入 `chrome://extensions/`
2. 開啟右上角「**開發人員模式**」
3. 點擊「**載入未封裝項目**」
4. 選擇資料夾：

   ```
   <你的專案路徑>/IDE-Link-Interceptor/extension
   ```

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

GitHub MCP 頁面的「Install in VS Code」按鈕使用 JavaScript 動態觸發 `vscode://` 協議，而非標準 `<a>` 連結。已加入 `extension/interceptor.js`（Main World）攔截下列 API：

- `window.location.href`
- `window.location.assign()`
- `window.location.replace()`
- `window.open()`

![GitHub MCP 頁面](file:///C:/Users/addra/.gemini/antigravity/brain/f37dc266-81ab-4b5e-b20f-6497a4dcffe0/.system_generated/click_feedback/click_feedback_1768719570314.png)

---

## GitHub Copilot / GitHub 登入認證問題修復

部分 IDE 的 GitHub OAuth 回呼會使用類似下列的協議連結：

- `vscode://vscode.github-authentication/did-authenticate?...`
- `cursor://vscode.github-authentication/did-authenticate?...`

若把這類「authentication 回呼」誤轉成其他 IDE 的協議，會導致登入完成後無法把 token 回傳給原本發起登入的 IDE（表現為 Copilot 登入卡住/失敗）。

修復方式：偵測 provider 含 `authentication` 的協議連結並**保留原樣**，不進行攔截轉換。
