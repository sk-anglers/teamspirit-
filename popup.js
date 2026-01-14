const TEAMSPIRIT_URL = 'https://teamspirit-74532.lightning.force.com/lightning/page/home';

document.addEventListener('DOMContentLoaded', async () => {
  const clockInBtn = document.getElementById('clockIn');
  const clockOutBtn = document.getElementById('clockOut');
  const locationSelect = document.getElementById('location');
  const messageDiv = document.getElementById('message');
  const statusDiv = document.getElementById('status');
  const openTeamSpiritLink = document.getElementById('openTeamSpirit');

  // Load saved location preference
  const { savedLocation } = await chrome.storage.local.get('savedLocation');
  if (savedLocation) {
    locationSelect.value = savedLocation;
  }

  // Save location preference when changed
  locationSelect.addEventListener('change', () => {
    chrome.storage.local.set({ savedLocation: locationSelect.value });
  });

  // Open TeamSpirit link
  openTeamSpiritLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: TEAMSPIRIT_URL });
  });

  // Check current status
  checkStatus();

  // Clock in button
  clockInBtn.addEventListener('click', () => {
    performPunch('clockIn', locationSelect.value);
  });

  // Clock out button
  clockOutBtn.addEventListener('click', () => {
    performPunch('clockOut', locationSelect.value);
  });

  async function checkStatus() {
    try {
      const tab = await findTeamSpiritTab();
      if (tab) {
        statusDiv.querySelector('.status-text').textContent = 'TeamSpiritに接続中';
        // Send message to content script to get status
        chrome.tabs.sendMessage(tab.id, { action: 'getStatus' }, (response) => {
          if (chrome.runtime.lastError) {
            showStatus('TeamSpiritタブを再読み込みしてください', 'not-working');
            return;
          }
          if (response && response.status) {
            showStatus(response.status, response.isWorking ? 'working' : 'not-working');
          }
        });
      } else {
        showStatus('TeamSpiritを開いてください', 'not-working');
      }
    } catch (error) {
      showStatus('状態を取得できません', 'not-working');
    }
  }

  function showStatus(text, className) {
    statusDiv.querySelector('.status-text').textContent = text;
    statusDiv.className = 'status ' + className;
  }

  async function performPunch(action, location) {
    const btn = action === 'clockIn' ? clockInBtn : clockOutBtn;

    try {
      btn.disabled = true;
      btn.classList.add('loading');
      showMessage('処理中...', 'info');

      const tab = await findTeamSpiritTab();

      if (!tab) {
        // Open TeamSpirit and wait for it to load
        showMessage('TeamSpiritを開いています...', 'info');
        const newTab = await chrome.tabs.create({ url: TEAMSPIRIT_URL, active: false });

        // Wait for the tab to load
        await waitForTabLoad(newTab.id);

        // Send punch command
        await sendPunchCommand(newTab.id, action, location);
      } else {
        // Send punch command to existing tab
        await sendPunchCommand(tab.id, action, location);
      }
    } catch (error) {
      showMessage(error.message || 'エラーが発生しました', 'error');
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  }

  async function findTeamSpiritTab() {
    const tabs = await chrome.tabs.query({ url: 'https://teamspirit-74532.lightning.force.com/*' });
    return tabs[0] || null;
  }

  function waitForTabLoad(tabId) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('タブの読み込みがタイムアウトしました'));
      }, 30000);

      const listener = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          clearTimeout(timeout);
          chrome.tabs.onUpdated.removeListener(listener);
          // Wait a bit more for the page to fully render
          setTimeout(resolve, 3000);
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
    });
  }

  function sendPunchCommand(tabId, action, location) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { action, location }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error('TeamSpiritとの通信に失敗しました。ページを再読み込みしてください。'));
          return;
        }

        if (response && response.success) {
          const actionText = action === 'clockIn' ? '出勤' : '退勤';
          showMessage(`${actionText}打刻が完了しました`, 'success');
          checkStatus();
          resolve();
        } else {
          reject(new Error(response?.error || '打刻に失敗しました'));
        }
      });
    });
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = 'message ' + type;
  }
});
