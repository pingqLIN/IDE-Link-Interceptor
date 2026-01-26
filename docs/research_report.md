# VS Code 衍生應用程式與擴充套件來源調查報告

這份報告整理了目前主流的 VS Code 相關衍生 IDE 以及擴充套件軟體網站，並針對我們正在開發的 `vscode-antigravity-linker` 專案進行了相容性評估。

## 1. 擴充套件來源網站列表

| 來源名稱                      | 網址 / 類型                                                          | 擴充套件安裝/下載方式 (Link Pattern)                                    |
| :---------------------------- | :------------------------------------------------------------------- | :---------------------------------------------------------------------- |
| **Visual Studio Marketplace** | [marketplace.visualstudio.com](https://marketplace.visualstudio.com) | `vscode:extension/{publisher}.{name}`                                   |
| **Open VSX Registry**         | [open-vsx.org](https://open-vsx.org)                                 | 主要是 `.vsix` 直接下載連結：`https://open-vsx.org/api/.../{name}.vsix` |
| **GitHub (MCP Registry)**     | [github.com/mcp](https://github.com/mcp)                             | `https://vscode.dev/redirect?url=vscode:mcp/install?name=...`           |
| **Cursor Marketplace**        | 內建於 Cursor IDE                                                    | `cursor:extension/{publisher}.{name}`                                   |
| **Windsurf (Codeium)**        | [codeium.com/windsurf](https://codeium.com/windsurf)                 | 預計使用 `windsurf:extension/...` (主要由 IDE 內部處理)                 |
| **VSIX Hub**                  | [vsixhub.com](https://vsixhub.com)                                   | 直接下載 `.vsix` 檔案                                                   |

---

## 2. 專案相容性檢查結論

針對我們目前開發的 `vscode-antigravity-linker`（VS Code IDE Switcher），檢查結果如下：

### ✅ 完全相容（目前已支援）

- **Visual Studio Marketplace**: 該網站點擊「Install」時會觸發 `vscode:` 協議。我們的專案已經成功攔截此協議並重定向，運作良好。
- **GitHub / vscode.dev**: 專案已針對 `vscode.dev/redirect` 模式進行了解析，能有效處理 GitHub 上提供的 MCP 或擴充套件安裝連結。

### ⚠️ 部分相容 / 需要優化

- **Open VSX Registry / VSIX Hub**: 這些網站目前主要提供 `.vsix` 檔案下載，而非協議連結。
  - _應用現況_：目前的攔截器無法處理檔案下載。
  - _建議改進_：可以開發「VSIX 攔截功能」，在點擊下載連結時，詢問用戶是否要改用 IDE 協議開啟。
- **原生 IDE 連結 (Cursor/Windsurf)**: 目前專案只攔截 `vscode:` 和 `vscode-insiders:`。
  - _應用現況_：若用戶設定目標為 Antigravity，但在網頁上點擊「Install in Cursor」按鈕，該連結不會被攔截。
  - _建議改進_：擴展攔截列表，將 `cursor:`、`windsurf:` 等協議也納入監控。

---

## 3. 具體應用建議 (Implementation Suggestion)

為了讓專案能「有效應用」於上述所有網站，建議在 `content.js` 中進行以下改動：

1. **擴充協議監控範圍**：

    ```javascript
    // 建議將其他 IDE 協議也納入攔截
    const INTERCEPT_PROTOCOLS = [
      "vscode:",
      "vscode-insiders:",
      "cursor:",
      "windsurf:",
      "vscodium:",
    ];
    ```

2. **增加 Open VSX 注入按鈕**：
    在點擊相關網站時，自動在「Download」按鈕旁注入一個「Install in [您的 IDE]」的按鈕，其背後邏輯是構造一個 `antigravity:extension/...` 的連結。

3. **VSIX 下載攔截**：
    監聽後綴名為 `.vsix` 的點擊事件，嘗試轉換為 IDE 安裝命令（如果目標 IDE 支持對應的安裝協議）。

---

這些發現顯示我們的專案在「官方生態系」已經做得很好，但如果能跨足到 **Open VSX** 和 **Cursor** 等第三方生態，其「Switcher」的角色會更加完整。
