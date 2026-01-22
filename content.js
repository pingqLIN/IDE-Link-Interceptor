/**
 * VS Code IDE Switcher - Content Script
 * 
 * 攔截 vscode:// 和 vscode-insiders:// 協議連結，
 * 根據用戶設定轉換為目標 IDE 協議。
 * 
 * 支援兩種攔截方式：
 * 1. 標準 <a> 連結點擊
 * 2. JavaScript 動態觸發的協議導航（如 GitHub MCP）
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'selectedProtocol';
  const DEFAULT_PROTOCOL = 'antigraavity';

  // 支援攔截的 IDE 協議前綴（包含競爭 IDE）
  const VSCODE_PROTOCOLS = [
    'vscode:',
    'vscode-insiders:',
    'cursor:',
    'windsurf:',
    'vscodium:'
  ];

  // 支援攔截的 vscode.dev 重定向網址模式 (GitHub MCP 使用)
  const VSCODE_DEV_REDIRECT_PATTERNS = [
    'vscode.dev/redirect',
    'insiders.vscode.dev/redirect'
  ];

  // 當前選擇的目標協議
  let targetProtocol = DEFAULT_PROTOCOL;

  // 舊協議 ID 到新協議 ID 的映射（用於遷移）
  const PROTOCOL_MIGRATION_MAP = {
    'antigravity': 'antigraavity'
  };

  /**
   * 從 storage 載入用戶設定（含遷移邏輯）
   */
  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEY);
      let protocol = result[STORAGE_KEY] || DEFAULT_PROTOCOL;

      // 自動遷移舊的協議 ID
      if (PROTOCOL_MIGRATION_MAP[protocol]) {
        const newProtocol = PROTOCOL_MIGRATION_MAP[protocol];
        console.log(`[IDE Switcher] 遷移協議: ${protocol} -> ${newProtocol}`);
        await chrome.storage.sync.set({ [STORAGE_KEY]: newProtocol });
        protocol = newProtocol;
      }

      targetProtocol = protocol;
      console.log(`[IDE Switcher] 目標 IDE: ${targetProtocol}`);
    } catch (error) {
      console.error('[IDE Switcher] 載入設定失敗:', error);
      targetProtocol = DEFAULT_PROTOCOL;
    }
  }

  /**
   * 監聽設定變更
   */
  function listenForSettingsChanges() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes[STORAGE_KEY]) {
        targetProtocol = changes[STORAGE_KEY].newValue || DEFAULT_PROTOCOL;
        console.log(`[IDE Switcher] 設定已更新，目標 IDE: ${targetProtocol}`);
        // 更新注入腳本中的設定
        injectInterceptorScript();
      }
    });
  }

  /**
   * 檢查 URL 是否為 VS Code 協議
   */
  function isVSCodeUrl(url) {
    if (!url) return false;
    return VSCODE_PROTOCOLS.some(protocol => url.startsWith(protocol));
  }

  /**
   * 檢查 URL 是否為 vscode.dev 重定向連結 (GitHub MCP 使用)
   */
  function isVSCodeDevRedirectUrl(url) {
    if (!url) return false;
    return VSCODE_DEV_REDIRECT_PATTERNS.some(pattern => url.includes(pattern));
  }

  /**
   * 將 vscode.dev 重定向連結轉換為目標 IDE 協議
   * 
   * 支援兩種格式：
   * 格式 1: https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F...
   *         (GitHub MCP Registry 使用此格式，url 參數包含完整 vscode: 連結)
   * 格式 2: https://insiders.vscode.dev/redirect/mcp/install?name=github&config={...}
   *         (路徑格式)
   */
  function convertVSCodeDevToProtocol(url) {
    try {
      const urlObj = new URL(url);

      // 格式 1: 檢查是否有 url 參數（GitHub MCP Registry 使用）
      const urlParam = urlObj.searchParams.get('url');
      if (urlParam) {
        // 解碼 url 參數，取得實際的 vscode: 連結
        const decodedUrl = decodeURIComponent(urlParam);
        console.log(`[IDE Switcher] 解碼的 vscode 連結: ${decodedUrl}`);

        // 替換協議 (vscode: 或 vscode-insiders: → 目標協議)
        for (const protocol of VSCODE_PROTOCOLS) {
          if (decodedUrl.startsWith(protocol)) {
            return decodedUrl.replace(protocol, `${targetProtocol}:`);
          }
        }
        // 如果已經是目標協議，直接返回
        if (decodedUrl.startsWith(`${targetProtocol}:`)) {
          return decodedUrl;
        }
        return decodedUrl;
      }

      // 格式 2: 路徑格式 (/redirect/mcp/install?...)
      const path = urlObj.pathname.replace('/redirect', '');
      const queryString = urlObj.search;
      return `${targetProtocol}:${path}${queryString}`;
    } catch (error) {
      console.error('[IDE Switcher] 轉換 vscode.dev 連結失敗:', error);
      return null;
    }
  }

  /**
   * 將 VS Code URL 轉換為目標協議 URL
   */
  function convertToTargetUrl(url) {
    if (url.startsWith(`${targetProtocol}:`)) {
      return url;
    }
    for (const protocol of VSCODE_PROTOCOLS) {
      if (url.startsWith(protocol)) {
        return url.replace(protocol, `${targetProtocol}:`);
      }
    }
    return url;
  }

  /**
   * 處理連結點擊事件
   */
  function handleClick(event) {
    const link = event.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href') || link.href;

    // 處理 vscode.dev 重定向連結 (GitHub MCP 使用)
    if (isVSCodeDevRedirectUrl(href)) {
      const targetUrl = convertVSCodeDevToProtocol(href);
      if (!targetUrl) return;

      event.preventDefault();
      event.stopPropagation();

      console.log(`[IDE Switcher] 攔截 vscode.dev 連結: ${href}`);
      console.log(`[IDE Switcher] 重定向至: ${targetUrl}`);

      window.location.href = targetUrl;
      return;
    }

    // 處理標準 vscode:// 協議連結
    if (!isVSCodeUrl(href)) return;

    const targetUrl = convertToTargetUrl(href);
    if (targetUrl === href) {
      console.log(`[IDE Switcher] 保持原連結: ${href}`);
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    console.log(`[IDE Switcher] 攔截連結: ${href}`);
    console.log(`[IDE Switcher] 重定向至: ${targetUrl}`);

    window.location.href = targetUrl;
  }

  /**
   * 注入攔截腳本到頁面上下文
   * 這是為了攔截 JavaScript 動態觸發的 vscode:// 導航
   * （如 GitHub MCP 頁面的 Install in VS Code 按鈕）
   */
  function injectInterceptorScript() {
    // 移除舊的注入腳本
    const oldScript = document.getElementById('ide-switcher-interceptor');
    if (oldScript) {
      oldScript.remove();
    }

    const script = document.createElement('script');
    script.id = 'ide-switcher-interceptor';
    script.textContent = `
      (function() {
        const TARGET_PROTOCOL = '${targetProtocol}';
        const VSCODE_PROTOCOLS = ['vscode:', 'vscode-insiders:', 'cursor:', 'windsurf:', 'vscodium:', 'antigraavity:'];
        const VSCODE_DEV_PATTERNS = ['vscode.dev/redirect', 'insiders.vscode.dev/redirect'];
        
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
          if (url.startsWith(TARGET_PROTOCOL + ':')) return url;
          for (const protocol of VSCODE_PROTOCOLS) {
            if (url.startsWith(protocol)) {
              return url.replace(protocol, TARGET_PROTOCOL + ':');
            }
          }
          return url;
        }
        
        // 轉換 vscode.dev 重定向連結 (支援兩種格式)
        function convertVSCodeDevUrl(url) {
          try {
            const urlObj = new URL(url);
            
            // 格式 1: url 參數 (GitHub MCP Registry 使用)
            const urlParam = urlObj.searchParams.get('url');
            if (urlParam) {
              const decodedUrl = decodeURIComponent(urlParam);
              console.log('[IDE Switcher] 解碼的 vscode 連結:', decodedUrl);
              for (const protocol of VSCODE_PROTOCOLS) {
                if (decodedUrl.startsWith(protocol)) {
                  return decodedUrl.replace(protocol, TARGET_PROTOCOL + ':');
                }
              }
              if (decodedUrl.startsWith(TARGET_PROTOCOL + ':')) {
                return decodedUrl;
              }
              return decodedUrl;
            }
            
            // 格式 2: 路徑格式
            const path = urlObj.pathname.replace('/redirect', '');
            const queryString = urlObj.search;
            return TARGET_PROTOCOL + ':' + path + queryString;
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
            set: function(value) {
              if (needsInterception(value)) {
                const newUrl = processUrl(value);
                if (newUrl && newUrl !== value) {
                  console.log('[IDE Switcher] 攔截 JS 導航: ' + value);
                  console.log('[IDE Switcher] 重定向至: ' + newUrl);
                  value = newUrl;
                }
              }
              return originalDescriptor.set.call(this, value);
            },
            configurable: true
          });
        }

        // 攔截 window.location.assign
        const originalAssign = window.location.assign;
        window.location.assign = function(url) {
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
        window.location.replace = function(url) {
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
        window.open = function(url, ...args) {
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

        console.log('[IDE Switcher] JS 攔截器已注入，目標: ' + TARGET_PROTOCOL);
      })();
    `;

    // 盡早注入腳本
    (document.head || document.documentElement).appendChild(script);
  }

  /**
   * 處理動態添加的連結
   */
  function observeNewLinks() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const links = node.querySelectorAll ?
                node.querySelectorAll('a[href^="vscode:"], a[href^="vscode-insiders:"], a[href^="cursor:"], a[href^="windsurf:"], a[href^="vscodium:"]') : [];

              links.forEach(link => {
                if (!link.dataset.ideSwitcherProcessed) {
                  link.dataset.ideSwitcherProcessed = 'true';
                }
              });
            }
          });
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  /**
   * 初始化
   */
  async function init() {
    await loadSettings();
    listenForSettingsChanges();

    // 注入 JS 攔截器（攔截動態導航）
    injectInterceptorScript();

    // 監聯連結點擊（攔截標準 <a> 連結）
    document.addEventListener('click', handleClick, true);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', observeNewLinks);
    } else {
      observeNewLinks();
    }

    console.log('[IDE Switcher] 擴充功能已載入');
  }

  init();
})();
