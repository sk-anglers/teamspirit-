// TeamSpirit Assistant - Punch Module
// 打刻操作関連（popup.js から分離）

async function sendPunchCommand(tabId, action, location) {
  try {
    // Use chrome.scripting.executeScript with allFrames to find buttons in any frame (including iframes)
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: (action, location) => {
        const logs = [];
        logs.push(`Frame: ${window === window.top ? 'main' : 'iframe'}`);
        logs.push(`URL: ${window.location.href}`);

        // Location mapping
        const LOCATION_MAP = {
          'remote': 'リモート',
          'office': 'オフィス',
          'direct-to-office': '直行→オフィス',
          'office-to-direct': 'オフィス→直帰',
          'direct': '直行直帰'
        };

        // Find button by ID first, then by text
        function findPunchButton(text) {
          // Method 1: Search by specific TeamSpirit button IDs
          if (text === '出勤') {
            const btn = document.getElementById('btnStInput');
            if (btn) return btn;
          }
          if (text === '退勤') {
            const btn = document.getElementById('btnEtInput');
            if (btn) return btn;
          }

          // Method 2: Direct button search by value attribute
          const buttons = document.querySelectorAll('button, input[type="button"], [role="button"]');
          for (const btn of buttons) {
            const btnText = btn.textContent?.trim() || btn.value?.trim() || '';
            if (btnText === text) {
              return btn;
            }
          }
          return null;
        }

        // Select location
        function selectLocation(loc) {
          const locationText = LOCATION_MAP[loc];
          if (!locationText) return;

          const buttons = document.querySelectorAll('button, input[type="button"], [role="button"], label');
          for (const btn of buttons) {
            const text = btn.textContent?.trim() || btn.value?.trim() || '';
            if (text === locationText) {
              const isSelected = btn.classList.contains('selected') ||
                                btn.classList.contains('active') ||
                                btn.getAttribute('aria-pressed') === 'true';
              if (!isSelected) {
                btn.click();
              }
              return;
            }
          }
        }

        // Simulate click with multiple methods
        function simulateClick(element) {
          logs.push(`Clicking: ${element.id || element.value}`);

          // Focus first
          element.focus();

          // Try onclick directly if exists
          if (element.onclick) {
            try {
              element.onclick();
              logs.push('onclick() called');
            } catch (e) {
              logs.push(`onclick error: ${e.message}`);
            }
          }

          // Create and dispatch mouse events
          const rect = element.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          const mouseDownEvent = new MouseEvent('mousedown', {
            bubbles: true, cancelable: true, view: window,
            clientX: centerX, clientY: centerY
          });
          element.dispatchEvent(mouseDownEvent);

          const mouseUpEvent = new MouseEvent('mouseup', {
            bubbles: true, cancelable: true, view: window,
            clientX: centerX, clientY: centerY
          });
          element.dispatchEvent(mouseUpEvent);

          const clickEvent = new MouseEvent('click', {
            bubbles: true, cancelable: true, view: window,
            clientX: centerX, clientY: centerY
          });
          element.dispatchEvent(clickEvent);

          // Native click
          element.click();

          logs.push('Click events dispatched');
        }

        try {
          const buttonText = action === 'clockIn' ? '出勤' : '退勤';
          const button = findPunchButton(buttonText);

          if (!button) {
            // Button not found in this frame - not an error, just skip
            return { success: false, notFound: true, logs: logs.join('\n') };
          }

          logs.push(`Button found: ${button.id}, disabled: ${button.disabled}`);

          if (button.disabled) {
            const errorMsg = action === 'clockIn' ? '既に出勤済みです' : '出勤していないため退勤できません';
            return { success: false, error: errorMsg, logs: logs.join('\n') };
          }

          // Select location first (for clock in)
          if (action === 'clockIn' && location) {
            selectLocation(location);
          }

          // Click the button
          simulateClick(button);

          return { success: true, logs: logs.join('\n') };
        } catch (e) {
          logs.push(`Error: ${e.message}`);
          return { success: false, error: e.message, logs: logs.join('\n') };
        }
      },
      args: [action, location]
    });

    // Find the best result from all frames
    // Prioritize: success > error with button found > not found
    let bestResult = null;
    let allLogs = [];

    for (const frameResult of results) {
      if (frameResult.result) {
        allLogs.push(frameResult.result.logs || '');

        if (frameResult.result.success) {
          // Found and clicked - this is what we want
          bestResult = frameResult.result;
          break;
        } else if (!frameResult.result.notFound) {
          // Button was found but there was an error (like disabled)
          bestResult = frameResult.result;
        }
      }
    }

    if (bestResult) {
      return bestResult;
    }

    // No frame found the button
    return {
      success: false,
      error: '打刻ボタンが見つかりません。TeamSpiritページを開いてください。',
      logs: allLogs.join('\n---\n')
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function performPunch(action, location) {
  const { clockInBtn, clockOutBtn, showMessage, showStatus,
          updateButtonStates, showTimeSection, displaySummary,
          startTimeUpdates, loadMissedPunchData, updateTimeDisplayFinal,
          showLoginSection } = window._popupCtx;
  const btn = action === 'clockIn' ? clockInBtn : clockOutBtn;
  let autoOpenedTab = null;

  try {
    btn.disabled = true;
    clockInBtn.disabled = true;
    clockOutBtn.disabled = true;
    btn.classList.add('loading');
    showMessage('処理中...', 'info');

    // Get stored credentials (email and encrypted password from local)
    const { savedEmail, encryptedPassword } = await chrome.storage.local.get(['savedEmail', 'encryptedPassword']);
    const savedPassword = encryptedPassword ? await decryptPassword(encryptedPassword) : null;

    let tab = await findTeamSpiritTab();

    if (!tab) {
      // Open TeamSpirit in background
      showMessage('TeamSpiritを開いています...', 'info');
      autoOpenedTab = await chrome.tabs.create({ url: CONFIG.TEAMSPIRIT_URL, active: false });

      await waitForTabLoad(autoOpenedTab.id);
      showMessage('ページ読み込み完了...', 'info');

      await waitForContentScript(autoOpenedTab.id);

      // Check if login is needed
      const pageInfo = await getPageInfo(autoOpenedTab.id);

      if (pageInfo.isLoginPage && savedEmail && savedPassword) {
        showMessage('自動ログイン中...', 'info');
        const loginResult = await sendLoginCommand(autoOpenedTab.id, savedEmail, savedPassword);

        if (!loginResult.success) {
          throw new Error('自動ログインに失敗しました');
        }

        await waitForLoginRedirect(autoOpenedTab.id);
        await waitForContentScript(autoOpenedTab.id);
      } else if (pageInfo.isLoginPage) {
        throw new Error('ログインが必要です');
      }

      tab = autoOpenedTab;
    }

    // Send punch command
    showMessage('打刻中...', 'info');
    const result = await sendPunchCommand(tab.id, action, location);

    if (result.success) {
      const actionText = action === 'clockIn' ? '出勤' : '退勤';
      showMessage(`${actionText}打刻が完了しました`, 'success');

      // Update button states and time management based on action
      if (action === 'clockIn') {
        showStatus('出勤中', 'working');
        updateButtonStates('working');
        // Save clock-in timestamp locally
        await saveClockInTime();
        showTimeSection();

        // キャッシュ無効化後、サマリーデータを再取得して表示
        chrome.runtime.sendMessage({ type: 'INVALIDATE_CACHE' }, () => {
          loadMissedPunchData();
          fetchClockInTimeFromSite().then((fetchResult) => {
            if (fetchResult && fetchResult.summary) {
              displaySummary(fetchResult.summary, true, fetchResult.clockInTimestamp);
              startTimeUpdates();
            }
          });
        });
      } else {
        showStatus('退勤済み', 'logged-in');
        updateButtonStates('clocked-out');
        // Get clock-in timestamp and set clock-out timestamp
        const stored = await chrome.storage.local.get('clockInTimestamp');
        const clockOutTimestamp = Date.now();
        await chrome.storage.local.set({ hasClockedOut: true, clockOutTimestamp: clockOutTimestamp });
        // Show final time display (this also stops the interval)
        if (stored.clockInTimestamp) {
          updateTimeDisplayFinal(stored.clockInTimestamp, clockOutTimestamp);
        }

        // キャッシュを無効化してから打刻漏れデータを再取得
        chrome.runtime.sendMessage({ type: 'INVALIDATE_CACHE' }, () => {
          loadMissedPunchData();
        });
      }

      // Close auto-opened tab
      if (autoOpenedTab) {
        setTimeout(async () => {
          try {
            await chrome.tabs.remove(autoOpenedTab.id);
          } catch (e) {}
        }, 1500);
      }
    } else {
      throw new Error(result.error || '打刻に失敗しました');
    }
  } catch (error) {
    showMessage(error.message || 'エラーが発生しました', 'error');

    // Handle session expired
    if (error.message.includes('ログイン')) {
      await chrome.storage.local.set({ isLoggedIn: false });
      showLoginSection();
    }

    if (autoOpenedTab) {
      setTimeout(async () => {
        try {
          await chrome.tabs.remove(autoOpenedTab.id);
        } catch (e) {}
      }, 2000);
    }

    // Restore correct button states based on current status
    const errorRecovery = await chrome.storage.local.get(
      ['clockInTimestamp', 'hasClockedOut']
    );
    if (errorRecovery.clockInTimestamp && !errorRecovery.hasClockedOut) {
      updateButtonStates('working');
    } else if (errorRecovery.hasClockedOut) {
      updateButtonStates('clocked-out');
    } else {
      updateButtonStates('not-working');
    }
  } finally {
    btn.classList.remove('loading');
  }
}
