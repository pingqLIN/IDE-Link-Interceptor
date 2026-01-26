# Chrome Extension: VS Code to Antigravity Redirector

## 目標

建立一個 Chrome 擴充功能，攔截網頁上的 `vscode://` 連結，並提供 Popup 介面讓用戶選擇要導向哪個 IDE。

---

## 支援的 IDE 協議

| IDE              | 協議                 |
| ---------------- | -------------------- |
| VS Code          | `vscode://`          |
| VS Code Insiders | `vscode-insiders://` |
| Antigravity      | `antigravity://`    |
| Cursor           | `cursor://`          |
| Windsurf         | `windsurf://`        |

## Tasks

### 規劃階段

- [x] 研究 VS Code 連結格式（`vscode://` 協議）
- [x] 設計擴充功能架構
- [x] 撰寫 implementation plan

### 實作階段

- [x] 建立專案目錄結構
- [x] 撰寫 `manifest.json`
- [x] 撰寫 Content Script（攔截連結）
- [x] ~~撰寫 Service Worker~~（不需要，Content Script 已足夠）
- [x] 設計擴充功能圖示

### 驗證階段 (v1.0)

- [x] 在 Chrome 中載入擴充功能 _(已完成)_
- [x] 測試 VS Code 連結攔截功能
- [x] 驗證 Antigravity 是否正確啟動

---

## v1.1 - Popup UI 功能

### 規劃階段

- [x] 更新 implementation plan

### 實作階段

- [x] 修改 `manifest.json` 新增 popup 設定
- [x] 建立 `popup.html`（選擇介面）
- [x] 建立 `popup.css`（樣式）
- [x] 建立 `popup.js`（選擇邏輯）
- [x] 修改 `content.js`（支援動態協議切換）

### 驗證階段

- [ ] 重新載入擴充功能
- [ ] 測試 Popup 選擇功能
- [ ] 驗證不同 IDE 協議導向
