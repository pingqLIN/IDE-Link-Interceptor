# VS Code to Antigravity Redirector - Chrome Extension

## 背景說明

建立一個輕量級 Chrome 擴充功能，用於攔截網頁上的 VS Code 連結（`vscode://` 協議），並將其重定向為 Antigravity 協議，讓 Antigravity 程式接管這些連結。

**常見使用情境**：

- GitHub 上的「Open in VS Code」按鈕
- 網頁上的 VS Code 擴充功能安裝連結
- 各種開發者工具網站的 VS Code 整合連結

---

## Proposed Changes

### VSCode Antigravity Linker Extension

建立新專案目錄於 `c:\Users\addra\.gemini\antigravity\playground\crystal-astro\vscode-antigravity-linker`

---

#### [NEW] [manifest.json](file:///c:/Users/addra/.gemini/antigravity/playground/crystal-astro/vscode-antigravity-linker/manifest.json)

Chrome 擴充功能配置檔：

- Manifest V3 格式
- Content Script 注入所有網頁
- 監聽 `vscode://` 協議連結點擊事件

---

#### [NEW] [content.js](file:///c:/Users/addra/.gemini/antigravity/playground/crystal-astro/vscode-antigravity-linker/content.js)

Content Script 負責：

1. 監聽頁面中的連結點擊事件
2. 檢測 `vscode://` 或 `vscode-insiders://` 協議
3. 阻止預設行為
4. 將協議替換為 `antigravity://`
5. 觸發新連結導航

```javascript
// 偽代碼示意
document.addEventListener("click", (e) => {
  const link = e.target.closest(
    'a[href^="vscode://"], a[href^="vscode-insiders://"]',
  );
  if (link) {
    e.preventDefault();
    const newUrl = link.href.replace(/^vscode(-insiders)?:/, "antigravity:");
    window.location.href = newUrl;
  }
});
```

---

#### [NEW] [icons/](file:///c:/Users/addra/.gemini/antigravity/playground/crystal-astro/vscode-antigravity-linker/icons/)

擴充功能圖示（16x16, 48x48, 128x128）

---

## Verification Plan

### 手動測試

1. **載入擴充功能**
   - 開啟 Chrome → `chrome://extensions/`
   - 開啟「開發人員模式」
   - 點擊「載入未封裝項目」
   - 選擇 `vscode-antigravity-linker` 資料夾

2. **測試 VS Code 連結攔截**
   - 前往 [VS Code Marketplace](https://marketplace.visualstudio.com/)
   - 點擊任一擴充功能的「Install」按鈕
   - 確認：
     - [ ] 連結被攔截（不會跳出「想開啟 VS Code 嗎？」的系統對話框）
     - [ ] Antigravity 程式啟動
     - [ ] 擴充功能正確安裝到 Antigravity

3. **測試 GitHub 連結**
   - 前往任一 GitHub Repository
   - 點擊「Code」→「Open with VS Code」（如果有）
   - 確認 Antigravity 接管連結

---

## 注意事項

> [!IMPORTANT]
> 此擴充功能的成功運作取決於 Antigravity 是否已註冊 `antigravity://` 協議處理器。如果 Antigravity 尚未註冊此協議，需要先確認 Antigravity 支援的協議格式。

---

## 開放問題

1. ~~**Antigravity 協議格式**~~：已確認使用 `antigravity://` 協議
2. ~~**VS Code 連結路徑對應**~~：已實作協議轉換邏輯

---

# v1.1 - Popup UI 功能

## 新增功能說明

點擊擴充功能圖示時顯示 Popup 視窗，讓用戶選擇目標 IDE：

| IDE              | 協議                 | 說明            |
| ---------------- | -------------------- | --------------- |
| VS Code          | `vscode://`          | 官方穩定版      |
| VS Code Insiders | `vscode-insiders://` | 開發預覽版      |
| Antigravity      | `antigravity://`    | Antigravity IDE |
| Cursor           | `cursor://`          | AI-first IDE    |
| Windsurf         | `windsurf://`        | Codeium IDE     |

---

## Proposed Changes (v1.1)

### Popup UI 元件

---

#### [MODIFY] [manifest.json](file:///c:/Users/addra/.gemini/antigravity/playground/crystal-astro/vscode-antigravity-linker/manifest.json)

新增：

- `action.default_popup` 指向 `popup.html`
- `permissions` 新增 `storage`（儲存用戶選擇）

---

#### [NEW] [popup.html](file:///c:/Users/addra/.gemini/antigravity/playground/crystal-astro/vscode-antigravity-linker/popup.html)

Popup 介面結構：

- 標題：選擇目標 IDE
- 列表：可點擊的 IDE 選項（帶圖示）
- 當前選擇狀態顯示

---

#### [NEW] [popup.css](file:///c:/Users/addra/.gemini/antigravity/playground/crystal-astro/vscode-antigravity-linker/popup.css)

樣式設計：

- 簡潔現代風格
- 與 Chrome 擴充功能 UI 風格一致
- 選中狀態醒目顯示

---

#### [NEW] [popup.js](file:///c:/Users/addra/.gemini/antigravity/playground/crystal-astro/vscode-antigravity-linker/popup.js)

傳遞用戶選擇至 `chrome.storage.sync`，讓 Content Script 讀取。

---

#### [MODIFY] [content.js](file:///c:/Users/addra/.gemini/antigravity/playground/crystal-astro/vscode-antigravity-linker/content.js)

修改：

- 從 `chrome.storage.sync` 讀取用戶選擇的目標 IDE
- 動態轉換協議

---

## Verification Plan (v1.1)

### 手動測試

1. 重新載入擴充功能
2. 點擊擴充功能圖示，確認 Popup 顯示
3. 選擇不同 IDE，確認選擇狀態儲存
4. 前往 VS Code Marketplace 點擊 Install，確認導向正確的 IDE
