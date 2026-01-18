/**
 * VS Code IDE Switcher - Popup Script
 * 
 * 處理 IDE 選擇邏輯，將選擇儲存至 chrome.storage.sync
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'selectedProtocol';
  const DEFAULT_PROTOCOL = 'antigravity';

  /**
   * 取得目前選擇的協議
   */
  async function getSelectedProtocol() {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEY);
      return result[STORAGE_KEY] || DEFAULT_PROTOCOL;
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
        // 加入已選中的勾選圖示顯示邏輯由 CSS 處理
      } else {
        option.classList.remove('selected');
      }
    });

    // 不需要更新 status 文字了，因為 footer 被警告文字取代
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
    }
  }

  /**
   * 設定警告訊息語言
   */
  function setWarningMessage() {
    const warningEl = document.getElementById('warning-msg');
    if (!warningEl) return;

    warningEl.textContent = chrome.i18n.getMessage("warningNotInstalled");
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
  }

  // 當 DOM 載入完成時初始化
  document.addEventListener('DOMContentLoaded', init);
})();
