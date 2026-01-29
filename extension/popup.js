/**
 * VS Code IDE Switcher - Popup Script
 * 
 * 處理 IDE 選擇邏輯，將選擇儲存至 chrome.storage.sync
 * 並提供協議註冊狀態檢測與修復功能
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

  // 協議註冊狀態快取
  let registrationStatus = {};

  /**
   * 取得目前選擇的協議
   */
  async function getSelectedProtocol() {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEY);
      const protocol = result[STORAGE_KEY] || DEFAULT_PROTOCOL;
      if (!SUPPORTED_PROTOCOLS.has(protocol)) {
        await chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_PROTOCOL });
        return DEFAULT_PROTOCOL;
      }
      return protocol;
    } catch (error) {
      console.error('讀取設定失敗:', error);
      return DEFAULT_PROTOCOL;
    }
  }

  /**
   * 儲存選擇的協議
   */
  async function setSelectedProtocol(protocol) {
    try {
      await chrome.storage.sync.set({ [STORAGE_KEY]: protocol });
      return true;
    } catch (error) {
      console.error('儲存設定失敗:', error);
      return false;
    }
  }

  /**
   * 更新 UI 顯示選中狀態
   */
  function updateUI(selectedProtocol) {
    const options = document.querySelectorAll('.ide-option');
    options.forEach(option => {
      const protocol = option.dataset.protocol;
      if (protocol === selectedProtocol) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
  }

  /**
   * 更新單一 IDE 的註冊狀態指示器
   */
  function updateIDEStatusIndicator(protocol, status) {
    const option = document.querySelector(`.ide-option[data-protocol="${protocol}"]`);
    if (!option) return;

    // 找到或建立狀態指示器
    let statusEl = option.querySelector('.ide-status');
    if (!statusEl) {
      statusEl = document.createElement('span');
      statusEl.className = 'ide-status';
      // 插入在 check-icon 之前
      const checkIcon = option.querySelector('.check-icon');
      if (checkIcon) {
        option.insertBefore(statusEl, checkIcon);
      } else {
        option.appendChild(statusEl);
      }
    }

    // 清除所有狀態類別
    statusEl.classList.remove('ide-status--registered', 'ide-status--missing', 'ide-status--unknown', 'ide-status--checking');

    // 設定適當的狀態類別
    if (status === 'checking') {
      statusEl.classList.add('ide-status--checking');
      statusEl.title = chrome.i18n.getMessage('statusChecking') || 'Checking...';
    } else if (status === true) {
      statusEl.classList.add('ide-status--registered');
      statusEl.title = chrome.i18n.getMessage('statusRegistered') || 'Registered';
    } else if (status === false) {
      statusEl.classList.add('ide-status--missing');
      statusEl.title = chrome.i18n.getMessage('statusNotRegistered') || 'Not registered';
    } else {
      statusEl.classList.add('ide-status--unknown');
      statusEl.title = 'Unknown';
    }
  }

  /**
   * 檢查所有 IDE 的註冊狀態
   */
  async function checkAllIDEStatus() {
    // 先標記所有為檢測中
    SUPPORTED_PROTOCOLS.forEach(protocol => {
      updateIDEStatusIndicator(protocol, 'checking');
    });

    try {
      // 透過 background script 檢查
      const response = await chrome.runtime.sendMessage({ action: 'checkAllIDERegistrations' });

      if (response && !response.error) {
        registrationStatus = response;

        // 更新所有狀態指示器
        for (const [protocol, status] of Object.entries(response)) {
          updateIDEStatusIndicator(protocol, status.registered);
        }

        // 檢查是否有未註冊的 IDE
        updateFixSection();
      } else {
        // Native Host 不可用
        SUPPORTED_PROTOCOLS.forEach(protocol => {
          updateIDEStatusIndicator(protocol, null);
        });
      }
    } catch (error) {
      console.error('檢查 IDE 狀態失敗:', error);
      SUPPORTED_PROTOCOLS.forEach(protocol => {
        updateIDEStatusIndicator(protocol, null);
      });
    }
  }

  /**
   * 更新修復區塊的顯示
   */
  async function updateFixSection() {
    const fixSection = document.getElementById('fix-section');
    const fixBtnText = document.getElementById('fix-btn-text');

    if (!fixSection || !fixBtnText) return;

    // 檢查目前選中的 IDE 是否未註冊
    const currentProtocol = await getSelectedProtocol();
    const currentStatus = registrationStatus[currentProtocol];

    if (currentStatus && currentStatus.registered === false) {
      fixSection.classList.remove('hidden');
      fixBtnText.textContent = chrome.i18n.getMessage('fixRegistration') || 'Fix Registration';
    } else {
      fixSection.classList.add('hidden');
    }
  }

  /**
   * 處理修復按鈕點擊
   */
  async function handleFixClick() {
    const fixBtn = document.getElementById('fix-btn');
    const fixStatus = document.getElementById('fix-status');
    const currentProtocol = await getSelectedProtocol();

    if (!fixBtn || !fixStatus) return;

    // 禁用按鈕
    fixBtn.disabled = true;
    fixStatus.textContent = chrome.i18n.getMessage('statusChecking') || 'Processing...';
    fixStatus.className = 'fix-status';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'registerProtocol',
        protocol: currentProtocol
      });

      if (response && response.success) {
        fixStatus.textContent = chrome.i18n.getMessage('fixSuccess') || 'Protocol registered successfully!';
        fixStatus.className = 'fix-status success';

        // 更新狀態
        registrationStatus[currentProtocol] = { registered: true, execPath: response.execPath };
        updateIDEStatusIndicator(currentProtocol, true);

        // 延遲隱藏修復區塊
        setTimeout(() => {
          const fixSection = document.getElementById('fix-section');
          if (fixSection) fixSection.classList.add('hidden');
        }, 2000);
      } else {
        fixStatus.textContent = response?.error ||
          (chrome.i18n.getMessage('fixFailed') || 'Registration failed.');
        fixStatus.className = 'fix-status error';
      }
    } catch (error) {
      fixStatus.textContent = error.message || 'Registration failed.';
      fixStatus.className = 'fix-status error';
    }

    // 重新啟用按鈕
    fixBtn.disabled = false;
  }

  /**
   * 處理 IDE 選項點擊
   */
  async function handleOptionClick(event) {
    const option = event.currentTarget;
    const protocol = option.dataset.protocol;

    if (!protocol) return;

    // 儲存選擇
    const success = await setSelectedProtocol(protocol);

    if (success) {
      // 移除所有 just-selected 類別
      document.querySelectorAll('.ide-option').forEach(el => {
        el.classList.remove('just-selected');
      });

      // 添加動畫效果
      option.classList.add('just-selected');

      // 更新 UI
      updateUI(protocol);

      // 更新修復區塊
      updateFixSection();
    }
  }

  /**
   * 設定警告訊息語言
   */
  function setWarningMessage() {
    const warningEl = document.getElementById('warning-msg');
    if (!warningEl) return;

    warningEl.textContent = chrome.i18n.getMessage('warningNotInstalled');
  }

  /**
   * 初始化
   */
  async function init() {
    // 設定語言訊息
    setWarningMessage();

    // 取得目前設定
    const currentProtocol = await getSelectedProtocol();
    updateUI(currentProtocol);

    // 綁定點擊事件
    const options = document.querySelectorAll('.ide-option');
    options.forEach(option => {
      option.addEventListener('click', handleOptionClick);
    });

    // 綁定修復按鈕
    const fixBtn = document.getElementById('fix-btn');
    if (fixBtn) {
      fixBtn.addEventListener('click', handleFixClick);
    }

    // 檢查所有 IDE 註冊狀態
    checkAllIDEStatus();
  }

  // 當 DOM 載入完成時初始化
  document.addEventListener('DOMContentLoaded', init);
})();
