/**
 * URL 轉換規則測試腳本
 * 
 * 測試 IDE-Link-Interceptor 的 URL 轉換邏輯是否符合 url-conversion-rules.md 規範
 * 
 * 執行方式: node tests/url-conversion.test.js
 */

// ========== 模擬核心轉換邏輯 ==========

const IDE_PROVIDER_MAP = {
    'vscode': 'github.remotehub',
    'vscode-insiders': 'github.remotehub',
    'antigravity': 'git',
    'cursor': 'repo',
    'windsurf': 'repo',
    'vscodium': 'github.remotehub'
};

// 避免破壞 OAuth/登入流程（例如 GitHub Copilot / GitHub Auth 回呼）
function isAuthCallbackUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const match = url.match(/^([^:]+):\/\/([^/]+)\/([^?]+)(\?.*)?$/) ||
        url.match(/^([^:]+):([^/]+)\/([^?]+)(\?.*)?$/);
    if (!match) return false;
    const provider = (match[2] || '').toLowerCase();
    return provider.includes('authentication');
}

/**
 * 轉換 VS Code URL 為目標協議
 */
function convertVSCodeUrl(url, targetProtocol) {
    if (url.startsWith(`${targetProtocol}:`)) return url;
    if (isAuthCallbackUrl(url)) return url;

    try {
        const match = url.match(/^([^:]+):\/\/([^\/]+)\/([^?]+)(\?.*)?$/) ||
            url.match(/^([^:]+):([^\/]+)\/([^?]+)(\?.*)?$/);

        if (match) {
            const [, , , action, queryStr] = match;
            const targetProvider = IDE_PROVIDER_MAP[targetProtocol] || 'git';
            return `${targetProtocol}://${targetProvider}/${action}${queryStr || ''}`;
        }

        // Fallback
        const protocols = ['vscode:', 'vscode-insiders:', 'cursor:'];
        for (const protocol of protocols) {
            if (url.startsWith(protocol)) {
                return url.replace(protocol, `${targetProtocol}:`);
            }
        }
    } catch (e) {
        console.error('轉換失敗:', e);
    }

    return url;
}

/**
 * 建構 VSIX 安裝 URL
 */
function buildVsixInstallUrl(targetProtocol, vsixUrl, publisher, name, version) {
    const encodedVsixUrl = encodeURIComponent(vsixUrl);
    const extensionName = `${publisher}.${name}`;

    let url = `${targetProtocol}://extension/install?url=${encodedVsixUrl}&name=${extensionName}`;

    if (version) {
        url += `&version=${version}`;
    }

    return url;
}

/**
 * 建構擴充 URL
 * Antigravity 使用 protocol://id 格式
 * 其他協議使用 protocol:extension/id 格式
 */
function buildExtensionUrl(protocol, publisher, name) {
    const extensionId = `${publisher}.${name}`;
    if (protocol === 'antigravity') {
        return `antigravity://${extensionId}`;
    }
    return `${protocol}:extension/${extensionId}`;
}

/**
 * 檢查 URL 是否為 MCP URL
 */
function isMcpUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return /^(vscode|vscode-insiders):mcp\//.test(url);
}

/**
 * 從 MCP URL 提取服務器名稱
 */
