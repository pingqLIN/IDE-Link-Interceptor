const STORAGE_KEY = 'selectedProtocol';
const DEFAULT_PROTOCOL = 'antigravity';
const NATIVE_HOST_NAME = 'com.idelinkinterceptor.host';

// IDE 選項配置
const IDE_OPTIONS = [
  { id: 'vscode', name: 'VS Code', desc: 'Official stable' },
  { id: 'vscode-insiders', name: 'VS Code Insiders', desc: 'Preview release' },
  { id: 'antigravity', name: 'Antigravity', desc: 'Antigravity IDE' },
  { id: 'cursor', name: 'Cursor', desc: 'AI-first IDE' },
  { id: 'windsurf', name: 'Windsurf', desc: 'Codeium IDE' },
];

const VALID_PROTOCOLS = new Set(IDE_OPTIONS.map(option => option.id));

// Native Host 連線狀態
let nativeHostAvailable = null; // null = 未知, true = 可用, false = 不可用

function normalizeProtocol(protocol) {
  return VALID_PROTOCOLS.has(protocol) ? protocol : DEFAULT_PROTOCOL;
}

/**
 * 遷移舊的協議 ID 到新格式
 */
async function migrateProtocolIfNeeded() {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    const currentProtocol = result[STORAGE_KEY];
    const normalizedProtocol = normalizeProtocol(currentProtocol);
    if (currentProtocol && currentProtocol !== normalizedProtocol) {
      console.log(`[IDE Switcher] 修正協議: ${currentProtocol} -> ${normalizedProtocol}`);
      await chrome.storage.sync.set({ [STORAGE_KEY]: normalizedProtocol });
      return normalizedProtocol;
    }
    return currentProtocol || DEFAULT_PROTOCOL;
  } catch (error) {
    console.error('[IDE Switcher] 遷移失敗:', error);
    return DEFAULT_PROTOCOL;
  }
}

/**
 * 取得目前選擇的 IDE 名稱
 */
async function getCurrentIDEName() {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    const currentProtocol = normalizeProtocol(result[STORAGE_KEY]);
    const ide = IDE_OPTIONS.find(i => i.id === currentProtocol);
    return ide ? ide.name : 'IDE';
  } catch {
    return 'IDE';
  }
}

/**
 * 檢查 Native Host 是否可用
 */
async function checkNativeHost() {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendNativeMessage(
        NATIVE_HOST_NAME,
        { action: 'ping' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.log('[IDE Switcher] Native Host not available:', chrome.runtime.lastError.message);
            nativeHostAvailable = false;
            resolve(false);
          } else if (response && response.success) {
            console.log('[IDE Switcher] Native Host connected, version:', response.version);
            nativeHostAvailable = true;
            resolve(true);
          } else {
            nativeHostAvailable = false;
            resolve(false);
          }
        }
      );
    } catch (e) {
      console.error('[IDE Switcher] Native Host check error:', e);
      nativeHostAvailable = false;
      resolve(false);
    }
  });
}

/**
 * 透過 Native Host 安裝擴充功能
 */
async function installViaHost(extensionId, ide) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(
      NATIVE_HOST_NAME,
      { action: 'install', extensionId, ide },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Unknown error'));
        }
      }
    );
  });
}

/**
 * 檢查指定 IDE 協議是否已在系統中註冊
 * @param {string} protocol - IDE 協議名稱
 * @returns {Promise<{registered: boolean, execPath?: string, error?: string}>}
 */
async function checkIDERegistration(protocol) {
  return new Promise((resolve) => {
    chrome.runtime.sendNativeMessage(
      NATIVE_HOST_NAME,
      { action: 'checkProtocol', protocol },
      (response) => {
        if (chrome.runtime.lastError) {
          console.log('[IDE Switcher] checkIDERegistration error:', chrome.runtime.lastError.message);
          resolve({ registered: false, error: chrome.runtime.lastError.message });
        } else if (response && response.success) {
          resolve({
            registered: response.registered,
            execPath: response.execPath
          });
        } else {
          resolve({ registered: false, error: response?.error });
        }
      }
    );
  });
}

/**
 * 請求 Native Host 自動註冊 IDE 協議
 * @param {string} protocol - IDE 協議名稱
 * @param {string} [execPath] - 可選，指定 IDE 執行檔路徑
 * @returns {Promise<{success: boolean, execPath?: string, error?: string}>}
 */
