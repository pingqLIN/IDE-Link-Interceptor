/**
 * IDE Link Interceptor - Protocol Registration Helper
 * 
 * 此模組負責檢測與註冊 Windows IDE 協議 (URL Scheme)
 * 目前僅支援 Windows 平台
 */

const { exec, spawn } = require('child_process');
const path = require('path');

// IDE 預設安裝路徑對照表 (Windows)
const DEFAULT_IDE_PATHS = {
    'vscode': [
        process.env.LOCALAPPDATA + '\\Programs\\Microsoft VS Code\\Code.exe',
        'C:\\Program Files\\Microsoft VS Code\\Code.exe'
    ],
    'vscode-insiders': [
        process.env.LOCALAPPDATA + '\\Programs\\Microsoft VS Code Insiders\\Code - Insiders.exe',
        'C:\\Program Files\\Microsoft VS Code Insiders\\Code - Insiders.exe'
    ],
    'antigravity': [
        process.env.LOCALAPPDATA + '\\Programs\\Antigravity\\Antigravity.exe',
        'C:\\Program Files\\Antigravity\\Antigravity.exe',
        'C:\\Dev\\bin\\Antigravity.exe'
    ],
    'cursor': [
        process.env.LOCALAPPDATA + '\\Programs\\Cursor\\Cursor.exe',
        process.env.LOCALAPPDATA + '\\cursor\\Cursor.exe'
    ],
    'windsurf': [
        process.env.LOCALAPPDATA + '\\Programs\\Windsurf\\Windsurf.exe',
        'C:\\Program Files\\Windsurf\\Windsurf.exe'
    ]
};

/**
 * 檢查檔案是否存在
 * @param {string} filePath 
 * @returns {Promise<boolean>}
 */
function fileExists(filePath) {
    return new Promise((resolve) => {
        const fs = require('fs');
        fs.access(filePath, fs.constants.F_OK, (err) => {
            resolve(!err);
        });
    });
}

/**
 * 尋找 IDE 的實際安裝路徑
 * @param {string} protocol 
 * @returns {Promise<string|null>}
 */
async function findIDEPath(protocol) {
    const paths = DEFAULT_IDE_PATHS[protocol];
    if (!paths) return null;

    for (const p of paths) {
        if (await fileExists(p)) {
            return p;
        }
    }
    return null;
}

/**
 * 透過 PowerShell 讀取 Registry 值
 * @param {string} keyPath 
 * @returns {Promise<string|null>}
 */
function readRegistry(keyPath) {
    return new Promise((resolve) => {
        const cmd = `powershell -NoProfile -Command "try { (Get-ItemProperty -Path '${keyPath}' -ErrorAction Stop).'(default)' } catch { '' }"`;

        exec(cmd, { windowsHide: true }, (error, stdout) => {
            if (error) {
                resolve(null);
            } else {
                const value = stdout.trim();
                resolve(value || null);
            }
        });
    });
}

/**
 * 透過 PowerShell 寫入 Registry
 * 注意：寫入 HKLM 需要管理員權限
 * @param {string} keyPath 
 * @param {string} value 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
function writeRegistry(keyPath, value) {
    return new Promise((resolve) => {
        // 先確認父機碼存在，不存在則建立
        const parentPath = keyPath.substring(0, keyPath.lastIndexOf('\\'));
        const escapedValue = value.replace(/"/g, '\\"');

        const script = `
      $ErrorActionPreference = 'Stop'
      try {
        $path = '${keyPath}'
        $parent = '${parentPath}'
        
        # 建立父機碼（如果不存在）
        if (-not (Test-Path $parent)) {
          New-Item -Path $parent -Force | Out-Null
        }
        
        # 建立機碼（如果不存在）
        if (-not (Test-Path $path)) {
          New-Item -Path $path -Force | Out-Null
        }
        
        # 設定預設值
        Set-ItemProperty -Path $path -Name '(default)' -Value "${escapedValue}"
        Write-Output 'SUCCESS'
      } catch {
        Write-Output "ERROR: $_"
      }
    `;

        exec(`powershell -NoProfile -Command "${script.replace(/\n/g, ' ')}"`,
            { windowsHide: true },
            (error, stdout, stderr) => {
                const output = stdout.trim();
                if (error || !output.startsWith('SUCCESS')) {
                    resolve({
                        success: false,
                        error: stderr || output || error?.message || 'Unknown error'
                    });
                } else {
                    resolve({ success: true });
                }
            }
        );
    });
}

/**
 * 檢查協議是否已在系統中註冊
 * @param {string} protocol - IDE 協議名稱 (如 'vscode', 'cursor')
 * @returns {Promise<{registered: boolean, execPath?: string, error?: string}>}
 */
