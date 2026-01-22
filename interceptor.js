/**
 * VS Code IDE Switcher - Interceptor Script (Main World)
 * 
 * 此腳本運行在頁面的 Main World 中，負責攔截：
 * 1. window.location 的變更
 * 2. window.open 調用
 * 
 * 設定值由 content.js (Isolated World) 透過 HTML dataset 傳遞
 */

(function () {
  'use strict';

  const VSCODE_PROTOCOLS = ['vscode:', 'vscode-insiders:', 'cursor:', 'windsurf:', 'vscodium:', 'antigraavity:'];
  const VSCODE_DEV_PATTERNS = ['vscode.dev/redirect', 'insiders.vscode.dev/redirect'];

  // 從 dataset 讀取目標協議，預設為 antigraavity
  function getTargetProtocol() {
    return document.documentElement.dataset.ideTargetProtocol || 'antigraavity';
  }

  // 檢查是否為 VS Code 協議 URL
  function isVSCodeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return VSCODE_PROTOCOLS.some(protocol => url.startsWith(protocol));
  }

  // 檢查是否為 vscode.dev 重定向連結
  function isVSCodeDevUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return VSCODE_DEV_PATTERNS.some(pattern => url.includes(pattern));
  }

  // 轉換 VS Code 協議 URL
  function convertVSCodeUrl(url) {
    const targetProtocol = getTargetProtocol();
    if (url.startsWith(targetProtocol + ':')) return url;

    for (const protocol of VSCODE_PROTOCOLS) {
      if (url.startsWith(protocol)) {
        return url.replace(protocol, targetProtocol + ':');
      }
    }
    return url;
  }

  // 轉換 vscode.dev 重定向連結 (支援兩種格式)
  function convertVSCodeDevUrl(url) {
    const targetProtocol = getTargetProtocol();
    try {
      const urlObj = new URL(url);

      // 格式 1: url 參數 (GitHub MCP Registry 使用)
      const urlParam = urlObj.searchParams.get('url');
      if (urlParam) {
        const decodedUrl = decodeURIComponent(urlParam);
        for (const protocol of VSCODE_PROTOCOLS) {
          if (decodedUrl.startsWith(protocol)) {
            return decodedUrl.replace(protocol, targetProtocol + ':');
          }
        }
        if (decodedUrl.startsWith(targetProtocol + ':')) {
          return decodedUrl;
        }
        return decodedUrl;
      }

      // 格式 2: 路徑格式
      const path = urlObj.pathname.replace('/redirect', '');
      const queryString = urlObj.search;
      return targetProtocol + ':' + path + queryString;
    } catch (e) {
      console.error('[IDE Switcher] 轉換失敗:', e);
      return null;
    }
  }

  // 統一處理 URL 轉換
  function processUrl(url) {
    if (isVSCodeDevUrl(url)) {
      return convertVSCodeDevUrl(url);
    }
    if (isVSCodeUrl(url)) {
      return convertVSCodeUrl(url);
    }
    return url;
  }

  // 檢查是否需要處理
  function needsInterception(url) {
    return isVSCodeUrl(url) || isVSCodeDevUrl(url);
  }

  // 攔截 window.location.href 設定
  const originalDescriptor = Object.getOwnPropertyDescriptor(window.location.__proto__, 'href') ||
        Object.getOwnPropertyDescriptor(window.Location.prototype, 'href');

  if (originalDescriptor && originalDescriptor.set) {
    Object.defineProperty(window.location, 'href', {
      get: originalDescriptor.get,
      set: function (value) {
        if (needsInterception(value)) {
          const newUrl = processUrl(value);
          if (newUrl && newUrl !== value) {
            console.log('[IDE Switcher] 攔截 JS 導航: ' + value);
            console.log('[IDE Switcher] 重定向至: ' + newUrl);
            value = newUrl;
          }
        }
        originalDescriptor.set.call(this, value);
      },
      configurable: true
    });
  }

  // 攔截 window.location.assign
  const originalAssign = window.location.assign;
  window.location.assign = function (url) {
    if (needsInterception(url)) {
      const newUrl = processUrl(url);
      if (newUrl && newUrl !== url) {
        console.log('[IDE Switcher] 攔截 assign: ' + url);
        console.log('[IDE Switcher] 重定向至: ' + newUrl);
        url = newUrl;
      }
    }
    return originalAssign.call(this, url);
  };

  // 攔截 window.location.replace
  const originalReplace = window.location.replace;
  window.location.replace = function (url) {
    if (needsInterception(url)) {
      const newUrl = processUrl(url);
      if (newUrl && newUrl !== url) {
        console.log('[IDE Switcher] 攔截 replace: ' + url);
        console.log('[IDE Switcher] 重定向至: ' + newUrl);
        url = newUrl;
      }
    }
    return originalReplace.call(this, url);
  };

  // 攔截 window.open
  const originalOpen = window.open;
  window.open = function (url, ...args) {
    if (needsInterception(url)) {
      const newUrl = processUrl(url);
      if (newUrl && newUrl !== url) {
        console.log('[IDE Switcher] 攔截 window.open: ' + url);
        console.log('[IDE Switcher] 重定向至: ' + newUrl);
        url = newUrl;
      }
    }
    return originalOpen.call(this, url, ...args);
  };

  console.log('[IDE Switcher] JS 攔截器已就緒');
})();