async function requestIDERegistration(protocol, execPath = null) {
  return new Promise((resolve) => {
    const message = { action: 'registerProtocol', protocol };
    if (execPath) {
      message.execPath = execPath;
    }

    chrome.runtime.sendNativeMessage(
      NATIVE_HOST_NAME,
      message,
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('[IDE Switcher] requestIDERegistration error:', chrome.runtime.lastError.message);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else if (response && response.success) {
          resolve({
            success: true,
            execPath: response.execPath,
            alreadyRegistered: response.alreadyRegistered
          });
        } else {
          resolve({ success: false, error: response?.error });
        }
      }
    );
  });
}

/**
 * 批量檢查所有 IDE 的註冊狀態
 * @returns {Promise<Object<string, {registered: boolean, execPath?: string}>>}
 */
async function checkAllIDERegistrations() {
  const results = {};

  // 先確認 Native Host 可用
  if (nativeHostAvailable === null) {
    await checkNativeHost();
  }

  if (!nativeHostAvailable) {
    // Native Host 不可用，返回所有未知狀態
    IDE_OPTIONS.forEach(ide => {
      results[ide.id] = { registered: null, error: 'Native Host not available' };
    });
    return results;
  }

  // 並行檢查所有 IDE
  const promises = IDE_OPTIONS.map(async (ide) => {
    const status = await checkIDERegistration(ide.id);
    results[ide.id] = status;
  });

  await Promise.all(promises);
  return results;
}

/**
 * 建立右鍵選單
 */
async function createContextMenus() {
  const ideName = await getCurrentIDEName();

  // 移除所有現有選單
  chrome.contextMenus.removeAll(() => {
    // ============ VSIX 連結專用選單 ============
    chrome.contextMenus.create({
      id: 'install-vsix',
      title: chrome.i18n.getMessage('menuInstallVsix', [ideName]),
      contexts: ['link'],
      targetUrlPatterns: [
        '*://*/*.vsix',
        '*://*/*.vsix?*',
        '*://open-vsx.org/api/*/*/*/file*',
        '*://*.open-vsx.org/api/*/*/*/file*',
        '*://*.gallery.vsassets.io/_apis/public/gallery/publisher/*/extension/*/*/assetbyname/*',
        '*://marketplace.visualstudio.com/_apis/public/gallery/publishers/*/vsextensions/*/*/vspackage',
        '*://github.com/*/*/releases/download/*/*.vsix',
        '*://github.com/*/*/releases/download/*/*.vsix?*'
      ]
    });

    // ============ IDE 選擇選單 ============
    chrome.contextMenus.create({
      id: 'ide-switcher-parent',
      title: chrome.i18n.getMessage('menuSelectIde'),
      contexts: ['page', 'link', 'selection'],
    });

    // 建立各 IDE 選項
    IDE_OPTIONS.forEach((ide) => {
      chrome.contextMenus.create({
        id: `ide-${ide.id}`,
        parentId: 'ide-switcher-parent',
        title: ide.name,
        type: 'radio',
        contexts: ['page', 'link', 'selection'],
      });
    });

    // 初始化選中狀態
    updateMenuCheckState();
  });
}

/**
 * 更新選單的選中狀態和標題
 */
async function updateMenuCheckState() {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    const currentProtocol = normalizeProtocol(result[STORAGE_KEY]);
    const ideName = IDE_OPTIONS.find(i => i.id === currentProtocol)?.name || 'IDE';

    // 更新 VSIX 安裝選單標題
    chrome.contextMenus.update('install-vsix', {
      title: chrome.i18n.getMessage('menuInstallVsix', [ideName])
    });

    // 更新 radio 狀態
    IDE_OPTIONS.forEach((ide) => {
      chrome.contextMenus.update(`ide-${ide.id}`, {
        checked: ide.id === currentProtocol,
      });
    });
  } catch (error) {
    console.error('[IDE Switcher] Failed to update menu state:', error);
  }
}

/**
 * 從 VSIX URL 解析擴充套件資訊
 * 支援 Open VSX 格式: https://open-vsx.org/api/{namespace}/{name}/{version}/file
 * 或 https://open-vsx.org/api/{namespace}/{name}/{version}/file/{name}-{version}.vsix
 */
