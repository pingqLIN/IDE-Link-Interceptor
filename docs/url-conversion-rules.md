# 網址轉換規則說明

以下文件說明如何將標準 HTTP(S) 的 GitHub 或 Open VSX 連結轉換為各編輯器可識別的自訂協議 URI，包含範本、欄位說明、實作步驟、範例以及安全注意事項。範例以 `https://github.com/mcp/upstash/context7` 為來源示範。

---

## 概要

- **目的**：把一般的網頁連結轉成各編輯器自訂協議 URI，方便直接從瀏覽器啟動編輯器並開啟遠端 repo 或安裝 VSIX。
- **支援編輯器**：VS Code stable, VS Code Insiders, Antigravity, Cursor, Windsurf Codeium。
- **兩類場景**：打開遠端 repo 或檔案；安裝 `.vsix` 擴充套件（例如來自 Open VSX 的檔案）。

---

## 通用模板與欄位說明

**通用模板**

```
{editor}://{provider}/{action}?url={URL_ENCODED_TARGET}&branch={branch}&path={subdir}&file={file}&line={line}&name={publisher.extension}&version={version}
```

**MCP 擴充模板**

```
{editor}:mcp/install?{URL_ENCODED_JSON_CONFIG}
{editor}:mcp/by-name/{namespace}/{name}
```

**欄位說明**

- **editor**：編輯器協議名稱，例如 `vscode`、`vscode-insiders`、`antigravity`、`cursor`、`windsurf`。
- **provider**：編輯器內處理遠端資源的模組或命名空間，例如 `github.remotehub`、`repo`、`git`、`extension`。
- **action**：動作，例如 `open`、`install`、`clone`、`browse`。
- **url**：目標資源的完整 URL，**必須 URL encode**。
- **branch**：可選，指定分支名稱。
- **path**：可選，指定子目錄。
- **file**：可選，指定檔案相對路徑。
- **line**：可選，指定行號。
- **name**：安裝 VSIX 時的擴充識別名稱，例如 `publisher.extension`。
- **version**：安裝 VSIX 時的版本號。

---

## 編輯器協議範例表

| **Editor** | **Scheme** | **用途** | **範例打開 Repo** | **範例安裝 VSIX** |
|---|---:|---|---|---|
| VS Code stable | `vscode://` | 官方穩定版 | `vscode://github.remotehub/open?url=https%3A%2F%2Fgithub.com%2Fmcp%2Fupstash%2Fcontext7` | `vscode://extension/install?url=https%3A%2F%2Fopen-vsx.org%2Fapi%2Fpub%2Fext%2F1.2.3%2Ffile&name=pub.ext&version=1.2.3` |
| VS Code Insiders | `vscode-insiders://` | 預覽版 | `vscode-insiders://github.remotehub/open?url=...` | `vscode-insiders://extension/install?url=...` |
| Antigravity IDE | `antigravity://` | Antigravity 自訂協議 | `antigravity://git/open?url=https%3A%2F%2Fgithub.com%2Fmcp%2Fupstash%2Fcontext7` | `antigravity://extension/install?url={VSIX_URL}&name={publisher}.{extension}` |
| Cursor AI IDE | `cursor://` | AI first IDE | `cursor://repo/open?url=https%3A%2F%2Fgithub.com%2Fmcp%2Fupstash%2Fcontext7` | `cursor://extension/install?url={VSIX_URL}&name={publisher}.{extension}` |
| Windsurf Codeium | `windsurf://` | Codeium IDE | `windsurf://repo/open?url=https%3A%2F%2Fgithub.com%2Fmcp%2Fupstash%2Fcontext7` | `windsurf://extension/install?url={VSIX_URL}&name={publisher}.{extension}` |

---

### 注意事項：Antigravity 擴充 URL 格式

Antigravity IDE 的擴充安裝連結格式與其他 VS Code 系列 IDE 不同：

**從 Marketplace 安裝擴充（`vscode:extension/id` 連結）**：
- **Antigravity**: `antigravity://{publisher}.{extension}` (擴充 ID 直接作為 authority)
- **其他 IDE**: `{protocol}:extension/{publisher}.{extension}` (擴充 ID 作為 path)

範例：
- Antigravity: `antigravity://esbenp.prettier-vscode`
- VS Code: `vscode:extension/esbenp.prettier-vscode`
- Cursor: `cursor:extension/esbenp.prettier-vscode`

**從 VSIX 檔案安裝（`.vsix` 下載連結）**：
- 所有 IDE（包括 Antigravity）都使用相同格式：
  `{protocol}://extension/install?url={VSIX_URL}&name={publisher}.{extension}`

---

## 轉換與編碼步驟

1. **取得原始 URL**
   例如：`https://github.com/mcp/upstash/context7` 或 Open VSX 的 VSIX 下載連結 `https://open-vsx.org/api/pub/ext/1.2.3/file`。

2. **URL encode 目標 URL**
   - 將 `:` `/` `?` `&` 等字元轉為百分比編碼。
   - 範例編碼結果：

     ```
     https%3A%2F%2Fgithub.com%2Fmcp%2Fupstash%2Fcontext7
     ```

