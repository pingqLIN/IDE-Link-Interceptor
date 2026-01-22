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
   * 更新攔截器狀態 (傳遞給 Main World 的 interceptor.js)
   */
  function updateInterceptorState() {
    document.documentElement.dataset.ideTargetProtocol = targetProtocol;
  }

  /**
   * 監聽設定變更
   */
  function listenForSettingsChanges() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes[STORAGE_KEY]) {
        targetProtocol = changes[STORAGE_KEY].newValue || DEFAULT_PROTOCOL;
        console.log(`[IDE Switcher] 設定已更新，目標 IDE: ${targetProtocol}`);
        // 更新 dataset 供 interceptor.js 讀取
        updateInterceptorState();
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
    updateInterceptorState(); // 初始化 dataset
    listenForSettingsChanges();

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

