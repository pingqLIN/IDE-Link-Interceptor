#!/usr/bin/env node
/**
 * IDE Link Interceptor - Native Messaging Host
 * 
 * This script receives messages from the browser extension via Native Messaging
 * and executes IDE CLI commands to install extensions.
 * 
 * Native Messaging Protocol:
 * - Input: 4 bytes (uint32 LE) length + JSON string
 * - Output: 4 bytes (uint32 LE) length + JSON string
 */

const { spawn } = require('child_process');
const {
  checkProtocolRegistration,
  registerProtocol,
  autoRegisterProtocol,
  findIDEPath
} = require('./protocol-helper');

// IDE 命令對應
const IDE_COMMANDS = {
  'vscode': 'code',
  'vscode-insiders': 'code-insiders',
  'antigravity': 'antigravity',
  'cursor': 'cursor',
  'windsurf': 'windsurf',
};

/**
 * 發送 Native Messaging 回應
 */
function sendMessage(message) {
  const json = JSON.stringify(message);
  const buffer = Buffer.from(json, 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);

  process.stdout.write(header);
  process.stdout.write(buffer);
}

/**
 * 執行 IDE 安裝命令
 */
function installExtension(ide, extensionId) {
  return new Promise((resolve, reject) => {
    const command = IDE_COMMANDS[ide];

    if (!command) {
      reject(new Error(`Unknown IDE: ${ide}`));
      return;
    }

    const args = ['--install-extension', extensionId];

    const child = spawn(command, args, {
      shell: true,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Exit code ${code}: ${stderr || stdout}`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Spawn error: ${err.message}`));
    });

    // 60 秒超時
    setTimeout(() => {
      child.kill();
      reject(new Error('Installation timed out'));
    }, 60000);
  });
}

/**
 * 處理訊息
 */
async function handleMessage(message) {
  if (!message || typeof message !== 'object') {
    return { success: false, error: 'Invalid message format' };
  }

  const { action, extensionId, ide } = message;

  if (action === 'ping') {
    return { success: true, message: 'pong', version: '1.0.0' };
  }

  if (action === 'install') {
    if (!extensionId) {
      return { success: false, error: 'Missing extensionId' };
    }
    if (!ide) {
      return { success: false, error: 'Missing ide' };
    }

    try {
      const result = await installExtension(ide, extensionId);
      return {
        success: true,
        message: `Extension ${extensionId} installed successfully`,
        output: result.stdout
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // 檢查協議是否已註冊
  if (action === 'checkProtocol') {
    const protocol = message.protocol || ide;
    if (!protocol) {
      return { success: false, error: 'Missing protocol' };
    }

    try {
      const result = await checkProtocolRegistration(protocol);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // 註冊協議
  if (action === 'registerProtocol') {
    const protocol = message.protocol || ide;
    const execPath = message.execPath;

    if (!protocol) {
      return { success: false, error: 'Missing protocol' };
    }

    try {
      // 如果有指定 execPath，直接註冊
      // 否則自動偵測並註冊
      if (execPath) {
        const result = await registerProtocol(protocol, execPath);
        return { success: result.success, error: result.error, execPath };
      } else {
        const result = await autoRegisterProtocol(protocol);
        return result;
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // 尋找 IDE 安裝路徑
  if (action === 'findIDEPath') {
    const protocol = message.protocol || ide;
    if (!protocol) {
      return { success: false, error: 'Missing protocol' };
    }

    try {
      const path = await findIDEPath(protocol);
      return { success: true, path: path, found: !!path };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: `Unknown action: ${action}` };
}

/**
 * 主程式 - 讀取 Native Messaging 格式的輸入
 */
function main() {
  let inputBuffer = Buffer.alloc(0);
  let messageLength = null;

  process.stdin.on('readable', () => {
    let chunk;
    while ((chunk = process.stdin.read()) !== null) {
      inputBuffer = Buffer.concat([inputBuffer, chunk]);
    }

    // 嘗試讀取完整訊息
    while (true) {
      // 需要至少 4 bytes 來讀取長度
      if (messageLength === null) {
        if (inputBuffer.length < 4) {
          return;
        }
        messageLength = inputBuffer.readUInt32LE(0);
        inputBuffer = inputBuffer.slice(4);
      }

      // 等待完整訊息
      if (inputBuffer.length < messageLength) {
        return;
      }

      // 解析訊息
      const messageData = inputBuffer.slice(0, messageLength);
      inputBuffer = inputBuffer.slice(messageLength);
      messageLength = null;

      try {
        const message = JSON.parse(messageData.toString('utf8'));

        handleMessage(message)
          .then(response => {
            sendMessage(response);
            process.exit(0);
          })
          .catch(err => {
            sendMessage({ success: false, error: err.message });
            process.exit(1);
          });
      } catch (err) {
        sendMessage({ success: false, error: `Parse error: ${err.message}` });
        process.exit(1);
      }

      return; // 只處理一個訊息
    }
  });

  process.stdin.on('end', () => {
    process.exit(0);
  });

  process.stdin.on('error', (err) => {
    sendMessage({ success: false, error: `Stdin error: ${err.message}` });
    process.exit(1);
  });
}

main();
