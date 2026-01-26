# 自定義協議註冊指南 (Protocol Registration Guide)

由於瀏覽器擴充功能（Browser Extension）受限於沙盒安全機制，**無法直接檢查**使用者的作業系統是否已經註冊了特定的 IDE 協議指令。

若您的 IDE（如 Antigravity, VSCodium, Cursor 等）無法透過連結直接開啟，這通常是因為作業系統的 Registry 或 Config 遺失了關聯。

以下提供各平台的標準註冊方式，您可以將這些資訊提供給使用者進行手動修復。

---

## 支援的 IDE 協議對照表

請根據您要修復的 IDE，將下方腳本中的 `PROTO_NAME` 與 `EXE_PATH` 替換為對應的值：

| IDE 名稱 | 協議 (Protocol) | Windows 預設路徑範例 (EXE_PATH) |
| :--- | :--- | :--- |
| **Antigravity** | `antigravity` | `C:\\Program Files\\Antigravity\\Antigravity.exe` |
| **VSCodium** | `vscodium` | `C:\\Program Files\\VSCodium\\VSCodium.exe` |
| **Cursor** | `cursor` | `C:\\Users\\User\\AppData\\Local\\Programs\\Cursor\\Cursor.exe` |
| **Windsurf** | `windsurf` | `C:\\Program Files\\Windsurf\\Windsurf.exe` |
| **VS Code Insiders** | `vscode-insiders` | `C:\\Program Files\\Microsoft VS Code Insiders\\Code - Insiders.exe` |

---

## Windows (使用 Registry 機碼)

在 Windows 上，協議註冊在 `HKEY_CLASSES_ROOT` 下。

### 1. 通用註冊腳本 (`register-ide.reg`)

請將下方的 `[PROTOCOL]` 替換為協議名稱（如 `antigravity`），並將 `[PATH_TO_EXE]` 替換為執行檔路徑（注意反斜線要兩次 `\\`）。

```registry
Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\[PROTOCOL]]
@="URL:[PROTOCOL] Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\[PROTOCOL]\shell]

[HKEY_CLASSES_ROOT\[PROTOCOL]\shell\open]

[HKEY_CLASSES_ROOT\[PROTOCOL]\shell\open\command]
@="\"[PATH_TO_EXE]\" \"%1\""
```

### 範例：修復 Cursor 連結

```registry
Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\cursor]
@="URL:cursor Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\cursor\shell\open\command]
@="\"C:\\Users\\Administrator\\AppData\\Local\\Programs\\Cursor\\Cursor.exe\" \"%1\""
```

### 2. 執行方式

儲存成 `.reg` 檔案，雙擊並確認即可。

---

## macOS (Info.plist)

macOS 應用程式通常會自動註冊。若失效，請檢查 App 套件內的 `Info.plist` 是否包含 `CFBundleURLSchemes`。

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>IDE Protocol</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <!-- 在此填入協議名稱，如 antigravity, cursor, windsurf -->
            <string>antigravity</string>
        </array>
    </dict>
</array>
```

**修復指令**：若 `Info.plist` 正確但無法開啟，可在終端機執行此指令重建 LaunchServices 資料庫：

```bash
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain local -domain system -domain user
```

---

## Linux (.desktop 文件)

### 1. 建立 `.desktop` 檔案

檔案路徑：`~/.local/share/applications/[protocol].desktop`
（例如 `antigravity.desktop` 或 `cursor.desktop`）

```ini
[Desktop Entry]
Name=IDE Name
Exec=/path/to/ide-executable %u
Type=Application
Terminal=false
MimeType=x-scheme-handler/[protocol];
```

**範例 (VSCodium)**：

```ini
[Desktop Entry]
Name=VSCodium
Exec=/usr/bin/vscodium %u
Type=Application
Terminal=false
MimeType=x-scheme-handler/vscodium;
```

### 2. 更新關聯

```bash
update-desktop-database ~/.local/share/applications/
xdg-mime default [filename].desktop x-scheme-handler/[protocol]
```

---

## 建議的處理流程 (UI/UX)

1. **Popup 偵測UI**：
   在擴充功能選單中，當使用者選擇特定 IDE 時（例如切換到 "Cursor"），可以顯示一行小字：
   > *"First time? Click here to test if Cursor opens."*

2. **失敗引導**：
   若測試失敗，提供連結連至此文件或提供下載對應的 `.reg` 修復檔。