async function checkProtocolRegistration(protocol) {
    try {
        // 依序檢查 HKCU 和 HKCR
        const registryPaths = [
            `HKCU:\\Software\\Classes\\${protocol}\\shell\\open\\command`,
            `Registry::HKEY_CLASSES_ROOT\\${protocol}\\shell\\open\\command`
        ];

        for (const regPath of registryPaths) {
            const value = await readRegistry(regPath);
            if (value) {
                // 從命令中提取執行檔路徑
                // 格式通常是: "C:\path\to\exe.exe" "%1" 或 "C:\path\to\exe.exe" "--open-url" "--" "%1"
                const match = value.match(/^"([^"]+)"/);
                const execPath = match ? match[1] : null;

                return {
                    registered: true,
                    execPath: execPath,
                    registryValue: value
                };
            }
        }

        return { registered: false };
    } catch (error) {
        return { registered: false, error: error.message };
    }
}

/**
 * 註冊協議到系統 Registry (HKCU，不需管理員權限)
 * @param {string} protocol - IDE 協議名稱
 * @param {string} execPath - IDE 執行檔完整路徑
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function registerProtocol(protocol, execPath) {
    try {
        // 驗證 execPath 存在
        if (!await fileExists(execPath)) {
            return { success: false, error: `Executable not found: ${execPath}` };
        }

        const basePath = `HKCU:\\Software\\Classes\\${protocol}`;

        // 1. 設定協議描述
        const descResult = await writeRegistry(basePath, `URL:${protocol} Protocol`);
        if (!descResult.success) {
            return { success: false, error: `Failed to set description: ${descResult.error}` };
        }

        // 2. 設定 URL Protocol 標記（這裡需要用不同方式，因為名稱不是 (default)）
        const urlProtocolCmd = `powershell -NoProfile -Command "Set-ItemProperty -Path 'HKCU:\\Software\\Classes\\${protocol}' -Name 'URL Protocol' -Value ''"`;
        await new Promise((resolve) => {
            exec(urlProtocolCmd, { windowsHide: true }, () => resolve());
        });

        // 3. 設定 shell\\open\\command
        // 正確格式: "C:\path\to\exe.exe" "--open-url" "--" "%1"
        const command = `"${execPath}" "--open-url" "--" "%1"`;
        const cmdResult = await writeRegistry(`${basePath}\\shell\\open\\command`, command);

        if (!cmdResult.success) {
            return { success: false, error: `Failed to set command: ${cmdResult.error}` };
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * 自動偵測並註冊協議
 * @param {string} protocol 
 * @returns {Promise<{success: boolean, execPath?: string, error?: string}>}
 */
async function autoRegisterProtocol(protocol) {
    // 先檢查是否已註冊
    const status = await checkProtocolRegistration(protocol);
    if (status.registered) {
        return { success: true, execPath: status.execPath, alreadyRegistered: true };
    }

    // 尋找 IDE 安裝路徑
    const execPath = await findIDEPath(protocol);
    if (!execPath) {
        return {
            success: false,
            error: `Cannot find ${protocol} installation. Please install it first or specify the path manually.`
        };
    }

    // 註冊協議
    const result = await registerProtocol(protocol, execPath);
    if (result.success) {
        return { success: true, execPath: execPath };
    }

    return result;
}

/**
 * 取得所有支援的 IDE 預設路徑
 * @returns {object}
 */
function getDefaultIDEPaths() {
    return DEFAULT_IDE_PATHS;
}

module.exports = {
    checkProtocolRegistration,
    registerProtocol,
    autoRegisterProtocol,
    findIDEPath,
    getDefaultIDEPaths
};
