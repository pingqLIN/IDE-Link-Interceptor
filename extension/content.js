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
  const DEFAULT_PROTOCOL = 'antigravity';

  const SUPPORTED_PROTOCOLS = new Set([
    'vscode',
    'vscode-insiders',
    'antigravity',
    'cursor',
    'windsurf'
  ]);

  // 支援攔截的 IDE 協議前綴（包含競爭 IDE）
  const VSCODE_PROTOCOLS = [
    'vscode:',
    'vscode-insiders:',
    'antigravity:',
    'cursor:',
    'windsurf:',
    'vscodium:'
  ];

  // 支援攔截的 vscode.dev 重定向網址模式 (GitHub MCP 使用)
  const VSCODE_DEV_REDIRECT_PATTERNS = [
    'vscode.dev/redirect',
    'insiders.vscode.dev/redirect'
  ];

  const VSCODE_EXTENSION_SCHEMES = new Set(['vscode', 'vscode-insiders']);

  // MCP 伺服器名稱到 GitHub 倉庫的映射
  const MCP_REPO_MAP = {
    'huggingface': 'https://github.com/huggingface/hf-mcp-server',
    'hf-mcp-server': 'https://github.com/huggingface/hf-mcp-server'
  };

  // 避免破壞 OAuth/登入流程（例如 GitHub Copilot / GitHub Auth 回呼）
  // 典型回呼：vscode://vscode.github-authentication/did-authenticate?code=...&state=...
  function isAuthCallbackUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const match = url.match(/^([^:]+):\/\/([^/]+)\//) || url.match(/^([^:]+):([^/]+)\//);
    const provider = (match?.[2] || '').toLowerCase();
    return provider.includes('authentication');
  }

  /**
   * 取得協議前綴
   * Antigravity 使用 antigravity:// 格式（有雙斜線）
   * 其他 IDE 使用 protocol: 格式（無雙斜線）
   */
  function getProtocolPrefix() {
    return targetProtocol === 'antigravity' ? `${targetProtocol}://` : `${targetProtocol}:`;
  }

  // 當前選擇的目標協議
  let targetProtocol = DEFAULT_PROTOCOL;

  /**
   * 從 storage 載入用戶設定（含遷移邏輯）
   */
  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEY);
      let protocol = result[STORAGE_KEY] || DEFAULT_PROTOCOL;
      if (!SUPPORTED_PROTOCOLS.has(protocol)) {
        console.log(`[IDE Switcher] 修正協議: ${protocol} -> ${DEFAULT_PROTOCOL}`);
        await chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_PROTOCOL });
        protocol = DEFAULT_PROTOCOL;
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
        const nextProtocol = changes[STORAGE_KEY].newValue || DEFAULT_PROTOCOL;
        targetProtocol = SUPPORTED_PROTOCOLS.has(nextProtocol) ? nextProtocol : DEFAULT_PROTOCOL;
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
    * 檢查 URL 是否為 MCP URL
    * 支援兩種格式：
    * 1. vscode:mcp/by-name/{name}
    * 2. vscode:mcp/api.mcp.github.com/.../servers/{id}/{name}
    */
  function isMcpUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return /^(vscode|vscode-insiders):mcp\//.test(url);
  }

  /**
    * 從 MCP URL 提取服務器名稱
    * 支援兩種格式的提取：
    * 1. vscode:mcp/by-name/huggingface → "huggingface"
    * 2. vscode:mcp/api.mcp.github.com/.../servers/huggingface/hf-mcp-server → "hf-mcp-server"
    * 
    * @returns {string|null} 服務器名稱，如果格式不符則返回 null
    */
  function extractMcpServerName(url) {
    if (!isMcpUrl(url)) return null;

    try {
      // 格式 1: vscode:mcp/by-name/{name}
      const byNameMatch = url.match(/^(vscode|vscode-insiders):mcp\/by-name\/([^/?#]+)/);
      if (byNameMatch) {
        return byNameMatch[2];
      }

      // 格式 2: vscode:mcp/api.mcp.github.com/.../servers/{id}/{name}
      const apiMatch = url.match(/^(vscode|vscode-insiders):mcp\/api\.mcp\.github\.com.*\/servers\/[^/]+\/([^/?#]+)/);
      if (apiMatch) {
        return apiMatch[2];
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
    * 判斷是否為 VSIX 下載連結
    */
  function isVsixUrl(url) {
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') return false;
      const hostname = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname.toLowerCase();

      if (pathname.endsWith('.vsix')) return true;

      if (hostname === 'open-vsx.org' || hostname.endsWith('.open-vsx.org')) {
        if (/^\/api\/[^/]+\/[^/]+\/[^/]+\/file/.test(pathname)) return true;
      }

      if (hostname.endsWith('.gallery.vsassets.io')) {
        if (/^\/_apis\/public\/gallery\/publisher\/[^/]+\/extension\/[^/]+\/[^/]+\/assetbyname\//.test(pathname)) {
          return true;
        }
      }

      if (hostname === 'marketplace.visualstudio.com') {
        if (/^\/_apis\/public\/gallery\/publishers\/[^/]+\/vsextensions\/[^/]+\/[^/]+\/vspackage$/.test(pathname)) {
          return true;
        }
      }

      if (hostname === 'github.com') {
        if (/^\/[^/]+\/[^/]+\/releases\/download\/[^/]+\/.+\.vsix$/.test(pathname)) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * 從 VSIX URL 解析擴充套件資訊
   */
  function parseExtensionFromVsixUrl(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      if (hostname.endsWith('.gallery.vsassets.io')) {
        const vsAssetsMatch = urlObj.pathname.match(
          /^\/_apis\/public\/gallery\/publisher\/([^/]+)\/extension\/([^/]+)\/([^/]+)\/assetbyname\/.+$/
        );
        if (vsAssetsMatch) {
          return { publisher: vsAssetsMatch[1], name: vsAssetsMatch[2], version: vsAssetsMatch[3] };
        }
      }

      if (hostname === 'marketplace.visualstudio.com') {
        const marketplaceMatch = urlObj.pathname.match(
          /^\/_apis\/public\/gallery\/publishers\/([^/]+)\/vsextensions\/([^/]+)\/([^/]+)\/vspackage$/
        );
        if (marketplaceMatch) {
          return { publisher: marketplaceMatch[1], name: marketplaceMatch[2], version: marketplaceMatch[3] };
        }
      }

      const openVsxMatch = urlObj.pathname.match(/^\/api\/([^/]+)\/([^/]+)\/([^/]+)\/file(?:\/([^/]+))?$/);
      if (openVsxMatch) {
        return { publisher: openVsxMatch[1], name: openVsxMatch[2], version: openVsxMatch[3] };
      }

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
   * 依照規範建立 VSIX 安裝協議 URL
   */
  function buildVsixInstallUrl(protocol, vsixUrl, extInfo) {
    const params = new URLSearchParams({ url: vsixUrl });
    if (extInfo?.publisher && extInfo?.name) {
      params.set('name', `${extInfo.publisher}.${extInfo.name}`);
    }
    if (extInfo?.version) {
      params.set('version', extInfo.version);
    }
    return `${protocol}://extension/install?${params.toString()}`;
  }

  function parseVSCodeExtensionId(url) {
    const match = url.match(/^([^:]+):(\/\/)?extension\/([^?#]+)/);
    if (!match) return null;
    const scheme = match[1];
    if (!VSCODE_EXTENSION_SCHEMES.has(scheme)) return null;
    return match[3];
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

        // OAuth/登入回呼不轉換，避免破壞 IDE 的認證流程
        if (isAuthCallbackUrl(decodedUrl)) {
          console.log('[IDE Switcher] 偵測到認證回呼連結，略過轉換');
          return decodedUrl;
        }

        // 替換協議 (vscode: 或 vscode-insiders: → 目標協議)
        for (const protocol of VSCODE_PROTOCOLS) {
          if (decodedUrl.startsWith(protocol)) {
            // 移除來源協議，取得路徑部分
            const path = decodedUrl.slice(protocol.length);
            return `${getProtocolPrefix()}${path}`;
          }
        }
        // 如果已經是目標協議，直接返回
        if (decodedUrl.startsWith(`${targetProtocol}:`) || decodedUrl.startsWith(`${targetProtocol}://`)) {
          return decodedUrl;
        }
        return decodedUrl;
      }

      // 格式 2: 路徑格式 (/redirect/mcp/install?...)
      const path = urlObj.pathname.replace('/redirect', '');
      const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
      const queryString = urlObj.search;
      // 所有路徑都使用統一的協議前綴
      return `${getProtocolPrefix()}${normalizedPath}${queryString}`;
    } catch (error) {
      console.error('[IDE Switcher] 轉換 vscode.dev 連結失敗:', error);
      return null;
    }
  }

  /**
   * 將 VS Code URL 轉換為目標協議 URL
   */
  function convertToTargetUrl(url) {
    // OAuth/登入回呼不轉換，避免破壞 IDE 的認證流程
    if (isAuthCallbackUrl(url)) {
      return url;
    }
    // 已經是目標協議
    if (url.startsWith(`${targetProtocol}:`) || url.startsWith(`${targetProtocol}://`)) {
      return url;
    }
    // 替換來源協議為目標協議
    for (const protocol of VSCODE_PROTOCOLS) {
      if (url.startsWith(protocol)) {
        // 移除來源協議，取得路徑部分
        const path = url.slice(protocol.length);
        // 根據目標協議格式重建 URL
        return `${getProtocolPrefix()}${path}`;
      }
    }
    return url;
  }

  /**
    * 建立並顯示 MCP 安裝說明模態框
    */
  function createMcpInstructionModal(serverName, repoUrl) {
    const modalId = 'ide-switcher-mcp-modal';
     
    // 檢查模態框是否已存在
    if (document.getElementById(modalId)) {
      return document.getElementById(modalId);
    }

    // 建立模態框 HTML
    const modalHTML = `
       <div id="${modalId}" class="ide-switcher-mcp-modal-overlay">
         <div class="ide-switcher-mcp-modal">
           <div class="ide-switcher-mcp-modal-header">
             <h2>MCP 伺服器安裝指南 for Antigravity</h2>
             <button class="ide-switcher-mcp-modal-close" aria-label="關閉">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <line x1="18" y1="6" x2="6" y2="18"></line>
                 <line x1="6" y1="6" x2="18" y2="18"></line>
               </svg>
             </button>
           </div>
           <div class="ide-switcher-mcp-modal-content">
             <p class="ide-switcher-mcp-modal-intro">
               Antigravity 不支援 MCP URL 協議處理程式。您已被重定向到 GitHub 倉庫。
             </p>

             <h3>安裝方法 1: MCP Store (推薦)</h3>
             <ol>
               <li>開啟 Antigravity</li>
               <li>點擊 "..." → "MCP Store"</li>
               <li>搜尋 "<strong>${serverName}</strong>"</li>
               <li>點擊「安裝」</li>
             </ol>

             <h3>安裝方法 2: 手動設定</h3>
             <p>編輯 <code>~/.gemini/antigravity/mcp_config.json</code> 並新增伺服器設定。</p>
             <p>詳細的設定說明請參閱 <a href="${repoUrl}" target="_blank" class="ide-switcher-mcp-modal-link">GitHub 倉庫</a>。</p>

             <div class="ide-switcher-mcp-modal-footer">
               <a href="${repoUrl}" target="_blank" class="ide-switcher-mcp-modal-button">
                 檢視 GitHub 倉庫
               </a>
               <label class="ide-switcher-mcp-modal-checkbox">
                 <input type="checkbox" id="ide-switcher-mcp-dont-show-again">
                 <span>不要再顯示</span>
               </label>
             </div>
           </div>
         </div>
       </div>
     `;

    // 建立容器並插入 DOM
    const container = document.createElement('div');
    container.innerHTML = modalHTML;
    const modal = container.firstElementChild;
     
    // 注入 CSS 樣式
    injectModalStyles();

    // 新增事件監聽器
    const closeBtn = modal.querySelector('.ide-switcher-mcp-modal-close');
    const overlay = modal.querySelector('.ide-switcher-mcp-modal-overlay');
    const dontShowCheckbox = modal.querySelector('#ide-switcher-mcp-dont-show-again');

    closeBtn.addEventListener('click', () => {
      modal.remove();
      if (dontShowCheckbox.checked) {
        chrome.storage.sync.set({ mcpInstructionModalDismissed: true });
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        modal.remove();
        if (dontShowCheckbox.checked) {
          chrome.storage.sync.set({ mcpInstructionModalDismissed: true });
        }
      }
    });

    return modal;
  }

  /**
    * 注入模態框 CSS 樣式
    */
  function injectModalStyles() {
    const styleId = 'ide-switcher-mcp-modal-styles';
    if (document.getElementById(styleId)) {
      return; // 樣式已注入
    }

    const styles = `
       .ide-switcher-mcp-modal-overlay {
         position: fixed;
         top: 0;
         left: 0;
         right: 0;
         bottom: 0;
         background-color: rgba(0, 0, 0, 0.5);
         display: flex;
         align-items: center;
         justify-content: center;
         z-index: 10000;
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
       }

       .ide-switcher-mcp-modal {
         background-color: white;
         border-radius: 8px;
         box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
         max-width: 600px;
         width: 90%;
         max-height: 80vh;
         overflow-y: auto;
       }

       .ide-switcher-mcp-modal-header {
         padding: 20px;
         border-bottom: 1px solid #e1e4e8;
         display: flex;
         justify-content: space-between;
         align-items: center;
       }

       .ide-switcher-mcp-modal-header h2 {
         margin: 0;
         font-size: 18px;
         font-weight: 600;
         color: #24292e;
       }

       .ide-switcher-mcp-modal-close {
         background: none;
         border: none;
         cursor: pointer;
         padding: 4px;
         display: flex;
         align-items: center;
         justify-content: center;
         color: #6a737d;
         transition: color 0.2s;
       }

       .ide-switcher-mcp-modal-close:hover {
         color: #24292e;
       }

       .ide-switcher-mcp-modal-content {
         padding: 20px;
         color: #24292e;
         line-height: 1.6;
       }

       .ide-switcher-mcp-modal-intro {
         margin: 0 0 20px 0;
         font-size: 14px;
         color: #586069;
         padding: 12px;
         background-color: #f6f8fa;
         border-radius: 4px;
       }

       .ide-switcher-mcp-modal-content h3 {
         margin: 20px 0 10px 0;
         font-size: 15px;
         font-weight: 600;
       }

       .ide-switcher-mcp-modal-content ol {
         margin: 10px 0 20px 20px;
         padding: 0;
       }

       .ide-switcher-mcp-modal-content li {
         margin-bottom: 8px;
         font-size: 14px;
       }

       .ide-switcher-mcp-modal-content code {
         background-color: #f6f8fa;
         border-radius: 3px;
         padding: 2px 6px;
         font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
         font-size: 13px;
         color: #24292e;
       }

       .ide-switcher-mcp-modal-link {
         color: #0366d6;
         text-decoration: none;
         border-bottom: 1px solid transparent;
         transition: color 0.2s, border-bottom 0.2s;
       }

       .ide-switcher-mcp-modal-link:hover {
         color: #0256c7;
         border-bottom-color: #0366d6;
       }

       .ide-switcher-mcp-modal-footer {
         margin-top: 20px;
         padding-top: 20px;
         border-top: 1px solid #e1e4e8;
         display: flex;
         justify-content: space-between;
         align-items: center;
       }

       .ide-switcher-mcp-modal-button {
         display: inline-block;
         padding: 8px 16px;
         background-color: #28a745;
         color: white;
         text-decoration: none;
         border-radius: 4px;
         font-size: 14px;
         font-weight: 600;
         transition: background-color 0.2s;
         cursor: pointer;
       }

       .ide-switcher-mcp-modal-button:hover {
         background-color: #218838;
       }

       .ide-switcher-mcp-modal-checkbox {
         display: flex;
         align-items: center;
         gap: 8px;
         cursor: pointer;
         font-size: 13px;
         user-select: none;
       }

       .ide-switcher-mcp-modal-checkbox input[type="checkbox"] {
         cursor: pointer;
         margin: 0;
         width: 16px;
         height: 16px;
       }

       @media (max-width: 600px) {
         .ide-switcher-mcp-modal {
           width: 95%;
         }

         .ide-switcher-mcp-modal-footer {
           flex-direction: column;
           gap: 12px;
           align-items: stretch;
         }

         .ide-switcher-mcp-modal-button {
           width: 100%;
           text-align: center;
         }
       }
     `;

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }

  /**
    * 顯示 MCP 安裝說明模態框
    */
  async function showMcpInstructionModal(serverName, repoUrl) {
    // 檢查用戶是否已設定不再顯示
    try {
      const result = await chrome.storage.sync.get('mcpInstructionModalDismissed');
      if (result.mcpInstructionModalDismissed) {
        console.log('[IDE Switcher] 使用者已設定不再顯示 MCP 安裝說明');
        // 直接重定向到 GitHub
        window.location.href = repoUrl;
        return;
      }
    } catch (error) {
      console.error('[IDE Switcher] 無法讀取儲存設定:', error);
    }

    // 建立並顯示模態框
    const modal = createMcpInstructionModal(serverName, repoUrl);
    document.body.appendChild(modal);

    // 等待用戶關閉模態框時重定向
    const checkModalRemoved = setInterval(() => {
      if (!document.body.contains(modal)) {
        clearInterval(checkModalRemoved);
        // 延遲重定向，避免與模態框關閉動作衝突
        setTimeout(() => {
          window.location.href = repoUrl;
        }, 300);
      }
    }, 100);
  }

  /**
    * 處理連結點擊事件
    */
  async function handleClick(event) {
    const link = event.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href') || link.href;

    // OAuth/登入回呼不攔截，避免 GitHub Copilot 登入失敗
    if (isAuthCallbackUrl(href)) return;

    // 處理 VS Code Marketplace 安裝連結 (vscode:extension/...)
    // 注意：所有 VS Code 系列 IDE 都支援 {protocol}:extension/{id} 格式開啟擴充頁面
    // 但不支援自動安裝，用戶需要在 IDE 內點擊「安裝」按鈕
    const extensionId = parseVSCodeExtensionId(href);
    if (extensionId) {
      // 如果目標協議就是原始協議，不需要轉換
      if (VSCODE_EXTENSION_SCHEMES.has(targetProtocol) && href.startsWith(`${targetProtocol}:`)) {
        return; // 讓瀏覽器正常處理
      }

      event.preventDefault();
      event.stopPropagation();

      console.log(`[IDE Switcher] 攔截擴充連結: ${href}`);
      console.log(`[IDE Switcher] 擴充功能 ID: ${extensionId}`);
      
      // 嘗試透過 Native Host 安裝（適用於 Antigravity 等不支援 protocol URL 的 IDE）
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'installExtension',
          extensionId: extensionId
        });
        
        if (response && response.success) {
          console.log('[IDE Switcher] 擴充功能安裝成功');
        } else if (response && response.error === 'Native Host not installed') {
          // Native Host 未安裝，回退到 protocol URL
          console.log('[IDE Switcher] Native Host 未安裝，嘗試使用 protocol URL');
          const protocolUrl = targetProtocol === 'antigravity' 
            ? `antigravity://${extensionId}` 
            : `${getProtocolPrefix()}extension/${extensionId}`;
          console.log(`[IDE Switcher] 重定向至: ${protocolUrl}`);
          window.location.href = protocolUrl;
        } else {
          console.error('[IDE Switcher] 安裝失敗:', response?.error);
        }
      } catch (err) {
        // 通訊失敗，回退到 protocol URL
        console.error('[IDE Switcher] 無法連接 background script:', err);
        const protocolUrl = targetProtocol === 'antigravity' 
          ? `antigravity://${extensionId}` 
          : `${getProtocolPrefix()}extension/${extensionId}`;
        console.log(`[IDE Switcher] 回退到 protocol URL: ${protocolUrl}`);
        window.location.href = protocolUrl;
      }
      return;
    }

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

    // 處理 VSIX 下載連結 (Open VSX / Marketplace / GitHub Releases / *.vsix)
    if (isVsixUrl(href)) {
      const extInfo = parseExtensionFromVsixUrl(href);
      const protocolUrl = buildVsixInstallUrl(targetProtocol, href, extInfo);

      event.preventDefault();
      event.stopPropagation();

      console.log(`[IDE Switcher] 攔截 VSIX 下載: ${href}`);
      console.log(`[IDE Switcher] 重定向至: ${protocolUrl}`);

      window.location.href = protocolUrl;
      return;
    }

    // 處理 MCP URL (GitHub MCP Registry 使用)
    if (isMcpUrl(href)) {
      // 如果目標協議是 Antigravity，攔截並顯示安裝說明
      if (targetProtocol === 'antigravity') {
        const serverName = extractMcpServerName(href);
        if (serverName) {
          event.preventDefault();
          event.stopPropagation();

          console.log(`[IDE Switcher] 攔截 MCP URL: ${href}`);
          console.log(`[IDE Switcher] MCP 伺服器: ${serverName}`);

          // 取得 GitHub 倉庫 URL
          const repoUrl = MCP_REPO_MAP[serverName];
          if (repoUrl) {
            // 顯示模態框並重定向
            showMcpInstructionModal(serverName, repoUrl);
          }
          return;
        }
      } else {
        // 對於其他 IDE，轉換協議後正常處理
        const mcpUrl = convertToTargetUrl(href);
        if (mcpUrl !== href) {
          event.preventDefault();
          event.stopPropagation();

          console.log(`[IDE Switcher] 攔截 MCP URL: ${href}`);
          console.log(`[IDE Switcher] 重定向至: ${mcpUrl}`);

          window.location.href = mcpUrl;
          return;
        }
      }
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