function parseExtensionFromVsixUrl(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Visual Studio Marketplace 資產 (gallery.vsassets.io)
    if (hostname.endsWith('.gallery.vsassets.io')) {
      const vsAssetsMatch = urlObj.pathname.match(
        /^\/_apis\/public\/gallery\/publisher\/([^/]+)\/extension\/([^/]+)\/([^/]+)\/assetbyname\/.+$/
      );
      if (vsAssetsMatch) {
        return {
          publisher: vsAssetsMatch[1],
          name: vsAssetsMatch[2],
          version: vsAssetsMatch[3]
        };
      }
    }

    // Visual Studio Marketplace API
    if (hostname === 'marketplace.visualstudio.com') {
      const marketplaceMatch = urlObj.pathname.match(
        /^\/_apis\/public\/gallery\/publishers\/([^/]+)\/vsextensions\/([^/]+)\/([^/]+)\/vspackage$/
      );
      if (marketplaceMatch) {
        return {
          publisher: marketplaceMatch[1],
          name: marketplaceMatch[2],
          version: marketplaceMatch[3]
        };
      }
    }

    // Open VSX 格式: /api/{namespace}/{name}/{version}/file/{filename}.vsix
    const openVsxMatch = urlObj.pathname.match(/^\/api\/([^/]+)\/([^/]+)\/([^/]+)\/file(?:\/([^/]+))?$/);
    if (openVsxMatch) {
      return {
        publisher: openVsxMatch[1],
        name: openVsxMatch[2],
        version: openVsxMatch[3]
      };
    }

    // 嘗試從檔案名解析: {publisher}.{name}-{version}.vsix
    const filename = urlObj.pathname.split('/').pop();
    if (filename) {
      const vsixMatch = filename.match(/^(.+)\.vsix$/i);
      if (vsixMatch) {
        const baseName = vsixMatch[1];
        const lastDash = baseName.lastIndexOf('-');
        const namePart = lastDash > 0 ? baseName.slice(0, lastDash) : baseName;
        const version = lastDash > 0 ? baseName.slice(lastDash + 1) : null;
        const dotIndex = namePart.indexOf('.');
        if (dotIndex > 0) {
          return {
            publisher: namePart.slice(0, dotIndex),
            name: namePart.slice(dotIndex + 1),
            version: version || undefined
          };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 取得協議前綴
 * Antigravity 使用 antigravity:// 格式（有雙斜線）
 * 其他 IDE 使用 protocol: 格式（無雙斜線）
 */
function getProtocolPrefix(protocol) {
  return protocol === 'antigravity' ? `${protocol}://` : `${protocol}:`;
}

/**
 * 建立擴充瀏覽 URL（開啟 Marketplace 頁面）
 * 格式: vscode:extension/{publisher}.{name}
 */
function buildExtensionViewUrl(protocol, extInfo) {
  if (!extInfo?.publisher || !extInfo?.name) {
    return null;
  }
  const extensionId = `${extInfo.publisher}.${extInfo.name}`;

  if (protocol === 'antigravity') {
    return `antigravity://${extensionId}`;
  }

  const prefix = getProtocolPrefix(protocol);
  return `${prefix}extension/${extensionId}`;
}

/**
 * 顯示安裝結果通知
 */
function showNotification(title, message, isError = false) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message,
    priority: isError ? 2 : 1
  });
}

/**
 * 處理選單項目點擊
 */
async function handleMenuClick(info, tab) {
  const menuId = info.menuItemId;

  // 處理 VSIX 安裝
  if (menuId === 'install-vsix' && info.linkUrl) {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    const protocol = result[STORAGE_KEY] || DEFAULT_PROTOCOL;
    const ideName = IDE_OPTIONS.find(i => i.id === protocol)?.name || protocol;

    const extInfo = parseExtensionFromVsixUrl(info.linkUrl);

    if (!extInfo) {
      // 無法解析擴充資訊，直接下載 VSIX 並顯示提示
      console.log(`[IDE Switcher] Cannot parse extension info, downloading VSIX: ${info.linkUrl}`);
      downloadVsixWithNotification(info.linkUrl, ideName);
      return;
    }

    const extensionId = `${extInfo.publisher}.${extInfo.name}`;

    // 嘗試透過 Native Host 安裝
    if (nativeHostAvailable === null) {
      await checkNativeHost();
    }

    if (nativeHostAvailable) {
      console.log(`[IDE Switcher] Installing ${extensionId} via Native Host...`);
      showNotification(
        chrome.i18n.getMessage('notificationInstalling') || 'Installing Extension',
        `${extensionId} → ${ideName}`
      );

      try {
        const installResult = await installViaHost(extensionId, protocol);
        console.log('[IDE Switcher] Install result:', installResult);
        showNotification(
          chrome.i18n.getMessage('notificationInstallSuccess') || 'Installation Successful',
          `${extensionId} ${chrome.i18n.getMessage('notificationInstalledTo') || 'installed to'} ${ideName}`
        );
      } catch (err) {
        console.error('[IDE Switcher] Install failed:', err);
        showNotification(
          chrome.i18n.getMessage('notificationInstallFailed') || 'Installation Failed',
          err.message,
          true
        );
        // 備援：下載 VSIX
        downloadVsixWithNotification(info.linkUrl, ideName);
      }
    } else {
      // Native Host 不可用，使用 protocol URL 或下載備援
      console.log('[IDE Switcher] Native Host not available, using fallback...');

      // 嘗試使用 protocol URL (對於支援的 IDE)
      const viewUrl = buildExtensionViewUrl(protocol, extInfo);
      if (viewUrl) {
        // 非 Antigravity 的 IDE 可能支援 protocol URL
        console.log(`[IDE Switcher] Trying protocol URL: ${viewUrl}`);
        chrome.tabs.update(tab.id, { url: viewUrl });
      } else {
        // Antigravity 或其他情況：下載 VSIX
        downloadVsixWithNotification(info.linkUrl, ideName);
      }
    }
    return;
  }

  // 處理 IDE 選擇
  if (menuId.startsWith('ide-')) {
    const protocol = menuId.replace('ide-', '');

    try {
      await chrome.storage.sync.set({ [STORAGE_KEY]: protocol });
      console.log(`[IDE Switcher] Switched to: ${protocol}`);

      // 更新選單狀態
      await updateMenuCheckState();
    } catch (error) {
      console.error('[IDE Switcher] Failed to save settings:', error);
    }
  }
}

/**
 * 下載 VSIX 並顯示安裝提示
 */
function downloadVsixWithNotification(url, ideName) {
  chrome.downloads.download({ url }, () => {
    if (chrome.runtime.lastError) {
      console.error('[IDE Switcher] Download failed:', chrome.runtime.lastError);
      return;
    }

    showNotification(
      chrome.i18n.getMessage('notificationVsixDownloaded') || 'VSIX Downloaded',
      chrome.i18n.getMessage('notificationVsixInstallHint', [ideName]) ||
      `Use "${ideName} --install-extension <path>" to install.`
    );
  });
}

/**
 * 處理來自 content script 的擴充功能安裝請求
 */
async function handleInstallRequest(extensionId) {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const protocol = result[STORAGE_KEY] || DEFAULT_PROTOCOL;
  const ideName = IDE_OPTIONS.find(i => i.id === protocol)?.name || protocol;

  // 檢查 Native Host
  if (nativeHostAvailable === null) {
    await checkNativeHost();
  }

  if (nativeHostAvailable) {
    console.log(`[IDE Switcher] Installing ${extensionId} via Native Host...`);
    showNotification(
      chrome.i18n.getMessage('notificationInstalling') || 'Installing Extension',
      `${extensionId} → ${ideName}`
    );

    try {
      await installViaHost(extensionId, protocol);
      showNotification(
        chrome.i18n.getMessage('notificationInstallSuccess') || 'Installation Successful',
        `${extensionId} ${chrome.i18n.getMessage('notificationInstalledTo') || 'installed to'} ${ideName}`
      );
      return { success: true };
    } catch (err) {
      console.error('[IDE Switcher] Install failed:', err);
      showNotification(
        chrome.i18n.getMessage('notificationInstallFailed') || 'Installation Failed',
        err.message,
        true
      );
      return { success: false, error: err.message };
    }
  } else {
    // Native Host 不可用，返回提示
    return {
      success: false,
      error: 'Native Host not installed',
      hint: 'Please run the install script in native-host folder first.'
    };
  }
}

// 監聽來自 content script 的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'installExtension' && request.extensionId) {
    handleInstallRequest(request.extensionId)
      .then(sendResponse)
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // 保持 sendResponse 有效
  }

  if (request.action === 'checkNativeHost') {
    checkNativeHost().then(available => {
      sendResponse({ available });
    });
    return true;
  }

  // 檢查單一 IDE 協議註冊狀態
  if (request.action === 'checkIDERegistration' && request.protocol) {
    checkIDERegistration(request.protocol)
      .then(sendResponse)
      .catch(err => sendResponse({ registered: false, error: err.message }));
    return true;
  }

  // 批量檢查所有 IDE 註冊狀態
  if (request.action === 'checkAllIDERegistrations') {
    checkAllIDERegistrations()
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  // 請求註冊 IDE 協議
  if (request.action === 'registerProtocol' && request.protocol) {
    requestIDERegistration(request.protocol, request.execPath)
      .then(sendResponse)
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// 監聽擴充功能安裝/更新
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[IDE Switcher] Extension installed/updated');
  // 先執行修正（處理未知/過期協議值）
  await migrateProtocolIfNeeded();
  createContextMenus();
  // 檢查 Native Host 狀態
  await checkNativeHost();
});

// 監聽選單點擊
chrome.contextMenus.onClicked.addListener(handleMenuClick);

// 監聽設定變更（同步選單狀態）
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes[STORAGE_KEY]) {
    updateMenuCheckState();
  }
});