3. **選擇 editor 與 provider 並套入模板**
   - 例如要在 Antigravity 打開 repo：

     ```
     antigravity://git/open?url=https%3A%2F%2Fgithub.com%2Fmcp%2Fupstash%2Fcontext7
     ```

4. **加入可選參數**
   - 指定分支：`&branch=main`
   - 指定子目錄：`&path=context7`
   - 指定檔案與行號：`&file=src%2Findex.js&line=42`

5. **測試**
   - 在支援該協議的系統上點擊或在瀏覽器地址列貼上 URI，確認編輯器被喚起並執行預期動作。

---

## Open VSX 與 VSIX 安裝範例

- **Open VSX 直接檔案 URL 常見格式**

  ```
  https://open-vsx.org/api/{publisher}/{extension}/{version}/file
  ```

- **將 VSIX URL 套入安裝模板**
  - Antigravity 安裝範例（已編碼）

    ```
antigravity://extension/install?url=https%3A%2F%2Fopen-vsx.org%2Fapi%2Fpub%2Fext%2F1.2.3%2Ffile&name=publisher.extension&version=1.2.3
```

---

- **若編輯器不支援協議**
  - 使用 CLI 或內建功能安裝 VSIX，例如 VS Code CLI：

    ```
    code --install-extension path_or_url_to_vsix
    ```

  - 或先下載 VSIX 檔案再透過編輯器的「Install from VSIX」功能安裝。

---

## 安全與實務注意事項

- **務必 URL encode** 所有作為查詢參數的完整 URL。
- **不要在 URI 中放入敏感資訊**，例如 access token、密碼或私人憑證。
- **授權需求**：若資源需要授權，請使用編輯器或平台提供的 OAuth 或授權流程，不要把 token 放在 URI。
- **協議註冊**：系統必須已註冊該自訂協議並綁定到對應應用程式，否則瀏覽器會顯示錯誤或無回應。
- **擴充相容性**：不同編輯器可能使用不同 provider 或 action 命名，請參考該編輯器官方文件或擴充說明以取得正確格式。
- **防範惡意 URL**：只對可信來源使用自訂協議，避免被惡意 URL 利用來執行不預期動作。

---

## 常見問題與對策

- **Q 編輯器沒有反應**
  - A 檢查系統是否註冊該協議，或改用 CLI/手動安裝。

- **Q URL 包含特殊字元導致失敗**
  - A 確認完整 URL 已正確 URL encode。

- **Q 需要指定分支或檔案但編輯器不支援**
  - A 改為先 clone 到本地再用編輯器開啟，或使用該編輯器的遠端擴充功能。

---

## 實用範例總結

- **打開 GitHub repo 在 Antigravity**

  ```
  antigravity://git/open?url=https%3A%2F%2Fgithub.com%2Fmcp%2Fupstash%2Fcontext7
  ```

- **在 Cursor 打開 repo 並指定分支與子目錄**

  ```
  cursor://repo/open?url=https%3A%2F%2Fgithub.com%2Fmcp%2Fupstash%2Fcontext7&branch=main&path=context7
  ```

- **在 Antigravity 安裝 Marketplace 擴充 (特殊格式)**

  ```
  antigravity://esbenp.prettier-vscode
  ```

- **在 Antigravity 安裝來自 Open VSX 的 VSIX**

```
antigravity://extension/install?url=https%3A%2F%2Fopen-vsx.org%2Fapi%2Fpub%2Fext%2F1.2.3%2Ffile&name=publisher.extension&version=1.2.3
```

---

## MCP URL Support

### Overview
GitHub MCP Registry uses URLs like `vscode:mcp/by-name/{server}` to install MCP servers. IDE-Link-Interceptor handles these URLs specially when the target IDE is Antigravity.

### URL Formats

**Format 1: By Name**
```
vscode:mcp/by-name/huggingface
vscode-insiders:mcp/by-name/huggingface
```

**Format 2: API Path**
```
vscode:mcp/api.mcp.github.com/2025-09-15/v0/servers/huggingface/hf-mcp-server
```

### Behavior

#### For Antigravity
When target IDE is Antigravity:
1. Intercept MCP URL
2. Extract server name
3. Show installation instruction modal
4. Redirect to GitHub repository

**Why**: Antigravity does NOT support MCP URL protocol handlers. It uses:
- Built-in MCP Store UI
- Manual JSON config file (`~/.gemini/antigravity/mcp_config.json`)

#### For Other IDEs
When target IDE is VS Code, Cursor, Windsurf:
- Convert protocol normally (e.g., `vscode:mcp/...` → `cursor:mcp/...`)
- Let the IDE handle MCP installation

### Supported MCP Servers

| Server Name | GitHub Repository |
|-------------|-------------------|
| `huggingface` | https://github.com/huggingface/hf-mcp-server |
| `hf-mcp-server` | https://github.com/huggingface/hf-mcp-server |

(More servers can be added to `MCP_REPO_MAP` in `content.js`)