function extractMcpServerName(url) {
    if (!isMcpUrl(url)) return null;
    
    try {
        // Format 1: vscode:mcp/by-name/{name}
        const byNameMatch = url.match(/^(vscode|vscode-insiders):mcp\/by-name\/([^/?#]+)/);
        if (byNameMatch) {
            return byNameMatch[2];
        }
        
        // Format 2: vscode:mcp/api.mcp.github.com/.../servers/{id}/{name}
        const apiMatch = url.match(/^(vscode|vscode-insiders):mcp\/api\.mcp\.github\.com.*\/servers\/[^/]+\/([^/?#]+)/);
        if (apiMatch) {
            return apiMatch[2];
        }
        
        return null;
    } catch {
        return null;
    }
}

// ========== 測試案例 ==========

function runTests() {
    const tests = [];
    let passed = 0;
    let failed = 0;

    function test(name, actual, expected) {
        const status = actual === expected ? '✅ PASS' : '❌ FAIL';
        tests.push({ name, status, actual, expected });

        if (actual === expected) {
            passed++;
        } else {
            failed++;
            console.error(`\n❌ FAIL: ${name}`);
            console.error('  Expected:', expected);
            console.error('  Actual:  ', actual);
        }
    }

    console.log('\n🧪 開始測試 URL 轉換規則...\n');

    // ========== 測試 1: Provider 映射 ==========
    console.log('📋 測試 1: Provider 映射');

    test(
        '1.1 VS Code 使用 github.remotehub provider',
        convertVSCodeUrl('vscode://github.remotehub/open?url=https%3A%2F%2Fgithub.com%2Fmcp%2Fcontext7', 'vscode'),
        'vscode://github.remotehub/open?url=https%3A%2F%2Fgithub.com%2Fmcp%2Fcontext7'
    );

    test(
        '1.2 VS Code → Antigravity 轉換使用 git provider',
        convertVSCodeUrl('vscode://github.remotehub/open?url=https%3A%2F%2Fgithub.com%2Fmcp%2Fcontext7', 'antigravity'),
        'antigravity://git/open?url=https%3A%2F%2Fgithub.com%2Fmcp%2Fcontext7'
    );

    test(
        '1.3 VS Code → Cursor 轉換使用 repo provider',
        convertVSCodeUrl('vscode://github.remotehub/open?url=https%3A%2F%2Fgithub.com%2Fmcp%2Fcontext7', 'cursor'),
        'cursor://repo/open?url=https%3A%2F%2Fgithub.com%2Fmcp%2Fcontext7'
    );

    test(
        '1.4 VS Code → Windsurf 轉換使用 repo provider',
        convertVSCodeUrl('vscode://github.remotehub/open?url=https%3A%2F%2Fgithub.com%2Fmcp%2Fcontext7', 'windsurf'),
        'windsurf://repo/open?url=https%3A%2F%2Fgithub.com%2Fmcp%2Fcontext7'
    );

    // ========== 測試 2: GitHub Repo 轉換 ==========
    console.log('\n📋 測試 2: GitHub Repo 連結轉換');

    test(
        '2.1 標準 vscode:// 格式轉換',
        convertVSCodeUrl('vscode://github.remotehub/clone?url=https%3A%2F%2Fgithub.com%2Fuser%2Frepo', 'antigravity'),
        'antigravity://git/clone?url=https%3A%2F%2Fgithub.com%2Fuser%2Frepo'
    );

    test(
        '2.2 含分支參數的轉換',
        convertVSCodeUrl('vscode://github.remotehub/open?url=https%3A%2F%2Fgithub.com%2Fuser%2Frepo&branch=main', 'antigravity'),
        'antigravity://git/open?url=https%3A%2F%2Fgithub.com%2Fuser%2Frepo&branch=main'
    );

    test(
        '2.3 含多個參數的轉換',
        convertVSCodeUrl('vscode://github.remotehub/open?url=https%3A%2F%2Fgithub.com%2Fuser%2Frepo&branch=dev&path=src', 'cursor'),
        'cursor://repo/open?url=https%3A%2F%2Fgithub.com%2Fuser%2Frepo&branch=dev&path=src'
    );

    // ========== 測試 3: VSIX 安裝 URL ==========
    console.log('\n📋 測試 3: VSIX 安裝 URL 格式');

    test(
        '3.1 Open VSX 完整格式（含版本）',
        buildVsixInstallUrl('antigravity', 'https://open-vsx.org/api/pub/ext/1.2.3/file', 'pub', 'ext', '1.2.3'),
        'antigravity://extension/install?url=https%3A%2F%2Fopen-vsx.org%2Fapi%2Fpub%2Fext%2F1.2.3%2Ffile&name=pub.ext&version=1.2.3'
    );

    test(
        '3.2 無版本號的 VSIX',
        buildVsixInstallUrl('cursor', 'https://example.com/extension.vsix', 'publisher', 'myext', null),
        'cursor://extension/install?url=https%3A%2F%2Fexample.com%2Fextension.vsix&name=publisher.myext'
    );

    test(
        '3.3 特殊字元 URL encoding',
        buildVsixInstallUrl('antigravity', 'https://example.com/ext?token=abc&id=123', 'test', 'ext', '2.0.0'),
        'antigravity://extension/install?url=https%3A%2F%2Fexample.com%2Fext%3Ftoken%3Dabc%26id%3D123&name=test.ext&version=2.0.0'
    );

    test(
        '3.4 Marketplace vsassets 下載 URL',
        buildVsixInstallUrl(
            'antigravity',
            'https://ms-python.gallery.vsassets.io/_apis/public/gallery/publisher/ms-python/extension/python/2026.0.0/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage',
            'ms-python',
            'python',
            '2026.0.0'
        ),
        'antigravity://extension/install?url=https%3A%2F%2Fms-python.gallery.vsassets.io%2F_apis%2Fpublic%2Fgallery%2Fpublisher%2Fms-python%2Fextension%2Fpython%2F2026.0.0%2Fassetbyname%2FMicrosoft.VisualStudio.Services.VSIXPackage&name=ms-python.python&version=2026.0.0'
    );

    // ========== 測試 4: URL Encoding ==========
    console.log('\n📋 測試 4: URL Encoding 正確性');

    const testUrl = 'https://github.com/user/repo?query=value&foo=bar';
    const encoded = encodeURIComponent(testUrl);

    test(
        '4.1 URL 包含冒號正確編碼',
        encoded.includes('%3A'),
        true
    );

    test(
        '4.2 URL 包含斜線正確編碼',
        encoded.includes('%2F'),
        true
    );

    test(
        '4.3 URL 包含問號正確編碼',
        encoded.includes('%3F'),
        true
    );

    test(
        '4.4 URL 包含 & 符號正確編碼',
        encoded.includes('%26'),
        true
    );

    // ========== 測試 5: 認證回呼保留原樣 ==========
    console.log('\n📋 測試 5: 認證回呼保留原樣（避免 Copilot 登入失敗）');

    test(
        '5.1 vscode.github-authentication 不轉換',
        convertVSCodeUrl('vscode://vscode.github-authentication/did-authenticate?code=abc&state=def', 'cursor'),
        'vscode://vscode.github-authentication/did-authenticate?code=abc&state=def'
    );

    test(
        '5.2 cursor://...authentication... 不轉換',
        convertVSCodeUrl('cursor://vscode.github-authentication/did-authenticate?code=abc&state=def', 'antigravity'),
        'cursor://vscode.github-authentication/did-authenticate?code=abc&state=def'
    );

    // ========== 測試 6: Antigravity 擴充 URL 格式 ==========
    console.log('\n📋 測試 6: Antigravity 擴充 URL 格式');

    test(
        '6.1 Antigravity 擴充 URL 使用 protocol://id 格式',
        buildExtensionUrl('antigravity', 'esbenp', 'prettier-vscode'),
        'antigravity://esbenp.prettier-vscode'
    );

    test(
        '6.2 VS Code 擴充 URL 保持 protocol:extension/id 格式',
        buildExtensionUrl('vscode', 'esbenp', 'prettier-vscode'),
        'vscode:extension/esbenp.prettier-vscode'
    );

     test(
         '6.3 Cursor 擴充 URL 保持 protocol:extension/id 格式',
         buildExtensionUrl('cursor', 'ms-python', 'python'),
         'cursor:extension/ms-python.python'
     );

     // ========== 測試 7: MCP URL 檢測與處理 ==========
     console.log('\n📋 測試 7: MCP URL 檢測與處理');

     test(
         '7.1 檢測 vscode:mcp/by-name/huggingface 格式',
         isMcpUrl('vscode:mcp/by-name/huggingface'),
         true
     );

     test(
         '7.2 檢測 vscode:mcp/api.mcp.github.com/.../servers/... 格式',
         isMcpUrl('vscode:mcp/api.mcp.github.com/2025-09-15/v0/servers/huggingface/hf-mcp-server'),
         true
     );

     test(
         '7.3 檢測 vscode-insiders:mcp 格式',
         isMcpUrl('vscode-insiders:mcp/by-name/huggingface'),
         true
     );

     test(
         '7.4 非 MCP URL 應返回 false',
         isMcpUrl('vscode://github.remotehub/open?url=https%3A%2F%2Fgithub.com%2Fuser%2Frepo'),
         false
     );

     test(
         '7.5 提取 by-name 格式的服務器名稱',
         extractMcpServerName('vscode:mcp/by-name/huggingface'),
         'huggingface'
     );

     test(
         '7.6 提取 by-name 格式帶路徑的服務器名稱',
         extractMcpServerName('vscode:mcp/by-name/python-mcp?arg=value'),
         'python-mcp'
     );

     test(
         '7.7 提取 api.mcp.github.com 格式的服務器名稱',
         extractMcpServerName('vscode:mcp/api.mcp.github.com/2025-09-15/v0/servers/huggingface/hf-mcp-server'),
         'hf-mcp-server'
     );

     test(
         '7.8 提取 api.mcp.github.com 格式帶查詢參數的服務器名稱',
         extractMcpServerName('vscode:mcp/api.mcp.github.com/2025-09-15/v0/servers/huggingface/hf-mcp-server?version=1.0'),
         'hf-mcp-server'
     );

     test(
         '7.9 vscode-insiders 前綴的 by-name 格式提取',
         extractMcpServerName('vscode-insiders:mcp/by-name/anthropic'),
         'anthropic'
     );

     test(
         '7.10 vscode-insiders 前綴的 api.mcp.github.com 格式提取',
         extractMcpServerName('vscode-insiders:mcp/api.mcp.github.com/2025-09-15/v0/servers/anthropic/claude-mcp'),
         'claude-mcp'
     );

     test(
         '7.11 非 MCP URL 應返回 null',
         extractMcpServerName('vscode://github.remotehub/open?url=https%3A%2F%2Fgithub.com'),
         null
     );

     test(
         '7.12 null 或 undefined URL 應返回 null',
         extractMcpServerName(null),
         null
     );

     // ========== 測試結果統計 ==========
    console.log('\n' + '='.repeat(60));
    console.log('📊 測試結果統計');
    console.log('='.repeat(60));
    console.log(`✅ 通過: ${passed}/${tests.length}`);
    console.log(`❌ 失敗: ${failed}/${tests.length}`);

    if (failed === 0) {
        console.log('\n🎉 所有測試通過！URL 轉換邏輯符合 url-conversion-rules.md 規範。\n');
    } else {
        console.log('\n⚠️ 有測試失敗，請檢查上面的錯誤訊息。\n');
        process.exit(1);
    }
}

// 執行測試
runTests();
